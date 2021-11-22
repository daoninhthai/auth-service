const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { query } = require('../config/database');
const User = require('../models/User');
const emailService = require('../services/emailService');

const SALT_ROUNDS = 12;
const RESET_TOKEN_EXPIRY = 60 * 60 * 1000; // 1 hour

class PasswordController {
  /**
   * Request password reset
   * POST /api/password/forgot-password
   */
  static async forgotPassword(req, res) {
    try {
      const { email } = req.body;

      // Always return success to prevent email enumeration
      const successResponse = {
        message: 'If the email exists, a password reset link has been sent',
      };

      const user = await User.findByEmail(email);
      if (!user) {
        return res.json(successResponse);
      }

      // Invalidate any existing reset tokens for this user
      await query(
        'UPDATE password_resets SET used = true WHERE user_id = $1 AND used = false',
        [user.id]
      );

      // Generate secure reset token
      const resetToken = crypto.randomBytes(32).toString('hex');
      const hashedToken = crypto
        .createHash('sha256')
        .update(resetToken)
        .digest('hex');

      // Store hashed token in database
      const expiresAt = new Date(Date.now() + RESET_TOKEN_EXPIRY);
      await query(
        'INSERT INTO password_resets (user_id, token, expires_at) VALUES ($1, $2, $3)',
        [user.id, hashedToken, expiresAt]
      );

      // Send reset email (with unhashed token)
      await emailService.sendResetEmail(email, resetToken, user.full_name);

      res.json(successResponse);
    } catch (error) {
      console.error('Forgot password error:', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to process password reset request',
      });
    }
  }

  /**
   * Reset password with token
   * POST /api/password/reset-password
   */
  static async resetPassword(req, res) {
    try {
      const { token, password } = req.body;

      if (!token || !password) {
        return res.status(400).json({
          error: 'Bad Request',
          message: 'Token and new password are required',
        });
      }

      if (password.length < 8) {
        return res.status(400).json({
          error: 'Bad Request',
          message: 'Password must be at least 8 characters',
        });
      }

      // Hash the provided token to compare with stored hash
      const hashedToken = crypto
        .createHash('sha256')
        .update(token)
        .digest('hex');

      // Find valid reset token
      const { rows } = await query(
        `SELECT id, user_id, expires_at
         FROM password_resets
         WHERE token = $1 AND used = false AND expires_at > CURRENT_TIMESTAMP`,
        [hashedToken]
      );

      if (rows.length === 0) {
        return res.status(400).json({
          error: 'Bad Request',
          message: 'Invalid or expired reset token',
        });
      }

      const resetRecord = rows[0];

      // Hash new password
      const password_hash = await bcrypt.hash(password, SALT_ROUNDS);

      // Update user password
      await User.updatePassword(resetRecord.user_id, password_hash);

      // Mark token as used
      await query(
        'UPDATE password_resets SET used = true WHERE id = $1',
        [resetRecord.id]
      );

      res.json({
        message: 'Password reset successful',
      });
    } catch (error) {
      console.error('Reset password error:', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to reset password',
      });
    }
  }
}

module.exports = PasswordController;
