const express = require('express');
const router = express.Router();
const AuthController = require('../controllers/authController');
const { validate, registerSchema, loginSchema } = require('../middleware/validation');

// POST /api/auth/register
router.post('/register', validate(registerSchema), AuthController.register);

// POST /api/auth/login
router.post('/login', validate(loginSchema), AuthController.login);

// POST /api/auth/refresh-token
router.post('/refresh-token', AuthController.refreshToken);

// POST /api/auth/logout
router.post('/logout', AuthController.logout);

module.exports = router;
