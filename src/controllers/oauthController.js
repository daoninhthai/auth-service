const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const User = require('../models/User');
const OAuthProvider = require('../models/OAuthProvider');
const TokenService = require('../services/tokenService');
const RefreshToken = require('../models/RefreshToken');

class OAuthController {
  /**
   * Handle Google OAuth callback
   * GET /api/oauth/google/callback
   */
  static async handleGoogleCallback(req, res) {
    try {
      const oauthData = req.user;

      if (!oauthData) {
        return res.status(401).json({
          error: 'Unauthorized',
          message: 'OAuth authentication failed',
        });
      }

      // Check if this Google account is already linked
      let existingOAuth = await OAuthProvider.findByProvider('google', oauthData.provider_id);

      let user;

      if (existingOAuth) {
        // Existing OAuth user - login
        user = {
          id: existingOAuth.user_id,
          email: existingOAuth.email,
          full_name: existingOAuth.full_name,
          role: existingOAuth.role,
        };

        // Update OAuth tokens
        await OAuthProvider.link({
          user_id: user.id,
          provider: 'google',
          provider_id: oauthData.provider_id,
          access_token: oauthData.access_token,
          profile: oauthData.profile,
        });
      } else {
        // Check if user with this email exists
        let existingUser = null;
        if (oauthData.email) {
          existingUser = await User.findByEmail(oauthData.email);
        }

        if (existingUser) {
          // Link Google to existing account
          user = existingUser;
          await OAuthProvider.link({
            user_id: user.id,
            provider: 'google',
            provider_id: oauthData.provider_id,
            access_token: oauthData.access_token,
            profile: oauthData.profile,
          });
        } else {
          // Create new user
          const randomPassword = crypto.randomBytes(32).toString('hex');
          const password_hash = await bcrypt.hash(randomPassword, 12);

          user = await User.create({
            email: oauthData.email,
            password_hash,
            full_name: oauthData.full_name,
          });

          // Mark email as verified (Google verified it)
          await User.verifyEmail(user.id);

          // Link OAuth provider
          await OAuthProvider.link({
            user_id: user.id,
            provider: 'google',
            provider_id: oauthData.provider_id,
            access_token: oauthData.access_token,
            profile: oauthData.profile,
          });
        }
      }

      // Generate tokens
      const tokens = TokenService.generateTokenPair(user);

      // Store refresh token
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      await RefreshToken.create({
        user_id: user.id,
        token: tokens.refreshToken,
        expires_at: expiresAt,
      });

      // Redirect with tokens (or return JSON)
      const redirectUrl = process.env.OAUTH_REDIRECT_URL || '/';
      res.redirect(
        `${redirectUrl}?accessToken=${tokens.accessToken}&refreshToken=${tokens.refreshToken}`
      );
    } catch (error) {
      console.error('Google OAuth callback error:', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'OAuth authentication failed',
      });
    }
  }

  /**
   * Handle GitHub OAuth callback
   * GET /api/oauth/github/callback
   */
  static async handleGithubCallback(req, res) {
    try {
      const oauthData = req.user;

      if (!oauthData) {
        return res.status(401).json({
          error: 'Unauthorized',
          message: 'GitHub OAuth authentication failed',
        });
      }

      // Check if this GitHub account is already linked
      let existingOAuth = await OAuthProvider.findByProvider('github', oauthData.provider_id);

      let user;

      if (existingOAuth) {
        user = {
          id: existingOAuth.user_id,
          email: existingOAuth.email,
          full_name: existingOAuth.full_name,
          role: existingOAuth.role,
        };

        await OAuthProvider.link({
          user_id: user.id,
          provider: 'github',
          provider_id: oauthData.provider_id,
          access_token: oauthData.access_token,
          profile: oauthData.profile,
        });
      } else {
        let existingUser = null;
        if (oauthData.email) {
          existingUser = await User.findByEmail(oauthData.email);
        }

        if (existingUser) {
          user = existingUser;
          await OAuthProvider.link({
            user_id: user.id,
            provider: 'github',
            provider_id: oauthData.provider_id,
            access_token: oauthData.access_token,
            profile: oauthData.profile,
          });
        } else {
          const randomPassword = crypto.randomBytes(32).toString('hex');
          const password_hash = await bcrypt.hash(randomPassword, 12);

          user = await User.create({
            email: oauthData.email,
            password_hash,
            full_name: oauthData.full_name,
          });

          await User.verifyEmail(user.id);

          await OAuthProvider.link({
            user_id: user.id,
            provider: 'github',
            provider_id: oauthData.provider_id,
            access_token: oauthData.access_token,
            profile: oauthData.profile,
          });
        }
      }

      const tokens = TokenService.generateTokenPair(user);

      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      await RefreshToken.create({
        user_id: user.id,
        token: tokens.refreshToken,
        expires_at: expiresAt,
      });

      const redirectUrl = process.env.OAUTH_REDIRECT_URL || '/';
      res.redirect(
        `${redirectUrl}?accessToken=${tokens.accessToken}&refreshToken=${tokens.refreshToken}`
      );
    } catch (error) {
      console.error('GitHub OAuth callback error:', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'GitHub OAuth authentication failed',
      });
    }
  }

  /**
   * Link OAuth provider to existing account
   * POST /api/oauth/link
   */
  static async linkAccount(req, res) {
    try {
      const { provider, provider_id, access_token, profile } = req.body;
      const userId = req.user.id;

      // Check if this provider account is already linked to another user
      const existing = await OAuthProvider.findByProvider(provider, provider_id);
      if (existing && existing.user_id !== userId) {
        return res.status(409).json({
          error: 'Conflict',
          message: 'This OAuth account is already linked to another user',
        });
      }

      await OAuthProvider.link({
        user_id: userId,
        provider,
        provider_id,
        access_token,
        profile,
      });

      res.json({
        message: `${provider} account linked successfully`,
      });
    } catch (error) {
      console.error('Link account error:', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to link account',
      });
    }
  }

  /**
   * Unlink OAuth provider from account
   * DELETE /api/oauth/unlink/:provider
   */
  static async unlinkAccount(req, res) {
    try {
      const { provider } = req.params;
      const userId = req.user.id;

      const unlinked = await OAuthProvider.unlink(userId, provider);
      if (!unlinked) {
        return res.status(404).json({
          error: 'Not Found',
          message: `No ${provider} account linked`,
        });
      }

      res.json({
        message: `${provider} account unlinked successfully`,
      });
    } catch (error) {
      console.error('Unlink account error:', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to unlink account',
      });
    }
  }

  /**
   * Get linked OAuth providers for current user
   * GET /api/oauth/providers
   */
  static async getLinkedProviders(req, res) {
    try {
      const providers = await OAuthProvider.findByUserId(req.user.id);
      res.json({
        providers: providers.map(p => ({
          provider: p.provider,
          linked_at: p.created_at,
        })),
      });
    } catch (error) {
      console.error('Get providers error:', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to get linked providers',
      });
    }
  }
}

module.exports = OAuthController;
