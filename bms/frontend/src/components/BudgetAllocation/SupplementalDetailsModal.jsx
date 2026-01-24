import React from "react";
import { X } from "lucide-react";
import AllocationStatusBadge from "./AllocationStatusBadge";

const SupplementalDetailsModal = ({ request, onClose, onApprove, onReject, isFinanceManager }) => {
  if (!request) return null;

  const formatCurrency = (val) => `₱${parseFloat(val).toLocaleString("en-US", { minimumFractionDigits: 2 })}`;

  return (
    <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.5)", zIndex: 2000, display: "flex", justifyContent: "center", alignItems: "center" }}>
      <div style={{ backgroundColor: "white", borderRadius: "8px", width: "600px", maxWidth: "90%", maxHeight: "90vh", overflow: "auto", boxShadow: "0 4px 6px rgba(0,0,0,0.1)" }}>
        <div style={{ padding: "16px 24px", borderBottom: "1px solid #e9ecef", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h3 style={{ margin: 0, fontSize: "18px" }}>Supplemental Request Details</h3>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer" }}><X size={20} /></button>
        </div>
        
        <div style={{ padding: "24px" }}>
          <div style={{ marginBottom: "24px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h4 style={{ margin: 0, fontSize: "16px", color: "#333" }}>ID: {request.request_id}</h4>
            <AllocationStatusBadge status={request.status} />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "24px", fontSize: "14px" }}>
            <div><label style={{ display: "block", fontSize: "12px", color: "#666" }}>Department</label><strong>{request.department_name}</strong></div>
            <div><label style={{ display: "block", fontSize: "12px", color: "#666" }}>Date Submitted</label><strong>{request.date_submitted}</strong></div>
            <div><label style={{ display: "block", fontSize: "12px", color: "#666" }}>Category</label><strong>{request.category_name}</strong></div>
            <div><label style={{ display: "block", fontSize: "12px", color: "#666" }}>Requested Amount</label><strong style={{ color: "#007bff", fontSize: "16px" }}>{formatCurrency(request.amount)}</strong></div>
          </div>

          <div style={{ marginBottom: "24px" }}>
            <label style={{ display: "block", fontSize: "12px", color: "#666" }}>Justification</label>
            <div style={{ padding: "12px", background: "#f8f9fa", borderRadius: "6px", fontSize: "14px", lineHeight: "1.5" }}>{request.reason}</div>
          </div>

          <div style={{ marginBottom: "24px" }}>
            <label style={{ display: "block", fontSize: "12px", color: "#666" }}>Requester</label>
            <div style={{ fontSize: "14px" }}>{request.requester_name}</div>
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", borderTop: "1px solid #eee", paddingTop: "20px" }}>
            {isFinanceManager && request.status === "PENDING" ? (
              <>
                <button onClick={() => onReject(request.id)} style={{ padding: "8px 20px", background: "#dc3545", color: "white", border: "none", borderRadius: "4px", cursor: "pointer", fontWeight: "600" }}>Reject Request</button>
                <button onClick={() => onApprove(request.id)} style={{ padding: "8px 20px", background: "#28a745", color: "white", border: "none", borderRadius: "4px", cursor: "pointer", fontWeight: "600" }}>Approve & Allocate</button>
              </>
            ) : (
              <button onClick={onClose} style={{ padding: "8px 20px", background: "#f8f9fa", border: "1px solid #ccc", borderRadius: "4px", cursor: "pointer" }}>Close</button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SupplementalDetailsModal;