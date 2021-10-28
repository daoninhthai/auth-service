const TokenService = require('../services/tokenService');

/**
 * Middleware to verify JWT access token
 * Extracts Bearer token from Authorization header
 * Checks blacklist, decodes token, and attaches user to request
 */
const verifyToken = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Access token is required',
      });
    }

    if (!authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid token format. Use: Bearer <token>',
      });
    }

    const token = authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Token not provided',
      });
    }

    // Check if token is blacklisted
    if (TokenService.isBlacklisted(token)) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Token has been revoked',
      });
    }

    // Verify and decode token
    const decoded = TokenService.verifyAccessToken(token);

    // Attach user info to request
    req.user = {
      id: decoded.id,
      email: decoded.email,
      role: decoded.role,
    };
    req.token = token;

    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Token has expired',
      });
    }

    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid token',
      });
    }

    console.error('Token verification error:', error);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Token verification failed',
    });
  }
};

/**
 * Optional auth middleware - doesn't fail if no token
 * Attaches user to request if valid token is provided
 */
const optionalAuth = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next();
    }

    const token = authHeader.split(' ')[1];
    if (!token || TokenService.isBlacklisted(token)) {
      return next();
    }

    const decoded = TokenService.verifyAccessToken(token);
    req.user = {
      id: decoded.id,
      email: decoded.email,
      role: decoded.role,
    };
    req.token = token;
  } catch (error) {
    // Silently continue without user
  }

  next();
};

module.exports = {
  verifyToken,
  optionalAuth,
};
