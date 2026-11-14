import React from 'react';
import { NavLink } from 'react-router-dom';
import { Sparkles } from 'lucide-react';
import './LandingPage.css';

export const LandingPage = () => {
  return (
    <div className="entrance-page">
      <div className="entrance-container">
        {/* LearnMate Logo */}
        <div className="entrance-logo">
          <div className="entrance-logo-icon">
            <Sparkles size={28} />
          </div>
          <span className="entrance-logo-text">LearnMate</span>
        </div>

        {/* Tagline */}
        <p className="entrance-tagline">
          Your studies, organized in one place.
        </p>

        {/* Action Buttons */}
        <div className="entrance-actions">
          <NavLink to="/signup" className="btn btn-primary btn-lg entrance-btn">
            Create Account
          </NavLink>
          <NavLink to="/login" className="btn btn-secondary btn-lg entrance-btn">
            Sign In
          </NavLink>
        </div>
      </div>
    </div>
  );
};
