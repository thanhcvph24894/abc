const express = require('express');
const router = express.Router();
const { protect } = require('../../middleware/api/authMiddleware');

// Import controllers
const categoryController = require('../../controllers/api/categoryController');
const productController = require('../../controllers/api/productController');
const cartController = require('../../controllers/api/cartController');
const orderController = require('../../controllers/api/orderController');

// Category routes
router.get('/categories', categoryController.getCategories);
router.get('/categories/with-products', categoryController.getCategoriesWithProducts);
router.get('/categories/:slug', categoryController.getCategoryWithProducts);

// Product routes
router.get('/products', productController.getProducts);
router.get('/products/:slug', productController.getProduct);

// Cart routes
router.get('/cart', protect, cartController.getCart);
router.post('/cart', protect, cartController.addToCart);
router.put('/cart/:itemId', protect, cartController.updateCartItem);
router.delete('/cart/:itemId', protect, cartController.removeCartItem);
router.delete('/cart', protect, cartController.clearCart);

// Order routes
router.get('/orders', protect, orderController.getOrders);
router.get('/orders/:id', protect, orderController.getOrderById);
router.post('/orders', protect, orderController.createOrder);
router.put('/orders/:id/cancel', protect, orderController.cancelOrder);
router.put('/orders/:id/update-status', protect, orderController.updateStatus);
router.put('/orders/:id/pay', protect, orderController.payOrder);

module.exports = router; 