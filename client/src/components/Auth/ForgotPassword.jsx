import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import '../../styles/auth.css';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    setError('');

    try {
      const response = await api.post('/auth/forgot-password', { email });
      setMessage(response.data.message);
      setEmail('');
    } catch (err) {
      setError(err.response?.data?.message || 'Error sending reset email');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-container">
      <div className="auth-container">
        <div className="auth-box glass-card slide-in-up">
          <div className="auth-header">
            <div className="auth-logo">🔐</div>
            <h1 className="auth-title">Forgot Password</h1>
            <p className="auth-subtitle">Enter your email to receive a reset link</p>
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
                type="email"
                placeholder=" "
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <label>📧 Email Address</label>
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
                    Sending...
                  </>
                ) : (
                  <>
                    📧 Send Reset Link
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

export default ForgotPassword;
