const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const fs = require('fs');

// Configure dotenv to read from parent directory
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const app = express();
const PORT = process.env.PORT || 3000;

// Kreiraj potrebne direktorijume
const uploadsDir = path.join(__dirname, '../uploads');
const logosDir = path.join(uploadsDir, 'logos');
const documentsDir = path.join(uploadsDir, 'documents');

[uploadsDir, logosDir, documentsDir].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['http://localhost:8080', 'http://127.0.0.1:8080'] // Dodaj svoje production domene
    : true,
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minuta
  max: 1000, // maksimalno 1000 zahteva po IP adresi
  message: 'Previše zahteva sa ove IP adrese, pokušajte kasnije.'
});
app.use(limiter);

// Strict rate limiting za login
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minuta
  max: 5, // maksimalno 5 pokušaja login-a
  skipSuccessfulRequests: true,
  message: 'Previše neuspešnih pokušaja prijave, pokušajte kasnije.'
});

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Statičke rute za fajlove
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Import ruta
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const clientRoutes = require('./routes/clients');
const productRoutes = require('./routes/products');
const offerRoutes = require('./routes/offers');
const saleRoutes = require('./routes/sales');
const companyRoutes = require('./routes/company');
const incomingDocumentRoutes = require('./routes/incomingDocuments');

// API rute
app.use('/api/auth', loginLimiter, authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/clients', clientRoutes);
app.use('/api/products', productRoutes);
app.use('/api/offers', offerRoutes);
app.use('/api/sales', saleRoutes);
app.use('/api/company', companyRoutes);
app.use('/api/incoming-documents', incomingDocumentRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Error:', error);
  
  if (error.name === 'ValidationError') {
    return res.status(400).json({ error: 'Validacija nije uspešna', details: error.message });
  }
  
  if (error.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ error: 'Fajl je prevelik' });
  }
  
  if (error.code === 'LIMIT_UNEXPECTED_FILE') {
    return res.status(400).json({ error: 'Neočekivan fajl' });
  }

  if (error.message && error.message.includes('Dozvoljeni su samo')) {
    return res.status(400).json({ error: error.message });
  }
  
  res.status(500).json({ error: 'Greška servera' });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Ruta nije pronađena' });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server pokrenut na portu ${PORT}`);
  console.log(`API dokumentacija dostupna na http://localhost:${PORT}/api/health`);
  
  if (process.env.NODE_ENV !== 'production') {
    console.log('');
    console.log('🔧 Development mode');
    console.log('📁 Uploads folder:', path.join(__dirname, '../uploads'));
    console.log('🏥 Health check: http://localhost:' + PORT + '/api/health');
    console.log('');
  }
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT signal received: closing HTTP server');
  process.exit(0);
});

module.exports = app;
