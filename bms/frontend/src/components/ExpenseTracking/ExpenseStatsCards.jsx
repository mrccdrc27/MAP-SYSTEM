import React from "react";
import "../Dashboard/SummaryCards.css"; // Reuse dashboard styling

const ExpenseStatsCards = ({ summaryData }) => {
  const formatCurrency = (val) => {
    const num = parseFloat(val);
    return isNaN(num) ? "₱0.00" : `₱${num.toLocaleString("en-US", { 
      minimumFractionDigits: 2, 
      maximumFractionDigits: 2 
    })}`;
  };

  return (
    <div className="stats-grid">
      <div className="compact-budget-card">
        <div className="compact-card-title">Budget Remaining</div>
        <div className="compact-stat-value">
          {formatCurrency(summaryData.budget_remaining)}
        </div>
        <div className="compact-card-subtext">Available for allocation</div>
      </div>

      <div className="compact-budget-card">
        <div className="compact-card-title">Total Expenses</div>
        <div className="compact-stat-value">
          {formatCurrency(summaryData.total_expenses_this_month)}
        </div>
        <div className="compact-card-subtext">Recorded this month</div>
      </div>
    </div>
  );
};

export default ExpenseStatsCards;