import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  Sparkles,
  ArrowRight,
  AlertCircle,
  LogIn
} from 'lucide-react';
import { PublicNavbar } from '../components/layout/PublicNavbar';
import { PublicFooter } from '../components/layout/PublicFooter';
import { useApp } from '../context/AppContext';
import './Auth.css';

export const SignupPage = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    institution: '',
    program: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const { signupUser } = useApp();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (formData.password.length < 6) {
      setErrorMessage('Password must be at least 6 characters long.');
      return;
    }

    setLoading(true);
    try {
      const result = await signupUser(formData);
      if (result.success) {
        // Instant registration -> Direct navigation to Dashboard
        navigate('/dashboard', { replace: true });
      } else {
        setErrorMessage(result.error || 'Unable to create account. Please check your details and try again.');
      }
    } catch (err) {
      setErrorMessage(err.message || 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  const isDuplicateAccount = errorMessage.toLowerCase().includes('already exists') ||
    errorMessage.toLowerCase().includes('already registered');

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
            <h2>Create Your Student Account</h2>
            <p>Start organizing your classes, deadlines, and revision today</p>
          </div>

          {/* Error Alert */}
          {errorMessage && (
            <div className="auth-error-alert" role="alert">
              <AlertCircle size={18} />
              <div>
                <span>{errorMessage}</span>
                {isDuplicateAccount && (
                  <div style={{ marginTop: '0.5rem' }}>
                    <NavLink to="/login" className="btn btn-sm btn-primary">
                      <LogIn size={14} /> Go to Sign In
                    </NavLink>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Registration Form */}
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Full Name</label>
              <input
                type="text"
                required
                className="form-input"
                placeholder="e.g. Jordan Smith"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                disabled={loading}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Email Address</label>
              <input
                type="email"
                required
                className="form-input"
                placeholder="you@university.edu"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                disabled={loading}
              />
            </div>

            <div className="form-group">
              <label className="form-label">University / College</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. University of Science & Tech"
                value={formData.institution}
                onChange={(e) => setFormData({ ...formData, institution: e.target.value })}
                disabled={loading}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Degree / Major</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. Computer Science"
                value={formData.program}
                onChange={(e) => setFormData({ ...formData, program: e.target.value })}
                disabled={loading}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Create Password</label>
              <input
                type="password"
                required
                className="form-input"
                placeholder="At least 6 characters"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                disabled={loading}
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary btn-lg"
              style={{ width: '100%', marginTop: '0.5rem' }}
              disabled={loading}
            >
              {loading ? 'Creating Account...' : 'Create Free Account'} <ArrowRight size={18} />
            </button>
          </form>

          <p className="auth-footer-text">
            Already have an account? <NavLink to="/login">Sign in here</NavLink>
          </p>
        </div>
      </div>
      <PublicFooter />
    </div>
  );
};
