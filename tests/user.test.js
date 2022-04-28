const bcrypt = require('bcryptjs');

// Mock database
jest.mock('../src/config/database', () => ({
  query: jest.fn(),
  pool: { connect: jest.fn() },
}));

const { query } = require('../src/config/database');
const User = require('../src/models/User');

describe('User Model', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Profile Management', () => {
    it('should find user by ID', async () => {
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

      const user = await User.findById(1);
      expect(user).toEqual(mockUser);
      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT'),
        [1]
      );
    });

    it('should return null for non-existent user', async () => {
      query.mockResolvedValueOnce({ rows: [] });

      const user = await User.findById(999);
      expect(user).toBeNull();
    });

    it('should update user profile', async () => {
      const updatedUser = {
        id: 1,
        email: 'newemail@example.com',
        full_name: 'Updated Name',
        role: 'user',
        is_active: true,
        email_verified: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      query.mockResolvedValueOnce({ rows: [updatedUser] });

      const result = await User.updateProfile(1, {
        full_name: 'Updated Name',
        email: 'newemail@example.com',
      });

      expect(result.full_name).toBe('Updated Name');
      expect(result.email).toBe('newemail@example.com');
    });

    it('should update user role', async () => {
      const updatedUser = {
        id: 1,
        email: 'test@example.com',
        full_name: 'Test User',
        role: 'admin',
        updated_at: new Date().toISOString(),
      };

      query.mockResolvedValueOnce({ rows: [updatedUser] });

      const result = await User.updateRole(1, 'admin');
      expect(result.role).toBe('admin');
    });
  });

  describe('Password Change', () => {
    it('should update user password', async () => {
      const newHash = await bcrypt.hash('NewPassword123', 12);

      const updatedUser = {
        id: 1,
        email: 'test@example.com',
        full_name: 'Test User',
        role: 'user',
        updated_at: new Date().toISOString(),
      };

      query.mockResolvedValueOnce({ rows: [updatedUser] });

      const result = await User.updatePassword(1, newHash);
      expect(result).toBeDefined();
      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE users'),
        expect.arrayContaining([newHash, 1])
      );
    });

    it('should verify old password before changing', async () => {
      const oldPassword = 'OldPassword123';
      const oldHash = await bcrypt.hash(oldPassword, 12);

      // Verify old password
      const isValid = await bcrypt.compare(oldPassword, oldHash);
      expect(isValid).toBe(true);

      // New password should be different
      const newPassword = 'NewPassword456';
      const isSame = await bcrypt.compare(newPassword, oldHash);
      expect(isSame).toBe(false);
    });
  });

  describe('Account Management', () => {
    it('should deactivate user account', async () => {
      const deactivatedUser = {
        id: 1,
        email: 'test@example.com',
        is_active: false,
        updated_at: new Date().toISOString(),
      };

      query.mockResolvedValueOnce({ rows: [deactivatedUser] });

      const result = await User.deactivate(1);
      expect(result.is_active).toBe(false);
    });

    it('should activate user account', async () => {
      const activatedUser = {
        id: 1,
        email: 'test@example.com',
        is_active: true,
        updated_at: new Date().toISOString(),
      };

      query.mockResolvedValueOnce({ rows: [activatedUser] });

      const result = await User.activate(1);
      expect(result.is_active).toBe(true);
    });

    it('should verify email', async () => {
      const verifiedUser = {
        id: 1,
        email: 'test@example.com',
        email_verified: true,
        updated_at: new Date().toISOString(),
      };

      query.mockResolvedValueOnce({ rows: [verifiedUser] });

      const result = await User.verifyEmail(1);
      expect(result.email_verified).toBe(true);
    });
  });
});
