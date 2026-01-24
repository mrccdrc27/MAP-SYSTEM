import React from "react";
import { ArrowLeft } from "lucide-react";

const ProposalConfirmationModal = ({
  isOpen,
  proposal,
  status,
  onClose,
  onBack,
  rejectionReason,
  setRejectionReason,
  rejectionReasons,
  comment,
  setComment,
  financeName,
  onSubmit,
}) => {
  if (!isOpen || !proposal) return null;

  return (
    <div
      className="popup-overlay"
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(0,0,0,0.5)",
        zIndex: 1200,
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <div
        style={{
          backgroundColor: "white",
          borderRadius: "8px",
          padding: "20px",
          width: "600px",
          maxWidth: "90vw",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            marginBottom: "15px",
            borderBottom: "1px solid #eee",
            paddingBottom: "10px",
          }}
        >
          <button
            onClick={onBack}
            style={{
              background: "none",
              border: "none",
              color: "#007bff",
              cursor: "pointer",
            }}
          >
            <ArrowLeft size={20} />
          </button>
          <h2
            style={{ margin: "0 auto", fontSize: "20px", fontWeight: "bold" }}
          >
            {status === "APPROVED" ? "Approval Status" : "Rejection Details"}
          </h2>
        </div>

        <div style={{ marginBottom: "20px" }}>
          <h3 style={{ fontSize: "16px", marginBottom: "10px" }}>
            {proposal.title}
          </h3>
          <div style={{ fontSize: "14px", color: "#555" }}>
            <div>
              <strong>Amount:</strong> ₱
              {parseFloat(
                proposal.amount || proposal.total_cost,
              ).toLocaleString()}
            </div>
            <div>
              <strong>Department:</strong>{" "}
              {proposal.department_name || proposal.department}
            </div>
          </div>
        </div>

        {status === "REJECTED" && (
          <div style={{ marginBottom: "15px" }}>
            <label
              style={{
                display: "block",
                marginBottom: "5px",
                fontWeight: "600",
              }}
            >
              Rejection Reason:
            </label>
            <select
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              style={{
                width: "100%",
                padding: "8px",
                borderRadius: "4px",
                border: "1px solid #ccc",
              }}
            >
              <option value="">Select a reason</option>
              {rejectionReasons.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>
        )}

        <div style={{ marginBottom: "20px" }}>
          <label
            style={{ display: "block", marginBottom: "5px", fontWeight: "600" }}
          >
            {status === "REJECTED" ? "Comments:" : "Approval Notes (Optional):"}
          </label>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows="4"
            style={{
              width: "100%",
              padding: "8px",
              borderRadius: "4px",
              border: "1px solid #ccc",
              resize: "vertical",
            }}
            placeholder="Add feedback here..."
          ></textarea>
        </div>

        <div
          style={{
            backgroundColor: status === "APPROVED" ? "#d4edda" : "#f8d7da",
            padding: "15px",
            borderRadius: "8px",
            fontSize: "13px",
          }}
        >
          <div>
            <strong>Actor:</strong> {financeName} (Finance Department)
          </div>
          <div>
            <strong>Action:</strong> {status}
          </div>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "center",
            marginTop: "20px",
          }}
        >
          <button
            onClick={onSubmit}
            style={{
              padding: "10px 30px",
              backgroundColor: "#007bff",
              color: "white",
              border: "none",
              borderRadius: "4px",
              fontWeight: "600",
              cursor: "pointer",
            }}
          >
            Submit Review
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProposalConfirmationModal;
