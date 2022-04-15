const AuditLog = require('../models/AuditLog');

// Define audit action constants
const AUDIT_ACTIONS = {
  // Auth actions
  USER_REGISTER: 'user.register',
  USER_LOGIN: 'user.login',
  USER_LOGIN_FAILED: 'user.login_failed',
  USER_LOGOUT: 'user.logout',
  TOKEN_REFRESH: 'token.refresh',

  // Password actions
  PASSWORD_CHANGE: 'password.change',
  PASSWORD_RESET_REQUEST: 'password.reset_request',
  PASSWORD_RESET_COMPLETE: 'password.reset_complete',

  // Profile actions
  PROFILE_UPDATE: 'profile.update',
  ACCOUNT_DEACTIVATE: 'account.deactivate',
  EMAIL_VERIFY: 'email.verify',

  // OAuth actions
  OAUTH_LOGIN: 'oauth.login',
  OAUTH_LINK: 'oauth.link',
  OAUTH_UNLINK: 'oauth.unlink',

  // 2FA actions
  TWO_FACTOR_ENABLE: '2fa.enable',
  TWO_FACTOR_DISABLE: '2fa.disable',
  TWO_FACTOR_VERIFY: '2fa.verify',

  // API key actions
  API_KEY_CREATE: 'api_key.create',
  API_KEY_REVOKE: 'api_key.revoke',
  API_KEY_DELETE: 'api_key.delete',

  // Admin actions
  ADMIN_USER_ROLE_UPDATE: 'admin.user_role_update',
  ADMIN_USER_BAN: 'admin.user_ban',
  ADMIN_USER_UNBAN: 'admin.user_unban',

  // Session actions
  SESSION_REVOKE: 'session.revoke',
  SESSION_REVOKE_ALL: 'session.revoke_all',
};

class AuditService {
  /**
   * Log an audit action
   * @param {Object} params
   * @param {number} params.userId - User performing the action
   * @param {string} params.action - Action type (from AUDIT_ACTIONS)
   * @param {string} params.resource - Resource being acted upon
   * @param {string} params.ip - IP address
   * @param {string} params.userAgent - User agent string
   * @param {Object} params.metadata - Additional metadata
   * @param {string} params.status - 'success' or 'failure'
   */
  static async log({ userId, action, resource, ip, userAgent, metadata = {}, status = 'success' }) {
    try {
      await AuditLog.create({
        user_id: userId,
        action,
        resource,
        ip_address: ip,
        user_agent: userAgent,
        metadata,
        status,
      });
    } catch (error) {
      // Don't let audit logging failures break the application
      console.error('Audit log error:', error.message);
    }
  }

  /**
   * Extract request info for audit logging
   * @param {Object} req - Express request object
   * @returns {Object} { ip, userAgent, userId }
   */
  static extractRequestInfo(req) {
    return {
      ip: req.ip || req.connection.remoteAddress || 'unknown',
      userAgent: req.headers['user-agent'] || 'unknown',
      userId: req.user ? req.user.id : null,
    };
  }
}

module.exports = {
  AuditService,
  AUDIT_ACTIONS,
};
