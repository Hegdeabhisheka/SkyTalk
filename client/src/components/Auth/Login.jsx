import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authAPI } from '../../services/api';
import '../../styles/auth.css';

function Login() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Request OTP
      const response = await authAPI.requestOTP({
        email: formData.email,
        password: formData.password,
      });

      console.log('OTP requested:', response.data);
      
      // Navigate to OTP verification page
      navigate('/verify-otp', { 
        state: { 
          email: formData.email,
          message: response.data.message 
        } 
      });

    } catch (err) {
      console.error('Login error:', err);
      setError(err.response?.data?.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-container">
      <div className="auth-container">
        <div className="auth-box glass-card slide-in-up">
          <div className="auth-header">
            <div className="auth-logo">☁️</div>
            <h1 className="auth-title">Welcome Back</h1>
            <p className="auth-subtitle">Login to continue to Sky Talk</p>
          </div>

          {error && (
            <div className="alert alert-error shake">
              ⚠️ {error}
            </div>
          )}

          <form className="auth-form" onSubmit={handleSubmit}>
            <div className="input-floating">
              <input
                type="email"
                name="email"
                placeholder=" "
                value={formData.email}
                onChange={handleChange}
                required
              />
              <label>Email Address</label>
            </div>

            <div className="input-floating">
              <input
                type="password"
                name="password"
                placeholder=" "
                value={formData.password}
                onChange={handleChange}
                required
                minLength={6}
              />
              <label>Password</label>
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
                    Sending OTP...
                  </>
                ) : (
                  <>
                    🔐 Get OTP
                  </>
                )}
              </button>
            </div>
          </form>

          <div className="auth-footer">
            <p className="auth-footer-text">
              Don't have an account?{' '}
              <Link to="/register" className="auth-link">
                Register here
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Login;
