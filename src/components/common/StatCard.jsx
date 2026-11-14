import React from 'react';
import './StatCard.css';

export const StatCard = ({
  icon: Icon,
  title,
  value,
  subvalue,
  trend,
  color = 'blue',
  onClick
}) => {
  return (
    <div className={`stat-card stat-${color} ${onClick ? 'clickable' : ''}`} onClick={onClick}>
      <div className="stat-top">
        <span className="stat-title">{title}</span>
        {Icon && (
          <div className="stat-icon-wrapper">
            <Icon size={20} />
          </div>
        )}
      </div>
      <div className="stat-middle">
        <h3 className="stat-value">{value}</h3>
      </div>
      {(subvalue || trend) && (
        <div className="stat-bottom">
          {trend && <span className="stat-trend">{trend}</span>}
          {subvalue && <span className="stat-sub">{subvalue}</span>}
        </div>
      )}
    </div>
  );
};
