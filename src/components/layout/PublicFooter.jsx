import React from 'react';
import { NavLink } from 'react-router-dom';
import { Sparkles, Heart } from 'lucide-react';
import './PublicFooter.css';

const CURRENT_YEAR = new Date().getFullYear();

export const PublicFooter = () => {
  return (
    <footer className="public-footer">
      <div className="footer-container">
        <div className="footer-top">
          <div className="footer-brand-col">
            <div className="public-brand">
              <div className="brand-icon">
                <Sparkles size={18} />
              </div>
              <span className="brand-title">LearnMate</span>
            </div>
            <p className="footer-tagline">
              Empowering students worldwide to organize studies, conquer exams, and achieve their academic goals.
            </p>
          </div>

          <div className="footer-links-grid">
            <div className="footer-col">
              <h4>Product</h4>
              <NavLink to="/dashboard">Dashboard</NavLink>
              <NavLink to="/timetable">Timetable</NavLink>
              <NavLink to="/assignments">Assignments</NavLink>
              <NavLink to="/quizzes">Quizzes</NavLink>
            </div>
            <div className="footer-col">
              <h4>Tools</h4>
              <NavLink to="/study-planner">Study Timer</NavLink>
              <NavLink to="/exams">Exam Tracker</NavLink>
              <NavLink to="/notes">Smart Notes</NavLink>
              <NavLink to="/analytics">Analytics</NavLink>
            </div>
            <div className="footer-col">
              <h4>Account</h4>
              <NavLink to="/login">Sign In</NavLink>
              <NavLink to="/signup">Register Free</NavLink>
              <NavLink to="/settings">Settings</NavLink>
            </div>
          </div>
        </div>

        <div className="footer-bottom">
          <p>© {CURRENT_YEAR} LearnMate Inc. Designed with care for students.</p>
          <div className="footer-badge">
            Built for Academic Excellence <Heart size={14} color="#EF4444" fill="#EF4444" />
          </div>
        </div>
      </div>
    </footer>
  );
};
