import React, { useState, useRef, useEffect } from 'react';
import { Sun, Moon, Laptop, Check } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { useApp } from '../../context/AppContext';
import './ThemeToggle.css';

export const ThemeToggle = ({ showLabels = false, className = '' }) => {
  const { theme, resolvedTheme, setTheme } = useTheme();
  const { updateUser, user } = useApp();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const handleSelectTheme = (newTheme) => {
    setTheme(newTheme);
    setIsOpen(false);
    if (updateUser && user) {
      try {
        updateUser({ preferredTheme: newTheme });
      } catch (e) {
        console.warn('Theme preference sync note:', e);
      }
    }
  };

  const options = [
    { id: 'light', label: 'Light Mode', icon: Sun, desc: 'Clean Teal + White palette' },
    { id: 'dark', label: 'Dark Mode', icon: Moon, desc: 'Deep navy & teal contrast' },
    { id: 'system', label: 'System Default', icon: Laptop, desc: 'Follows OS appearance' }
  ];

  const CurrentIcon = resolvedTheme === 'dark' ? Moon : Sun;

  return (
    <div className={`theme-toggle-wrapper ${className}`} ref={dropdownRef}>
      <button
        type="button"
        className={`theme-toggle-trigger ${isOpen ? 'active' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
        title={`Theme: ${theme.charAt(0).toUpperCase() + theme.slice(1)} (Click to switch)`}
        aria-label="Toggle theme appearance"
        aria-expanded={isOpen}
      >
        <span className="theme-toggle-icon-box">
          <CurrentIcon size={17} className="theme-toggle-svg" />
        </span>
        {showLabels && (
          <span className="theme-toggle-label">
            {theme === 'system' ? 'System' : theme === 'dark' ? 'Dark' : 'Light'}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="theme-dropdown-menu">
          <div className="theme-dropdown-header">
            <span>Appearance Theme</span>
          </div>
          <div className="theme-dropdown-options">
            {options.map((opt) => {
              const Icon = opt.icon;
              const isSelected = theme === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  className={`theme-option-btn ${isSelected ? 'selected' : ''}`}
                  onClick={() => handleSelectTheme(opt.id)}
                >
                  <div className="theme-option-icon-wrap">
                    <Icon size={16} />
                  </div>
                  <div className="theme-option-info">
                    <span className="theme-option-title">{opt.label}</span>
                    <span className="theme-option-desc">{opt.desc}</span>
                  </div>
                  {isSelected && <Check size={14} className="theme-check-icon" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

