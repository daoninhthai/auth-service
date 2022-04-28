const TokenService = require('../src/services/tokenService');

// Mock database
jest.mock('../src/config/database', () => ({
  query: jest.fn(),
  pool: { connect: jest.fn() },
}));

describe('Middleware Tests', () => {
  describe('JWT Verification Middleware', () => {
    let req, res, next;

    beforeEach(() => {
      req = {
        headers: {},
      };
      res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
      };
      next = jest.fn();
    });

    // Import after mocking
    const { verifyToken } = require('../src/middleware/auth');

    it('should reject request without authorization header', () => {
      verifyToken(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Unauthorized',
          message: 'Access token is required',
        })
      );
      expect(next).not.toHaveBeenCalled();
    });

    it('should reject request with invalid token format', () => {
      req.headers.authorization = 'InvalidFormat token';

      verifyToken(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Unauthorized',
          message: 'Invalid token format. Use: Bearer <token>',
        })
      );
    });

    it('should accept valid token and attach user', () => {
      const testUser = { id: 1, email: 'test@example.com', role: 'user' };
      const token = TokenService.generateAccessToken(testUser);
      req.headers.authorization = `Bearer ${token}`;

      verifyToken(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(req.user).toBeDefined();
      expect(req.user.id).toBe(testUser.id);
      expect(req.user.email).toBe(testUser.email);
      expect(req.user.role).toBe(testUser.role);
    });

    it('should reject blacklisted token', () => {
      const testUser = { id: 1, email: 'test@example.com', role: 'user' };
      const token = TokenService.generateAccessToken(testUser);

      TokenService.blacklistToken(token);
      req.headers.authorization = `Bearer ${token}`;

      verifyToken(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(next).not.toHaveBeenCalled();
    });

    it('should reject expired token', () => {
      // Create a token that's already expired
      req.headers.authorization = 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwiZXhwIjoxMDAwMDAwMDAwfQ.invalid';

      verifyToken(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('Role Authorization Middleware', () => {
    let req, res, next;
    const authorize = require('../src/middleware/authorize');

    beforeEach(() => {
      req = { user: null };
      res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
      };
      next = jest.fn();
    });

    it('should reject unauthenticated user', () => {
      const middleware = authorize('admin');
      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(next).not.toHaveBeenCalled();
    });

    it('should reject user without required role', () => {
      req.user = { id: 1, email: 'test@example.com', role: 'user' };
      const middleware = authorize('admin');

      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Forbidden',
        })
      );
      expect(next).not.toHaveBeenCalled();
    });

    it('should allow admin access', () => {
      req.user = { id: 1, email: 'admin@example.com', role: 'admin' };
      const middleware = authorize('admin');

      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should allow multiple roles', () => {
      req.user = { id: 1, email: 'mod@example.com', role: 'moderator' };
      const middleware = authorize('admin', 'moderator');

      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should reject if role not in allowed list', () => {
      req.user = { id: 1, email: 'user@example.com', role: 'user' };
      const middleware = authorize('admin', 'moderator');

      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('Validation Middleware', () => {
    const { validate, registerSchema, loginSchema } = require('../src/middleware/validation');

    let req, res, next;

    beforeEach(() => {
      req = { body: {} };
      res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
      };
      next = jest.fn();
    });

    it('should validate valid registration data', () => {
      req.body = {
        email: 'test@example.com',
        password: 'TestPassword123',
        full_name: 'Test User',
      };

      validate(registerSchema)(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should reject registration with invalid email', () => {
      req.body = {
        email: 'invalid-email',
        password: 'TestPassword123',
        full_name: 'Test User',
      };

      validate(registerSchema)(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Validation Error',
        })
      );
      expect(next).not.toHaveBeenCalled();
    });

    it('should reject registration with weak password', () => {
      req.body = {
        email: 'test@example.com',
        password: '1234',
        full_name: 'Test User',
      };

      validate(registerSchema)(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(next).not.toHaveBeenCalled();
    });

    it('should validate valid login data', () => {
      req.body = {
        email: 'test@example.com',
        password: 'anypassword',
      };

      validate(loginSchema)(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should reject login without email', () => {
      req.body = {
        password: 'anypassword',
      };

      validate(loginSchema)(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(next).not.toHaveBeenCalled();
    });
  });
});
