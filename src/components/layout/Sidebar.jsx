import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Calendar,
  GraduationCap,
  CheckSquare,
  BookOpen,
  Bot,
  BarChart3,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Flame,
  Sparkles,
  Timer,
  HelpCircle
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import './Sidebar.css';

const mainNavItems = [
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/timetable', label: 'Timetable', icon: Calendar },
  { path: '/exams', label: 'Exam Planner', icon: GraduationCap, badgeKey: 'exams' },
  { path: '/assignments', label: 'Assignments', icon: CheckSquare, badgeKey: 'assignments' },
  { path: '/notes', label: 'Notes & Materials', icon: BookOpen },
  { path: '/doubt-solver', label: 'AI Doubt Solver', icon: Bot, badge: 'AI' },
  { path: '/analytics', label: 'Progress Tracker', icon: BarChart3 },
  { path: '/settings', label: 'Settings', icon: Settings },
];

const extraStudyTools = [
  { path: '/study-planner', label: 'Study Focus Timer', icon: Timer },
  { path: '/quizzes', label: 'Quizzes & Practice', icon: HelpCircle },
];

export const Sidebar = () => {
  const [collapsed, setCollapsed] = useState(false);
  const { user, assignments = [], exams = [], logoutUser } = useApp();
  const navigate = useNavigate();

  const pendingAssignmentsCount = assignments.filter((a) => a.status === 'pending').length;
  const upcomingExamsCount = exams.length;

  const handleLogout = async () => {
    await logoutUser();
    navigate('/login');
  };

  return (
    <aside className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
      {/* Brand Header */}
      <div className="sidebar-header">
        <NavLink to="/dashboard" className="sidebar-brand">
          <div className="brand-icon">
            <Sparkles size={20} className="brand-sparkle" />
          </div>
          {!collapsed && (
            <div className="brand-text">
              <span className="brand-title">LearnMate</span>
              <span className="brand-subtitle">Student SaaS</span>
            </div>
          )}
        </NavLink>
        <button
          className="collapse-btn"
          onClick={() => setCollapsed(!collapsed)}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          aria-label="Toggle sidebar"
        >
          {collapsed ? <ChevronRight size={17} /> : <ChevronLeft size={17} />}
        </button>
      </div>

      {/* Streak badge */}
      {!collapsed && (
        <div className="sidebar-streak-card">
          <div className="streak-icon-wrap">
            <Flame size={17} className="streak-icon" />
          </div>
          <div className="streak-info">
            <span className="streak-label">{user.studyStreak || 0} Day Streak!</span>
            <span className="streak-sub">
              {user.studyStreak > 0 ? 'Consistency pays off' : 'Study today to build streak'}
            </span>
          </div>
        </div>
      )}

      {/* Navigation Links */}
      <nav className="sidebar-nav">
        <div className="nav-section-title">{!collapsed && 'MENU'}</div>
        <ul className="nav-list">
          {mainNavItems.map((item) => {
            const Icon = item.icon;
            let badge = null;
            if (item.badge) {
              badge = item.badge;
            } else if (item.badgeKey === 'assignments' && pendingAssignmentsCount > 0) {
              badge = pendingAssignmentsCount;
            } else if (item.badgeKey === 'exams' && upcomingExamsCount > 0) {
              badge = upcomingExamsCount;
            }

            return (
              <li key={item.path} className="nav-item">
                <NavLink
                  to={item.path}
                  className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                  title={collapsed ? item.label : undefined}
                >
                  <Icon size={19} className="nav-icon" />
                  {!collapsed && <span className="nav-label">{item.label}</span>}
                  {!collapsed && badge && (
                    <span className={`nav-badge ${badge === 'AI' ? 'nav-badge-ai' : ''}`}>
                      {badge}
                    </span>
                  )}
                </NavLink>
              </li>
            );
          })}
        </ul>

        {/* Extra Study Tools */}
        <div className="nav-section-title" style={{ marginTop: '0.75rem' }}>
          {!collapsed && 'STUDY TOOLS'}
        </div>
        <ul className="nav-list">
          {extraStudyTools.map((item) => {
            const Icon = item.icon;
            return (
              <li key={item.path} className="nav-item">
                <NavLink
                  to={item.path}
                  className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                  title={collapsed ? item.label : undefined}
                >
                  <Icon size={19} className="nav-icon" />
                  {!collapsed && <span className="nav-label">{item.label}</span>}
                </NavLink>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Sidebar Footer: Student Profile / Logout */}
      <div className="sidebar-footer">
        <div className="user-profile-preview" onClick={() => navigate('/settings')}>
          <img
            src={user.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'}
            alt={user.name || 'Student'}
            className="user-avatar-sm"
          />
          {!collapsed && (
            <div className="user-preview-info">
              <span className="user-name">{user.name || 'Student'}</span>
              <span className="user-program">{user.program || user.institution || 'Learner'}</span>
            </div>
          )}
        </div>
        <button
          className="logout-btn"
          onClick={handleLogout}
          title="Sign out of LearnMate"
          aria-label="Logout"
        >
          <LogOut size={18} />
        </button>
      </div>
    </aside>
  );
};
