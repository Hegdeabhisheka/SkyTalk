// server/config/email.js

import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

console.log('\n' + '═'.repeat(60));
console.log('📧 EMAIL SERVICE CONFIGURATION');
console.log('═'.repeat(60));

let transporter = null;
let emailServiceEnabled = false;

if (process.env.EMAIL_USER && process.env.EMAIL_APP_PASSWORD) {
  try {
    console.log('Email Provider: Gmail SMTP');
    console.log('Email Account:', process.env.EMAIL_USER);
    console.log('Password Length:', process.env.EMAIL_APP_PASSWORD.length);
    
    transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_APP_PASSWORD
      },
      tls: {
        rejectUnauthorized: false
      }
    });

    emailServiceEnabled = true;
    console.log('✅ Email service initialized successfully');
  } catch (error) {
    console.error('❌ Failed to initialize email service:', error.message);
    console.log('⚠️  Email service will not be available');
  }
} else {
  console.log('⚠️  Email credentials not configured');
  console.log('📝 OTP will be logged to console (development mode)');
}

console.log('═'.repeat(60) + '\n');

// ============================================
// SEND OTP EMAIL - WITH PROFESSIONAL DESIGN
// ============================================

export const sendOTPEmail = async (email, username, otp) => {
  if (!emailServiceEnabled || !transporter) {
    console.log('\n' + '═'.repeat(60));
    console.log('📝 OTP FOR DEVELOPMENT/TESTING:');
    console.log('═'.repeat(60));
    console.log(`📧 Email: ${email}`);
    console.log(`👤 Username: ${username}`);
    console.log(`🔐 OTP: ${otp}`);
    console.log(`⏱️  Expires in: 5 minutes`);
    console.log('═'.repeat(60) + '\n');
    
    return Promise.resolve();
  }

  try {
    console.log('\n📧 Sending OTP email to:', email);
    
    const mailOptions = {
      from: `"Sky Talk" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: '🔐 Sky Talk - Your OTP Code',
      text: `Hi ${username},\n\nYour OTP code is: ${otp}\n\nThis code will expire in 5 minutes.\n\nIf you didn't request this, please ignore this email.\n\n- Sky Talk Team`,
      html: `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Sky Talk - OTP Verification</title>
          <style>
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            body {
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              padding: 20px;
              min-height: 100vh;
            }
            .container {
              max-width: 600px;
              margin: 0 auto;
              background: #ffffff;
              border-radius: 12px;
              box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
              overflow: hidden;
            }
            .header {
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              padding: 40px 20px;
              text-align: center;
              color: #ffffff;
            }
            .header-logo {
              font-size: 48px;
              margin-bottom: 15px;
            }
            .header-title {
              font-size: 28px;
              font-weight: 700;
              margin-bottom: 8px;
            }
            .header-subtitle {
              font-size: 14px;
              opacity: 0.9;
            }
            .content {
              padding: 40px;
            }
            .greeting {
              font-size: 18px;
              color: #333;
              margin-bottom: 20px;
            }
            .greeting strong {
              color: #667eea;
            }
            .description {
              font-size: 14px;
              color: #666;
              line-height: 1.6;
              margin-bottom: 30px;
            }
            .otp-section {
              background: #f8f9fa;
              border: 2px solid #667eea;
              border-radius: 10px;
              padding: 30px;
              text-align: center;
              margin: 30px 0;
            }
            .otp-label {
              font-size: 12px;
              color: #999;
              text-transform: uppercase;
              letter-spacing: 1px;
              margin-bottom: 10px;
            }
            .otp-code {
              font-size: 48px;
              font-weight: 700;
              color: #667eea;
              letter-spacing: 8px;
              font-family: 'Courier New', monospace;
              word-break: break-all;
            }
            .otp-expiry {
              font-size: 13px;
              color: #666;
              margin-top: 15px;
              padding-top: 15px;
              border-top: 1px solid #ddd;
            }
            .warning-box {
              background: #fff3cd;
              border-left: 4px solid #ffc107;
              padding: 15px;
              margin: 20px 0;
              border-radius: 4px;
            }
            .warning-box .warning-icon {
              font-size: 18px;
              margin-right: 10px;
            }
            .warning-text {
              font-size: 13px;
              color: #856404;
            }
            .security-tips {
              background: #e8f5e9;
              border-left: 4px solid #4caf50;
              padding: 15px;
              margin: 20px 0;
              border-radius: 4px;
            }
            .security-tips .security-icon {
              font-size: 18px;
              margin-right: 10px;
            }
            .security-text {
              font-size: 13px;
              color: #2e7d32;
            }
            .footer {
              background: #f8f9fa;
              padding: 30px 40px;
              text-align: center;
              border-top: 1px solid #eee;
            }
            .footer-text {
              font-size: 12px;
              color: #999;
              line-height: 1.8;
            }
            .footer-link {
              color: #667eea;
              text-decoration: none;
            }
            .divider {
              height: 1px;
              background: #eee;
              margin: 30px 0;
            }
            .info-grid {
              display: table;
              width: 100%;
              font-size: 13px;
              color: #666;
              margin: 20px 0;
            }
            .info-row {
              display: table-row;
            }
            .info-label {
              display: table-cell;
              padding: 8px 0;
              font-weight: 600;
              color: #333;
              width: 100px;
            }
            .info-value {
              display: table-cell;
              padding: 8px 0;
              padding-left: 20px;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <!-- Header -->
            <div class="header">
              <div class="header-logo">☁️</div>
              <div class="header-title">Sky Talk</div>
              <div class="header-subtitle">Real-Time Chat Application</div>
            </div>

            <!-- Content -->
            <div class="content">
              <p class="greeting">Hi <strong>${username}</strong>,</p>
              
              <p class="description">
                You've requested to verify your Sky Talk account. Your One-Time Password (OTP) is below:
              </p>

              <!-- OTP Box -->
              <div class="otp-section">
                <div class="otp-label">Your OTP Code</div>
                <div class="otp-code">${otp}</div>
                <div class="otp-expiry">
                  ⏱️ Valid for 5 minutes only
                </div>
              </div>

              <!-- Security Warning -->
              <div class="warning-box">
                <span class="warning-icon">⚠️</span>
                <span class="warning-text">
                  <strong>Never share this code!</strong> Sky Talk support will never ask for your OTP.
                </span>
              </div>

              <!-- Security Tips -->
              <div class="security-tips">
                <span class="security-icon">🔒</span>
                <span class="security-text">
                  <strong>Security Tip:</strong> Always verify you're on the official Sky Talk app before entering your OTP.
                </span>
              </div>

              <div class="divider"></div>

              <p class="description">
                If you didn't request this OTP, you can safely ignore this email. Your account remains secure.
              </p>
            </div>

            <!-- Footer -->
            <div class="footer">
              <p class="footer-text">
                <strong>Questions or concerns?</strong><br>
                Contact our support team or visit our website<br>
                <br>
                © 2025 Sky Talk. All rights reserved.<br>
                <a href="#" class="footer-link">Privacy Policy</a> | 
                <a href="#" class="footer-link">Terms of Service</a>
              </p>
            </div>
          </div>
        </body>
        </html>
      `
    };

    const info = await transporter.sendMail(mailOptions);
    
    console.log('✅ OTP email sent successfully');
    console.log('   Message ID:', info.messageId);
    console.log('   To:', email);
    
    return info;

  } catch (error) {
    console.error('❌ Failed to send OTP email:');
    console.error('   Error:', error.message);
    console.error('   Code:', error.code);
    
    console.log('\n' + '═'.repeat(60));
    console.log('📝 OTP FALLBACK (Email Failed):');
    console.log('═'.repeat(60));
    console.log(`🔐 OTP: ${otp}`);
    console.log(`📧 Intended for: ${email}`);
    console.log('═'.repeat(60) + '\n');
    
    return Promise.resolve();
  }
};

// ============================================
// SEND FRIEND REQUEST EMAIL - PROFESSIONAL DESIGN
// ============================================

export const sendFriendRequestEmail = async (email, senderName) => {
  if (!emailServiceEnabled || !transporter) {
    console.log(`📧 Friend request: ${senderName} → ${email}`);
    return Promise.resolve();
  }

  try {
    console.log('\n📧 Sending friend request email to:', email);
    
    const mailOptions = {
      from: `"Sky Talk" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: `🤝 ${senderName} sent you a friend request on Sky Talk!`,
      text: `${senderName} sent you a friend request on Sky Talk! Login to accept or decline this request.`,
      html: `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Sky Talk - Friend Request</title>
          <style>
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            body {
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              padding: 20px;
              min-height: 100vh;
            }
            .container {
              max-width: 600px;
              margin: 0 auto;
              background: #ffffff;
              border-radius: 12px;
              box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
              overflow: hidden;
            }
            .header {
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              padding: 40px 20px;
              text-align: center;
              color: #ffffff;
            }
            .header-logo {
              font-size: 48px;
              margin-bottom: 15px;
            }
            .header-title {
              font-size: 28px;
              font-weight: 700;
            }
            .content {
              padding: 40px;
              text-align: center;
            }
            .message {
              font-size: 16px;
              color: #333;
              margin-bottom: 30px;
              line-height: 1.6;
            }
            .sender-name {
              font-size: 36px;
              font-weight: 700;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              -webkit-background-clip: text;
              -webkit-text-fill-color: transparent;
              background-clip: text;
              margin: 30px 0;
            }
            .action-buttons {
              margin: 30px 0;
            }
            .btn {
              display: inline-block;
              padding: 12px 30px;
              margin: 0 10px;
              border-radius: 8px;
              text-decoration: none;
              font-weight: 600;
              font-size: 14px;
              transition: all 0.3s ease;
            }
            .btn-primary {
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: #ffffff;
            }
            .btn-primary:hover {
              transform: translateY(-2px);
              box-shadow: 0 5px 20px rgba(102, 126, 234, 0.4);
            }
            .divider {
              height: 1px;
              background: #eee;
              margin: 30px 0;
            }
            .footer {
              background: #f8f9fa;
              padding: 30px 40px;
              text-align: center;
              border-top: 1px solid #eee;
            }
            .footer-text {
              font-size: 12px;
              color: #999;
              line-height: 1.8;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <!-- Header -->
            <div class="header">
              <div class="header-logo">🤝</div>
              <div class="header-title">New Friend Request</div>
            </div>

            <!-- Content -->
            <div class="content">
              <p class="message">
                Great news! You have a new friend request on Sky Talk:
              </p>

              <div class="sender-name">${senderName}</div>

              <p class="message">
                Login to Sky Talk to accept or decline this request and start chatting!
              </p>

              <div class="action-buttons">
                <a href="${process.env.FRONTEND_URL}" class="btn btn-primary">
                  Open Sky Talk
                </a>
              </div>

              <div class="divider"></div>

              <p style="font-size: 13px; color: #666;">
                You're receiving this email because ${senderName} sent you a friend request on Sky Talk.
              </p>
            </div>

            <!-- Footer -->
            <div class="footer">
              <p class="footer-text">
                © 2025 Sky Talk. All rights reserved.<br>
                <a href="#" style="color: #667eea; text-decoration: none;">Privacy Policy</a> | 
                <a href="#" style="color: #667eea; text-decoration: none;">Terms of Service</a>
              </p>
            </div>
          </div>
        </body>
        </html>
      `
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Friend request email sent successfully');
    return info;
    
  } catch (error) {
    console.error('❌ Friend request email failed:', error.message);
    return Promise.resolve();
  }
};

export default transporter;