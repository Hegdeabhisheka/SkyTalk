import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { authAPI } from '../../services/api';
import '../../styles/auth.css';

function OTPVerify() {
  const navigate = useNavigate();
  const location = useLocation();
  const email = location.state?.email;
  
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [timeLeft, setTimeLeft] = useState(300);
  const [canResend, setCanResend] = useState(false);
  
  const inputRefs = useRef([]);

  useEffect(() => {
    if (!email) {
      console.log('No email in location.state, redirecting to login');
      navigate('/login');
    } else {
      console.log('Email received:', email);
    }
  }, [email, navigate]);

  useEffect(() => {
    if (timeLeft <= 0) {
      setCanResend(true);
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleChange = (index, value) => {
    if (value && !/^\d$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    if (value && index < 5) {
      inputRefs.current[index + 1].focus();
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1].focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').slice(0, 6);
    const newOtp = pastedData.split('').slice(0, 6);
    
    while (newOtp.length < 6) {
      newOtp.push('');
    }
    
    setOtp(newOtp);
    
    const lastFilledIndex = newOtp.findIndex(val => !val);
    const focusIndex = lastFilledIndex === -1 ? 5 : lastFilledIndex;
    inputRefs.current[focusIndex].focus();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const otpString = otp.join('');
    
    console.log('=== FRONTEND: OTP SUBMISSION ===');
    console.log('Email:', email);
    console.log('OTP:', otpString);
    
    if (otpString.length !== 6) {
      setError('Please enter all 6 digits');
      return;
    }

    setLoading(true);

    try {
      console.log('Calling verifyOTP API...');
      const response = await authAPI.verifyOTP({
        email,
        otp: otpString,
      });

      console.log('API Response:', response.data);

      if (response.data.success) {
        console.log('Saving tokens to localStorage...');
        localStorage.setItem('accessToken', response.data.accessToken);
        localStorage.setItem('refreshToken', response.data.refreshToken);
        localStorage.setItem('user', JSON.stringify(response.data.user));
        
        console.log('Tokens saved. Checking...');
        console.log('AccessToken exists:', !!localStorage.getItem('accessToken'));
        console.log('User exists:', !!localStorage.getItem('user'));

        console.log('Navigating to dashboard...');
        
        // Force navigation with window.location
        setTimeout(() => {
          window.location.href = '/dashboard';
        }, 1000);
      }

    } catch (err) {
      console.error('=== FRONTEND: OTP ERROR ===');
      console.error('Error:', err);
      console.error('Response:', err.response?.data);
      
      setError(err.response?.data?.message || 'Invalid OTP. Please try again.');
      setOtp(['', '', '', '', '', '']);
      inputRefs.current[0].focus();
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!canResend) return;
    
    setLoading(true);
    setError('');

    try {
      const password = prompt('Enter your password to resend OTP:');
      if (!password) {
        setLoading(false);
        return;
      }

      const response = await authAPI.requestOTP({
        email,
        password,
      });

      console.log('OTP resent:', response.data);
      
      setTimeLeft(300);
      setCanResend(false);
      setOtp(['', '', '', '', '', '']);
      inputRefs.current[0].focus();

      alert('New OTP sent to your email!');

    } catch (err) {
      console.error('Resend OTP error:', err);
      setError(err.response?.data?.message || 'Failed to resend OTP.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-container">
      <div className="auth-container">
        <div className="auth-box glass-card scale-in-bounce">
          <div className="auth-header">
            <div className="auth-logo">📧</div>
            <h1 className="auth-title">Enter OTP</h1>
            <p className="auth-subtitle">
              We've sent a 6-digit code to<br />
              <strong>{email}</strong>
            </p>
          </div>

          {error && (
            <div className="alert alert-error shake">
              ⚠️ {error}
            </div>
          )}

          {location.state?.message && !error && (
            <div className="alert alert-success fade-in">
              ✅ {location.state.message}
            </div>
          )}

          <form className="auth-form" onSubmit={handleSubmit}>
            <div className="otp-inputs" onPaste={handlePaste}>
              {otp.map((digit, index) => (
                <input
                  key={index}
                  ref={(el) => (inputRefs.current[index] = el)}
                  type="text"
                  inputMode="numeric"
                  className="otp-input"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleChange(index, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(index, e)}
                  autoFocus={index === 0}
                  disabled={loading}
                />
              ))}
            </div>

            <div style={{ textAlign: 'center' }}>
              <div className={`otp-timer ${timeLeft > 60 ? 'success' : ''}`}>
                ⏱️ {timeLeft > 0 ? `Valid for ${formatTime(timeLeft)}` : 'OTP Expired'}
              </div>

              <div className="resend-otp">
                {canResend ? (
                  <button
                    type="button"
                    className="resend-link"
                    onClick={handleResend}
                    disabled={loading}
                  >
                    🔄 Resend OTP
                  </button>
                ) : (
                  <span style={{ color: 'var(--gray-500)', fontSize: '0.875rem' }}>
                    Resend available in {formatTime(timeLeft)}
                  </span>
                )}
              </div>
            </div>

            <div className="form-actions">
              <button 
                type="submit" 
                className="btn btn-primary"
                disabled={loading || otp.join('').length !== 6}
              >
                {loading ? (
                  <>
                    <div className="spinner" style={{ width: '20px', height: '20px', borderWidth: '3px' }}></div>
                    Verifying...
                  </>
                ) : (
                  <>
                    ✅ Verify & Login
                  </>
                )}
              </button>

              <button 
                type="button" 
                className="btn btn-secondary"
                onClick={() => navigate('/login')}
                disabled={loading}
              >
                ← Back to Login
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default OTPVerify;
