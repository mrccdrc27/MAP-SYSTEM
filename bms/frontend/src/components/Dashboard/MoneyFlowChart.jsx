import React from "react";
import { Line } from "react-chartjs-2";
import { TrendingUp, BarChart3, RefreshCw } from "lucide-react"; // Added BarChart3
import "./DashboardCharts.css";

const MoneyFlowChart = ({
  data,
  options,
  showForecasting,
  toggleForecasting,
  showForecastComparison,
  toggleForecastComparison,
  isFinanceManager, // New Prop
  onRefreshForecast, // New Prop
}) => {
  return (
    <div className="card chart-card" style={{ flex: 2 }}>
      <div className="chart-header">
        <h3 className="chart-title">Money Flow</h3>
        
        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          {/* --- RESTORED LEGEND START --- */}
          <div style={{ display: "flex", gap: "4px" }}>
            <button
              style={{
                padding: "4px 8px",
                backgroundColor: "#007bff",
                color: "white",
                border: "none",
                borderRadius: "4px",
                fontSize: "12px",
                cursor: "default"
              }}
            >
              Budget
            </button>
            <button
              style={{
                padding: "4px 8px",
                backgroundColor: "#28a745",
                color: "white",
                border: "none",
                borderRadius: "4px",
                fontSize: "12px",
                cursor: "default"
              }}
            >
              Expense
            </button>
            {showForecasting && (
              <button
                style={{
                  padding: "4px 8px",
                  backgroundColor: "#ff6b35",
                  color: "white",
                  border: "none",
                  borderRadius: "4px",
                  fontSize: "12px",
                  cursor: "default"
                }}
              >
                Forecast
              </button>
            )}
          </div>
          {/* --- RESTORED LEGEND END --- */}

          

          <div className="toggle-group">

            {/* MODIFICATION START: Refresh Forecast Button */}
            {isFinanceManager && (
                <button
                  className="toggle-btn"
                  onClick={onRefreshForecast}
                  title="Recalculate Forecasts based on latest data"
                >
                  <RefreshCw size={16} />
                  Refresh
                </button>
            )}
            {/* MODIFICATION END */}

            <button
              className={`toggle-btn ${showForecasting ? "active" : ""}`}
              onClick={toggleForecasting}
              title={showForecasting ? "Hide Forecast" : "Show Forecast"}
            >
              <TrendingUp size={16} />
              Forecasting
            </button>
            <button
              className={`toggle-btn ${showForecastComparison ? "active" : ""}`}
              onClick={toggleForecastComparison}
              title={showForecastComparison ? "Hide Comparison" : "Show Forecast vs Actual"}
            >
              <BarChart3 size={16} />
              Compare
            </button>
          </div>
        </div>

        {/* Export button only appears in Compare mode in the original design context, 
            though usually it's passed via onExport prop. 
            Adjusting layout to match original 'space-between' header behavior. 
        */}
      </div>

      {/* 
         The original had specific height styling: height: "420px".
         We apply a style here to ensure the chart doesn't shrink.
      */}
      <div className="chart-container" style={{ minHeight: "420px" }}>
        <Line data={data} options={options} />
      </div>
    </div>
  );
};

export default MoneyFlowChart;