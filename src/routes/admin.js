const express = require('express');
const router = express.Router();
const AdminController = require('../controllers/adminController');
const { verifyToken } = require('../middleware/auth');
const authorize = require('../middleware/authorize');
const { pagination } = require('../middleware/pagination');

// All admin routes require authentication and admin role
router.use(verifyToken);
router.use(authorize('admin'));

// GET /api/admin/users - Get all users with pagination
router.get('/users', pagination(20, 100), AdminController.getAllUsers);

// GET /api/admin/users/:id - Get user by ID
router.get('/users/:id', AdminController.getUserById);

// PUT /api/admin/users/:id/role - Update user role
router.put('/users/:id/role', AdminController.updateUserRole);

// PUT /api/admin/users/:id/ban - Ban user
router.put('/users/:id/ban', AdminController.banUser);

// PUT /api/admin/users/:id/unban - Unban user
router.put('/users/:id/unban', AdminController.unbanUser);

// GET /api/admin/stats - Get user statistics
router.get('/stats', AdminController.getUserStats);

module.exports = router;
