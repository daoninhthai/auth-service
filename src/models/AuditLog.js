const { query } = require('../config/database');

class AuditLog {
  /**
   * Create a new audit log entry
   * @param {Object} data - { user_id, action, resource, ip_address, user_agent, metadata, status }
   * @returns {Object} Created audit log
   */
  static async create({ user_id, action, resource, ip_address, user_agent, metadata = {}, status = 'success' }) {
    const sql = `
      INSERT INTO audit_logs (user_id, action, resource, ip_address, user_agent, metadata, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id, user_id, action, resource, ip_address, status, created_at
    `;
    const { rows } = await query(sql, [
      user_id,
      action,
      resource,
      ip_address,
      user_agent,
      JSON.stringify(metadata),
      status,
    ]);
    return rows[0];
  }

  /**
   * Find audit logs by user ID
   * @param {number} userId
   * @param {Object} options - { limit, offset }
   * @returns {Array}
   */
  static async findByUser(userId, { limit = 50, offset = 0 } = {}) {
    const sql = `
      SELECT id, user_id, action, resource, ip_address, user_agent, metadata, status, created_at
      FROM audit_logs
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT $2 OFFSET $3
    `;
    const { rows } = await query(sql, [userId, limit, offset]);
    return rows;
  }

  /**
   * Find audit logs by action
   * @param {string} action
   * @param {Object} options - { limit, offset }
   * @returns {Array}
   */
  static async findByAction(action, { limit = 50, offset = 0 } = {}) {
    const sql = `
      SELECT al.id, al.user_id, al.action, al.resource, al.ip_address,
             al.user_agent, al.metadata, al.status, al.created_at,
             u.email, u.full_name
      FROM audit_logs al
      LEFT JOIN users u ON u.id = al.user_id
      WHERE al.action = $1
      ORDER BY al.created_at DESC
      LIMIT $2 OFFSET $3
    `;
    const { rows } = await query(sql, [action, limit, offset]);
    return rows;
  }

  /**
   * Find audit logs by date range
   * @param {Date} startDate
   * @param {Date} endDate
   * @param {Object} options - { limit, offset }
   * @returns {Array}
   */
  static async findByDateRange(startDate, endDate, { limit = 100, offset = 0 } = {}) {
    const sql = `
      SELECT al.id, al.user_id, al.action, al.resource, al.ip_address,
             al.metadata, al.status, al.created_at,
             u.email, u.full_name
      FROM audit_logs al
      LEFT JOIN users u ON u.id = al.user_id
      WHERE al.created_at BETWEEN $1 AND $2
      ORDER BY al.created_at DESC
      LIMIT $3 OFFSET $4
    `;
    const { rows } = await query(sql, [startDate, endDate, limit, offset]);
    return rows;
  }

  /**
   * Get audit log statistics
   * @param {number} days - Number of days to look back
   * @returns {Object} Statistics
   */
  static async getStats(days = 30) {
    const sql = `
      SELECT
        action,
        status,
        COUNT(*) as count
      FROM audit_logs
      WHERE created_at > CURRENT_TIMESTAMP - $1 * INTERVAL '1 day'
      GROUP BY action, status
      ORDER BY count DESC
    `;
    const { rows } = await query(sql, [days]);
    return rows;
  }
}

module.exports = AuditLog;
