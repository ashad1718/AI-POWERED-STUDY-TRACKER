'use strict';

const nodemailer = require('nodemailer');

let transporter = null;

const getEmailConfig = () => {
  const EMAIL_USER = process.env.EMAIL_USER || process.env.SMTP_USER;
  const EMAIL_APP_PASSWORD = process.env.EMAIL_APP_PASSWORD || process.env.SMTP_PASS;
  const EMAIL_FROM = process.env.EMAIL_FROM || process.env.SMTP_FROM || EMAIL_USER;

  if (!EMAIL_USER || !EMAIL_APP_PASSWORD) {
    throw new Error('Email configuration is incomplete. Set EMAIL_USER and EMAIL_APP_PASSWORD.');
  }

  return { EMAIL_USER, EMAIL_APP_PASSWORD, EMAIL_FROM };
};

/**
 * Lazily create and reuse Nodemailer transporter.
 * @returns {import('nodemailer').Transporter}
 */
const getEmailTransporter = () => {
  if (transporter) return transporter;

  const { EMAIL_USER, EMAIL_APP_PASSWORD } = getEmailConfig();

  transporter = nodemailer.createTransport({
    service: 'gmail',
    host:   'smtp.gmail.com',
    port:   465,
    secure: true,
    auth: {
      user: EMAIL_USER,
      pass: EMAIL_APP_PASSWORD,
    },
  });

  return transporter;
};

const verifyEmailTransporter = async () => {
  const mailer = getEmailTransporter();
  await mailer.verify();
  console.log('[EMAIL] SMTP connection verified');
};

const buildOtpEmail = (otp, userName = 'User') => {
  const text = [
    `Hello ${userName},`,
    '',
    'Your verification code is:',
    '',
    otp,
    '',
    'This code expires in 10 minutes.',
  ].join('\n');

  const html = `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Verify Your Email</title>
      </head>
      <body style="margin:0;padding:0;background:#0B1020;font-family:Inter,Arial,sans-serif;color:#F8FAFC;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#0B1020;padding:32px 16px;">
          <tr>
            <td align="center">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:520px;background:#1A2336;border:1px solid #243047;border-radius:16px;overflow:hidden;">
                <tr>
                  <td style="padding:32px 28px 12px;">
                    <p style="margin:0 0 8px;font-size:12px;letter-spacing:0.08em;text-transform:uppercase;color:#00D4AA;font-weight:700;">StudyAI Security</p>
                    <h1 style="margin:0;font-size:24px;line-height:1.3;color:#F8FAFC;">Verify Your Email</h1>
                  </td>
                </tr>
                <tr>
                  <td style="padding:8px 28px 0;">
                    <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#94A3B8;">Hello ${userName},</p>
                    <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#94A3B8;">Your verification code is:</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding:0 28px 8px;">
                    <div style="background:#131A2A;border:1px solid #243047;border-radius:12px;padding:20px;text-align:center;">
                      <span style="display:inline-block;font-size:32px;font-weight:800;letter-spacing:0.35em;color:#4F7CFF;">${otp}</span>
                    </div>
                  </td>
                </tr>
                <tr>
                  <td style="padding:8px 28px 28px;">
                    <p style="margin:0;font-size:14px;line-height:1.6;color:#94A3B8;">This code expires in <strong style="color:#F8FAFC;">10 minutes</strong>.</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `;

  return { text, html };
};

const sendOtpEmail = async (to, otp, userName = 'User') => {
  const mailer = getEmailTransporter();
  const { EMAIL_FROM } = getEmailConfig();
  const { text, html } = buildOtpEmail(otp, userName);

  console.log(`[EMAIL] Sending OTP to ${to}`);

  try {
    await verifyEmailTransporter();
    const info = await mailer.sendMail({
      from: `"StudyAI" <${EMAIL_FROM}>`,
      to,
      subject: 'Verify Your Email',
      text,
      html,
    });

    console.log(`[EMAIL] OTP sent successfully to ${to}`);
    if (info.messageId) {
      console.log(`[EMAIL] SMTP success messageId=${info.messageId}`);
    }
  } catch (err) {
    console.error(`[EMAIL ERROR] ${err.message}`);
    throw err;
  }
};

/**
 * Send password reset OTP email.
 * @param {string} to
 * @param {string} otp
 * @param {string} [userName='User']
 */
const sendPasswordResetEmail = async (to, otp, userName = 'User') => {
  const mailer = getEmailTransporter();
  const { EMAIL_FROM } = getEmailConfig();

  const text = [
    `Hello ${userName},`,
    '',
    'Your verification code is:',
    '',
    otp,
    '',
    'This code expires in 10 minutes.',
    '',
    'If you did not request this reset, please ignore this email.',
  ].join('\n');

  const html = `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Password Reset Verification Code</title>
      </head>
      <body style="margin:0;padding:0;background:#0B1020;font-family:Inter,Arial,sans-serif;color:#F8FAFC;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#0B1020;padding:32px 16px;">
          <tr>
            <td align="center">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:520px;background:#1A2336;border:1px solid #243047;border-radius:16px;overflow:hidden;">
                <tr>
                  <td style="padding:32px 28px 12px;">
                    <p style="margin:0 0 8px;font-size:12px;letter-spacing:0.08em;text-transform:uppercase;color:#00D4AA;font-weight:700;">StudyAI Security</p>
                    <h1 style="margin:0;font-size:24px;line-height:1.3;color:#F8FAFC;">Password Reset Verification Code</h1>
                  </td>
                </tr>
                <tr>
                  <td style="padding:8px 28px 0;">
                    <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#94A3B8;">Hello ${userName},</p>
                    <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#94A3B8;">Your verification code is:</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding:0 28px 8px;">
                    <div style="background:#131A2A;border:1px solid #243047;border-radius:12px;padding:20px;text-align:center;">
                      <span style="display:inline-block;font-size:32px;font-weight:800;letter-spacing:0.35em;color:#4F7CFF;">${otp}</span>
                    </div>
                  </td>
                </tr>
                <tr>
                  <td style="padding:8px 28px 28px;">
                    <p style="margin:0 0 12px;font-size:14px;line-height:1.6;color:#94A3B8;">This code expires in <strong style="color:#F8FAFC;">10 minutes</strong>.</p>
                    <p style="margin:0;font-size:13px;line-height:1.6;color:#64748B;">If you did not request this reset, please ignore this email.</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `;

  console.log(`[EMAIL] Sending OTP to ${to}`);

  try {
    await verifyEmailTransporter();
    const info = await mailer.sendMail({
      from: `"StudyAI" <${EMAIL_FROM}>`,
      to,
      subject: 'Verify Your Email',
      text,
      html,
    });

    console.log(`[EMAIL] OTP sent successfully to ${to}`);
    if (info.messageId) {
      console.log(`[EMAIL] SMTP success messageId=${info.messageId}`);
    }
  } catch (err) {
    console.error(`[EMAIL ERROR] ${err.message}`);
    throw err;
  }
};

module.exports = {
  getEmailTransporter,
  verifyEmailTransporter,
  sendOtpEmail,
  sendPasswordResetEmail,
};
