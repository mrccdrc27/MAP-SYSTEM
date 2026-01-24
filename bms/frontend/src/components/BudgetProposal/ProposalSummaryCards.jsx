import React from "react";
import "../Dashboard/SummaryCards.css";

const ProposalSummaryCards = ({ summaryData }) => {
  const formatCurrency = (val) => {
    const num = parseFloat(val);
    return isNaN(num) ? "₱0.00" : `₱${num.toLocaleString("en-US", { 
      minimumFractionDigits: 2, 
      maximumFractionDigits: 2 
    })}`;
  };
  // MODIFICATION START: Updated JSX to use CSS classes from SummaryCards.css
  return (
    <div className="stats-grid">
      <div className="compact-budget-card">
        <div className="compact-card-title">Total Proposals</div>
        <div className="compact-stat-value">
          {summaryData.total_proposals}
        </div>
        <div className="compact-card-subtext">All submitted tickets</div>
      </div>

      <div className="compact-budget-card">
        <div className="compact-card-title">Pending Approval</div>
        <div className="compact-stat-value">
          {summaryData.pending_approvals}
        </div>
        <div className="compact-card-subtext">Awaiting finance review</div>
      </div>

      <div className="compact-budget-card">
        <div className="compact-card-title">Budget Total</div>
        <div className="compact-stat-value">
          {formatCurrency(summaryData.total_budget)}
        </div>
        <div className="compact-card-subtext">Cumulative requested amount</div>
      </div>
    </div>
  );
  // MODIFICATION END
};

export default ProposalSummaryCards;