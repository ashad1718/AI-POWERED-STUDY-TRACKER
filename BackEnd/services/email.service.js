'use strict';

const nodemailer = require('nodemailer');

// Create reusable transporter object using the default SMTP transport
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT, 10) || 587,
  secure: process.env.SMTP_PORT === '465', // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

/**
 * Send password reset OTP to user's registered email
 * @param {string} email - Destination email address
 * @param {string} otp - 6-digit numeric OTP code
 * @returns {Promise<any>}
 */
const sendOTP = async (email, otp) => {
  const mailOptions = {
    from: `"StudyAI Team" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
    to: email,
    subject: 'StudyAI Password Reset OTP',
    text: `Hello,

Your password reset OTP is:

${otp}

This OTP will expire in 10 minutes.

If you did not request a password reset, ignore this email.

StudyAI Team`,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`[EMAIL SERVICE] OTP successfully sent to: ${email}. MessageId: ${info.messageId}`);
    return info;
  } catch (err) {
    console.error(`[EMAIL SERVICE ERROR] Failed to send OTP email to ${email}: ${err.message}`);
    throw err;
  }
};

module.exports = {
  sendOTP,
};
