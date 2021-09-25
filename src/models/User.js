const { query } = require('../config/database');

class User {
  /**
   * Create a new user
   * @param {Object} userData - { email, password_hash, full_name, role }
   * @returns {Object} Created user
   */
  static async create({ email, password_hash, full_name, role = 'user' }) {
    const sql = `
      INSERT INTO users (email, password_hash, full_name, role)
      VALUES ($1, $2, $3, $4)
      RETURNING id, email, full_name, role, is_active, email_verified, created_at, updated_at
    `;
    const { rows } = await query(sql, [email, password_hash, full_name, role]);
    return rows[0];
  }

  /**
   * Find user by email
   * @param {string} email
   * @returns {Object|null} User object or null
   */
  static async findByEmail(email) {
    const sql = `
      SELECT id, email, password_hash, full_name, role, is_active, email_verified, created_at, updated_at
      FROM users
      WHERE email = $1
    `;
    const { rows } = await query(sql, [email]);
    return rows[0] || null;
  }

  /**
   * Find user by ID
   * @param {number} id
   * @returns {Object|null} User object or null
   */
  static async findById(id) {
    const sql = `
      SELECT id, email, full_name, role, is_active, email_verified, created_at, updated_at
      FROM users
      WHERE id = $1
    `;
    const { rows } = await query(sql, [id]);
    return rows[0] || null;
  }

  /**
   * Update user password
   * @param {number} id - User ID
   * @param {string} password_hash - New hashed password
   * @returns {Object} Updated user
   */
  static async updatePassword(id, password_hash) {
    const sql = `
      UPDATE users
      SET password_hash = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING id, email, full_name, role, updated_at
    `;
    const { rows } = await query(sql, [password_hash, id]);
    return rows[0];
  }

  /**
   * Mark email as verified
   * @param {number} id - User ID
   * @returns {Object} Updated user
   */
  static async verifyEmail(id) {
    const sql = `
      UPDATE users
      SET email_verified = true, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING id, email, email_verified, updated_at
    `;
    const { rows } = await query(sql, [id]);
    return rows[0];
  }

  /**
   * Deactivate user account
   * @param {number} id - User ID
   * @returns {Object} Updated user
   */
  static async deactivate(id) {
    const sql = `
      UPDATE users
      SET is_active = false, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING id, email, is_active, updated_at
    `;
    const { rows } = await query(sql, [id]);
    return rows[0];
  }

  /**
   * Activate user account
   * @param {number} id - User ID
   * @returns {Object} Updated user
   */
  static async activate(id) {
    const sql = `
      UPDATE users
      SET is_active = true, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING id, email, is_active, updated_at
    `;
    const { rows } = await query(sql, [id]);
    return rows[0];
  }

  /**
   * Update user profile
   * @param {number} id - User ID
   * @param {Object} data - { full_name, email }
   * @returns {Object} Updated user
   */
  static async updateProfile(id, { full_name, email }) {
    const fields = [];
    const values = [];
    let paramIndex = 1;

    if (full_name) {
      fields.push(`full_name = $${paramIndex++}`);
      values.push(full_name);
    }
    if (email) {
      fields.push(`email = $${paramIndex++}`);
      values.push(email);
    }

    if (fields.length === 0) return this.findById(id);

    values.push(id);
    const sql = `
      UPDATE users
      SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $${paramIndex}
      RETURNING id, email, full_name, role, is_active, email_verified, created_at, updated_at
    `;
    const { rows } = await query(sql, values);
    return rows[0];
  }

  /**
   * Update user role
   * @param {number} id - User ID
   * @param {string} role - New role
   * @returns {Object} Updated user
   */
  static async updateRole(id, role) {
    const sql = `
      UPDATE users
      SET role = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING id, email, full_name, role, updated_at
    `;
    const { rows } = await query(sql, [role, id]);
    return rows[0];
  }
}

module.exports = User;
