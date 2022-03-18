const TwoFactorService = require('../services/twoFactorService');
const User = require('../models/User');

class TwoFactorController {
  /**
   * Setup 2FA - Generate secret and QR code
   * POST /api/2fa/setup
   */
  static async setup(req, res) {
    try {
      const user = await User.findById(req.user.id);
      if (!user) {
        return res.status(404).json({
          error: 'Not Found',
          message: 'User not found',
        });
      }

      // Check if 2FA is already enabled
      const status = await TwoFactorService.get2FAStatus(req.user.id);
      if (status && status.enabled) {
        return res.status(400).json({
          error: 'Bad Request',
          message: '2FA is already enabled. Disable it first to set up again.',
        });
      }

      // Generate secret and QR code
      const { secret, otpauthUrl, qrCodeDataUrl } = await TwoFactorService.generateSecret(user.email);

      // Generate backup codes
      const backupCodes = TwoFactorService.generateBackupCodes();

      // Store temporarily (user must verify before enabling)
      // Using a temporary field or we can store in session/Redis
      req.session = req.session || {};
      req.tempSecret = secret;
      req.tempBackupCodes = backupCodes;

      // For now, store in a pending state
      res.json({
        message: '2FA setup initiated. Scan the QR code and verify with a token to enable.',
        secret, // Show secret for manual entry
        qrCodeUrl: qrCodeDataUrl,
        otpauthUrl,
        backupCodes,
        note: 'Save your backup codes in a safe place. You will need them if you lose access to your authenticator app.',
      });
    } catch (error) {
      console.error('2FA setup error:', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to setup 2FA',
      });
    }
  }

  /**
   * Verify and enable 2FA
   * POST /api/2fa/verify
   */
  static async verify(req, res) {
    try {
      const { token, secret } = req.body;

      if (!token || !secret) {
        return res.status(400).json({
          error: 'Bad Request',
          message: 'Token and secret are required',
        });
      }

      // Verify the TOTP token
      const isValid = TwoFactorService.verifyToken(token, secret);
      if (!isValid) {
        return res.status(400).json({
          error: 'Bad Request',
          message: 'Invalid verification token. Please try again.',
        });
      }

      // Generate backup codes and enable 2FA
      const backupCodes = TwoFactorService.generateBackupCodes();
      await TwoFactorService.enable2FA(req.user.id, secret, backupCodes);

      res.json({
        message: '2FA enabled successfully',
        backupCodes,
        warning: 'Store these backup codes safely. They will not be shown again.',
      });
    } catch (error) {
      console.error('2FA verify error:', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to verify 2FA',
      });
    }
  }

  /**
   * Disable 2FA
   * POST /api/2fa/disable
   */
  static async disable(req, res) {
    try {
      const { token } = req.body;

      if (!token) {
        return res.status(400).json({
          error: 'Bad Request',
          message: 'Current 2FA token is required to disable 2FA',
        });
      }

      // Get user's 2FA status
      const status = await TwoFactorService.get2FAStatus(req.user.id);
      if (!status || !status.enabled) {
        return res.status(400).json({
          error: 'Bad Request',
          message: '2FA is not enabled',
        });
      }

      // Verify token before disabling
      const isValid = TwoFactorService.verifyToken(token, status.secret);
      if (!isValid) {
        // Check backup code as fallback
        const isBackupValid = await TwoFactorService.verifyBackupCode(req.user.id, token);
        if (!isBackupValid) {
          return res.status(400).json({
            error: 'Bad Request',
            message: 'Invalid token. Provide a valid 2FA token or backup code.',
          });
        }
      }

      await TwoFactorService.disable2FA(req.user.id);

      res.json({
        message: '2FA disabled successfully',
      });
    } catch (error) {
      console.error('2FA disable error:', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to disable 2FA',
      });
    }
  }

  /**
   * Get 2FA status
   * GET /api/2fa/status
   */
  static async getStatus(req, res) {
    try {
      const status = await TwoFactorService.get2FAStatus(req.user.id);

      res.json({
        twoFactorEnabled: status ? status.enabled : false,
      });
    } catch (error) {
      console.error('2FA status error:', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to get 2FA status',
      });
    }
  }
}

module.exports = TwoFactorController;
