const { query } = require('../config/database');

class OAuthProvider {
  /**
   * Link OAuth provider to user
   * @param {Object} data - { user_id, provider, provider_id, access_token, profile }
   * @returns {Object} Created record
   */
  static async link({ user_id, provider, provider_id, access_token, profile }) {
    const sql = `
      INSERT INTO oauth_providers (user_id, provider, provider_id, access_token, profile_data)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (provider, provider_id) DO UPDATE
      SET access_token = $4, profile_data = $5, updated_at = CURRENT_TIMESTAMP
      RETURNING id, user_id, provider, provider_id, created_at
    `;
    const { rows } = await query(sql, [
      user_id,
      provider,
      provider_id,
      access_token,
      JSON.stringify(profile),
    ]);
    return rows[0];
  }

  /**
   * Find user by OAuth provider
   * @param {string} provider - Provider name (google, github)
   * @param {string} provider_id - Provider user ID
   * @returns {Object|null}
   */
  static async findByProvider(provider, provider_id) {
    const sql = `
      SELECT op.id, op.user_id, op.provider, op.provider_id, op.profile_data,
             u.email, u.full_name, u.role, u.is_active
      FROM oauth_providers op
      JOIN users u ON u.id = op.user_id
      WHERE op.provider = $1 AND op.provider_id = $2
    `;
    const { rows } = await query(sql, [provider, provider_id]);
    return rows[0] || null;
  }

  /**
   * Find all OAuth providers for a user
   * @param {number} user_id
   * @returns {Array}
   */
  static async findByUserId(user_id) {
    const sql = `
      SELECT id, provider, provider_id, created_at, updated_at
      FROM oauth_providers
      WHERE user_id = $1
    `;
    const { rows } = await query(sql, [user_id]);
    return rows;
  }

  /**
   * Unlink OAuth provider from user
   * @param {number} user_id
   * @param {string} provider
   * @returns {boolean}
   */
  static async unlink(user_id, provider) {
    const sql = `
      DELETE FROM oauth_providers
      WHERE user_id = $1 AND provider = $2
      RETURNING id
    `;
    const { rows } = await query(sql, [user_id, provider]);
    return rows.length > 0;
  }
}

module.exports = OAuthProvider;
