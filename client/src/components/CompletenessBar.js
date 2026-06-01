import React from 'react';
import './CompletenessBar.css';

const CompletenessBar = ({ percentage }) => {
  const getColor = (pct) => {
    if (pct >= 80) return '#10b981'; // Green
    if (pct >= 50) return '#f59e0b'; // Orange
    return '#ef4444'; // Red
  };

  const getMessage = (pct) => {
    if (pct === 100) return 'Perfect!';
    if (pct >= 80) return 'Excellent!';
    if (pct >= 60) return 'Good progress';
    if (pct >= 40) return 'Getting there';
    return 'Just started';
  };

  return (
    <div className="completeness-bar-wrapper">
      <div className="completeness-bar">
        <div 
          className="completeness-fill"
          style={{ 
            width: `${percentage}%`,
            backgroundColor: getColor(percentage)
          }}
        >
          <span className="completeness-percentage">{percentage}%</span>
        </div>
      </div>
      <span className="completeness-status" style={{ color: getColor(percentage) }}>
        {getMessage(percentage)}
      </span>
    </div>
  );
};

export default CompletenessBar;
