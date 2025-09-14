
const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

// Middleware to protect routes
const { ensureAuthenticated } = require('../config/auth');

// Login Page
router.get('/login', authController.getLogin);

// Register Page
router.get('/register', authController.getRegister);

// Register Handle
router.post('/register', authController.postRegister);

// Login Handle
router.post('/login', authController.postLogin);

// Logout Handle
router.get('/logout', authController.logout);


module.exports = router;
