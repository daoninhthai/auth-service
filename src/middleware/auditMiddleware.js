const { AuditService, AUDIT_ACTIONS } = require('../services/auditService');

/**
 * Mapping of route patterns to audit actions
 */
const routeActionMap = {
  'POST /api/auth/register': AUDIT_ACTIONS.USER_REGISTER,
  'POST /api/auth/login': AUDIT_ACTIONS.USER_LOGIN,
  'POST /api/auth/logout': AUDIT_ACTIONS.USER_LOGOUT,
  'POST /api/auth/refresh-token': AUDIT_ACTIONS.TOKEN_REFRESH,
  'POST /api/password/forgot-password': AUDIT_ACTIONS.PASSWORD_RESET_REQUEST,
  'POST /api/password/reset-password': AUDIT_ACTIONS.PASSWORD_RESET_COMPLETE,
  'PUT /api/users/profile': AUDIT_ACTIONS.PROFILE_UPDATE,
  'PUT /api/users/change-password': AUDIT_ACTIONS.PASSWORD_CHANGE,
  'DELETE /api/users/account': AUDIT_ACTIONS.ACCOUNT_DEACTIVATE,
  'POST /api/2fa/verify': AUDIT_ACTIONS.TWO_FACTOR_ENABLE,
  'POST /api/2fa/disable': AUDIT_ACTIONS.TWO_FACTOR_DISABLE,
  'POST /api/api-keys': AUDIT_ACTIONS.API_KEY_CREATE,
};

/**
 * Audit middleware - automatically logs auth-related actions
 * Should be applied after routes execute (uses response finish event)
 */
const auditMiddleware = (req, res, next) => {
  // Store original end function
  const originalEnd = res.end;
  const startTime = Date.now();

  res.end = function (...args) {
    // Restore original end
    res.end = originalEnd;
    res.end(...args);

    // Determine the route key
    const routeKey = `${req.method} ${req.baseUrl}${req.route ? req.route.path : req.path}`;
    const action = routeActionMap[routeKey];

    if (action) {
      const { ip, userAgent, userId } = AuditService.extractRequestInfo(req);
      const status = res.statusCode >= 200 && res.statusCode < 400 ? 'success' : 'failure';

      // Build metadata
      const metadata = {
        method: req.method,
        path: req.originalUrl,
        statusCode: res.statusCode,
        duration: Date.now() - startTime,
      };

      // Add email for auth actions (but not password)
      if (req.body && req.body.email) {
        metadata.email = req.body.email;
      }

      // Log asynchronously (don't block response)
      AuditService.log({
        userId,
        action,
        resource: req.originalUrl,
        ip,
        userAgent,
        metadata,
        status,
      }).catch(err => {
        console.error('Audit middleware error:', err.message);
      });
    }
  };

  next();
};

/**
 * Manual audit log helper for use in controllers
 * @param {Object} req - Express request
 * @param {string} action - Audit action
 * @param {Object} metadata - Additional metadata
 * @param {string} status - 'success' or 'failure'
 */
const logAudit = async (req, action, metadata = {}, status = 'success') => {
  const { ip, userAgent, userId } = AuditService.extractRequestInfo(req);

  await AuditService.log({
    userId,
    action,
    resource: req.originalUrl,
    ip,
    userAgent,
    metadata,
    status,
  });
};

module.exports = {
  auditMiddleware,
  logAudit,
};
