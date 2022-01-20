const express = require('express');
const router = express.Router();
const UserController = require('../controllers/userController');
const { verifyToken } = require('../middleware/auth');
const { validate, updateProfileSchema, changePasswordSchema } = require('../middleware/validation');

// All routes require authentication
router.use(verifyToken);

// GET /api/users/profile
router.get('/profile', UserController.getProfile);

// PUT /api/users/profile
router.put('/profile', validate(updateProfileSchema), UserController.updateProfile);

// PUT /api/users/change-password
router.put('/change-password', validate(changePasswordSchema), UserController.changePassword);

// DELETE /api/users/account
router.delete('/account', UserController.deleteAccount);

module.exports = router;
