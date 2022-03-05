const SessionService = require('../services/sessionService');

class SessionController {
  /**
   * Get all active sessions for current user
   * GET /api/sessions
   */
  static async getSessions(req, res) {
    try {
      const sessions = await SessionService.getUserSessions(req.user.id);

      res.json({
        sessions: sessions.map(session => ({
          id: session.id,
          ip: session.ip,
          device: session.device,
          userAgent: session.userAgent,
          createdAt: session.createdAt,
          lastActivity: session.lastActivity,
          isCurrent: session.id === req.sessionId,
        })),
        total: sessions.length,
      });
    } catch (error) {
      console.error('Get sessions error:', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to get sessions',
      });
    }
  }

  /**
   * Revoke a specific session
   * DELETE /api/sessions/:id
   */
  static async revokeSession(req, res) {
    try {
      const { id } = req.params;

      await SessionService.destroySession(id, req.user.id);

      res.json({
        message: 'Session revoked successfully',
      });
    } catch (error) {
      console.error('Revoke session error:', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to revoke session',
      });
    }
  }

  /**
   * Revoke all sessions except current
   * DELETE /api/sessions
   */
  static async revokeAllSessions(req, res) {
    try {
      const count = await SessionService.destroyAllUserSessions(req.user.id);

      res.json({
        message: 'All sessions revoked successfully',
        revoked_count: count,
      });
    } catch (error) {
      console.error('Revoke all sessions error:', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to revoke sessions',
      });
    }
  }
}

module.exports = SessionController;
