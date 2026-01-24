import React from "react";
import "./SummaryCards.css";
import { formatPeso } from "../../utils/dashboardUtils";

// Reusable Sub-component for a single card
const StatCard = ({ title, children }) => {
  return (
    <div className="card compact-budget-card">
      <h3 className="compact-card-title">{title}</h3>
      {children}
    </div>
  );
};

const DashboardStats = ({ summaryData, currentMonth, currentYear }) => {
  const percentageUsed = summaryData?.percentage_used || 0;
  const remainingPercentage = summaryData?.remaining_percentage || 100;

  return (
    <div className="stats-grid">
      {/* 1. Budget Completion */}
      <StatCard title="Budget Completion">
        <p className="compact-stat-value">{percentageUsed.toFixed(1)}%</p>
        <p className="compact-card-subtext">Overall Status of Budget Plan</p>
        <div className="compact-progress-container">
          <div
            className="compact-progress-bar"
            style={{ width: `${percentageUsed}%` }}
          />
        </div>
      </StatCard>

      {/* 2. Total Budget */}
      <StatCard title="Total Budget">
        <div className="compact-date-context">
          As of {currentMonth} {currentYear}
        </div>
        <p className="compact-stat-value">
          {formatPeso(summaryData?.total_budget || 0)}
        </p>
        <p className="compact-card-subtext">
          {percentageUsed.toFixed(1)}% allocated
        </p>
        <div className="compact-progress-container">
          <div
            className="compact-progress-bar"
            style={{ width: `${percentageUsed}%` }}
          />
        </div>
      </StatCard>

      {/* 3. Remaining Budget */}
      <StatCard title="Remaining Budget">
        <p className="compact-stat-value">
          {formatPeso(summaryData?.remaining_budget || 0)}
        </p>
        <p className="compact-card-subtext">
          {remainingPercentage.toFixed(1)}% of Total Budget
        </p>
        <span className="compact-badge">Available for Allocation</span>
      </StatCard>
    </div>
  );
};

export default DashboardStats;