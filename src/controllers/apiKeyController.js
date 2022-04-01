const ApiKey = require('../models/ApiKey');

class ApiKeyController {
  /**
   * Create a new API key
   * POST /api/api-keys
   */
  static async create(req, res) {
    try {
      const { name, scopes, expires_in_days } = req.body;

      if (!name) {
        return res.status(400).json({
          error: 'Bad Request',
          message: 'API key name is required',
        });
      }

      let expires_at = null;
      if (expires_in_days) {
        expires_at = new Date(Date.now() + expires_in_days * 24 * 60 * 60 * 1000);
      }

      const { apiKey, record } = await ApiKey.create({
        user_id: req.user.id,
        name,
        scopes: scopes || [],
        expires_at,
      });

      res.status(201).json({
        message: 'API key created successfully',
        apiKey, // Full key - only shown once!
        record,
        warning: 'Save this API key now. It will not be shown again.',
      });
    } catch (error) {
      console.error('Create API key error:', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to create API key',
      });
    }
  }

  /**
   * List all API keys for current user
   * GET /api/api-keys
   */
  static async list(req, res) {
    try {
      const keys = await ApiKey.listByUser(req.user.id);

      res.json({
        apiKeys: keys.map(key => ({
          id: key.id,
          name: key.name,
          prefix: key.key_prefix,
          scopes: key.scopes,
          last_used: key.last_used,
          expires_at: key.expires_at,
          revoked: key.revoked,
          created_at: key.created_at,
        })),
        total: keys.length,
      });
    } catch (error) {
      console.error('List API keys error:', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to list API keys',
      });
    }
  }

  /**
   * Revoke an API key
   * PUT /api/api-keys/:id/revoke
   */
  static async revoke(req, res) {
    try {
      const { id } = req.params;

      const result = await ApiKey.revoke(id, req.user.id);
      if (!result) {
        return res.status(404).json({
          error: 'Not Found',
          message: 'API key not found',
        });
      }

      res.json({
        message: 'API key revoked successfully',
        apiKey: result,
      });
    } catch (error) {
      console.error('Revoke API key error:', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to revoke API key',
      });
    }
  }

  /**
   * Delete an API key permanently
   * DELETE /api/api-keys/:id
   */
  static async delete(req, res) {
    try {
      const { id } = req.params;

      const deleted = await ApiKey.delete(id, req.user.id);
      if (!deleted) {
        return res.status(404).json({
          error: 'Not Found',
          message: 'API key not found',
        });
      }

      res.json({
        message: 'API key deleted successfully',
      });
    } catch (error) {
      console.error('Delete API key error:', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to delete API key',
      });
    }
  }
}

module.exports = ApiKeyController;
