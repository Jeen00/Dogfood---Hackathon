require('dotenv').config();
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

async function sendVerificationEmail(to, token) {
  const mailOptions = {
    from: process.env.SMTP_USER || '"App Support" <no-reply@example.com>',
    to,
    subject: 'Please verify your email address',
    text: `Your verification link is: http://localhost:8080/auth/verify-email?token=${token}\n\nPlease verify your email by clicking the link.`,
    html: `<p>Your verification link is: <a href="http://localhost:8080/auth/verify-email?token=${token}">Verify Email</a></p><p>Please verify your email by clicking the link.</p>`,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('Verification email sent: %s', info.messageId);
  } catch (err) {
    console.error('Error sending verification email:', err);
  }
}

async function sendPasswordResetEmail(to, token) {
  const mailOptions = {
    from: process.env.SMTP_USER || '"App Support" <no-reply@example.com>',
    to,
    subject: 'Password Reset Request',
    text: `You requested a password reset. Your reset link is: http://localhost:8080/auth/reset-password?token=${token}\n\nPlease reset your password by clicking the link.`,
    html: `<p>You requested a password reset. Your reset link is: <a href="http://localhost:8080/auth/reset-password?token=${token}">Reset Password</a></p><p>Please reset your password by clicking the link.</p>`,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('Password reset email sent: %s', info.messageId);
  } catch (err) {
    console.error('Error sending password reset email:', err);
  }
}

module.exports = {
  sendVerificationEmail,
  sendPasswordResetEmail,
};
