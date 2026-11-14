import React, { useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Calendar,
  CheckSquare,
  BookOpen,
  GraduationCap,
  Timer,
  HelpCircle,
  BarChart3,
  Settings,
  X,
  Sparkles,
  LogOut,
  Flame,
  Bot
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { ThemeToggle } from '../common/ThemeToggle';
import './MobileNav.css';

const navItems = [
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/timetable', label: 'Timetable', icon: Calendar },
  { path: '/assignments', label: 'Assignments', icon: CheckSquare },
  { path: '/notes', label: 'Notes', icon: BookOpen },
  { path: '/exams', label: 'Exam Planner', icon: GraduationCap },
  { path: '/study-planner', label: 'Study Planner', icon: Timer },
  { path: '/quizzes', label: 'Quizzes', icon: HelpCircle },
  { path: '/doubt-solver', label: 'AI Doubt Solver', icon: Bot },
  { path: '/analytics', label: 'Analytics', icon: BarChart3 },
  { path: '/settings', label: 'Profile & Settings', icon: Settings },
];

export const MobileNav = ({ isOpen, onClose }) => {
  const { user, logoutUser } = useApp();
  const navigate = useNavigate();

  // Prevent background scrolling when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="mobile-nav-backdrop" onClick={onClose}>
      <div className="mobile-nav-drawer" onClick={(e) => e.stopPropagation()}>
        {/* Drawer Header */}
        <div className="mobile-nav-header">
          <div className="mobile-brand">
            <div className="brand-icon">
              <Sparkles size={20} />
            </div>
            <div className="brand-text">
              <span className="brand-title">LearnMate</span>
              <span className="brand-subtitle">Study Workspace</span>
            </div>
          </div>
          <button className="mobile-close-btn" onClick={onClose} aria-label="Close menu">
            <X size={20} />
          </button>
        </div>

        {/* Streak card */}
        <div className="mobile-streak-box">
          <Flame size={18} className="mobile-streak-icon" />
          <div>
            <strong>{user.studyStreak || 0} Day Streak</strong>
            <p>Today: {user.todayCompletedHours || 0}h / {user.dailyGoalHours || 4.0}h studied</p>
          </div>
        </div>

        {/* Nav Links */}
        <nav className="mobile-nav-list">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) => `mobile-nav-item ${isActive ? 'active' : ''}`}
                onClick={onClose}
              >
                <Icon size={20} />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="mobile-nav-footer">
          <div style={{ marginBottom: '0.75rem', width: '100%' }}>
            <ThemeToggle showLabels style={{ width: '100%', justifyContent: 'center' }} />
          </div>
          <NavLink to="/settings" className="mobile-user-card" onClick={onClose}>
            <img src={user.avatar} alt={user.name || 'Student'} className="user-avatar" />
            <div className="user-meta">
              <span className="user-name">{user.name || 'Student'}</span>
              <span className="user-role">{user.program || 'Student Profile'}</span>
            </div>
          </NavLink>
          <button
            className="btn btn-secondary btn-sm"
            style={{ width: '100%', marginTop: '0.75rem' }}
            onClick={async () => {
              await logoutUser();
              onClose();
              navigate('/login');
            }}
          >
            <LogOut size={16} /> Sign out
          </button>
        </div>
      </div>
    </div>
  );
};
