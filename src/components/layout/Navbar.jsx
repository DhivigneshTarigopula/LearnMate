import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Menu,
  Search,
  Bell,
  Flame,
  CheckCircle2,
  Calendar,
  AlertCircle,
  X,
  User,
  Settings,
  LogOut,
  ChevronDown
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { ThemeToggle } from '../common/ThemeToggle';
import './Navbar.css';

const PAGE_TITLES = {
  '/dashboard': 'Dashboard',
  '/timetable': 'My Timetable',
  '/exams': 'My Exam Planner',
  '/assignments': 'My Assignments',
  '/notes': 'My Notes & Materials',
  '/doubt-solver': 'AI Doubt Solver',
  '/analytics': 'My Learning Progress',
  '/study-planner': 'Study Focus Timer',
  '/quizzes': 'Quizzes & Practice',
  '/settings': 'Profile & Settings'
};

export const Navbar = ({ onOpenMobileNav }) => {
  const { user, globalSearch, setGlobalSearch, assignments = [], exams = [], logoutUser } = useApp();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const profileMenuRef = useRef(null);
  const notifMenuRef = useRef(null);

  const currentTitle = PAGE_TITLES[location.pathname] || 'LearnMate';

  const todayStr = useMemo(() => new Date().toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric'
  }), []);

  // Close menus on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(e.target)) {
        setShowProfileMenu(false);
      }
      if (notifMenuRef.current && !notifMenuRef.current.contains(e.target)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const notifications = [];

  // Urgent pending assignments
  assignments
    .filter((a) => a.status === 'pending')
    .slice(0, 3)
    .forEach((asg) => {
      notifications.push({
        id: `asg_${asg.id}`,
        title: 'Assignment Pending',
        desc: `${asg.title} (${asg.courseCode || asg.subject})`,
        icon: AlertCircle,
        time: asg.dueDate || 'Soon',
        color: asg.priority === 'high' ? 'coral' : 'purple'
      });
    });

  // Upcoming exams
  exams.slice(0, 2).forEach((ex) => {
    notifications.push({
      id: `ex_${ex.id}`,
      title: 'Upcoming Exam',
      desc: `${ex.subject} - ${ex.examName || ex.code || 'Test'}`,
      icon: Calendar,
      time: ex.date || 'Scheduled',
      color: 'teal'
    });
  });

  const handleLogout = async () => {
    await logoutUser();
    navigate('/login');
  };

  return (
    <header className="top-navbar">
      <div className="navbar-left">
        {/* Mobile menu button */}
        <button
          className="mobile-toggle-btn"
          onClick={onOpenMobileNav}
          aria-label="Open mobile navigation"
        >
          <Menu size={22} />
        </button>

        {/* Current Breadcrumb / Page Title */}
        <div className="navbar-breadcrumb">
          <span className="breadcrumb-root">LearnMate</span>
          <span className="breadcrumb-separator">/</span>
          <span className="breadcrumb-active">{currentTitle}</span>
        </div>

        {/* Search bar */}
        <div className="nav-search-box">
          <Search size={16} className="search-icon" />
          <input
            type="text"
            className="search-input"
            placeholder="Search classes, exams, assignments..."
            value={globalSearch || ''}
            onChange={(e) => setGlobalSearch && setGlobalSearch(e.target.value)}
          />
          {globalSearch && (
            <button
              className="clear-search-btn"
              onClick={() => setGlobalSearch && setGlobalSearch('')}
              aria-label="Clear search"
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      <div className="navbar-right">
        {/* Date Display */}
        <div className="date-pill">
          <Calendar size={14} color="#7566D8" />
          <span>{todayStr}</span>
        </div>

        {/* Streak Pill */}
        <div className="streak-pill" title={`${user.studyStreak || 0} consecutive days studied`}>
          <Flame size={15} className="fire-icon" />
          <span>{user.studyStreak || 0}d</span>
        </div>

        {/* Theme Toggle */}
        <ThemeToggle />

        {/* Notifications Popover */}
        <div className="notif-wrapper" ref={notifMenuRef}>
          <button
            className={`icon-action-btn ${showNotifications ? 'active' : ''}`}
            onClick={() => setShowNotifications(!showNotifications)}
            aria-label="Notifications"
          >
            <Bell size={18} />
            {notifications.length > 0 && <span className="notif-dot"></span>}
          </button>

          {showNotifications && (
            <div className="notif-dropdown">
              <div className="notif-header">
                <h3>Notifications</h3>
                <span className="badge badge-purple">{notifications.length} Alerts</span>
              </div>
              <div className="notif-list">
                {notifications.length > 0 ? (
                  notifications.map((item) => {
                    const Icon = item.icon;
                    return (
                      <div key={item.id} className="notif-item">
                        <div className={`notif-icon-box notif-icon-${item.color}`}>
                          <Icon size={16} />
                        </div>
                        <div className="notif-content">
                          <div className="notif-title">{item.title}</div>
                          <div className="notif-desc">{item.desc}</div>
                          <div className="notif-time">{item.time}</div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="notif-empty-state">
                    <CheckCircle2 size={24} color="#40B8A5" />
                    <p>All caught up! No urgent alerts.</p>
                  </div>
                )}
              </div>
              <div className="notif-footer">
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => setShowNotifications(false)}
                >
                  Close
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Student Profile Avatar with Dropdown */}
        <div className="nav-profile-menu-wrap" ref={profileMenuRef}>
          <button
            type="button"
            className="nav-profile-btn"
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            aria-label="User menu"
          >
            <div className="avatar-wrapper">
              <img
                src={user.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'}
                alt={user.name || 'Student'}
                className="nav-avatar"
              />
              <span className="status-indicator"></span>
            </div>
            <div className="nav-profile-name">
              <span className="name">{user.name || 'Student'}</span>
              <span className="grade">{user.program || user.institution || 'Learner'}</span>
            </div>
            <ChevronDown size={14} className="profile-chevron" />
          </button>

          {showProfileMenu && (
            <div className="profile-dropdown-card card">
              <div className="profile-dropdown-header">
                <div className="dropdown-user-title">{user.name || 'Student'}</div>
                <div className="dropdown-user-email">{user.email || 'student@learnmate.edu'}</div>
              </div>

              <div className="profile-dropdown-links">
                <button
                  type="button"
                  className="dropdown-link-item"
                  onClick={() => {
                    setShowProfileMenu(false);
                    navigate('/settings');
                  }}
                >
                  <User size={15} /> Student Profile
                </button>
                <button
                  type="button"
                  className="dropdown-link-item"
                  onClick={() => {
                    setShowProfileMenu(false);
                    navigate('/settings');
                  }}
                >
                  <Settings size={15} /> Preferences
                </button>
              </div>

              <div className="profile-dropdown-footer">
                <button
                  type="button"
                  className="dropdown-logout-item"
                  onClick={handleLogout}
                >
                  <LogOut size={15} /> Log Out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
