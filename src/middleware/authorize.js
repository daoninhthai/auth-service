/**
 * Role-based authorization middleware
 * Must be used after verifyToken middleware
 *
 * @param  {...string} roles - Allowed roles (e.g., 'admin', 'moderator')
 * @returns {Function} Express middleware
 *
 * Usage:
 *   router.get('/admin', verifyToken, authorize('admin'), handler);
 *   router.get('/manage', verifyToken, authorize('admin', 'moderator'), handler);
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    // Check that user is attached (verifyToken should run first)
    if (!req.user) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required',
      });
    }

    // Check if user's role is in the allowed roles
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'You do not have permission to access this resource',
        required_roles: roles,
        your_role: req.user.role,
      });
    }

    next();
  };
};

module.exports = authorize;
