const express = require('express');
const multer = require('multer');
const path = require('path');
const router = express.Router();
const incomingDocumentController = require('../controllers/incomingDocumentController');
const { authMiddleware } = require('../middleware/auth');
const { validateRequest, schemas } = require('../middleware/validation');

// Sve rute zahtevaju autentifikaciju
router.use(authMiddleware);

// Multer konfiguracija za upload PDF-a
const pdfStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/documents/');
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'document-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const pdfUpload = multer({
  storage: pdfStorage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB
  },
  fileFilter: function (req, file, cb) {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Dozvoljeni su samo PDF fajlovi'), false);
    }
  }
});

// Get all incoming documents
router.get('/', incomingDocumentController.getAll);

// Get incoming documents statistics
router.get('/stats', incomingDocumentController.getStats);

// Get incoming document by ID
router.get('/:id', incomingDocumentController.getById);

// Create new incoming document
router.post('/', validateRequest(schemas.incomingDocument), incomingDocumentController.create);

// Update incoming document
router.put('/:id', validateRequest(schemas.incomingDocument), incomingDocumentController.update);

// Delete incoming document
router.delete('/:id', incomingDocumentController.delete);

// Upload PDF
router.post('/upload-pdf', pdfUpload.single('pdf'), incomingDocumentController.uploadPDF);

module.exports = router;
