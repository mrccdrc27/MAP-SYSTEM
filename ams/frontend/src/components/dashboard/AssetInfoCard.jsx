import React from 'react';
import PropTypes from 'prop-types';
import '../../styles/dashboard/AssetInfoCard.css';

const AssetInfoCard = ({ title, value, percentage }) => {
  return (
    <div className="asset-info-card">
      <h3>{title}</h3>
      <div className="asset-info-value">{value}</div>
      <div className="asset-info-progress">
        <div className="progress-bar">
          <div 
            className="progress" 
            style={{ width: `${percentage}%` }}
          />
        </div>
        <span className="percentage">{percentage}%</span>
      </div>
    </div>
  );
};

AssetInfoCard.propTypes = {
  title: PropTypes.string.isRequired,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  percentage: PropTypes.number.isRequired,
};

export default AssetInfoCard; 