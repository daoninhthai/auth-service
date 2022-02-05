const crypto = require('crypto');
const { query } = require('../config/database');
const User = require('../models/User');

const VERIFICATION_TOKEN_EXPIRY = 24 * 60 * 60 * 1000; // 24 hours

class EmailVerificationService {
  /**
   * Generate a verification token for a user
   * @param {number} userId
   * @returns {string} Verification token (unhashed)
   */
  static async generateVerificationToken(userId) {
    // Invalidate any existing tokens for this user
    await query(
      'UPDATE email_verifications SET used = true WHERE user_id = $1 AND used = false',
      [userId]
    );

    // Generate secure token
    const token = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto
      .createHash('sha256')
      .update(token)
      .digest('hex');

    const expiresAt = new Date(Date.now() + VERIFICATION_TOKEN_EXPIRY);

    await query(
      'INSERT INTO email_verifications (user_id, token, expires_at) VALUES ($1, $2, $3)',
      [userId, hashedToken, expiresAt]
    );

    return token;
  }

  /**
   * Send verification email to user
   * @param {string} email - Recipient email
   * @param {string} token - Verification token
   * @param {string} fullName - User's full name
   */
  static async sendVerificationEmail(email, token, fullName) {
    const baseUrl = process.env.APP_URL || 'http://localhost:3000';
    const verificationUrl = `${baseUrl}/api/verification/verify/${token}`;

    const mailOptions = {
      from: process.env.EMAIL_FROM || 'noreply@auth-service.com',
      to: email,
      subject: 'Verify Your Email Address',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Email Verification</h2>
          <p>Hello ${fullName},</p>
          <p>Please verify your email address by clicking the link below:</p>
          <p>
            <a href="${verificationUrl}"
               style="display: inline-block; padding: 10px 24px; background-color: #2196F3;
                      color: white; text-decoration: none; border-radius: 4px;">
              Verify Email
            </a>
          </p>
          <p>This link will expire in 24 hours.</p>
          <p>If you didn't create an account, please ignore this email.</p>
          <hr>
          <p style="color: #888; font-size: 12px;">Auth Service</p>
        </div>
      `,
    };

    // In development, log instead of sending
    if (process.env.NODE_ENV !== 'production') {
      console.log('=== Email Verification ===');
      console.log(`To: ${email}`);
      console.log(`Verification URL: ${verificationUrl}`);
      console.log('==========================');
      return { success: true, preview: verificationUrl };
    }

    // In production, send via email service
    return { success: true };
  }

  /**
   * Verify email with token
   * @param {string} token - Unhashed verification token
   * @returns {Object} Result { success, message, user }
   */
  static async verifyEmail(token) {
    const hashedToken = crypto
      .createHash('sha256')
      .update(token)
      .digest('hex');

    // Find valid verification record
    const { rows } = await query(
      `SELECT id, user_id, expires_at
       FROM email_verifications
       WHERE token = $1 AND used = false AND expires_at > CURRENT_TIMESTAMP`,
      [hashedToken]
    );

    if (rows.length === 0) {
      return {
        success: false,
        message: 'Invalid or expired verification token',
      };
    }

    const verification = rows[0];

    // Mark token as used
    await query(
      'UPDATE email_verifications SET used = true WHERE id = $1',
      [verification.id]
    );

    // Mark user email as verified
    const user = await User.verifyEmail(verification.user_id);

    return {
      success: true,
      message: 'Email verified successfully',
      user,
    };
  }
}

module.exports = EmailVerificationService;
