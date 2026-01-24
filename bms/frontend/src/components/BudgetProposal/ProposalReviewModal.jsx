import React from "react";
import { ArrowLeft, Printer } from "lucide-react";
import SignatureUpload from "./SignatureUpload";

const ProposalReviewModal = ({
  isOpen,
  proposal,
  readOnly,
  isFinanceManager,
  onClose,
  onPrint,
  financeName,
  setFinanceName,
  financeSignature,
  setFinanceSignature,
  onStatusChange,
}) => {
  if (!isOpen || !proposal) return null;

  const formatCurrency = (val) =>
    `₱${parseFloat(val || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}`;

  return (
    <div className="popup-overlay">
      <div className="review-popup">
        {/* Header */}
        <div className="popup-header">
          <button className="back-button" onClick={onClose}>
            <ArrowLeft size={20} />
          </button>
          <h2 className="proposal-title">Ticket Review</h2>
          <div className="print-section">
            <a
              onClick={onPrint}
              className="print-link"
              style={{ cursor: "pointer" }}
            >
              <Printer size={16} /> Print File
            </a>
          </div>
        </div>

        {/* Content */}
        <div className="popup-content">
          {/* Title, Date and Ticket ID */}
          <div className="proposal-header">
            <div>
              <h3 className="proposal-project-title">
                {proposal.title || proposal.subject}
              </h3>
              <span className="proposal-date">
                {proposal.submitted_at
                  ? new Date(proposal.submitted_at).toLocaleDateString(
                      "en-US",
                      {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      },
                    )
                  : "Date not available"}
              </span>
              {proposal.external_system_id && (
                <div
                  style={{
                    marginTop: "8px",
                    fontSize: "0.875rem",
                    color: "#6b7280",
                  }}
                >
                  <strong>Ticket ID:</strong> {proposal.external_system_id}
                </div>
              )}
            </div>
          </div>

          {/* Project Details */}
          <div className="proposal-details-grid">
            <div className="detail-item">
              <strong>Category:</strong> {proposal.category || "N/A"}
            </div>
            <div className="detail-item">
              <strong>Sub-Category:</strong>{" "}
              {proposal.sub_category ||
                proposal.items?.[0]?.cost_element ||
                "N/A"}
            </div>
            <div className="detail-item">
              <strong>Department:</strong>{" "}
              {proposal.department_name || proposal.department || "N/A"}
            </div>
            <div className="detail-item">
              <strong>Budget Amount:</strong>{" "}
              {formatCurrency(proposal.total_cost || proposal.amount)}
            </div>
            <div className="detail-item">
              <strong>Submitted by:</strong>{" "}
              {proposal.submitted_by_name || proposal.submitted_by || "N/A"}
            </div>
          </div>

          {/* Project Summary */}
          <div className="proposal-section">
            <h4 className="section-label">PROJECT SUMMARY:</h4>
            <p className="section-content">
              {proposal.project_summary || "No summary provided."}
            </p>
          </div>

          {/* Project Description */}
          {proposal.project_description && (
            <div className="proposal-section">
              <h4 className="section-label">PROJECT DESCRIPTION:</h4>
              <p className="section-content">{proposal.project_description}</p>
            </div>
          )}

          {/* Period of Performance */}
          {proposal.performance_start_date && proposal.performance_end_date && (
            <div className="proposal-section">
              <h4 className="section-label">PERIOD OF PERFORMANCE:</h4>
              <p className="section-content">
                {new Date(proposal.performance_start_date).toLocaleDateString()}{" "}
                to{" "}
                {new Date(proposal.performance_end_date).toLocaleDateString()}
              </p>
            </div>
          )}

          {/* Cost Elements Table */}
          {proposal.items?.length > 0 && (
            <div className="proposal-section">
              <h4 className="section-label">COST ELEMENTS:</h4>
              <div className="cost-table">
                <div className="cost-table-header">
                  <div className="cost-header-cell">COST ELEMENTS</div>
                  <div className="cost-header-cell">DESCRIPTION</div>
                  <div className="cost-header-cell">ESTIMATED COST</div>
                </div>
                {proposal.items.map((item, idx) => (
                  <div key={idx} className="cost-table-row">
                    <div className="cost-cell">
                      <span className="cost-bullet green"></span>
                      {item.cost_element || "N/A"}
                    </div>
                    <div className="cost-cell">{item.description || "N/A"}</div>
                    <div className="cost-cell">
                      {formatCurrency(item.estimated_cost)}
                    </div>
                  </div>
                ))}
                <div className="cost-table-total">
                  <div className="cost-cell"></div>
                  <div className="cost-cell">TOTAL:</div>
                  <div className="cost-cell total-amount">
                    {formatCurrency(proposal.amount || proposal.total_cost)}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Finance Department Approval Section */}
          <div className="proposal-section">
            <h4 className="section-label">FINANCE DEPARTMENT APPROVAL:</h4>
            <div
              style={{
                padding: "1rem",
                border: "1px solid #e5e7eb",
                borderRadius: "0.5rem",
                marginTop: "0.5rem",
                backgroundColor: "white",
              }}
            >
              {/* Finance Manager Name */}
              <div style={{ marginBottom: "1rem" }}>
                <label
                  style={{
                    fontWeight: 500,
                    marginBottom: "0.5rem",
                    display: "block",
                    fontSize: "0.875rem",
                  }}
                >
                  Finance Manager Name: <span style={{ color: "red" }}>*</span>
                </label>
                <input
                  type="text"
                  value={financeName}
                  onChange={(e) => setFinanceName(e.target.value)}
                  disabled={readOnly || !isFinanceManager}
                  placeholder={
                    isFinanceManager
                      ? "Enter Finance Manager Name"
                      : "Pending Finance Review"
                  }
                  style={{
                    width: "100%",
                    padding: "0.75rem",
                    border: "1px solid #d1d5db",
                    borderRadius: "0.375rem",
                    fontSize: "0.875rem",
                    outline: "none",
                    backgroundColor:
                      readOnly || !isFinanceManager ? "#f8f9fa" : "white",
                    color:
                      readOnly || !isFinanceManager ? "#6c757d" : "#212529",
                    cursor:
                      readOnly || !isFinanceManager ? "not-allowed" : "text",
                  }}
                />
              </div>

              {/* Signature */}
              <div style={{ marginBottom: "1rem" }}>
                <label
                  style={{
                    fontWeight: 500,
                    marginBottom: "0.5rem",
                    display: "block",
                    fontSize: "0.875rem",
                  }}
                >
                  Signature (Attachment):{" "}
                  <span style={{ color: "red" }}>*</span>
                </label>
                {!readOnly && isFinanceManager ? (
                  <SignatureUpload
                    value={financeSignature}
                    onChange={setFinanceSignature}
                  />
                ) : proposal.signature || financeSignature ? (
                  <img
                    src={proposal.signature || financeSignature}
                    alt="Signature"
                    style={{
                      maxWidth: "300px",
                      maxHeight: "100px",
                      border: "1px solid #d1d5db",
                      padding: "0.5rem",
                      backgroundColor: "#f8f9fa",
                      borderRadius: "0.375rem",
                    }}
                  />
                ) : (
                  <div
                    style={{
                      padding: "1rem",
                      backgroundColor: "#f8f9fa",
                      border: "1px dashed #d1d5db",
                      borderRadius: "0.375rem",
                      color: "#6c757d",
                      fontStyle: "italic",
                      fontSize: "0.875rem",
                    }}
                  >
                    No signature attached.
                  </div>
                )}
              </div>

              {/* Date Submitted */}
              <div>
                <label
                  style={{
                    fontWeight: 500,
                    marginBottom: "0.5rem",
                    display: "block",
                    fontSize: "0.875rem",
                  }}
                >
                  Date submitted:
                </label>
                <div
                  style={{
                    padding: "0.75rem",
                    border: "1px solid #d1d5db",
                    borderRadius: "0.375rem",
                    backgroundColor: "#f8f9fa",
                    fontSize: "0.875rem",
                  }}
                >
                  {readOnly && proposal.approval_date
                    ? new Date(proposal.approval_date).toLocaleDateString()
                    : new Date().toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer with Action Buttons */}
        {!readOnly && isFinanceManager && (
          <div className="popup-footer">
            <div className="action-buttons">
              <button
                className="approve-btn"
                onClick={() => onStatusChange("APPROVED")}
              >
                Approve
              </button>
              <button
                className="reject-btn"
                onClick={() => onStatusChange("REJECTED")}
              >
                Reject
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProposalReviewModal;
