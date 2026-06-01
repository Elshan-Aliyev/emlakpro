import React from 'react';
import './EnhancementCard.css';

const EnhancementCard = ({ 
  icon, 
  title, 
  impact, 
  boost, 
  timeEstimate, 
  onClick,
  index 
}) => {
  return (
    <div 
      className="enhancement-card"
      onClick={onClick}
      style={{ animationDelay: `${index * 0.1}s` }}
    >
      <div className="card-header">
        <span className="card-icon">{icon}</span>
        <div className="card-badges">
          <span className="boost-badge">{boost}</span>
          <span className="time-badge">⏱️ {timeEstimate}</span>
        </div>
      </div>
      
      <h3 className="card-title">{title}</h3>
      <p className="card-impact">{impact}</p>
      
      <button className="card-action">
        {title} →
      </button>
    </div>
  );
};

export default EnhancementCard;
