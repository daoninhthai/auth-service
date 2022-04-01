const ApiKey = require('../models/ApiKey');

/**
 * API Key authentication middleware
 * Authenticates requests using the X-API-Key header
 * Can be used as an alternative to JWT authentication
 */
const apiKeyAuth = async (req, res, next) => {
  try {
    const apiKey = req.headers['x-api-key'];

    if (!apiKey) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'API key is required. Provide it via X-API-Key header.',
      });
    }

    // Validate key format
    if (!apiKey.startsWith('ask_')) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid API key format',
      });
    }

    // Look up the key
    const keyRecord = await ApiKey.findByKey(apiKey);

    if (!keyRecord) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid API key',
      });
    }

    // Check if revoked
    if (keyRecord.revoked) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'API key has been revoked',
      });
    }

    // Check if expired
    if (keyRecord.expires_at && new Date(keyRecord.expires_at) < new Date()) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'API key has expired',
      });
    }

    // Check if user is active
    if (!keyRecord.is_active) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'User account is deactivated',
      });
    }

    // Attach user info to request
    req.user = {
      id: keyRecord.user_id,
      email: keyRecord.email,
      role: keyRecord.role,
    };
    req.apiKey = {
      id: keyRecord.id,
      name: keyRecord.name,
      scopes: keyRecord.scopes,
    };

    next();
  } catch (error) {
    console.error('API key auth error:', error);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'API key authentication failed',
    });
  }
};

/**
 * Combined auth middleware - accepts either JWT or API key
 */
const combinedAuth = async (req, res, next) => {
  const hasJWT = req.headers.authorization && req.headers.authorization.startsWith('Bearer ');
  const hasApiKey = req.headers['x-api-key'];

  if (hasJWT) {
    // Use JWT auth
    const { verifyToken } = require('./auth');
    return verifyToken(req, res, next);
  }

  if (hasApiKey) {
    // Use API key auth
    return apiKeyAuth(req, res, next);
  }

  return res.status(401).json({
    error: 'Unauthorized',
    message: 'Authentication required. Provide a Bearer token or X-API-Key header.',
  });
};

module.exports = {
  apiKeyAuth,
  combinedAuth,
};
