const bcrypt = require('bcryptjs');
const User = require('../models/User');
const RefreshToken = require('../models/RefreshToken');
const TokenService = require('../services/tokenService');

const SALT_ROUNDS = 12;

class AuthController {
  /**
   * Register a new user
   * POST /api/auth/register
   */
  static async register(req, res) {
    try {
      const { email, password, full_name } = req.body;

      // Check if user already exists
      const existingUser = await User.findByEmail(email);
      if (existingUser) {
        return res.status(409).json({
          error: 'Conflict',
          message: 'Email already registered',
        });
      }

      // Hash password
      const password_hash = await bcrypt.hash(password, SALT_ROUNDS);

      // Create user
      const user = await User.create({
        email,
        password_hash,
        full_name,
      });

      // Generate tokens
      const tokens = TokenService.generateTokenPair(user);

      // Store refresh token in database
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
      await RefreshToken.create({
        user_id: user.id,
        token: tokens.refreshToken,
        expires_at: expiresAt,
      });

      res.status(201).json({
        message: 'User registered successfully',
        user: {
          id: user.id,
          email: user.email,
          full_name: user.full_name,
          role: user.role,
        },
        ...tokens,
      });
    } catch (error) {
      console.error('Register error:', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to register user',
      });
    }
  }

  /**
   * Login user
   * POST /api/auth/login
   */
  static async login(req, res) {
    try {
      const { email, password } = req.body;

      // Find user by email (includes password_hash)
      const user = await User.findByEmail(email);
      if (!user) {
        return res.status(401).json({
          error: 'Unauthorized',
          message: 'Invalid email or password',
        });
      }

      // Check if account is active
      if (!user.is_active) {
        return res.status(403).json({
          error: 'Forbidden',
          message: 'Account has been deactivated',
        });
      }

      // Verify password
      const isValidPassword = await bcrypt.compare(password, user.password_hash);
      if (!isValidPassword) {
        return res.status(401).json({
          error: 'Unauthorized',
          message: 'Invalid email or password',
        });
      }

      // Generate tokens
      const tokens = TokenService.generateTokenPair(user);

      // Store refresh token in database
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
      await RefreshToken.create({
        user_id: user.id,
        token: tokens.refreshToken,
        expires_at: expiresAt,
      });

      res.json({
        message: 'Login successful',
        user: {
          id: user.id,
          email: user.email,
          full_name: user.full_name,
          role: user.role,
        },
        ...tokens,
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to login',
      });
    }
  }

  /**
   * Refresh token - rotate old refresh token and issue new pair
   * POST /api/auth/refresh-token
   */
  static async refreshToken(req, res) {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        return res.status(400).json({
          error: 'Bad Request',
          message: 'Refresh token is required',
        });
      }

      // Verify the refresh token JWT
      let decoded;
      try {
        decoded = TokenService.verifyRefreshToken(refreshToken);
      } catch (error) {
        return res.status(401).json({
          error: 'Unauthorized',
          message: 'Invalid or expired refresh token',
        });
      }

      // Check if token exists in database and is not revoked
      const storedToken = await RefreshToken.findByToken(refreshToken);
      if (!storedToken) {
        return res.status(401).json({
          error: 'Unauthorized',
          message: 'Refresh token not found',
        });
      }

      if (storedToken.revoked) {
        // Possible token reuse attack - revoke all tokens for this user
        await RefreshToken.revokeAllForUser(storedToken.user_id);
        return res.status(401).json({
          error: 'Unauthorized',
          message: 'Token reuse detected. All sessions have been revoked.',
        });
      }

      if (new Date(storedToken.expires_at) < new Date()) {
        return res.status(401).json({
          error: 'Unauthorized',
          message: 'Refresh token has expired',
        });
      }

      // Revoke the old refresh token (rotation)
      await RefreshToken.revoke(refreshToken);

      // Get user data
      const user = await User.findById(decoded.id);
      if (!user || !user.is_active) {
        return res.status(401).json({
          error: 'Unauthorized',
          message: 'User not found or deactivated',
        });
      }

      // Generate new token pair
      const tokens = TokenService.generateTokenPair(user);

      // Store new refresh token
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      await RefreshToken.create({
        user_id: user.id,
        token: tokens.refreshToken,
        expires_at: expiresAt,
      });

      res.json({
        message: 'Tokens refreshed successfully',
        ...tokens,
      });
    } catch (error) {
      console.error('Refresh token error:', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to refresh token',
      });
    }
  }

  /**
   * Logout user (blacklist token)
   * POST /api/auth/logout
   */
  static async logout(req, res) {
    try {
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.split(' ')[1];
        TokenService.blacklistToken(token);
      }

      res.json({
        message: 'Logged out successfully',
      });
    } catch (error) {
      console.error('Logout error:', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to logout',
      });
    }
  }
}

module.exports = AuthController;
