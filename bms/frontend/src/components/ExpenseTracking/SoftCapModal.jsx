import React, { useState } from "react";
import { Bell } from "lucide-react";

const SoftCapModal = ({ isOpen, onClose, onSubmit, capInfo }) => {
  const [justification, setJustification] = useState("");

  if (!isOpen) return null;

  const handleSubmit = () => {
    if (!justification.trim() || justification.length < 10) {
      alert("Please provide a justification (minimum 10 characters).");
      return;
    }
    onSubmit(justification);
  };

  return (
    <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.5)", zIndex: 3000, display: "flex", justifyContent: "center", alignItems: "center" }}>
      <div style={{ backgroundColor: "white", borderRadius: "8px", width: "500px", maxWidth: "90%", padding: "24px", boxShadow: "0 4px 12px rgba(0,0,0,0.15)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px" }}>
          <Bell size={24} color="#f59e0b" />
          <h3 style={{ margin: 0, fontSize: "1.25rem", color: "#333" }}>Budget Soft Cap Exceeded</h3>
        </div>

        <div style={{ backgroundColor: "#fff3cd", border: "1px solid #ffeeba", color: "#856404", padding: "12px", borderRadius: "4px", marginBottom: "16px", fontSize: "0.9rem" }}>
          {capInfo?.detail || "This expense exceeds the designated soft cap for this category."}
        </div>

        {capInfo?.cap_info && (
          <div style={{ marginBottom: "16px", fontSize: "0.9rem", color: "#555" }}>
            <p style={{ margin: "4px 0" }}><strong>Remaining:</strong> ₱{capInfo.cap_info.remaining?.toLocaleString()}</p>
            <p style={{ margin: "4px 0" }}><strong>Requested:</strong> ₱{capInfo.cap_info.requested?.toLocaleString()}</p>
          </div>
        )}

        <label style={{ display: "block", marginBottom: "8px", fontWeight: "500" }}>Justification Required <span style={{ color: "red" }}>*</span></label>
        <textarea
          value={justification}
          onChange={(e) => setJustification(e.target.value)}
          placeholder="Explain why this expense is necessary..."
          style={{ width: "100%", minHeight: "100px", padding: "10px", border: "1px solid #ccc", borderRadius: "4px", marginBottom: "20px", fontSize: "14px", fontFamily: "inherit", resize: "vertical" }}
        />

        <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
          <button onClick={onClose} style={{ padding: "8px 16px", border: "1px solid #ccc", background: "white", borderRadius: "4px", cursor: "pointer" }}>Cancel</button>
          <button onClick={handleSubmit} style={{ padding: "8px 16px", border: "none", background: "#f59e0b", color: "white", borderRadius: "4px", fontWeight: "500", cursor: "pointer" }}>Proceed with Exception</button>
        </div>
      </div>
    </div>
  );
};

export default SoftCapModal;