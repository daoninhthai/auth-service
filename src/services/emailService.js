/**
 * Email Service
 * Placeholder implementation using nodemailer pattern
 * In production, replace with actual SMTP or email API (SendGrid, Mailgun, etc.)
 */

class EmailService {
  constructor() {
    this.from = process.env.EMAIL_FROM || 'noreply@auth-service.com';
    this.baseUrl = process.env.APP_URL || 'http://localhost:3000';
  }

  /**
   * Send password reset email
   * @param {string} email - Recipient email
   * @param {string} token - Reset token
   * @param {string} fullName - User's full name
   */
  async sendResetEmail(email, token, fullName) {
    const resetUrl = `${this.baseUrl}/reset-password?token=${token}`;

    const mailOptions = {
      from: this.from,
      to: email,
      subject: 'Password Reset Request',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Password Reset Request</h2>
          <p>Hello ${fullName},</p>
          <p>You requested a password reset. Click the link below to reset your password:</p>
          <p>
            <a href="${resetUrl}"
               style="display: inline-block; padding: 10px 24px; background-color: #4CAF50;
                      color: white; text-decoration: none; border-radius: 4px;">
              Reset Password
            </a>
          </p>
          <p>This link will expire in 1 hour.</p>
          <p>If you didn't request this, please ignore this email.</p>
          <hr>
          <p style="color: #888; font-size: 12px;">Auth Service</p>
        </div>
      `,
    };

    // In development, log the email instead of sending
    if (process.env.NODE_ENV !== 'production') {
      console.log('=== Password Reset Email ===');
      console.log(`To: ${email}`);
      console.log(`Reset URL: ${resetUrl}`);
      console.log('============================');
      return { success: true, preview: resetUrl };
    }

    // In production, use nodemailer or email API
    // const transporter = nodemailer.createTransport({...});
    // await transporter.sendMail(mailOptions);

    return { success: true };
  }

  /**
   * Send welcome email after registration
   * @param {string} email - Recipient email
   * @param {string} fullName - User's full name
   */
  async sendWelcomeEmail(email, fullName) {
    const mailOptions = {
      from: this.from,
      to: email,
      subject: 'Welcome to Auth Service',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Welcome!</h2>
          <p>Hello ${fullName},</p>
          <p>Your account has been created successfully.</p>
          <p>Thank you for joining us!</p>
          <hr>
          <p style="color: #888; font-size: 12px;">Auth Service</p>
        </div>
      `,
    };

    if (process.env.NODE_ENV !== 'production') {
      console.log('=== Welcome Email ===');
      console.log(`To: ${email}`);
      console.log('=====================');
      return { success: true };
    }

    return { success: true };
  }
}

module.exports = new EmailService();
