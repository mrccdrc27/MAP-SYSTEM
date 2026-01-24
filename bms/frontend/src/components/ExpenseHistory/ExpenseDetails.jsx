import React from "react";
import { Download, ArrowLeft } from "lucide-react";
import "./ExpenseDetails.css"; 

const ExpenseDetails = ({
  expense,
  proposalDetails,
  loading,
  onBack,
  onExport,
}) => {
  const formatCurrency = (amount) =>
    `₱${parseFloat(amount).toLocaleString("en-US", {
      minimumFractionDigits: 2,
    })}`;

  if (loading) {
    return <div className="details-loading">Loading details...</div>;
  }

  return (
    <div className="budget-proposal-view">
      {/* Top Bar */}
      <div className="details-header-row">
        <button className="back-button" onClick={onBack}>
          <ArrowLeft size={14} /> <span>Back to Expenses</span>
        </button>
        <button className="export-btn" onClick={onExport}>
          <Download size={14} />
          <span>Export Report</span>
        </button>
      </div>

      <div className="details-content">
        {proposalDetails ? (
          <>
            {/* Linked Project Header */}
            <div className="proposal-header">
              <div className="proposal-header-content">
                <div>
                  <h4 className="proposal-label">Linked Project Context</h4>
                  <h3 className="proposal-title">{proposalDetails.title}</h3>
                </div>
                <div className="proposal-date">
                  Performance End Date: {proposalDetails.performance_end_date}
                </div>
              </div>
            </div>

            {/* Transaction Details */}
            <div className="expense-summary-section">
              <h4 className="section-title">Transaction Details</h4>
              <div className="details-grid">
                <div>
                  <strong>Date:</strong>
                  <div>{expense.date}</div>
                </div>
                <div>
                  <strong>Amount:</strong>
                  <div>
                    <span className="amount-highlight">
                      {formatCurrency(expense.amount)}
                    </span>
                  </div>
                </div>
                <div className="full-width">
                  <strong>Description:</strong>
                  <div className="description-text">{expense.description}</div>
                </div>
                <div>
                  <strong>Vendor:</strong>
                  <div>{expense.vendor || "N/A"}</div>
                </div>
              </div>

              {/* Attachments */}
              {expense.attachments && expense.attachments.length > 0 && (
                <div className="attachments-section">
                  <strong>
                    Attachments ({expense.attachments.length}):
                  </strong>
                  <div className="attachments-list">
                    {expense.attachments.map((attachment, idx) => (
                      <a
                        key={idx}
                        href={attachment.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="attachment-link"
                      >
                        <Download size={16} />
                        <span className="attachment-name">
                          {attachment.name}
                        </span>
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Project Summary & Description */}
            <div className="proposal-section">
              <h4 className="section-label">Project Summary</h4>
              <p className="section-content">
                {proposalDetails.project_summary}
              </p>
            </div>

            <div className="proposal-section">
              <h4 className="section-label">Project Description</h4>
              <p className="section-content">
                {proposalDetails.project_description}
              </p>
            </div>

            {/* Cost Elements */}
            <div className="proposal-section">
              <h4 className="section-label">Cost Elements</h4>
              <div className="cost-table">
                <div className="cost-header">
                  <div style={{ flex: "1" }}>Type</div>
                  <div style={{ flex: "2" }}>Description</div>
                  <div style={{ flex: "1", textAlign: "right" }}>
                    Estimated Cost
                  </div>
                </div>
                {proposalDetails.items &&
                  proposalDetails.items.map((item, idx) => (
                    <div
                      className="cost-row"
                      key={idx}
                      style={{
                        backgroundColor: idx % 2 === 0 ? "#fff" : "#fcfcfc",
                      }}
                    >
                      <div className="cost-type-col">
                        <span className="cost-dot"></span>
                        <span className="cost-type-text">
                          {item.cost_element}
                        </span>
                      </div>
                      <div className="cost-desc-col">{item.description}</div>
                      <div className="cost-amount-col">
                        {formatCurrency(item.estimated_cost)}
                      </div>
                    </div>
                  ))}
                <div className="cost-row total">
                  <div style={{ flex: "1" }}></div>
                  <div className="cost-total-label">TOTAL</div>
                  <div className="cost-total-amount">
                    {formatCurrency(
                      proposalDetails.total_cost || proposalDetails.amount
                    )}
                  </div>
                </div>
              </div>
            </div>
          </>
        ) : (
          /* Fallback View */
          <div className="fallback-details">
            <h3>Expense Details</h3>
            <p>
              <strong>Description:</strong> {expense.description}
            </p>
            <p>
              <strong>Vendor:</strong> {expense.vendor || "N/A"}
            </p>
            <p>
              <strong>Amount:</strong> {formatCurrency(expense.amount)}
            </p>
            <p>
              <strong>Date:</strong> {expense.date}
            </p>
            <p>
              <strong>Department:</strong> {expense.department_name || "N/A"}
            </p>
            <p>
              <strong>Category:</strong> {expense.category_name || "N/A"}
            </p>
            <p>
              <strong>Sub-Category:</strong> {expense.sub_category_name || "N/A"}
            </p>
            <p className="fallback-note">
              <em>
                This expense is not linked to a full project proposal structure
                or details are unavailable.
              </em>
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ExpenseDetails;