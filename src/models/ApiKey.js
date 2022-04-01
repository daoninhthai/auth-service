const crypto = require('crypto');
const { query } = require('../config/database');

class ApiKey {
  /**
   * Generate a new API key
   * @returns {Object} { key, keyHash, keyPrefix }
   */
  static generateKey() {
    const rawKey = crypto.randomBytes(32).toString('hex');
    const key = `ask_${rawKey}`; // auth-service-key prefix
    const keyHash = crypto.createHash('sha256').update(key).digest('hex');
    const keyPrefix = key.substring(0, 10);

    return { key, keyHash, keyPrefix };
  }

  /**
   * Create a new API key for a user
   * @param {Object} data - { user_id, name, scopes, expires_at }
   * @returns {Object} { apiKey (full key), record }
   */
  static async create({ user_id, name, scopes = [], expires_at = null }) {
    const { key, keyHash, keyPrefix } = this.generateKey();

    const sql = `
      INSERT INTO api_keys (user_id, name, key_hash, key_prefix, scopes, expires_at)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id, user_id, name, key_prefix, scopes, expires_at, created_at
    `;
    const { rows } = await query(sql, [user_id, name, keyHash, keyPrefix, scopes, expires_at]);

    return {
      apiKey: key, // Only returned once during creation
      record: rows[0],
    };
  }

  /**
   * Find API key by the full key string
   * @param {string} key - Full API key
   * @returns {Object|null}
   */
  static async findByKey(key) {
    const keyHash = crypto.createHash('sha256').update(key).digest('hex');

    const sql = `
      SELECT ak.id, ak.user_id, ak.name, ak.key_prefix, ak.scopes,
             ak.last_used, ak.expires_at, ak.revoked, ak.created_at,
             u.email, u.role, u.is_active
      FROM api_keys ak
      JOIN users u ON u.id = ak.user_id
      WHERE ak.key_hash = $1
    `;
    const { rows } = await query(sql, [keyHash]);

    if (rows.length === 0) return null;

    // Update last_used timestamp
    await query(
      'UPDATE api_keys SET last_used = CURRENT_TIMESTAMP WHERE key_hash = $1',
      [keyHash]
    );

    return rows[0];
  }

  /**
   * Revoke an API key
   * @param {number} keyId
   * @param {number} userId - For ownership verification
   * @returns {Object|null}
   */
  static async revoke(keyId, userId) {
    const sql = `
      UPDATE api_keys
      SET revoked = true, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1 AND user_id = $2
      RETURNING id, name, key_prefix, revoked
    `;
    const { rows } = await query(sql, [keyId, userId]);
    return rows[0] || null;
  }

  /**
   * List all API keys for a user
   * @param {number} userId
   * @returns {Array}
   */
  static async listByUser(userId) {
    const sql = `
      SELECT id, name, key_prefix, scopes, last_used, expires_at, revoked, created_at
      FROM api_keys
      WHERE user_id = $1
      ORDER BY created_at DESC
    `;
    const { rows } = await query(sql, [userId]);
    return rows;
  }

  /**
   * Delete an API key permanently
   * @param {number} keyId
   * @param {number} userId
   * @returns {boolean}
   */
  static async delete(keyId, userId) {
    const sql = 'DELETE FROM api_keys WHERE id = $1 AND user_id = $2 RETURNING id';
    const { rows } = await query(sql, [keyId, userId]);
    return rows.length > 0;
  }
}

module.exports = ApiKey;
