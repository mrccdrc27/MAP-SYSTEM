import React from "react";
// MODIFICATION: Import AlertTriangle
import { AlertCircle, CheckCircle, AlertTriangle } from "lucide-react";

const AlertModal = ({ isOpen, onClose, message, type = "info" }) => {
  if (!isOpen) return null;

  // MODIFICATION START: Handle 'warning' type
  let Icon = CheckCircle;
  let iconColor = "#28a745"; // Green
  let title = "Success";

  if (type === "error") {
    Icon = AlertCircle;
    iconColor = "#dc3545"; // Red
    title = "Error";
  } else if (type === "warning") {
    Icon = AlertTriangle;
    iconColor = "#ffc107"; // Orange/Yellow
    title = "Attention";
  }
  // MODIFICATION END

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 4000,
      }}
    >
      <div
        style={{
          backgroundColor: "white",
          borderRadius: "8px",
          width: "400px",
          maxWidth: "90%",
          padding: "24px",
          boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
          textAlign: "center",
        }}
      >
        <div style={{ marginBottom: "16px", display: "flex", justifyContent: "center" }}>
          <Icon size={48} color={iconColor} />
        </div>
        <h3 style={{ margin: "0 0 10px 0", color: "#333", fontSize: "1.25rem" }}>
          {title}
        </h3>
        <p style={{ margin: "0 0 24px 0", color: "#666", fontSize: "1rem", lineHeight: "1.5" }}>
          {message}
        </p>
        <button
          onClick={onClose}
          style={{
            padding: "10px 24px",
            // Use dynamic color for button too
            backgroundColor: type === "warning" ? "#ffc107" : (type === "error" ? "#dc3545" : "#007bff"),
            color: type === "warning" ? "#333" : "white",
            border: "none",
            borderRadius: "4px",
            fontSize: "14px",
            fontWeight: "500",
            cursor: "pointer",
            minWidth: "100px",
          }}
        >
          OK
        </button>
      </div>
    </div>
  );
};

export default AlertModal;