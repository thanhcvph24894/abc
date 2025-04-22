const express = require('express');
const router = express.Router();
const { register, login, getMe, updateMe, changePassword } = require('../../controllers/api/authController');
const { protect } = require('../../middleware/api/authMiddleware');

// Public routes
router.post('/register', register);
router.post('/login', login);

// Protected routes
router.get('/me', protect, getMe);
router.put('/me', protect, updateMe);
router.put('/change-password', protect, changePassword);

module.exports = router; 