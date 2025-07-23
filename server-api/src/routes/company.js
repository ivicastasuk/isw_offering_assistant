const express = require('express');
const multer = require('multer');
const path = require('path');
const router = express.Router();
const companyController = require('../controllers/companyController');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');
const { validateRequest, schemas } = require('../middleware/validation');

// Sve rute zahtevaju autentifikaciju
router.use(authMiddleware);

// Get company info (dostupno svim korisnicima)
router.get('/', companyController.get);

// Admin only routes
router.use(adminMiddleware);

// Multer konfiguracija za upload logo-a
const logoStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/logos/');
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'logo-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const logoUpload = multer({
  storage: logoStorage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB
  },
  fileFilter: function (req, file, cb) {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Dozvoljeni su samo image fajlovi'), false);
    }
  }
});

// Update company info
router.put('/', validateRequest(schemas.companyInfo), companyController.update);

// Upload logo
router.post('/logo', logoUpload.single('logo'), companyController.uploadLogo);

module.exports = router;
