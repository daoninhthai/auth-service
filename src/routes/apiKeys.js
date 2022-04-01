const express = require('express');
const router = express.Router();
const ApiKeyController = require('../controllers/apiKeyController');
const { verifyToken } = require('../middleware/auth');

// All API key management routes require JWT authentication
router.use(verifyToken);

// POST /api/api-keys - Create a new API key
router.post('/', ApiKeyController.create);

// GET /api/api-keys - List all API keys
router.get('/', ApiKeyController.list);

// PUT /api/api-keys/:id/revoke - Revoke an API key
router.put('/:id/revoke', ApiKeyController.revoke);

// DELETE /api/api-keys/:id - Delete an API key
router.delete('/:id', ApiKeyController.delete);

module.exports = router;
