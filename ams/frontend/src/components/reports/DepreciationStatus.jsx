import React from 'react';
import '../../styles/reports/DepreciationReportTable.css';

const DepreciationStatus = ({ type, name }) => {
  // For the Overdue for an Audit table, we need to display the status properly
  const statusClassName = name 
    ? `depreciation-status-badge status-${type}` 
    : `depreciation-status-badge status-${type} status-dot-only`;
    
  return (
    <div className={statusClassName}>
      <div className="status-dot"></div>
      {name && <span className="status-text">{name}</span>}
    </div>
  );
};

export default DepreciationStatus;
