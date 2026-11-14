import React, { useState } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import {
  Sparkles,
  ArrowRight,
  UserCheck,
  AlertCircle
} from 'lucide-react';
import { PublicNavbar } from '../components/layout/PublicNavbar';
import { PublicFooter } from '../components/layout/PublicFooter';
import { useApp } from '../context/AppContext';
import './Auth.css';

export const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const { loginUser, loginDemoUser } = useApp();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogin = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setLoading(true);

    try {
      const result = await loginUser(email, password);
      if (result.success) {
        const destination = location.state?.from?.pathname || '/dashboard';
        navigate(destination, { replace: true });
      } else {
        setErrorMessage(result.error || 'Invalid email or password.');
      }
    } catch (err) {
      setErrorMessage(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = () => {
    loginDemoUser();
    navigate('/dashboard');
  };

  return (
    <div className="auth-container">
      <PublicNavbar />
      <div className="auth-wrapper">
        <div className="auth-card">
          <div className="auth-header">
            <NavLink to="/" className="auth-logo">
              <div className="brand-icon">
                <Sparkles size={20} />
              </div>
              <span className="brand-title">LearnMate</span>
            </NavLink>
            <h2>Welcome Back</h2>
            <p>Sign in to resume your study plans and assignments</p>
          </div>

          {/* Error Alert */}
          {errorMessage && (
            <div className="auth-error-alert" role="alert">
              <AlertCircle size={18} />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Quick Offline / Guest Login */}
          <div className="demo-login-box">
            <p>⚡ Quick Offline Evaluation</p>
            <button
              type="button"
              className="btn btn-soft btn-sm"
              style={{ width: '100%' }}
              onClick={handleDemoLogin}
            >
              <UserCheck size={16} /> Continue in Guest Mode
            </button>
          </div>

          <div className="divider">
            <span>or sign in with email</span>
          </div>

          <form onSubmit={handleLogin}>
            <div className="form-group">
              <label className="form-label">Student / University Email</label>
              <div style={{ position: 'relative' }}>
                <input
                  type="email"
                  required
                  className="form-input"
                  placeholder="name@university.edu"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Password</label>
              <input
                type="password"
                required
                className="form-input"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
              />
            </div>

            <div className="form-check">
              <label>
                <input type="checkbox" defaultChecked /> Remember me
              </label>
            </div>

            <button
              type="submit"
              className="btn btn-primary btn-lg"
              style={{ width: '100%' }}
              disabled={loading}
            >
              {loading ? 'Signing In...' : 'Sign In to LearnMate'} <ArrowRight size={18} />
            </button>
          </form>

          <p className="auth-footer-text">
            Don't have an account yet? <NavLink to="/signup">Register free</NavLink>
          </p>
        </div>
      </div>
      <PublicFooter />
    </div>
  );
};
