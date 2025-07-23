const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
const { authMiddleware } = require('../middleware/auth');
const { validateRequest, schemas } = require('../middleware/validation');

// Sve rute zahtevaju autentifikaciju
router.use(authMiddleware);

// Product Groups
router.get('/groups', productController.getAllGroups);
router.post('/groups', validateRequest(schemas.productGroup), productController.createGroup);
router.put('/groups/:id', validateRequest(schemas.productGroup), productController.updateGroup);
router.delete('/groups/:id', productController.deleteGroup);

// Products
router.get('/', productController.getAll);
router.get('/:id', productController.getById);
router.post('/', validateRequest(schemas.product), productController.create);
router.put('/:id', validateRequest(schemas.product), productController.update);
router.delete('/:id', productController.delete);
router.patch('/:id/deactivate', productController.deactivate);
router.patch('/:id/activate', productController.activate);

module.exports = router;
