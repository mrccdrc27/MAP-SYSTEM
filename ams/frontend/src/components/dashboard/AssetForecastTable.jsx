import React from 'react';
import PropTypes from 'prop-types';
import { FiTrendingUp, FiTrendingDown } from 'react-icons/fi';
import MediumButtons from '../buttons/MediumButtons';
import '../../styles/dashboard/AssetForecastTable.css';

function AssetForecastTable({ data }) {
  const handleExportExcel = () => {
    const headers = ['Status', 'Current Count', 'Forecast Count', 'Trend'];
    const rows = data.map(item => [
      item.status,
      item.currentCount,
      item.forecastCount,
      item.trend === 'up' ? 'Increasing' : 'Decreasing',
    ]);

    // Create CSV content
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(',')),
    ].join('\n');

    // Create and download Excel file
    const blob = new Blob([csvContent], { type: 'application/vnd.ms-excel' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'asset-forecast.xlsx';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="forecast-table-wrapper">
      <table className="forecast-table">
        <thead>
          <tr>
            <th>Status</th>
            <th>Current Count</th>
            <th>Forecast Count</th>
            <th>Trend</th>
          </tr>
        </thead>
        <tbody>
          {data.map((item, index) => (
            <tr key={index}>
              <td>{item.status}</td>
              <td>{item.currentCount}</td>
              <td>{item.forecastCount}</td>
              <td>
                <div className={`trend-cell ${item.trend}`}>
                  {item.trend === 'up' ? (
                    <FiTrendingUp className="trend-icon" />
                  ) : (
                    <FiTrendingDown className="trend-icon" />
                  )}
                  <span>{item.trend === 'up' ? 'Increasing' : 'Decreasing'}</span>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="table-footer">
        <MediumButtons type="export" onClick={handleExportExcel} />
      </div>
    </div>
  );
}

AssetForecastTable.propTypes = {
  data: PropTypes.arrayOf(
    PropTypes.shape({
      status: PropTypes.string.isRequired,
      currentCount: PropTypes.number.isRequired,
      forecastCount: PropTypes.number.isRequired,
      trend: PropTypes.string.isRequired,
    })
  ).isRequired,
};

export default AssetForecastTable;

