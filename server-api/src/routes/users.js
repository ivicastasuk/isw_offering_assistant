const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');
const { validateRequest, schemas } = require('../middleware/validation');

// Sve rute zahtevaju autentifikaciju
router.use(authMiddleware);

// Get all users
router.get('/', userController.getAll);

// Get user by ID
router.get('/:id', userController.getById);

// Admin only routes
router.use(adminMiddleware);

// Create new user
router.post('/', validateRequest(schemas.user), userController.create);

// Update user
router.put('/:id', validateRequest(schemas.userUpdate), userController.update);

// Deactivate user
router.patch('/:id/deactivate', userController.deactivate);

// Activate user
router.patch('/:id/activate', userController.activate);

// Reset user password
router.post('/:id/reset-password', userController.resetPassword);

module.exports = router;
