const crypto = require('crypto');
const { query } = require('../config/database');

// TOTP constants (compatible with Google Authenticator)
const TOTP_PERIOD = 30; // seconds
const TOTP_DIGITS = 6;
const TOTP_ALGORITHM = 'sha1';
const SECRET_LENGTH = 20; // bytes

class TwoFactorService {
  /**
   * Generate a new 2FA secret
   * @param {string} email - User's email for QR code label
   * @returns {Object} { secret, otpauthUrl, qrCodeDataUrl }
   */
  static async generateSecret(email) {
    // Generate random secret
    const buffer = crypto.randomBytes(SECRET_LENGTH);
    const secret = this.base32Encode(buffer);

    // Build otpauth URL (compatible with authenticator apps)
    const issuer = 'AuthService';
    const otpauthUrl = `otpauth://totp/${issuer}:${encodeURIComponent(email)}?secret=${secret}&issuer=${issuer}&algorithm=${TOTP_ALGORITHM.toUpperCase()}&digits=${TOTP_DIGITS}&period=${TOTP_PERIOD}`;

    // In production, use a QR code library to generate the image
    // For now, return the URL that can be used with any QR code generator
    const qrCodeDataUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(otpauthUrl)}`;

    return {
      secret,
      otpauthUrl,
      qrCodeDataUrl,
    };
  }

  /**
   * Generate backup codes for 2FA recovery
   * @param {number} count - Number of backup codes to generate
   * @returns {Array<string>} Backup codes
   */
  static generateBackupCodes(count = 10) {
    const codes = [];
    for (let i = 0; i < count; i++) {
      const code = crypto.randomBytes(4).toString('hex').toUpperCase();
      // Format: XXXX-XXXX
      codes.push(`${code.slice(0, 4)}-${code.slice(4, 8)}`);
    }
    return codes;
  }

  /**
   * Verify a TOTP token
   * @param {string} token - 6-digit TOTP token
   * @param {string} secret - Base32 encoded secret
   * @param {number} window - Number of time steps to check before/after
   * @returns {boolean}
   */
  static verifyToken(token, secret, window = 1) {
    if (!token || !secret) return false;

    const now = Math.floor(Date.now() / 1000);

    // Check current time step and adjacent ones (for clock skew)
    for (let i = -window; i <= window; i++) {
      const timeStep = Math.floor(now / TOTP_PERIOD) + i;
      const expectedToken = this.generateTOTP(secret, timeStep);

      if (token === expectedToken) {
        return true;
      }
    }

    return false;
  }

  /**
   * Generate TOTP token for a given time step
   * @param {string} secret - Base32 encoded secret
   * @param {number} timeStep - Time counter
   * @returns {string} 6-digit TOTP token
   */
  static generateTOTP(secret, timeStep) {
    // Decode base32 secret
    const key = this.base32Decode(secret);

    // Convert time step to 8-byte big-endian buffer
    const timeBuffer = Buffer.alloc(8);
    let tmp = timeStep;
    for (let i = 7; i >= 0; i--) {
      timeBuffer[i] = tmp & 0xff;
      tmp = tmp >> 8;
    }

    // HMAC-SHA1
    const hmac = crypto.createHmac(TOTP_ALGORITHM, key);
    hmac.update(timeBuffer);
    const hash = hmac.digest();

    // Dynamic truncation
    const offset = hash[hash.length - 1] & 0x0f;
    const code =
      ((hash[offset] & 0x7f) << 24) |
      ((hash[offset + 1] & 0xff) << 16) |
      ((hash[offset + 2] & 0xff) << 8) |
      (hash[offset + 3] & 0xff);

    // Modulo to get desired number of digits
    const otp = code % Math.pow(10, TOTP_DIGITS);
    return otp.toString().padStart(TOTP_DIGITS, '0');
  }

  /**
   * Enable 2FA for a user
   * @param {number} userId
   * @param {string} secret
   * @param {Array<string>} backupCodes
   */
  static async enable2FA(userId, secret, backupCodes) {
    await query(
      `UPDATE users
       SET two_factor_enabled = true,
           two_factor_secret = $1,
           two_factor_backup_codes = $2,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $3`,
      [secret, backupCodes, userId]
    );
  }

  /**
   * Disable 2FA for a user
   * @param {number} userId
   */
  static async disable2FA(userId) {
    await query(
      `UPDATE users
       SET two_factor_enabled = false,
           two_factor_secret = NULL,
           two_factor_backup_codes = NULL,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1`,
      [userId]
    );
  }

  /**
   * Get 2FA status for a user
   * @param {number} userId
   * @returns {Object} { enabled, secret }
   */
  static async get2FAStatus(userId) {
    const { rows } = await query(
      'SELECT two_factor_enabled, two_factor_secret FROM users WHERE id = $1',
      [userId]
    );
    if (rows.length === 0) return null;
    return {
      enabled: rows[0].two_factor_enabled,
      secret: rows[0].two_factor_secret,
    };
  }

  /**
   * Verify backup code
   * @param {number} userId
   * @param {string} code - Backup code
   * @returns {boolean}
   */
  static async verifyBackupCode(userId, code) {
    const { rows } = await query(
      'SELECT two_factor_backup_codes FROM users WHERE id = $1',
      [userId]
    );

    if (rows.length === 0 || !rows[0].two_factor_backup_codes) return false;

    const codes = rows[0].two_factor_backup_codes;
    const index = codes.indexOf(code);

    if (index === -1) return false;

    // Remove used backup code
    codes.splice(index, 1);
    await query(
      'UPDATE users SET two_factor_backup_codes = $1 WHERE id = $2',
      [codes, userId]
    );

    return true;
  }

  /**
   * Base32 encode a buffer
   * @param {Buffer} buffer
   * @returns {string}
   */
  static base32Encode(buffer) {
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    let result = '';
    let bits = 0;
    let value = 0;

    for (let i = 0; i < buffer.length; i++) {
      value = (value << 8) | buffer[i];
      bits += 8;

      while (bits >= 5) {
        result += alphabet[(value >>> (bits - 5)) & 31];
        bits -= 5;
      }
    }

    if (bits > 0) {
      result += alphabet[(value << (5 - bits)) & 31];
    }

    return result;
  }

  /**
   * Base32 decode a string
   * @param {string} str
   * @returns {Buffer}
   */
  static base32Decode(str) {
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    let bits = 0;
    let value = 0;
    const output = [];

    for (let i = 0; i < str.length; i++) {
      const idx = alphabet.indexOf(str[i].toUpperCase());
      if (idx === -1) continue;

      value = (value << 5) | idx;
      bits += 5;

      if (bits >= 8) {
        output.push((value >>> (bits - 8)) & 255);
        bits -= 8;
      }
    }

    return Buffer.from(output);
  }
}

module.exports = TwoFactorService;
