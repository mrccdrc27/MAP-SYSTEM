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

  // Safe defaults if data hasn't loaded yet
  const data = summaryData || {
    pending_count: 0, pending_value: 0,
    approved_count: 0, approved_value: 0,
    rejected_count: 0, rejected_value: 0
  };

  return (
    <div className="stats-grid">
      {/* Card 1: Workload (Pending) */}
      <div className="compact-budget-card" style={{ borderLeft: "4px solid #f59e0b" }}>
        <div className="compact-card-title">Pending Review</div>
        <div className="compact-stat-value" style={{ color: "#f59e0b" }}>
          {data.pending_count}
        </div>
        <div className="compact-card-subtext" style={{ color: "#616161"}}>
          Value: <strong>{formatCurrency(data.pending_value)}</strong>
        </div>
      </div>

      {/* Card 2: Impact (Approved) */}
      <div className="compact-budget-card" style={{ borderLeft: "4px solid #10b981" }}>
        <div className="compact-card-title">Approved Budget</div>
        <div className="compact-stat-value" style={{ color: "#10b981" }}>
          {formatCurrency(data.approved_value)}
        </div>
        <div className="compact-card-subtext">
          From {data.approved_count} approved proposals
        </div>
      </div>

      {/* Card 3: Filtered (Rejected) */}
      <div className="compact-budget-card" style={{ borderLeft: "4px solid #ef4444" }}>
        <div className="compact-card-title">Rejected Requests</div>
        <div className="compact-stat-value" style={{ color: "#ef4444" }}>
          {data.rejected_count}
        </div>
        <div className="compact-card-subtext">
          Value: {formatCurrency(data.rejected_value)}
        </div>
      </div>
    </div>
  );
};

export default ProposalSummaryCards;