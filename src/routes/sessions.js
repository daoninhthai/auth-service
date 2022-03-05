const express = require('express');
const router = express.Router();
const SessionController = require('../controllers/sessionController');
const { verifyToken } = require('../middleware/auth');

// All session routes require authentication
router.use(verifyToken);

// GET /api/sessions - Get all active sessions
router.get('/', SessionController.getSessions);

// DELETE /api/sessions - Revoke all sessions
router.delete('/', SessionController.revokeAllSessions);

// DELETE /api/sessions/:id - Revoke a specific session
router.delete('/:id', SessionController.revokeSession);

module.exports = router;
