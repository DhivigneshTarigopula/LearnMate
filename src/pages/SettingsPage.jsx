import React, { useState } from 'react';
import {
  User,
  Bell,
  Clock,
  Palette,
  Save,
  Camera,
  LogOut,
  Shield,
  Check,
  Sun,
  Moon,
  Laptop
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useTheme } from '../context/ThemeContext';
import './SettingsPage.css';

const avatarPresets = [
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80'
];

export const SettingsPage = () => {
  const { user, updateUser, logoutUser } = useApp();
  const { theme, resolvedTheme, setTheme } = useTheme();

  const [activeTab, setActiveTab] = useState('profile');
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    avatar: user?.avatar || avatarPresets[0],
    institution: user?.institution || '',
    program: user?.program || '',
    term: user?.term || '',
    gpa: user?.gpa || '',
    dailyGoalHours: user?.dailyGoalHours || 4.0,
    preferredTheme: user?.preferredTheme || 'light',
    notifications: { ...(user?.notifications || {}) }
  });

  const handleToggleNotif = (key) => {
    setFormData((prev) => ({
      ...prev,
      notifications: {
        ...prev.notifications,
        [key]: !prev.notifications[key]
      }
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    updateUser(formData);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const handleLogout = async () => {
    if (window.confirm('Are you sure you want to log out of LearnMate?')) {
      await logoutUser();
    }
  };

  return (
    <div className="settings-page">
      {/* Header */}
      <div className="page-header-row">
        <div>
          <h2>Settings & Student Profile</h2>
          <p className="page-sub">Manage academic credentials, study preferences, notifications, and security</p>
        </div>
      </div>

      <div className="settings-layout-grid">
        {/* Left Navigation Tabs */}
        <div className="settings-nav-card card">
          <button
            type="button"
            className={`settings-nav-btn ${activeTab === 'profile' ? 'active' : ''}`}
            onClick={() => setActiveTab('profile')}
          >
            <User size={18} /> Student Profile
          </button>
          <button
            type="button"
            className={`settings-nav-btn ${activeTab === 'study' ? 'active' : ''}`}
            onClick={() => setActiveTab('study')}
          >
            <Clock size={18} /> Study Preferences
          </button>
          <button
            type="button"
            className={`settings-nav-btn ${activeTab === 'notifications' ? 'active' : ''}`}
            onClick={() => setActiveTab('notifications')}
          >
            <Bell size={18} /> Notification Alerts
          </button>
          <button
            type="button"
            className={`settings-nav-btn ${activeTab === 'appearance' ? 'active' : ''}`}
            onClick={() => setActiveTab('appearance')}
          >
            <Palette size={18} /> Theme & Palette
          </button>
          <button
            type="button"
            className={`settings-nav-btn ${activeTab === 'account' ? 'active' : ''}`}
            onClick={() => setActiveTab('account')}
          >
            <Shield size={18} /> Account & Security
          </button>
        </div>

        {/* Right Form Card */}
        <div className="settings-content-card card">
          <form onSubmit={handleSubmit}>
            {activeTab === 'profile' && (
              <div className="tab-pane">
                <div className="pane-header">
                  <h3>Student Profile</h3>
                  <p>Your academic profile displayed across the study dashboard</p>
                </div>

                {/* Avatar Picker */}
                <div className="avatar-selection-box">
                  <div className="current-avatar-wrap">
                    <img src={formData.avatar} alt="Avatar" className="large-avatar-img" />
                    <div className="avatar-badge-icon">
                      <Camera size={14} />
                    </div>
                  </div>
                  <div className="avatar-options">
                    <span className="avatar-pick-label">Choose Avatar Preset:</span>
                    <div className="avatar-presets-row">
                      {avatarPresets.map((img, idx) => (
                        <img
                          key={idx}
                          src={img}
                          alt={`Preset ${idx}`}
                          className={`preset-thumb ${formData.avatar === img ? 'selected' : ''}`}
                          onClick={() => setFormData({ ...formData, avatar: img })}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                <div className="form-row-2">
                  <div className="form-group">
                    <label className="form-label">Full Name *</label>
                    <input
                      type="text"
                      required
                      className="form-input"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">University Email *</label>
                    <input
                      type="email"
                      required
                      className="form-input"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    />
                  </div>
                </div>

                <div className="form-row-2">
                  <div className="form-group">
                    <label className="form-label">Institution / University</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="e.g. Stanford University"
                      value={formData.institution}
                      onChange={(e) => setFormData({ ...formData, institution: e.target.value })}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Degree / Major</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="e.g. B.Tech Computer Science"
                      value={formData.program}
                      onChange={(e) => setFormData({ ...formData, program: e.target.value })}
                    />
                  </div>
                </div>

                <div className="form-row-2">
                  <div className="form-group">
                    <label className="form-label">Current Term / Semester</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="e.g. Semester 5"
                      value={formData.term}
                      onChange={(e) => setFormData({ ...formData, term: e.target.value })}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Target / Current GPA</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="e.g. 3.8 / 4.0"
                      value={formData.gpa}
                      onChange={(e) => setFormData({ ...formData, gpa: e.target.value })}
                    />
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'study' && (
              <div className="tab-pane">
                <div className="pane-header">
                  <h3>Study & Productivity Targets</h3>
                  <p>Fine-tune daily study goals and pomodoro focus intervals</p>
                </div>

                <div className="form-group">
                  <label className="form-label">Daily Study Target (Hours)</label>
                  <input
                    type="number"
                    step="0.5"
                    min="1"
                    max="12"
                    className="form-input"
                    value={formData.dailyGoalHours}
                    onChange={(e) =>
                      setFormData({ ...formData, dailyGoalHours: parseFloat(e.target.value) || 4.0 })
                    }
                  />
                  <p className="form-helper">Recommended target for active university coursework is 3.5 - 5.0 hours/day.</p>
                </div>

                <div className="form-group">
                  <label className="form-label">Default Focus Pomodoro Duration</label>
                  <select className="form-select" defaultValue="25">
                    <option value="20">20 minutes (Quick Sprint)</option>
                    <option value="25">25 minutes (Standard Pomodoro)</option>
                    <option value="45">45 minutes (Deep Study Block)</option>
                    <option value="60">60 minutes (Intensive Exam Prep)</option>
                  </select>
                </div>
              </div>
            )}

            {activeTab === 'notifications' && (
              <div className="tab-pane">
                <div className="pane-header">
                  <h3>Notification Preferences</h3>
                  <p>Choose when LearnMate alerts you about coursework deadlines and exams</p>
                </div>

                <div className="toggle-list">
                  <div className="toggle-item">
                    <div>
                      <strong>Assignment Due Reminders</strong>
                      <p>Receive notifications 24 hours and 3 days before coursework deadlines.</p>
                    </div>
                    <input
                      type="checkbox"
                      className="custom-toggle"
                      checked={formData.notifications?.dueReminders !== false}
                      onChange={() => handleToggleNotif('dueReminders')}
                    />
                  </div>

                  <div className="toggle-item">
                    <div>
                      <strong>Daily Study Streak Protection</strong>
                      <p>Get an evening reminder if your daily study goal has not been reached.</p>
                    </div>
                    <input
                      type="checkbox"
                      className="custom-toggle"
                      checked={formData.notifications?.streakUpdates !== false}
                      onChange={() => handleToggleNotif('streakUpdates')}
                    />
                  </div>

                  <div className="toggle-item">
                    <div>
                      <strong>Weekly Academic Digest</strong>
                      <p>Receive a weekly progress summary of study hours and exam countdowns.</p>
                    </div>
                    <input
                      type="checkbox"
                      className="custom-toggle"
                      checked={formData.notifications?.weeklyReport !== false}
                      onChange={() => handleToggleNotif('weeklyReport')}
                    />
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'appearance' && (
              <div className="tab-pane">
                <div className="pane-header">
                  <h3>Theme & Palette Identity</h3>
                  <p>Seamlessly toggle between Light Mode, Dark Mode, and System Default</p>
                </div>

                <div className="form-group">
                  <label className="form-label">Theme Mode Selection</label>
                  <div className="theme-selection-grid">
                    <button
                      type="button"
                      className={`theme-mode-card ${theme === 'light' ? 'selected' : ''}`}
                      onClick={() => {
                        setTheme('light');
                        setFormData({ ...formData, preferredTheme: 'light' });
                      }}
                    >
                      <div className="theme-mode-header">
                        <Sun size={20} className="icon-light" />
                        <strong>Light Mode</strong>
                        {theme === 'light' && <Check size={16} className="selected-check" />}
                      </div>
                      <p>Clean pastel-purple palette (#7566D8, #EEEAFE, #F8F8FC) for bright, distraction-free daylight study.</p>
                      <div className="mini-palette-preview">
                        <span style={{ background: '#7566D8' }}></span>
                        <span style={{ background: '#EEEAFE' }}></span>
                        <span style={{ background: '#FFFFFF', border: '1px solid #E9E7F2' }}></span>
                        <span style={{ background: '#40B8A5' }}></span>
                        <span style={{ background: '#F29A83' }}></span>
                      </div>
                    </button>

                    <button
                      type="button"
                      className={`theme-mode-card ${theme === 'dark' ? 'selected' : ''}`}
                      onClick={() => {
                        setTheme('dark');
                        setFormData({ ...formData, preferredTheme: 'dark' });
                      }}
                    >
                      <div className="theme-mode-header">
                        <Moon size={20} className="icon-dark" />
                        <strong>Dark Mode</strong>
                        {theme === 'dark' && <Check size={16} className="selected-check" />}
                      </div>
                      <p>Deep navy-purple palette (#171827, #24263A, #A99AFB) for comfortable low-light evening focus.</p>
                      <div className="mini-palette-preview">
                        <span style={{ background: '#A99AFB' }}></span>
                        <span style={{ background: '#393252' }}></span>
                        <span style={{ background: '#24263A', border: '1px solid #393B50' }}></span>
                        <span style={{ background: '#68CDB6' }}></span>
                        <span style={{ background: '#FFAD96' }}></span>
                      </div>
                    </button>

                    <button
                      type="button"
                      className={`theme-mode-card ${theme === 'system' ? 'selected' : ''}`}
                      onClick={() => {
                        setTheme('system');
                        setFormData({ ...formData, preferredTheme: 'system' });
                      }}
                    >
                      <div className="theme-mode-header">
                        <Laptop size={20} className="icon-system" />
                        <strong>System Default</strong>
                        {theme === 'system' && <Check size={16} className="selected-check" />}
                      </div>
                      <p>Automatically syncs with your device operating system theme (Currently: {resolvedTheme.toUpperCase()}).</p>
                      <div className="mini-palette-preview">
                        <span style={{ background: resolvedTheme === 'dark' ? '#A99AFB' : '#7566D8' }}></span>
                        <span style={{ background: resolvedTheme === 'dark' ? '#24263A' : '#FFFFFF', border: '1px solid var(--border-color)' }}></span>
                        <span style={{ background: resolvedTheme === 'dark' ? '#68CDB6' : '#40B8A5' }}></span>
                      </div>
                    </button>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Active Palette Tokens</label>
                  <div className="palette-showcase-box">
                    <div className="palette-chip-group">
                      <div className="palette-chip" style={{ background: 'var(--primary-purple)' }} title="Primary Purple" />
                      <div className="palette-chip" style={{ background: 'var(--light-lavender)' }} title="Lavender Surface" />
                      <div className="palette-chip" style={{ background: 'var(--teal)' }} title="Teal" />
                      <div className="palette-chip" style={{ background: 'var(--coral)' }} title="Coral" />
                      <div className="palette-chip" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)' }} title="Card Background" />
                      <div className="palette-chip" style={{ background: 'var(--bg-page)', border: '1px solid var(--border-color)' }} title="Page Background" />
                    </div>
                    <div className="palette-desc">
                      <strong>Current Mode: {resolvedTheme === 'dark' ? 'Deep Navy-Purple (Dark)' : 'Pastel-Purple (Light)'}</strong>
                      <span>All components, charts, and dialogs dynamically inherit these CSS tokens.</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'account' && (
              <div className="tab-pane">
                <div className="pane-header">
                  <h3>Account & Security</h3>
                  <p>Manage your Supabase authentication session and credentials</p>
                </div>

                <div className="account-details-box">
                  <div className="account-row">
                    <span className="account-label">Signed in as:</span>
                    <strong className="account-val">{user?.email || 'student@learnmate.edu'}</strong>
                  </div>
                  <div className="account-row">
                    <span className="account-label">Authentication Provider:</span>
                    <span className="badge badge-success">Supabase Auth (Active)</span>
                  </div>
                  <div className="account-row">
                    <span className="account-label">Data Privacy:</span>
                    <span className="account-val">Row-Level Security (RLS) Enabled</span>
                  </div>
                </div>

                <div className="logout-danger-box">
                  <div>
                    <strong>Sign Out of LearnMate</strong>
                    <p>Securely end your session on this browser device.</p>
                  </div>
                  <button
                    type="button"
                    className="btn btn-danger"
                    onClick={handleLogout}
                  >
                    <LogOut size={16} /> Sign Out
                  </button>
                </div>
              </div>
            )}

            {/* Bottom Save Button */}
            {activeTab !== 'account' && (
              <div className="settings-footer-actions">
                {saveSuccess && (
                  <div className="save-success-msg">
                    <Check size={16} color="#32A889" /> Settings saved successfully!
                  </div>
                )}
                <button type="submit" className="btn btn-primary btn-lg">
                  <Save size={18} /> Save Changes
                </button>
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
};
