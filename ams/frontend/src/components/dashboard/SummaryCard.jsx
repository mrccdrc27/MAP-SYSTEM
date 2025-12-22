import React from 'react';
import PropTypes from 'prop-types';
import '../../styles/dashboard/SummaryCard.css';

const SummaryCard = ({ title, value, percentage }) => {
  return (
    <div className="summary-card">
      <h3 className="summary-title">{title}</h3>
      <div className="summary-value">{value}</div>
      <div className="progress-bar">
        <div 
          className="progress-fill"
          style={{ width: `${percentage}%` }}
        />
      </div>
      <div className="progress-text">{percentage}% Complete</div>
    </div>
  );
};

SummaryCard.propTypes = {
  title: PropTypes.string.isRequired,
  value: PropTypes.string.isRequired,
  percentage: PropTypes.number.isRequired
};

export default SummaryCard; 