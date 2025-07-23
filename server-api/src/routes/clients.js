const express = require('express');
const router = express.Router();
const clientController = require('../controllers/clientController');
const { authMiddleware } = require('../middleware/auth');
const { validateRequest, schemas } = require('../middleware/validation');

// Sve rute zahtevaju autentifikaciju
router.use(authMiddleware);

// Get all clients
router.get('/', clientController.getAll);

// Get client by ID
router.get('/:id', clientController.getById);

// Create new client
router.post('/', validateRequest(schemas.client), clientController.create);

// Update client
router.put('/:id', validateRequest(schemas.client), clientController.update);

// Delete client
router.delete('/:id', clientController.delete);

// Deactivate client
router.patch('/:id/deactivate', clientController.deactivate);

// Activate client
router.patch('/:id/activate', clientController.activate);

module.exports = router;
