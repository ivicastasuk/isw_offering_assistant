const express = require('express');
const router = express.Router();
const offerController = require('../controllers/offerController');
const { authMiddleware } = require('../middleware/auth');
const { validateRequest, schemas } = require('../middleware/validation');

// Sve rute zahtevaju autentifikaciju
router.use(authMiddleware);

// Get all offers
router.get('/', offerController.getAll);

// Get offer by ID
router.get('/:id', offerController.getById);

// Create new offer
router.post('/', validateRequest(schemas.offer), offerController.create);

// Offer items management
router.post('/:id/items', validateRequest(schemas.offerItem), offerController.addItem);
router.put('/:id/items/:itemId', validateRequest(schemas.offerItem), offerController.updateItem);
router.delete('/:id/items/:itemId', offerController.removeItem);

// Lock offer
router.patch('/:id/lock', offerController.lock);

// Update offer status
router.patch('/:id/status', offerController.updateStatus);

// Create revision
router.post('/:id/revision', offerController.createRevision);

// Generate PDF
router.get('/:id/pdf', offerController.generatePDF);

module.exports = router;
