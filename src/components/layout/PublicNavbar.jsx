import React from 'react';
import { NavLink } from 'react-router-dom';
import { Sparkles, ArrowRight } from 'lucide-react';
import './PublicNavbar.css';

export const PublicNavbar = () => {
  return (
    <nav className="public-navbar">
      <div className="public-nav-container">
        <NavLink to="/" className="public-brand">
          <div className="brand-icon">
            <Sparkles size={20} />
          </div>
          <span className="brand-title">LearnMate</span>
        </NavLink>

        <div className="public-nav-links">
          <NavLink to="/" className="public-nav-link">Features</NavLink>
          <NavLink to="/dashboard" className="public-nav-link">Live Demo</NavLink>
          <NavLink to="/quizzes" className="public-nav-link">Sample Quizzes</NavLink>
        </div>

        <div className="public-nav-actions">
          <NavLink to="/login" className="btn btn-ghost btn-sm">
            Sign In
          </NavLink>
          <NavLink to="/signup" className="btn btn-primary btn-sm">
            Get Started Free <ArrowRight size={15} />
          </NavLink>
        </div>
      </div>
    </nav>
  );
};


