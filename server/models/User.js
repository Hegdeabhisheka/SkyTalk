import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema({
  username: { 
    type: String, 
    required: [true, 'Username is required'],
    unique: true,
    trim: true,
    minlength: [3, 'Username must be at least 3 characters']
  },
  email: { 
    type: String, 
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email']
  },
  password: { 
    type: String, 
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters']
  },
  avatar: { type: String, default: '' },
  
  // OTP fields
  otp: { type: String },
  otpExpiry: { type: Date },
  otpAttempts: { type: Number, default: 0 },
  otpBlockedUntil: { type: Date },
  lastOtpRequest: { type: Date },
  
  friends: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  createdAt: { type: Date, default: Date.now }
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Generate OTP
userSchema.methods.generateOTP = function() {
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  this.otp = otp;
  this.otpExpiry = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes
  this.lastOtpRequest = new Date();
  return otp;
};

// Verify OTP
userSchema.methods.verifyOTP = function(inputOtp) {
  if (!this.otp || !this.otpExpiry || this.otpExpiry < new Date()) {
    return { success: false, message: 'OTP has expired' };
  }

  if (this.otp !== inputOtp) {
    this.otpAttempts += 1;
    
    if (this.otpAttempts >= 5) {
      this.otpBlockedUntil = new Date(Date.now() + 60 * 60 * 1000);
      this.otp = undefined;
      this.otpExpiry = undefined;
      return { 
        success: false, 
        message: 'Too many failed attempts. Account blocked for 1 hour.',
        blocked: true
      };
    }
    
    return { 
      success: false, 
      message: `Invalid OTP. ${5 - this.otpAttempts} attempts remaining.` 
    };
  }

  this.otp = undefined;
  this.otpExpiry = undefined;
  this.otpAttempts = 0;
  this.otpBlockedUntil = undefined;
  
  return { success: true, message: 'OTP verified successfully' };
};

export default mongoose.model('User', userSchema);
