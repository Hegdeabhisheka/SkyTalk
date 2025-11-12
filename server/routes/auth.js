import express from 'express';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';  // 🆕 Added for password reset
import User from '../models/User.js';
import { sendOTPEmail, sendEmail } from '../config/email.js';  // 🆕 Added sendEmail
import { generateTokens, verifyToken } from '../middleware/auth.js';

const router = express.Router();

// ============================================
// CONSOLE LOGGING HELPER
// ============================================

const logSection = (title) => {
  console.log('\n' + '═'.repeat(60));
  console.log(`🔐 ${title}`);
  console.log('═'.repeat(60));
};

const logSuccess = (message) => {
  console.log(`✅ ${message}`);
};

const logWarning = (message) => {
  console.log(`⚠️  ${message}`);
};

const logError = (message) => {
  console.log(`❌ ${message}`);
};

// ============================================
// TEST ROUTE
// ============================================

router.get('/test', (req, res) => {
  res.json({ 
    success: true,
    message: '☁️ Sky Talk Auth route working!',
    timestamp: new Date().toISOString()
  });
});

// ============================================
// 1. REGISTER ENDPOINT
// ============================================

router.post('/register', async (req, res) => {
  try {
    logSection('USER REGISTRATION');
    
    const { username, email, password } = req.body;

    console.log('📝 Registration Request:');
    console.log('  Username:', username);
    console.log('  Email:', email);

    // Validation
    if (!username || !email || !password) {
      logError('Missing required fields');
      return res.status(400).json({ 
        success: false,
        message: 'Please provide username, email, and password' 
      });
    }

    // Username validation
    if (username.length < 3) {
      logError('Username too short');
      return res.status(400).json({ 
        success: false,
        message: 'Username must be at least 3 characters' 
      });
    }

    // Password validation
    if (password.length < 6) {
      logError('Password too short');
      return res.status(400).json({ 
        success: false,
        message: 'Password must be at least 6 characters' 
      });
    }

    // Email validation
    const emailRegex = /^\S+@\S+\.\S+$/;
    if (!emailRegex.test(email)) {
      logError('Invalid email format');
      return res.status(400).json({ 
        success: false,
        message: 'Please enter a valid email address' 
      });
    }

    // Check for existing user
    console.log('🔍 Checking for existing user...');
    const existingUser = await User.findOne({ 
      $or: [{ email }, { username }] 
    });

    if (existingUser) {
      if (existingUser.email === email) {
        logError('Email already registered');
        return res.status(400).json({ 
          success: false,
          message: '📧 Email already registered. Please login or use a different email.' 
        });
      } else {
        logError('Username already taken');
        return res.status(400).json({ 
          success: false,
          message: '👤 Username already taken. Please choose another.' 
        });
      }
    }

    // Create new user
    console.log('📝 Creating new user...');
    const user = new User({
      username,
      email,
      password
    });

    await user.save();
    logSuccess('User created successfully');

    // Log the new user
    console.log('  User ID:', user._id);
    console.log('  Username:', user.username);
    console.log('  Email:', user.email);
    console.log('═'.repeat(60) + '\n');

    res.status(201).json({ 
      success: true,
      message: '🎉 Registration successful! You can now login with OTP.',
      user: {
        id: user._id,
        username: user.username,
        email: user.email
      }
    });

  } catch (error) {
    logError('Registration error');
    console.error(error);
    
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors)
        .map(e => e.message)
        .join(', ');
      return res.status(400).json({ 
        success: false,
        message: messages
      });
    }

    res.status(500).json({ 
      success: false,
      message: 'Server error during registration' 
    });
  }
});

// ============================================
// 2. REQUEST OTP ENDPOINT
// ============================================

router.post('/request-otp', async (req, res) => {
  try {
    logSection('REQUEST OTP');
    
    const { email, password } = req.body;

    console.log('📧 Email:', email);
    console.log('🔒 Password: ***hidden***');

    // Validation
    if (!email || !password) {
      logError('Missing email or password');
      return res.status(400).json({ 
        success: false,
        message: 'Please provide email and password' 
      });
    }

    // Find user
    console.log('🔍 Looking for user...');
    const user = await User.findOne({ email });
    
    if (!user) {
      logError('User not found');
      return res.status(401).json({ 
        success: false,
        message: 'Invalid email or password' 
      });
    }

    logSuccess('User found: ' + user.username);

    // Verify password
    console.log('🔐 Verifying password...');
    const isMatch = await user.comparePassword(password);
    
    if (!isMatch) {
      logError('Password mismatch');
      return res.status(401).json({ 
        success: false,
        message: 'Invalid email or password' 
      });
    }

    logSuccess('Password verified');

    // Check if account is blocked
    if (user.otpBlockedUntil && user.otpBlockedUntil > new Date()) {
      const minutesLeft = Math.ceil((user.otpBlockedUntil - new Date()) / 60000);
      logWarning(`Account blocked for ${minutesLeft} more minutes`);
      return res.status(429).json({ 
        success: false,
        message: `⏳ Too many failed attempts. Please try again in ${minutesLeft} minutes.`,
        blocked: true,
        blockedUntil: user.otpBlockedUntil
      });
    }

    // Check rate limiting (60 second cooldown)
    if (user.lastOtpRequest) {
      const timeSinceLastRequest = Date.now() - user.lastOtpRequest.getTime();
      console.log(`⏱️  Time since last OTP request: ${Math.floor(timeSinceLastRequest / 1000)}s`);
      
      if (timeSinceLastRequest < 60000) {
        const secondsLeft = Math.ceil((60000 - timeSinceLastRequest) / 1000);
        logWarning(`Rate limited: ${secondsLeft}s remaining`);
        return res.status(429).json({ 
          success: false,
          message: `⏱️  Please wait ${secondsLeft} seconds before requesting another OTP.`,
          retryAfter: secondsLeft
        });
      }
    }

    // Generate OTP
    console.log('🎲 Generating OTP...');
    const otp = user.generateOTP();
    await user.save();

    console.log('  Generated OTP:', otp);
    console.log('  Expires at:', user.otpExpiry);
    console.log('  Valid for: 5 minutes');

    // Try to send email
    let emailSent = false;
    try {
      console.log('📧 Attempting to send OTP email...');
      await sendOTPEmail(user.email, user.username, otp);
      emailSent = true;
      logSuccess('OTP email sent successfully');
    } catch (emailError) {
      logWarning('Email service unavailable: ' + emailError.message);
      console.log('📝 OTP available in console for development testing');
      // Don't fail - show OTP in console for development
    }

    console.log('═'.repeat(60) + '\n');

    res.json({ 
      success: true,
      message: '📧 OTP sent to your email! Valid for 5 minutes.',
      expiresIn: 300,
      emailSent: emailSent,
      // For development testing only - remove in production
      ...(process.env.NODE_ENV === 'development' && { testOTP: otp })
    });

  } catch (error) {
    logError('Request OTP error');
    console.error(error);
    res.status(500).json({ 
      success: false,
      message: 'Server error while requesting OTP' 
    });
  }
});

// ============================================
// 3. VERIFY OTP ENDPOINT
// ============================================

router.post('/verify-otp', async (req, res) => {
  try {
    logSection('VERIFY OTP');
    
    const { email, otp } = req.body;

    console.log('📧 Email:', email);
    console.log('🔐 OTP: ' + '*'.repeat(otp?.length || 0));

    // Validation
    if (!email || !otp) {
      logError('Missing email or OTP');
      return res.status(400).json({ 
        success: false,
        message: 'Please provide email and OTP' 
      });
    }

    // Find user
    console.log('🔍 Looking for user...');
    const user = await User.findOne({ email });
    
    if (!user) {
      logError('User not found');
      return res.status(404).json({ 
        success: false,
        message: 'User not found' 
      });
    }

    logSuccess('User found: ' + user.username);

    // Check if account is blocked
    if (user.otpBlockedUntil && user.otpBlockedUntil > new Date()) {
      const minutesLeft = Math.ceil((user.otpBlockedUntil - new Date()) / 60000);
      logError(`Account blocked for ${minutesLeft} more minutes`);
      return res.status(429).json({ 
        success: false,
        message: `🔒 Account blocked. Please try again in ${minutesLeft} minutes.`,
        blocked: true
      });
    }

    // Verify OTP
    console.log('\n📋 OTP Details:');
    console.log('  Stored OTP:', user.otp);
    console.log('  Received OTP:', otp);
    console.log('  OTP Expiry:', user.otpExpiry);
    console.log('  Current Time:', new Date().toISOString());
    console.log('  Is Expired?', user.otpExpiry < new Date());

    const verificationResult = user.verifyOTP(otp);
    console.log('\n🔍 Verification Result:');
    console.log('  Success:', verificationResult.success);
    console.log('  Message:', verificationResult.message);

    if (!verificationResult.success) {
      await user.save();
      logError('OTP verification failed');
      return res.status(401).json(verificationResult);
    }

    // Clear OTP fields
    await user.save();
    logSuccess('OTP verified successfully!');

    // Generate tokens
    console.log('\n🔑 Generating tokens...');
    const { accessToken, refreshToken } = generateTokens(user._id);
    logSuccess('Tokens generated');

    console.log('  Access Token (first 50 chars):', accessToken.substring(0, 50) + '...');
    console.log('  Access Token Expires: 15 minutes');
    console.log('  Refresh Token Expires: 7 days');

    console.log('═'.repeat(60));
    console.log('🎉 LOGIN SUCCESSFUL');
    console.log('═'.repeat(60) + '\n');

    const response = {
      success: true,
      message: '☁️ Welcome to Sky Talk!',
      accessToken,
      refreshToken,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        avatar: user.avatar
      }
    };

    res.json(response);

  } catch (error) {
    logError('OTP verification error');
    console.error(error);
    console.log('═'.repeat(60) + '\n');
    
    res.status(500).json({ 
      success: false,
      message: 'Server error during OTP verification' 
    });
  }
});

// ============================================
// 4. GET CURRENT USER ENDPOINT
// ============================================

router.get('/me', verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    
    res.json({
      success: true,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        avatar: user.avatar,
        friends: user.friends,
        createdAt: user.createdAt
      }
    });
  } catch (error) {
    console.error('Get current user error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error fetching user data' 
    });
  }
});

// ============================================
// 5. REFRESH TOKEN ENDPOINT
// ============================================

router.post('/refresh-token', async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(401).json({ 
        success: false,
        message: 'Refresh token required' 
      });
    }

    // Verify refresh token
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    
    // Generate new tokens
    const { accessToken, refreshToken: newRefreshToken } = generateTokens(decoded.userId);

    console.log('✅ Tokens refreshed successfully');

    res.json({ 
      success: true,
      accessToken, 
      refreshToken: newRefreshToken,
      message: 'Tokens refreshed successfully'
    });

  } catch (error) {
    console.error('Refresh token error:', error);
    
    res.status(401).json({ 
      success: false,
      message: 'Invalid or expired refresh token' 
    });
  }
});

// ============================================
// 6. LOGOUT ENDPOINT
// ============================================

router.post('/logout', verifyToken, async (req, res) => {
  try {
    // Clear refresh token from client side
    // This is a placeholder - actual implementation depends on your session management
    
    res.json({
      success: true,
      message: '👋 Logged out successfully'
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      message: 'Server error during logout' 
    });
  }
});

// ============================================
// 🆕 7. FORGOT PASSWORD - REQUEST RESET
// ============================================

router.post('/forgot-password', async (req, res) => {
  try {
    logSection('FORGOT PASSWORD REQUEST');
    
    const { email } = req.body;

    console.log('📧 Reset request for:', email);

    // Validation
    if (!email) {
      logError('Missing email');
      return res.status(400).json({ 
        success: false,
        message: 'Please provide your email address' 
      });
    }

    // Find user
    console.log('🔍 Looking for user...');
    const user = await User.findOne({ email: email.toLowerCase() });
    
    if (!user) {
      logWarning('User not found - returning generic message for security');
      // Return success anyway to prevent email enumeration
      return res.json({ 
        success: true,
        message: '📧 If an account exists with this email, you will receive a password reset link.' 
      });
    }

    logSuccess('User found: ' + user.username);

    // Generate reset token (valid for 1 hour)
    console.log('🎲 Generating reset token...');
    const resetToken = crypto.randomBytes(32).toString('hex');
    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = Date.now() + 3600000; // 1 hour
    await user.save();

    console.log('  Token generated');
    console.log('  Expires at:', new Date(user.resetPasswordExpires).toISOString());

    // Create reset URL
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;
    console.log('  Reset URL:', resetUrl);

    // Send email
    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #06402B 0%, #0a5c3e 100%); padding: 30px; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 28px;">☁️ Sky Talk</h1>
        </div>
        
        <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
          <h2 style="color: #06402B; margin-top: 0;">🔐 Password Reset Request</h2>
          
          <p style="color: #333; font-size: 16px; line-height: 1.6;">
            Hello <strong>${user.username}</strong>,
          </p>
          
          <p style="color: #333; font-size: 16px; line-height: 1.6;">
            You requested to reset your password for your Sky Talk account.
          </p>
          
          <p style="color: #333; font-size: 16px; line-height: 1.6;">
            Click the button below to create a new password:
          </p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetUrl}" 
               style="background-color: #06402B; color: white; padding: 15px 40px; 
                      text-decoration: none; border-radius: 5px; display: inline-block;
                      font-weight: bold; font-size: 16px;">
              Reset My Password
            </a>
          </div>
          
          <div style="background: #fff; padding: 15px; border-radius: 5px; border-left: 4px solid #06402B;">
            <p style="margin: 0; color: #666; font-size: 14px;">
              Or copy and paste this link into your browser:
            </p>
            <p style="margin: 10px 0 0 0; word-break: break-all;">
              <a href="${resetUrl}" style="color: #06402B;">${resetUrl}</a>
            </p>
          </div>
          
          <div style="margin-top: 30px; padding: 15px; background: #fff3cd; border-radius: 5px; border-left: 4px solid #ffc107;">
            <p style="margin: 0; color: #856404; font-size: 14px;">
              ⏰ <strong>Important:</strong> This link will expire in 1 hour for security reasons.
            </p>
          </div>
          
          <p style="color: #666; font-size: 14px; margin-top: 20px; line-height: 1.6;">
            If you didn't request this password reset, please ignore this email. 
            Your password will remain unchanged.
          </p>
          
          <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
          
          <p style="color: #999; font-size: 12px; text-align: center; margin: 0;">
            Sky Talk - Connect the World ☁️
          </p>
        </div>
      </div>
    `;

    try {
      console.log('📧 Sending reset email...');
      await sendEmail(
        user.email,
        'Sky Talk - Password Reset Request',
        emailHtml
      );
      logSuccess('Reset email sent successfully');
    } catch (emailError) {
      logError('Failed to send email: ' + emailError.message);
      return res.status(500).json({
        success: false,
        message: 'Error sending reset email. Please try again later.'
      });
    }

    console.log('═'.repeat(60) + '\n');

    res.json({ 
      success: true,
      message: '📧 Password reset link sent to your email. Please check your inbox.',
      // For development testing
      ...(process.env.NODE_ENV === 'development' && { 
        testResetUrl: resetUrl,
        testToken: resetToken 
      })
    });

  } catch (error) {
    logError('Forgot password error');
    console.error(error);
    console.log('═'.repeat(60) + '\n');
    
    res.status(500).json({ 
      success: false,
      message: 'Server error processing password reset request' 
    });
  }
});

// ============================================
// 🆕 8. VERIFY RESET TOKEN
// ============================================

router.get('/verify-reset-token/:token', async (req, res) => {
  try {
    logSection('VERIFY RESET TOKEN');
    
    const { token } = req.params;

    console.log('🔍 Verifying token...');
    console.log('  Token (first 20 chars):', token.substring(0, 20) + '...');

    // Find user with valid token
    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() }
    });

    if (!user) {
      logError('Invalid or expired token');
      console.log('═'.repeat(60) + '\n');
      return res.status(400).json({ 
        success: false,
        message: 'Invalid or expired reset token',
        valid: false
      });
    }

    logSuccess('Token is valid');
    console.log('  User:', user.username);
    console.log('  Email:', user.email);
    console.log('  Expires:', new Date(user.resetPasswordExpires).toISOString());
    console.log('═'.repeat(60) + '\n');

    res.json({ 
      success: true,
      message: 'Token is valid',
      valid: true,
      email: user.email,
      username: user.username
    });

  } catch (error) {
    logError('Verify token error');
    console.error(error);
    console.log('═'.repeat(60) + '\n');
    
    res.status(500).json({ 
      success: false,
      message: 'Error verifying reset token' 
    });
  }
});

// ============================================
// 🆕 9. RESET PASSWORD
// ============================================

router.post('/reset-password', async (req, res) => {
  try {
    logSection('RESET PASSWORD');
    
    const { token, newPassword } = req.body;

    console.log('🔐 Processing password reset...');
    console.log('  Token (first 20 chars):', token?.substring(0, 20) + '...');

    // Validation
    if (!token || !newPassword) {
      logError('Missing token or password');
      return res.status(400).json({ 
        success: false,
        message: 'Token and new password are required' 
      });
    }

    if (newPassword.length < 6) {
      logError('Password too short');
      return res.status(400).json({ 
        success: false,
        message: 'Password must be at least 6 characters long' 
      });
    }

    // Find user with valid token
    console.log('🔍 Looking for user with valid token...');
    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() }
    });

    if (!user) {
      logError('Invalid or expired token');
      console.log('═'.repeat(60) + '\n');
      return res.status(400).json({ 
        success: false,
        message: 'Invalid or expired reset token. Please request a new password reset.' 
      });
    }

    logSuccess('User found: ' + user.username);

    // Update password
    console.log('🔄 Updating password...');
    user.password = newPassword;
    user.resetPasswordToken = null;
    user.resetPasswordExpires = null;
    
    // Clear any OTP blocks/attempts when resetting password
    user.otpAttempts = 0;
    user.otpBlockedUntil = null;
    
    await user.save();
    logSuccess('Password updated successfully');

    // Send confirmation email
    const confirmationHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #06402B 0%, #0a5c3e 100%); padding: 30px; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 28px;">☁️ Sky Talk</h1>
        </div>
        
        <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
          <h2 style="color: #06402B; margin-top: 0;">✅ Password Changed Successfully</h2>
          
          <p style="color: #333; font-size: 16px; line-height: 1.6;">
            Hello <strong>${user.username}</strong>,
          </p>
          
          <p style="color: #333; font-size: 16px; line-height: 1.6;">
            Your Sky Talk password has been successfully reset.
          </p>
          
          <div style="background: #d4edda; padding: 15px; border-radius: 5px; border-left: 4px solid #28a745; margin: 20px 0;">
            <p style="margin: 0; color: #155724; font-size: 14px;">
              ✅ You can now login with your new password.
            </p>
          </div>
          
          <div style="background: #fff3cd; padding: 15px; border-radius: 5px; border-left: 4px solid #ffc107; margin: 20px 0;">
            <p style="margin: 0; color: #856404; font-size: 14px;">
              🔒 <strong>Security Notice:</strong> If you didn't make this change, 
              please contact support immediately at 009skytalk@gmail.com
            </p>
          </div>
          
          <p style="color: #666; font-size: 14px; margin-top: 20px;">
            Reset Date: <strong>${new Date().toLocaleString()}</strong>
          </p>
          
          <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
          
          <p style="color: #999; font-size: 12px; text-align: center; margin: 0;">
            Sky Talk - Connect the World ☁️
          </p>
        </div>
      </div>
    `;

    try {
      console.log('📧 Sending confirmation email...');
      await sendEmail(
        user.email,
        'Sky Talk - Password Changed Successfully',
        confirmationHtml
      );
      logSuccess('Confirmation email sent');
    } catch (emailError) {
      logWarning('Failed to send confirmation email: ' + emailError.message);
      // Don't fail the request if confirmation email fails
    }

    console.log('═'.repeat(60));
    console.log('🎉 PASSWORD RESET SUCCESSFUL');
    console.log('═'.repeat(60) + '\n');

    res.json({ 
      success: true,
      message: '✅ Password reset successful! You can now login with your new password.',
      user: {
        username: user.username,
        email: user.email
      }
    });

  } catch (error) {
    logError('Reset password error');
    console.error(error);
    console.log('═'.repeat(60) + '\n');
    
    res.status(500).json({ 
      success: false,
      message: 'Server error resetting password' 
    });
  }
});

// ============================================
// ERROR HANDLER MIDDLEWARE
// ============================================

router.use((error, req, res, next) => {
  console.error('Auth route error:', error);
  
  res.status(500).json({
    success: false,
    message: 'An error occurred. Please try again.',
    error: process.env.NODE_ENV === 'development' ? error.message : undefined
  });
});

export default router;
