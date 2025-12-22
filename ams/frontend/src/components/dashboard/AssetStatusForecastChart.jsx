import React, { useState } from 'react';
import PropTypes from 'prop-types';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import '../../styles/dashboard/AssetStatusForecastChart.css';
import AssetForecastTable from './AssetForecastTable';

function AssetStatusForecastChart({ chartData, tableData }) {
  const [showDetails, setShowDetails] = useState(false);

  return (
    <div className="forecast-section">
      <div className="forecast-header">
        <h2 className="forecast-title">Asset Status Forecast</h2>
      </div>

      <div className="forecast-chart-container">
        <ResponsiveContainer width="100%" height={400}>
          <LineChart data={chartData} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis />
            <Tooltip />
            <Legend wrapperStyle={{ paddingTop: '20px' }} />
            {/* Historical data - solid lines */}
            <Line
              type="monotone"
              dataKey="available"
              stroke="#0D6EFD"
              strokeWidth={2}
              name="Available (Historical)"
              connectNulls={true}
              dot={{ r: 4 }}
              isAnimationActive={true}
            />
            <Line
              type="monotone"
              dataKey="checkedOut"
              stroke="#FFB800"
              strokeWidth={2}
              name="Checked-Out (Historical)"
              connectNulls={true}
              dot={{ r: 4 }}
              isAnimationActive={true}
            />
            <Line
              type="monotone"
              dataKey="underRepair"
              stroke="#FF6B6B"
              strokeWidth={2}
              name="Under Repair (Historical)"
              connectNulls={true}
              dot={{ r: 4 }}
              isAnimationActive={true}
            />
            {/* Forecast data - dashed lines */}
            <Line
              type="monotone"
              dataKey="forecastAvailable"
              stroke="#0D6EFD"
              strokeWidth={2}
              strokeDasharray="5 5"
              name="Available (Forecast)"
              connectNulls={true}
              dot={{ r: 4 }}
              opacity={0.6}
              isAnimationActive={true}
            />
            <Line
              type="monotone"
              dataKey="forecastCheckedOut"
              stroke="#FFB800"
              strokeWidth={2}
              strokeDasharray="5 5"
              name="Checked-Out (Forecast)"
              connectNulls={true}
              dot={{ r: 4 }}
              opacity={0.6}
              isAnimationActive={true}
            />
            <Line
              type="monotone"
              dataKey="forecastUnderRepair"
              stroke="#FF6B6B"
              strokeWidth={2}
              strokeDasharray="5 5"
              name="Under Repair (Forecast)"
              connectNulls={true}
              dot={{ r: 4 }}
              opacity={0.6}
              isAnimationActive={true}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="forecast-toggle-section">
        <button
          className="view-details-btn"
          onClick={() => setShowDetails(!showDetails)}
        >
          {showDetails ? 'Hide Details' : 'View Details'}
        </button>
      </div>

      {showDetails && (
        <div className="forecast-table-container">
          <AssetForecastTable data={tableData} />
        </div>
      )}
    </div>
  );
}

AssetStatusForecastChart.propTypes = {
  chartData: PropTypes.arrayOf(PropTypes.object).isRequired,
  tableData: PropTypes.arrayOf(PropTypes.object).isRequired,
};

export default AssetStatusForecastChart;

