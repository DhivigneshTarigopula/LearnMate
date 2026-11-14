import React from 'react';
import { CheckCircle2, AlertTriangle, Info } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import './Toast.css';

export const Toast = () => {
  const { toastMessage } = useApp();

  if (!toastMessage) return null;

  const { message, type } = toastMessage;

  return (
    <div className={`toast-container toast-${type}`}>
      <div className="toast-icon">
        {type === 'success' && <CheckCircle2 size={18} />}
        {type === 'warning' && <AlertTriangle size={18} />}
        {type === 'info' && <Info size={18} />}
      </div>
      <div className="toast-message">{message}</div>
    </div>
  );
};
