const express = require('express');
const router = express.Router();
const PasswordController = require('../controllers/passwordController');

// POST /api/password/forgot-password
router.post('/forgot-password', PasswordController.forgotPassword);

// POST /api/password/reset-password
router.post('/reset-password', PasswordController.resetPassword);

module.exports = router;
