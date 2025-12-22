import React, { useState } from 'react';
import PropTypes from 'prop-types';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import '../../styles/dashboard/ProductDemandForecastChart.css';
import ProductForecastTable from './ProductForecastTable';

function ProductDemandForecastChart({ chartData, tableData }) {
  const [showDetails, setShowDetails] = useState(false);

  const colors = ['#0D6EFD', '#FFB800', '#82ca9d', '#FF6B6B'];
  const products = ['MacBook Pro', 'Dell XPS', 'HP Pavilion', 'Lenovo ThinkPad'];

  return (
    <div className="forecast-section">
      <div className="forecast-header">
        <h2 className="forecast-title">Product Demand Forecast</h2>
      </div>

      <div className="forecast-chart-container">
        <ResponsiveContainer width="100%" height={400}>
          <BarChart data={chartData} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis />
            <Tooltip />
            <Legend wrapperStyle={{ paddingTop: '20px' }} />
            {/* Historical data - solid bars */}
            {products.map((product, index) => (
              <Bar
                key={`hist-${product}`}
                dataKey={product}
                fill={colors[index]}
                name={`${product} (Historical)`}
              />
            ))}
            {/* Forecast data - lighter/faded bars */}
            <Bar
              dataKey="forecastMacBook"
              fill={colors[0]}
              name="MacBook Pro (Forecast)"
              opacity={0.5}
            />
            <Bar
              dataKey="forecastDell"
              fill={colors[1]}
              name="Dell XPS (Forecast)"
              opacity={0.5}
            />
            <Bar
              dataKey="forecastHP"
              fill={colors[2]}
              name="HP Pavilion (Forecast)"
              opacity={0.5}
            />
            <Bar
              dataKey="forecastLenovo"
              fill={colors[3]}
              name="Lenovo ThinkPad (Forecast)"
              opacity={0.5}
            />
          </BarChart>
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
          <ProductForecastTable data={tableData} />
        </div>
      )}
    </div>
  );
}

ProductDemandForecastChart.propTypes = {
  chartData: PropTypes.arrayOf(PropTypes.object).isRequired,
  tableData: PropTypes.arrayOf(PropTypes.object).isRequired,
};

export default ProductDemandForecastChart;

