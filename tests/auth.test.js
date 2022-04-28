const bcrypt = require('bcryptjs');
const TokenService = require('../src/services/tokenService');

// Mock database
jest.mock('../src/config/database', () => ({
  query: jest.fn(),
  pool: { connect: jest.fn() },
}));

const { query } = require('../src/config/database');
const User = require('../src/models/User');

describe('Auth Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('User Registration', () => {
    it('should hash password correctly', async () => {
      const password = 'TestPassword123';
      const hash = await bcrypt.hash(password, 12);

      expect(hash).toBeDefined();
      expect(hash).not.toBe(password);
      expect(hash.length).toBeGreaterThan(50);
    });

    it('should verify hashed password', async () => {
      const password = 'TestPassword123';
      const hash = await bcrypt.hash(password, 12);

      const isValid = await bcrypt.compare(password, hash);
      expect(isValid).toBe(true);
    });

    it('should reject wrong password', async () => {
      const password = 'TestPassword123';
      const hash = await bcrypt.hash(password, 12);

      const isValid = await bcrypt.compare('WrongPassword123', hash);
      expect(isValid).toBe(false);
    });

    it('should create user via model', async () => {
      const mockUser = {
        id: 1,
        email: 'test@example.com',
        full_name: 'Test User',
        role: 'user',
        is_active: true,
        email_verified: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      query.mockResolvedValueOnce({ rows: [mockUser] });

      const user = await User.create({
        email: 'test@example.com',
        password_hash: 'hashed_password',
        full_name: 'Test User',
      });

      expect(user).toEqual(mockUser);
      expect(query).toHaveBeenCalledTimes(1);
      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO users'),
        expect.arrayContaining(['test@example.com', 'hashed_password', 'Test User'])
      );
    });
  });

  describe('User Login', () => {
    it('should find user by email', async () => {
      const mockUser = {
        id: 1,
        email: 'test@example.com',
        password_hash: await bcrypt.hash('TestPassword123', 12),
        full_name: 'Test User',
        role: 'user',
        is_active: true,
      };

      query.mockResolvedValueOnce({ rows: [mockUser] });

      const user = await User.findByEmail('test@example.com');
      expect(user).toBeDefined();
      expect(user.email).toBe('test@example.com');
    });

    it('should return null for non-existent email', async () => {
      query.mockResolvedValueOnce({ rows: [] });

      const user = await User.findByEmail('nonexistent@example.com');
      expect(user).toBeNull();
    });

    it('should validate correct password on login', async () => {
      const password = 'TestPassword123';
      const hash = await bcrypt.hash(password, 12);

      const isValid = await bcrypt.compare(password, hash);
      expect(isValid).toBe(true);
    });

    it('should reject invalid credentials', async () => {
      const password = 'TestPassword123';
      const hash = await bcrypt.hash(password, 12);

      const isValid = await bcrypt.compare('InvalidPassword!1', hash);
      expect(isValid).toBe(false);
    });
  });

  describe('Token Generation', () => {
    const testUser = { id: 1, email: 'test@example.com', role: 'user' };

    it('should generate access token', () => {
      const token = TokenService.generateAccessToken(testUser);
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.').length).toBe(3); // JWT has 3 parts
    });

    it('should generate refresh token', () => {
      const token = TokenService.generateRefreshToken(testUser);
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.').length).toBe(3);
    });

    it('should verify valid access token', () => {
      const token = TokenService.generateAccessToken(testUser);
      const decoded = TokenService.verifyAccessToken(token);

      expect(decoded.id).toBe(testUser.id);
      expect(decoded.email).toBe(testUser.email);
      expect(decoded.role).toBe(testUser.role);
      expect(decoded.type).toBe('access');
    });

    it('should verify valid refresh token', () => {
      const token = TokenService.generateRefreshToken(testUser);
      const decoded = TokenService.verifyRefreshToken(token);

      expect(decoded.id).toBe(testUser.id);
      expect(decoded.email).toBe(testUser.email);
      expect(decoded.type).toBe('refresh');
    });

    it('should generate token pair', () => {
      const { accessToken, refreshToken } = TokenService.generateTokenPair(testUser);

      expect(accessToken).toBeDefined();
      expect(refreshToken).toBeDefined();
      expect(accessToken).not.toBe(refreshToken);
    });

    it('should throw on invalid access token', () => {
      expect(() => {
        TokenService.verifyAccessToken('invalid.token.here');
      }).toThrow();
    });
  });

  describe('Token Blacklisting', () => {
    it('should blacklist a token', () => {
      const testUser = { id: 1, email: 'test@example.com', role: 'user' };
      const token = TokenService.generateAccessToken(testUser);

      expect(TokenService.isBlacklisted(token)).toBe(false);

      TokenService.blacklistToken(token);

      expect(TokenService.isBlacklisted(token)).toBe(true);
    });

    it('should throw when verifying blacklisted token', () => {
      const testUser = { id: 1, email: 'test@example.com', role: 'user' };
      const token = TokenService.generateAccessToken(testUser);

      TokenService.blacklistToken(token);

      expect(() => {
        TokenService.verifyAccessToken(token);
      }).toThrow('Token has been revoked');
    });
  });

  describe('Refresh Token Flow', () => {
    it('should store refresh token in database', async () => {
      query.mockResolvedValueOnce({
        rows: [{ id: 1, user_id: 1, token: 'test_token', expires_at: new Date(), revoked: false }],
      });

      const RefreshToken = require('../src/models/RefreshToken');
      const result = await RefreshToken.create({
        user_id: 1,
        token: 'test_token',
        expires_at: new Date(),
      });

      expect(result).toBeDefined();
      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO refresh_tokens'),
        expect.any(Array)
      );
    });

    it('should revoke refresh token', async () => {
      query.mockResolvedValueOnce({
        rows: [{ id: 1, user_id: 1, revoked: true }],
      });

      const RefreshToken = require('../src/models/RefreshToken');
      const result = await RefreshToken.revoke('test_token');

      expect(result).toBeDefined();
      expect(result.revoked).toBe(true);
    });
  });
});
