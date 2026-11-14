import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useApp } from '../../context/AppContext';

/**
 * ProtectedRoute Guard
 * Redirects unauthenticated users to the Login page while preserving intended destination.
 */
export const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, authLoading } = useApp();
  const location = useLocation();

  if (authLoading) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        background: 'var(--bg-primary, #0f172a)',
        color: 'var(--text-primary, #f8fafc)',
        gap: '1rem',
        fontFamily: 'system-ui, sans-serif'
      }}>
        <div style={{
          width: '36px',
          height: '36px',
          border: '3px solid rgba(99, 102, 241, 0.2)',
          borderTopColor: '#6366f1',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite'
        }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        <p style={{ fontSize: '0.9rem', color: '#94a3b8' }}>Verifying LearnMate session...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
};
