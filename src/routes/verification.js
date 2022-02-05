const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth');
const EmailVerificationService = require('../services/emailVerificationService');
const User = require('../models/User');

/**
 * Send verification email
 * POST /api/verification/send-verification
 * Requires authentication
 */
router.post('/send-verification', verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'User not found',
      });
    }

    if (user.email_verified) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Email is already verified',
      });
    }

    // Generate token and send email
    const token = await EmailVerificationService.generateVerificationToken(user.id);
    await EmailVerificationService.sendVerificationEmail(user.email, token, user.full_name);

    res.json({
      message: 'Verification email sent successfully',
    });
  } catch (error) {
    console.error('Send verification error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to send verification email',
    });
  }
});

/**
 * Verify email with token
 * GET /api/verification/verify/:token
 */
router.get('/verify/:token', async (req, res) => {
  try {
    const { token } = req.params;

    const result = await EmailVerificationService.verifyEmail(token);

    if (!result.success) {
      return res.status(400).json({
        error: 'Bad Request',
        message: result.message,
      });
    }

    res.json({
      message: result.message,
      user: result.user,
    });
  } catch (error) {
    console.error('Verify email error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to verify email',
    });
  }
});

module.exports = router;
