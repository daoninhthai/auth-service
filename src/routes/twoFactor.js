const express = require('express');
const router = express.Router();
const TwoFactorController = require('../controllers/twoFactorController');
const { verifyToken } = require('../middleware/auth');

// All 2FA routes require authentication
router.use(verifyToken);

// GET /api/2fa/status - Get 2FA status
router.get('/status', TwoFactorController.getStatus);

// POST /api/2fa/setup - Setup 2FA (generate secret + QR code)
router.post('/setup', TwoFactorController.setup);

// POST /api/2fa/verify - Verify and enable 2FA
router.post('/verify', TwoFactorController.verify);

// POST /api/2fa/disable - Disable 2FA
router.post('/disable', TwoFactorController.disable);

module.exports = router;
