import React from "react";
import { Target, Download } from "lucide-react";
import { formatPeso, convertCumulativeToMonthly } from "../../utils/dashboardUtils";
import "./DashboardCharts.css";
import "./SummaryCards.css"; // Reusing card styles (.card, .compact-budget-card)

const ForecastAccuracyAnalysis = ({
  moneyFlowData,
  forecastData,
  forecastAccuracyData, // Note: This prop was passed in the original but not utilized in the snippet's IIFE logic, keeping it for completeness if needed later.
  onExport,
}) => {
  // 1. Prepare Data Logic (Extracted from the IIFE in Dashboard.jsx)
  
  const monthlyForecasts = convertCumulativeToMonthly(forecastData);

  // Hardcoded to November logic based on original snippet
  // In a real scenario, this might be dynamic based on the current date
  const lastMonthIndex = 10; // 0-based index for November
  const lastMonthName = "November";

  // Get values for the Cards
  const actualVal = Number(moneyFlowData[lastMonthIndex]?.actual || 0);
  
  const forecastPoint = monthlyForecasts.find(
    (f) => f.month === lastMonthIndex + 1
  );
  const forecastVal = Number(forecastPoint?.forecast || 0);

  const varianceVal = actualVal - forecastVal;

  // Calculate Accuracy Score
  let accuracy = 0;
  if (actualVal > 0) {
    accuracy = 100 * (1 - Math.abs(varianceVal) / actualVal);
  } else if (forecastVal === 0) {
    accuracy = 100;
  }

  // Clamp accuracy between 0 and 100
  const displayAcc = Math.max(0, accuracy).toFixed(1);
  const displayAccNum = parseFloat(displayAcc);

  // Determine Status Color/Label
  let statusColor = "#dc3545"; // Red
  let statusLabel = "Poor";
  
  if (displayAccNum >= 90) {
    statusColor = "#28a745"; // Green
    statusLabel = "Excellent";
  } else if (displayAccNum >= 75) {
    statusColor = "#007bff"; // Blue (Good) - *Adjusted to standard bootstrap colors or keep original logic*
    statusLabel = "Good";
  }

  return (
    <div className="card" style={{ marginBottom: "30px" }}>
      {/* Header */}
      <div className="analysis-header">
        <h3 className="card-title">Forecast Accuracy Analysis</h3>
        <button onClick={onExport} className="btn-export-success">
          Export Accuracy Report
          <Download size={16} style={{ marginLeft: "6px" }} />
        </button>
      </div>

      {/* 4-Card Grid */}
      <div className="accuracy-stats-grid">
        {/* Accuracy Score Card */}
        <div className="card compact-budget-card accuracy-card-center">
          <Target size={24} style={{ margin: "0 auto 10px", color: "#007bff" }} />
          <h3 className="compact-card-title">Accuracy Score</h3>
          <p className="compact-stat-value" style={{ color: statusColor }}>
            {displayAcc}%
          </p>
          <span
            className="accuracy-badge"
            style={{ backgroundColor: statusColor }}
          >
            {statusLabel}
          </span>
        </div>

        {/* Variance Card */}
        <div className="card compact-budget-card accuracy-card">
          <h3 className="compact-card-title">Variance</h3>
          <p
            className="compact-stat-value"
            style={{
              color: varianceVal >= 0 ? "#dc3545" : "#28a745",
            }}
          >
            {formatPeso(Math.abs(varianceVal))}
          </p>
          <p className="compact-card-subtext">
            {Math.abs(varianceVal) < 0.01
              ? "Exact Match"
              : varianceVal >= 0
              ? "Over Forecast"
              : "Under Forecast"}
          </p>
        </div>

        {/* Actual Spend Card */}
        <div className="card compact-budget-card accuracy-card">
          <h3 className="compact-card-title">Actual Spend ({lastMonthName})</h3>
          <p className="compact-stat-value text-success">
            {formatPeso(actualVal)}
          </p>
          <p className="compact-card-subtext">Last Completed Month</p>
        </div>

        {/* Forecasted Spend Card */}
        <div className="card compact-budget-card accuracy-card">
          <h3 className="compact-card-title">Forecasted Spend ({lastMonthName})</h3>
          <p className="compact-stat-value text-orange">
            {formatPeso(forecastVal)}
          </p>
          <p className="compact-card-subtext">Last Completed Month</p>
        </div>
      </div>

      {/* Detailed Metrics Table */}
      <div style={{ marginTop: "20px" }}>
        <h4 className="analysis-table-title">Monthly Forecast vs Actual</h4>
        <div className="table-responsive">
          <table className="analysis-table">
            <thead>
              <tr>
                <th className="text-left">Month</th>
                <th className="text-right">Actual</th>
                <th className="text-right">Forecast</th>
                <th className="text-right">Variance</th>
                <th className="text-right">Accuracy</th>
              </tr>
            </thead>
            <tbody>
              {moneyFlowData?.map((month, index) => {
                // Table Row Logic
                const forecastPoint = monthlyForecasts.find(
                  (f) => f.month_name === month.month_name
                );
                const forecastValue = forecastPoint
                  ? Number(forecastPoint.forecast)
                  : 0;
                const actualValue = Number(month.actual);
                const variance = actualValue - forecastValue;
                const isExact = Math.abs(variance) < 0.01;

                // Calculate raw accuracy for row
                let rawAccuracy = 0;
                if (actualValue > 0) {
                  rawAccuracy = 100 * (1 - Math.abs(variance) / actualValue);
                } else if (forecastValue === 0) {
                  rawAccuracy = 100;
                }

                const displayAccuracy = Math.max(0, Math.min(100, rawAccuracy)).toFixed(1);
                const accNum = parseFloat(displayAccuracy);

                // Accuracy Color Logic for Table
                let accColorClass = "text-danger";
                if (accNum >= 90) accColorClass = "text-success";
                else if (accNum >= 80) accColorClass = "text-primary";
                else if (accNum >= 70) accColorClass = "text-warning";

                return (
                  <tr key={index}>
                    <td className="text-left">{month.month_name}</td>
                    <td className="text-right">{formatPeso(actualValue)}</td>
                    <td className="text-right">
                      {forecastPoint ? formatPeso(forecastValue) : "N/A"}
                    </td>
                    <td
                      className={`text-right ${
                        variance > 0 ? "text-success" : "text-danger"
                      }`}
                    >
                      {isExact
                        ? "Exact"
                        : `${formatPeso(Math.abs(variance))} ${
                            variance > 0 ? "Actual > Forecast" : "Actual < Forecast"
                          }`}
                    </td>
                    <td className={`text-right ${accColorClass}`}>
                      {`${displayAccuracy}%`}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ForecastAccuracyAnalysis;