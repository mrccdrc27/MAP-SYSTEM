import React from "react";
import { Paperclip, AlertCircle, ExternalLink } from "lucide-react";

const ReviewExpenseModal = ({
  isOpen,
  expense,
  onClose,
  action,
  setAction,
  notes,
  setNotes,
  onSubmit,
}) => {
  if (!isOpen || !expense) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(0,0,0,0.5)",
        zIndex: 3000,
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <div
        style={{
          backgroundColor: "white",
          borderRadius: "8px",
          width: "600px",
          maxWidth: "90%",
          maxHeight: "90vh",
          overflowY: "auto",
          padding: "24px",
          boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
        }}
      >
        <h3
          style={{
            margin: "0 0 20px 0",
            fontSize: "20px",
            fontWeight: "bold",
            color: "#333",
          }}
        >
          Review Expense
        </h3>

        {/* Details Card */}
        <div
          style={{
            backgroundColor: "#f8f9fa",
            borderRadius: "6px",
            padding: "15px",
            marginBottom: "20px",
            border: "1px solid #e9ecef",
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "10px",
              fontSize: "13px",
              marginBottom: "10px",
            }}
          >
            <div>
              <span style={{ color: "#666", display: "block" }}>Amount</span>
              <strong style={{ fontSize: "15px", color: "#007bff" }}>
                ₱
                {parseFloat(expense.amount).toLocaleString("en-US", {
                  minimumFractionDigits: 2,
                })}
              </strong>
            </div>
            <div>
              <span style={{ color: "#666", display: "block" }}>
                Department
              </span>
              <strong>{expense.department_name}</strong>
            </div>
            <div>
              <span style={{ color: "#666", display: "block" }}>Category</span>
              <strong>
                {expense.category_name || expense.sub_category_name}
              </strong>
            </div>
            <div>
              <span style={{ color: "#666", display: "block" }}>Vendor</span>
              <strong>{expense.vendor || "N/A"}</strong>
            </div>
          </div>
          {expense.description && (
            <div
              style={{
                marginTop: "10px",
                paddingTop: "10px",
                borderTop: "1px solid #dee2e6",
              }}
            >
              <span
                style={{
                  fontSize: "12px",
                  color: "#666",
                  display: "block",
                  marginBottom: "4px",
                }}
              >
                Description
              </span>
              <p style={{ margin: 0, fontSize: "13px" }}>
                {expense.description}
              </p>
            </div>
          )}
        </div>

        {/* Attachments Section - REQUIRED FEATURE */}
        <div
          style={{
            marginBottom: "20px",
            padding: "15px",
            backgroundColor: "#f8f9fa",
            borderRadius: "6px",
            border: "1px solid #e9ecef",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              marginBottom: "12px",
            }}
          >
            <Paperclip size={16} color="#666" />
            <span
              style={{ fontSize: "14px", fontWeight: "600", color: "#333" }}
            >
              Attachments
            </span>
          </div>

          {expense.isLoadingDetails ? (
            <div
              style={{
                textAlign: "center",
                padding: "15px",
                color: "#666",
                fontSize: "13px",
              }}
            >
              Loading attachments...
            </div>
          ) : expense.attachments && expense.attachments.length > 0 ? (
            <div
              style={{ display: "flex", flexDirection: "column", gap: "8px" }}
            >
              {expense.attachments.map((file, idx) => (
                <a
                  key={idx}
                  href={file.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    padding: "10px",
                    backgroundColor: "white",
                    border: "1px solid #dee2e6",
                    borderRadius: "4px",
                    textDecoration: "none",
                    color: "#333",
                    transition: "all 0.2s",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = "#007bff";
                    e.currentTarget.style.backgroundColor = "#f0f8ff";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = "#dee2e6";
                    e.currentTarget.style.backgroundColor = "white";
                  }}
                >
                  <ExternalLink size={14} color="#007bff" />
                  <span
                    style={{
                      flex: 1,
                      fontSize: "13px",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {file.name}
                  </span>
                  <span
                    style={{
                      fontSize: "11px",
                      color: "#007bff",
                      fontWeight: "500",
                    }}
                  >
                    View File
                  </span>
                </a>
              ))}
            </div>
          ) : (
            <div
              style={{
                textAlign: "center",
                padding: "15px",
                backgroundColor: "#fff5f5",
                border: "1px solid #ffebee",
                borderRadius: "4px",
                color: "#dc3545",
              }}
            >
              <AlertCircle size={20} style={{ marginBottom: "5px" }} />
              <div style={{ fontSize: "13px", fontWeight: "500" }}>
                No attachments found
              </div>
            </div>
          )}
        </div>

        {/* Decision Controls */}
        <div style={{ marginBottom: "20px" }}>
          <label
            style={{
              display: "block",
              marginBottom: "8px",
              fontWeight: "500",
              fontSize: "14px",
            }}
          >
            Decision:
          </label>
          <div style={{ display: "flex", gap: "10px", marginBottom: "15px" }}>
            <button
              onClick={() => setAction("APPROVED")}
              style={{
                flex: 1,
                padding: "10px",
                borderRadius: "4px",
                border: `1px solid ${action === "APPROVED" ? "#28a745" : "#ced4da"}`,
                backgroundColor: action === "APPROVED" ? "#28a745" : "#f8f9fa",
                color: action === "APPROVED" ? "white" : "#495057",
                cursor: "pointer",
                fontWeight: "600",
              }}
            >
              Approve
            </button>
            <button
              onClick={() => setAction("REJECTED")}
              style={{
                flex: 1,
                padding: "10px",
                borderRadius: "4px",
                border: `1px solid ${action === "REJECTED" ? "#dc3545" : "#ced4da"}`,
                backgroundColor: action === "REJECTED" ? "#dc3545" : "#f8f9fa",
                color: action === "REJECTED" ? "white" : "#495057",
                cursor: "pointer",
                fontWeight: "600",
              }}
            >
              Reject
            </button>
          </div>

          <label
            style={{
              display: "block",
              marginBottom: "8px",
              fontWeight: "500",
              fontSize: "14px",
            }}
          >
            Review Notes:
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Enter reason or comments..."
            style={{
              width: "100%",
              padding: "10px",
              borderRadius: "4px",
              border: "1px solid #ced4da",
              minHeight: "80px",
              fontSize: "14px",
              fontFamily: "inherit",
              resize: "vertical",
              backgroundColor: "white",
            }}
          />
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            gap: "10px",
            paddingTop: "15px",
            borderTop: "1px solid #e9ecef",
          }}
        >
          <button
            onClick={onClose}
            style={{
              padding: "8px 20px",
              background: "white",
              border: "1px solid #ccc",
              borderRadius: "4px",
              cursor: "pointer",
            }}
          >
            Cancel
          </button>
          <button
            onClick={onSubmit}
            disabled={!action}
            style={{
              padding: "8px 20px",
              background:
                action === "APPROVED"
                  ? "#28a745"
                  : action === "REJECTED"
                    ? "#dc3545"
                    : "#6c757d",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: action ? "pointer" : "not-allowed",
              fontWeight: "600",
              opacity: action ? 1 : 0.7,
            }}
          >
            Submit Decision
          </button>
        </div>
      </div>
    </div>
  );
};

export default ReviewExpenseModal;
