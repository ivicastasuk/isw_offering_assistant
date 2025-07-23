const express = require('express');
const router = express.Router();
const saleController = require('../controllers/saleController');
const { authMiddleware } = require('../middleware/auth');

// Sve rute zahtevaju autentifikaciju
router.use(authMiddleware);

// Get all sales
router.get('/', saleController.getAll);

// Get sales statistics
router.get('/stats', saleController.getStats);

// Get sale by ID
router.get('/:id', saleController.getById);

// Create new sale
router.post('/', saleController.create);

// Update sale
router.put('/:id', saleController.update);

// Delete sale
router.delete('/:id', saleController.delete);

module.exports = router;
