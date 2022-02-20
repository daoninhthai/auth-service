const { query } = require('../config/database');
const User = require('../models/User');
const RefreshToken = require('../models/RefreshToken');
const { buildPaginationMeta } = require('../middleware/pagination');

class AdminController {
  /**
   * Get all users with pagination
   * GET /api/admin/users
   */
  static async getAllUsers(req, res) {
    try {
      const { page, limit, offset } = req.pagination;
      const { search, role, is_active, sort_by = 'created_at', order = 'desc' } = req.query;

      // Build dynamic query
      let whereConditions = [];
      let params = [];
      let paramIndex = 1;

      if (search) {
        whereConditions.push(`(email ILIKE $${paramIndex} OR full_name ILIKE $${paramIndex})`);
        params.push(`%${search}%`);
        paramIndex++;
      }

      if (role) {
        whereConditions.push(`role = $${paramIndex}`);
        params.push(role);
        paramIndex++;
      }

      if (is_active !== undefined) {
        whereConditions.push(`is_active = $${paramIndex}`);
        params.push(is_active === 'true');
        paramIndex++;
      }

      const whereClause = whereConditions.length > 0
        ? `WHERE ${whereConditions.join(' AND ')}`
        : '';

      // Validate sort column
      const allowedSortColumns = ['created_at', 'email', 'full_name', 'role', 'updated_at'];
      const sortColumn = allowedSortColumns.includes(sort_by) ? sort_by : 'created_at';
      const sortOrder = order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

      // Get total count
      const countResult = await query(
        `SELECT COUNT(*) as total FROM users ${whereClause}`,
        params
      );
      const total = parseInt(countResult.rows[0].total);

      // Get users
      const usersResult = await query(
        `SELECT id, email, full_name, role, is_active, email_verified, created_at, updated_at
         FROM users
         ${whereClause}
         ORDER BY ${sortColumn} ${sortOrder}
         LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
        [...params, limit, offset]
      );

      res.json({
        users: usersResult.rows,
        pagination: buildPaginationMeta(total, page, limit),
      });
    } catch (error) {
      console.error('Get all users error:', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to get users',
      });
    }
  }

  /**
   * Get user by ID
   * GET /api/admin/users/:id
   */
  static async getUserById(req, res) {
    try {
      const { id } = req.params;
      const user = await User.findById(id);

      if (!user) {
        return res.status(404).json({
          error: 'Not Found',
          message: 'User not found',
        });
      }

      res.json({ user });
    } catch (error) {
      console.error('Get user by ID error:', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to get user',
      });
    }
  }

  /**
   * Update user role
   * PUT /api/admin/users/:id/role
   */
  static async updateUserRole(req, res) {
    try {
      const { id } = req.params;
      const { role } = req.body;

      const validRoles = ['user', 'moderator', 'admin'];
      if (!validRoles.includes(role)) {
        return res.status(400).json({
          error: 'Bad Request',
          message: `Invalid role. Must be one of: ${validRoles.join(', ')}`,
        });
      }

      // Prevent changing own role
      if (parseInt(id) === req.user.id) {
        return res.status(400).json({
          error: 'Bad Request',
          message: 'Cannot change your own role',
        });
      }

      const user = await User.updateRole(id, role);
      if (!user) {
        return res.status(404).json({
          error: 'Not Found',
          message: 'User not found',
        });
      }

      res.json({
        message: 'User role updated successfully',
        user,
      });
    } catch (error) {
      console.error('Update user role error:', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to update user role',
      });
    }
  }

  /**
   * Ban (deactivate) user
   * PUT /api/admin/users/:id/ban
   */
  static async banUser(req, res) {
    try {
      const { id } = req.params;

      // Prevent banning self
      if (parseInt(id) === req.user.id) {
        return res.status(400).json({
          error: 'Bad Request',
          message: 'Cannot ban yourself',
        });
      }

      const user = await User.deactivate(id);
      if (!user) {
        return res.status(404).json({
          error: 'Not Found',
          message: 'User not found',
        });
      }

      // Revoke all refresh tokens for banned user
      await RefreshToken.revokeAllForUser(id);

      res.json({
        message: 'User banned successfully',
        user,
      });
    } catch (error) {
      console.error('Ban user error:', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to ban user',
      });
    }
  }

  /**
   * Unban (activate) user
   * PUT /api/admin/users/:id/unban
   */
  static async unbanUser(req, res) {
    try {
      const { id } = req.params;

      const user = await User.activate(id);
      if (!user) {
        return res.status(404).json({
          error: 'Not Found',
          message: 'User not found',
        });
      }

      res.json({
        message: 'User unbanned successfully',
        user,
      });
    } catch (error) {
      console.error('Unban user error:', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to unban user',
      });
    }
  }

  /**
   * Get user statistics
   * GET /api/admin/stats
   */
  static async getUserStats(req, res) {
    try {
      const statsQueries = await Promise.all([
        query('SELECT COUNT(*) as total FROM users'),
        query('SELECT COUNT(*) as active FROM users WHERE is_active = true'),
        query('SELECT COUNT(*) as verified FROM users WHERE email_verified = true'),
        query("SELECT role, COUNT(*) as count FROM users GROUP BY role"),
        query(`SELECT COUNT(*) as new_users FROM users WHERE created_at > CURRENT_TIMESTAMP - INTERVAL '30 days'`),
        query(`SELECT COUNT(*) as new_today FROM users WHERE created_at > CURRENT_DATE`),
      ]);

      const roleDistribution = {};
      statsQueries[3].rows.forEach(row => {
        roleDistribution[row.role] = parseInt(row.count);
      });

      res.json({
        stats: {
          total_users: parseInt(statsQueries[0].rows[0].total),
          active_users: parseInt(statsQueries[1].rows[0].active),
          verified_users: parseInt(statsQueries[2].rows[0].verified),
          role_distribution: roleDistribution,
          new_users_30d: parseInt(statsQueries[4].rows[0].new_users),
          new_users_today: parseInt(statsQueries[5].rows[0].new_today),
        },
      });
    } catch (error) {
      console.error('Get user stats error:', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to get user statistics',
      });
    }
  }
}

module.exports = AdminController;
