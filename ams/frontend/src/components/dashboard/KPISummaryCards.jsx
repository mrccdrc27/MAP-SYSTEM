import React from 'react';
import PropTypes from 'prop-types';
import { FiArrowUp, FiArrowDown } from 'react-icons/fi';
import '../../styles/dashboard/KPISummaryCards.css';

function KPISummaryCards({ kpiData }) {
  const formatChange = (change) => {
    let changeValue = typeof change === 'string' ? parseFloat(change) : change;
    const isPositive = changeValue >= 0;
    const formattedValue = `${isPositive ? '+' : ''}${changeValue.toFixed(1)}%`;

    return {
      value: formattedValue,
      isPositive,
    };
  };

  return (
    <div className="kpi-summary-section">
      <h2 className="kpi-section-title">Forecast Insights</h2>
      <div className="kpi-cards-grid">
        {kpiData.map((kpi, index) => {
          const changeInfo = formatChange(kpi.change);
          return (
            <div key={index} className="kpi-card">
              <div className="kpi-card-content">
                <h3 className="kpi-title">{kpi.title}</h3>
                <div className="kpi-value-section">
                  <div className="kpi-value">{kpi.value}</div>
                  <div className="kpi-unit">{kpi.unit}</div>
                </div>
                <div className={`kpi-change ${changeInfo.isPositive ? 'positive' : 'negative'}`}>
                  {changeInfo.isPositive ? (
                    <FiArrowUp className="kpi-change-indicator" />
                  ) : (
                    <FiArrowDown className="kpi-change-indicator" />
                  )}
                  <span>{changeInfo.value}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

KPISummaryCards.propTypes = {
  kpiData: PropTypes.arrayOf(
    PropTypes.shape({
      title: PropTypes.string.isRequired,
      value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
      unit: PropTypes.string.isRequired,
      change: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    })
  ).isRequired,
};

export default KPISummaryCards;

