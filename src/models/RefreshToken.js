const { query } = require('../config/database');

class RefreshToken {
  /**
   * Store a new refresh token
   * @param {Object} data - { user_id, token, expires_at }
   * @returns {Object} Created refresh token record
   */
  static async create({ user_id, token, expires_at }) {
    const sql = `
      INSERT INTO refresh_tokens (user_id, token, expires_at)
      VALUES ($1, $2, $3)
      RETURNING id, user_id, token, expires_at, revoked, created_at
    `;
    const { rows } = await query(sql, [user_id, token, expires_at]);
    return rows[0];
  }

  /**
   * Find a refresh token by token string
   * @param {string} token
   * @returns {Object|null} Token record or null
   */
  static async findByToken(token) {
    const sql = `
      SELECT id, user_id, token, expires_at, revoked, created_at
      FROM refresh_tokens
      WHERE token = $1
    `;
    const { rows } = await query(sql, [token]);
    return rows[0] || null;
  }

  /**
   * Revoke a specific refresh token
   * @param {string} token
   * @returns {Object} Revoked token record
   */
  static async revoke(token) {
    const sql = `
      UPDATE refresh_tokens
      SET revoked = true
      WHERE token = $1
      RETURNING id, user_id, revoked
    `;
    const { rows } = await query(sql, [token]);
    return rows[0];
  }

  /**
   * Revoke all refresh tokens for a user
   * @param {number} user_id
   * @returns {number} Number of revoked tokens
   */
  static async revokeAllForUser(user_id) {
    const sql = `
      UPDATE refresh_tokens
      SET revoked = true
      WHERE user_id = $1 AND revoked = false
    `;
    const result = await query(sql, [user_id]);
    return result.rowCount;
  }

  /**
   * Delete expired tokens (cleanup job)
   * @returns {number} Number of deleted tokens
   */
  static async deleteExpired() {
    const sql = `
      DELETE FROM refresh_tokens
      WHERE expires_at < CURRENT_TIMESTAMP OR revoked = true
    `;
    const result = await query(sql);
    return result.rowCount;
  }
}

module.exports = RefreshToken;
