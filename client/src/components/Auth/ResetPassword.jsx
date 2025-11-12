import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../../services/api';
import '../../styles/auth.css';

const ResetPassword = () => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [validToken, setValidToken] = useState(false);
  const [checking, setChecking] = useState(true);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const { token } = useParams();
  const navigate = useNavigate();

  const verifyToken = useCallback(async () => {
    try {
      const response = await api.get(`/auth/verify-reset-token/${token}`);
      if (response.data.valid) {
        setValidToken(true);
      }
    } catch (err) {
      setError('Invalid or expired reset link');
    } finally {
      setChecking(false);
    }
  }, [token]);

  useEffect(() => {
    verifyToken();
  }, [verifyToken]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await api.post('/auth/reset-password', {
        token,
        newPassword: password
      });
      
      setMessage(response.data.message);
      
      setTimeout(() => {
        navigate('/login');
      }, 2000);
      
    } catch (err) {
      setError(err.response?.data?.message || 'Error resetting password');
    } finally {
      setLoading(false);
    }
  };

  if (checking) {
    return (
      <div className="app-container">
        <div className="auth-container">
          <div className="auth-box glass-card slide-in-up">
            <div className="auth-header">
              <div className="auth-logo">🔍</div>
              <h1 className="auth-title">Verifying Link</h1>
              <p className="auth-subtitle">Please wait...</p>
            </div>
            <div style={{ textAlign: 'center', padding: '20px' }}>
              <div className="spinner"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!validToken) {
    return (
      <div className="app-container">
        <div className="auth-container">
          <div className="auth-box glass-card slide-in-up">
            <div className="auth-header">
              <div className="auth-logo">❌</div>
              <h1 className="auth-title">Invalid Reset Link</h1>
              <p className="auth-subtitle">{error}</p>
            </div>
            <div className="form-actions">
              <button 
                onClick={() => navigate('/forgot-password')} 
                className="btn btn-primary"
              >
                Request New Link
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app-container">
      <div className="auth-container">
        <div className="auth-box glass-card slide-in-up">
          <div className="auth-header">
            <div className="auth-logo">🔐</div>
            <h1 className="auth-title">Reset Password</h1>
            <p className="auth-subtitle">Enter your new password</p>
          </div>

          {message && (
            <div className="alert alert-success slide-in-up">
              ✅ {message}
            </div>
          )}

          {error && (
            <div className="alert alert-error shake">
              ❌ {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="auth-form">
            <div className="input-floating">
              <input
                type="password"
                placeholder=" "
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength="6"
              />
              <label>🔒 New Password</label>
            </div>

            <div className="input-floating">
              <input
                type="password"
                placeholder=" "
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength="6"
              />
              <label>🔒 Confirm Password</label>
            </div>

            <div className="form-actions">
              <button 
                type="submit" 
                className="btn btn-primary"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <div className="spinner" style={{ width: '20px', height: '20px', borderWidth: '3px' }}></div>
                    Resetting...
                  </>
                ) : (
                  <>
                    ✅ Reset Password
                  </>
                )}
              </button>
            </div>
          </form>

          <div className="auth-footer">
            <p className="auth-footer-text">
              Remember your password?{' '}
              <button 
                onClick={() => navigate('/login')} 
                className="auth-link"
                style={{ background: 'none', border: 'none', cursor: 'pointer' }}
              >
                Login here
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
