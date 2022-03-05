const { redis } = require('../config/redis');
const crypto = require('crypto');

const SESSION_PREFIX = 'session:';
const USER_SESSIONS_PREFIX = 'user_sessions:';
const DEFAULT_TTL = 7 * 24 * 60 * 60; // 7 days in seconds

class SessionService {
  /**
   * Create a new session
   * @param {number} userId
   * @param {Object} metadata - { ip, userAgent, device }
   * @returns {Object} { sessionId, session }
   */
  static async createSession(userId, metadata = {}) {
    const sessionId = crypto.randomBytes(32).toString('hex');
    const session = {
      id: sessionId,
      userId,
      ip: metadata.ip || 'unknown',
      userAgent: metadata.userAgent || 'unknown',
      device: metadata.device || this.parseDevice(metadata.userAgent),
      createdAt: new Date().toISOString(),
      lastActivity: new Date().toISOString(),
    };

    const sessionKey = `${SESSION_PREFIX}${sessionId}`;
    const userSessionsKey = `${USER_SESSIONS_PREFIX}${userId}`;

    // Store session data
    await redis.setex(sessionKey, DEFAULT_TTL, JSON.stringify(session));

    // Add session ID to user's session set
    await redis.sadd(userSessionsKey, sessionId);
    await redis.expire(userSessionsKey, DEFAULT_TTL);

    return { sessionId, session };
  }

  /**
   * Get session by ID
   * @param {string} sessionId
   * @returns {Object|null} Session data or null
   */
  static async getSession(sessionId) {
    const sessionKey = `${SESSION_PREFIX}${sessionId}`;
    const data = await redis.get(sessionKey);

    if (!data) return null;

    // Update last activity
    const session = JSON.parse(data);
    session.lastActivity = new Date().toISOString();
    await redis.setex(sessionKey, DEFAULT_TTL, JSON.stringify(session));

    return session;
  }

  /**
   * Destroy a specific session
   * @param {string} sessionId
   * @param {number} userId
   * @returns {boolean}
   */
  static async destroySession(sessionId, userId) {
    const sessionKey = `${SESSION_PREFIX}${sessionId}`;
    const userSessionsKey = `${USER_SESSIONS_PREFIX}${userId}`;

    await redis.del(sessionKey);
    await redis.srem(userSessionsKey, sessionId);

    return true;
  }

  /**
   * Get all sessions for a user
   * @param {number} userId
   * @returns {Array} List of sessions
   */
  static async getUserSessions(userId) {
    const userSessionsKey = `${USER_SESSIONS_PREFIX}${userId}`;
    const sessionIds = await redis.smembers(userSessionsKey);

    if (sessionIds.length === 0) return [];

    const sessions = [];
    for (const sessionId of sessionIds) {
      const sessionKey = `${SESSION_PREFIX}${sessionId}`;
      const data = await redis.get(sessionKey);

      if (data) {
        sessions.push(JSON.parse(data));
      } else {
        // Clean up stale session ID
        await redis.srem(userSessionsKey, sessionId);
      }
    }

    // Sort by last activity (most recent first)
    sessions.sort((a, b) => new Date(b.lastActivity) - new Date(a.lastActivity));

    return sessions;
  }

  /**
   * Destroy all sessions for a user
   * @param {number} userId
   * @returns {number} Number of destroyed sessions
   */
  static async destroyAllUserSessions(userId) {
    const userSessionsKey = `${USER_SESSIONS_PREFIX}${userId}`;
    const sessionIds = await redis.smembers(userSessionsKey);

    if (sessionIds.length === 0) return 0;

    // Delete all session data
    const pipeline = redis.pipeline();
    for (const sessionId of sessionIds) {
      pipeline.del(`${SESSION_PREFIX}${sessionId}`);
    }
    pipeline.del(userSessionsKey);
    await pipeline.exec();

    return sessionIds.length;
  }

  /**
   * Parse device info from user agent string
   * @param {string} userAgent
   * @returns {string} Device description
   */
  static parseDevice(userAgent) {
    if (!userAgent) return 'Unknown';

    if (userAgent.includes('Mobile')) return 'Mobile';
    if (userAgent.includes('Tablet')) return 'Tablet';
    if (userAgent.includes('Windows')) return 'Windows Desktop';
    if (userAgent.includes('Macintosh')) return 'Mac Desktop';
    if (userAgent.includes('Linux')) return 'Linux Desktop';

    return 'Desktop';
  }
}

module.exports = SessionService;
