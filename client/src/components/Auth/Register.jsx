import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authAPI } from '../../services/api';
import '../../styles/auth.css';

function Register() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    
    // Check password strength
    if (name === 'password') {
      checkPasswordStrength(value);
    }
  };

  const checkPasswordStrength = (password) => {
    if (password.length < 6) {
      setPasswordStrength('weak');
    } else if (password.length < 10) {
      setPasswordStrength('medium');
    } else {
      setPasswordStrength('strong');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Validation
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);

    try {
      const response = await authAPI.register({
        username: formData.username,
        email: formData.email,
        password: formData.password,
      });

      console.log('Registration response:', response.data);
      setSuccess(true);
      
      // Redirect to login after 3 seconds
      setTimeout(() => {
        navigate('/login');
      }, 3000);

    } catch (err) {
      console.error('Registration error:', err);
      setError(err.response?.data?.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="app-container">
        <div className="auth-container">
          <div className="auth-box glass-card">
            <div className="auth-success">
              <div className="success-icon">✨</div>
              <h2 className="success-message">Registration Successful!</h2>
              <p className="success-submessage">
                Welcome to Sky Talk! Redirecting you to login...
              </p>
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
            <div className="auth-logo">☁️</div>
            <h1 className="auth-title">Join Sky Talk</h1>
            <p className="auth-subtitle">Create your account and start connecting</p>
          </div>

          {error && (
            <div className="alert alert-error shake">
              ⚠️ {error}
            </div>
          )}

          <form className="auth-form" onSubmit={handleSubmit}>
            <div className="input-group">
              <label className="input-label">Username</label>
              <input
                type="text"
                name="username"
                className="input-field"
                placeholder="Enter your username"
                value={formData.username}
                onChange={handleChange}
                required
                minLength={3}
              />
            </div>

            <div className="input-group">
              <label className="input-label">Email Address</label>
              <input
                type="email"
                name="email"
                className="input-field"
                placeholder="Enter your email"
                value={formData.email}
                onChange={handleChange}
                required
              />
            </div>

            <div className="input-group">
              <label className="input-label">Password</label>
              <input
                type="password"
                name="password"
                className="input-field"
                placeholder="Create a password"
                value={formData.password}
                onChange={handleChange}
                required
                minLength={6}
              />
              {formData.password && (
                <div className="password-strength">
                  <div className={`password-strength-bar ${passwordStrength}`}></div>
                </div>
              )}
              <p className="password-hint">
                Password strength: {passwordStrength || 'none'}
              </p>
            </div>

            <div className="input-group">
              <label className="input-label">Confirm Password</label>
              <input
                type="password"
                name="confirmPassword"
                className="input-field"
                placeholder="Confirm your password"
                value={formData.confirmPassword}
                onChange={handleChange}
                required
              />
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
                    Creating Account...
                  </>
                ) : (
                  <>
                    🚀 Create Account
                  </>
                )}
              </button>
            </div>
          </form>

          <div className="auth-footer">
            <p className="auth-footer-text">
              Already have an account?{' '}
              <Link to="/login" className="auth-link">
                Login here
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Register;
