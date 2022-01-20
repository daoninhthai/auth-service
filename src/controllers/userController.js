const bcrypt = require('bcryptjs');
const User = require('../models/User');
const RefreshToken = require('../models/RefreshToken');
const TokenService = require('../services/tokenService');

const SALT_ROUNDS = 12;

class UserController {
  /**
   * Get current user profile
   * GET /api/users/profile
   */
  static async getProfile(req, res) {
    try {
      const user = await User.findById(req.user.id);

      if (!user) {
        return res.status(404).json({
          error: 'Not Found',
          message: 'User not found',
        });
      }

      res.json({
        user: {
          id: user.id,
          email: user.email,
          full_name: user.full_name,
          role: user.role,
          is_active: user.is_active,
          email_verified: user.email_verified,
          created_at: user.created_at,
          updated_at: user.updated_at,
        },
      });
    } catch (error) {
      console.error('Get profile error:', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to get profile',
      });
    }
  }

  /**
   * Update current user profile
   * PUT /api/users/profile
   */
  static async updateProfile(req, res) {
    try {
      const { full_name, email } = req.body;

      // If changing email, check uniqueness
      if (email && email !== req.user.email) {
        const existing = await User.findByEmail(email);
        if (existing) {
          return res.status(409).json({
            error: 'Conflict',
            message: 'Email already in use',
          });
        }
      }

      const updatedUser = await User.updateProfile(req.user.id, {
        full_name,
        email,
      });

      if (!updatedUser) {
        return res.status(404).json({
          error: 'Not Found',
          message: 'User not found',
        });
      }

      res.json({
        message: 'Profile updated successfully',
        user: {
          id: updatedUser.id,
          email: updatedUser.email,
          full_name: updatedUser.full_name,
          role: updatedUser.role,
          updated_at: updatedUser.updated_at,
        },
      });
    } catch (error) {
      console.error('Update profile error:', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to update profile',
      });
    }
  }

  /**
   * Change password
   * PUT /api/users/change-password
   */
  static async changePassword(req, res) {
    try {
      const { current_password, new_password } = req.body;

      // Get user with password hash
      const user = await User.findByEmail(req.user.email);
      if (!user) {
        return res.status(404).json({
          error: 'Not Found',
          message: 'User not found',
        });
      }

      // Verify current password
      const isValidPassword = await bcrypt.compare(current_password, user.password_hash);
      if (!isValidPassword) {
        return res.status(400).json({
          error: 'Bad Request',
          message: 'Current password is incorrect',
        });
      }

      // Check if new password is different
      const isSamePassword = await bcrypt.compare(new_password, user.password_hash);
      if (isSamePassword) {
        return res.status(400).json({
          error: 'Bad Request',
          message: 'New password must be different from current password',
        });
      }

      // Hash and update password
      const password_hash = await bcrypt.hash(new_password, SALT_ROUNDS);
      await User.updatePassword(user.id, password_hash);

      // Revoke all refresh tokens (force re-login on other devices)
      await RefreshToken.revokeAllForUser(user.id);

      // Blacklist current access token
      if (req.token) {
        TokenService.blacklistToken(req.token);
      }

      // Generate new tokens
      const tokens = TokenService.generateTokenPair(user);

      res.json({
        message: 'Password changed successfully. All other sessions have been revoked.',
        ...tokens,
      });
    } catch (error) {
      console.error('Change password error:', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to change password',
      });
    }
  }

  /**
   * Delete (deactivate) account
   * DELETE /api/users/account
   */
  static async deleteAccount(req, res) {
    try {
      const { password } = req.body;

      // Verify password before deletion
      const user = await User.findByEmail(req.user.email);
      if (!user) {
        return res.status(404).json({
          error: 'Not Found',
          message: 'User not found',
        });
      }

      const isValidPassword = await bcrypt.compare(password, user.password_hash);
      if (!isValidPassword) {
        return res.status(400).json({
          error: 'Bad Request',
          message: 'Incorrect password',
        });
      }

      // Deactivate account (soft delete)
      await User.deactivate(user.id);

      // Revoke all refresh tokens
      await RefreshToken.revokeAllForUser(user.id);

      // Blacklist current token
      if (req.token) {
        TokenService.blacklistToken(req.token);
      }

      res.json({
        message: 'Account deactivated successfully',
      });
    } catch (error) {
      console.error('Delete account error:', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to delete account',
      });
    }
  }
}

module.exports = UserController;
