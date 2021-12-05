const express = require('express');
const router = express.Router();
const passport = require('../config/passport');
const OAuthController = require('../controllers/oauthController');
const { verifyToken } = require('../middleware/auth');

// Google OAuth
// GET /api/oauth/google - Initiate Google OAuth
router.get(
  '/google',
  passport.authenticate('google', {
    scope: ['profile', 'email'],
    session: false,
  })
);

// GET /api/oauth/google/callback - Google OAuth callback
router.get(
  '/google/callback',
  passport.authenticate('google', {
    session: false,
    failureRedirect: '/api/oauth/failure',
  }),
  OAuthController.handleGoogleCallback
);

// Protected routes (require authentication)
// GET /api/oauth/providers - Get linked OAuth providers
router.get('/providers', verifyToken, OAuthController.getLinkedProviders);

// POST /api/oauth/link - Link OAuth provider to account
router.post('/link', verifyToken, OAuthController.linkAccount);

// DELETE /api/oauth/unlink/:provider - Unlink OAuth provider
router.delete('/unlink/:provider', verifyToken, OAuthController.unlinkAccount);

// OAuth failure route
router.get('/failure', (req, res) => {
  res.status(401).json({
    error: 'Unauthorized',
    message: 'OAuth authentication failed',
  });
});

module.exports = router;
