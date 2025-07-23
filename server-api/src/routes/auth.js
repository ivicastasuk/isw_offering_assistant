const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { validateRequest, schemas } = require('../middleware/validation');

// Login
router.post('/login', validateRequest(schemas.login), authController.login);

// Authenticated routes
const { authMiddleware } = require('../middleware/auth');
router.use(authMiddleware);

// Get current user info
router.get('/me', authController.me);

// Change password
router.post('/change-password', authController.changePassword);

module.exports = router;
