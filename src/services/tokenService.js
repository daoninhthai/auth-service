const jwt = require('jsonwebtoken');
const jwtConfig = require('../config/jwt');

// In-memory blacklist for revoked tokens
// In production, use Redis for this
const tokenBlacklist = new Set();

class TokenService {
  /**
   * Generate access token (short-lived, 15 minutes)
   * @param {Object} payload - { id, email, role }
   * @returns {string} JWT access token
   */
  static generateAccessToken(payload) {
    return jwt.sign(
      {
        id: payload.id,
        email: payload.email,
        role: payload.role,
        type: 'access',
      },
      jwtConfig.accessToken.secret,
      {
        expiresIn: jwtConfig.accessToken.expiresIn,
        issuer: jwtConfig.issuer,
        audience: jwtConfig.audience,
      }
    );
  }

  /**
   * Generate refresh token (long-lived, 7 days)
   * @param {Object} payload - { id, email }
   * @returns {string} JWT refresh token
   */
  static generateRefreshToken(payload) {
    return jwt.sign(
      {
        id: payload.id,
        email: payload.email,
        type: 'refresh',
      },
      jwtConfig.refreshToken.secret,
      {
        expiresIn: jwtConfig.refreshToken.expiresIn,
        issuer: jwtConfig.issuer,
        audience: jwtConfig.audience,
      }
    );
  }

  /**
   * Verify access token
   * @param {string} token
   * @returns {Object} Decoded token payload
   */
  static verifyAccessToken(token) {
    if (tokenBlacklist.has(token)) {
      throw new Error('Token has been revoked');
    }

    return jwt.verify(token, jwtConfig.accessToken.secret, {
      issuer: jwtConfig.issuer,
      audience: jwtConfig.audience,
    });
  }

  /**
   * Verify refresh token
   * @param {string} token
   * @returns {Object} Decoded token payload
   */
  static verifyRefreshToken(token) {
    if (tokenBlacklist.has(token)) {
      throw new Error('Token has been revoked');
    }

    return jwt.verify(token, jwtConfig.refreshToken.secret, {
      issuer: jwtConfig.issuer,
      audience: jwtConfig.audience,
    });
  }

  /**
   * Add token to blacklist
   * @param {string} token
   */
  static blacklistToken(token) {
    tokenBlacklist.add(token);

    // Auto-remove from blacklist after token would expire
    // This prevents memory leak from accumulating revoked tokens
    try {
      const decoded = jwt.decode(token);
      if (decoded && decoded.exp) {
        const ttl = (decoded.exp * 1000) - Date.now();
        if (ttl > 0) {
          setTimeout(() => {
            tokenBlacklist.delete(token);
          }, ttl);
        } else {
          tokenBlacklist.delete(token);
        }
      }
    } catch (error) {
      // If we can't decode, keep in blacklist for 24h
      setTimeout(() => {
        tokenBlacklist.delete(token);
      }, 24 * 60 * 60 * 1000);
    }
  }

  /**
   * Check if token is blacklisted
   * @param {string} token
   * @returns {boolean}
   */
  static isBlacklisted(token) {
    return tokenBlacklist.has(token);
  }

  /**
   * Generate token pair (access + refresh)
   * @param {Object} user - { id, email, role }
   * @returns {Object} { accessToken, refreshToken }
   */
  static generateTokenPair(user) {
    const accessToken = this.generateAccessToken(user);
    const refreshToken = this.generateRefreshToken(user);
    return { accessToken, refreshToken };
  }
}

module.exports = TokenService;
