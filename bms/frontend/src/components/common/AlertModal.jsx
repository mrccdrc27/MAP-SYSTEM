import React from "react";
import { AlertCircle, CheckCircle } from "lucide-react";

const AlertModal = ({ isOpen, onClose, message, type = "info" }) => {
  if (!isOpen) return null;

  const isError = type === "error";
  const iconColor = isError ? "#dc3545" : "#28a745";
  const Icon = isError ? AlertCircle : CheckCircle;

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
          {isError ? "Error" : "Success"}
        </h3>
        <p style={{ margin: "0 0 24px 0", color: "#666", fontSize: "1rem", lineHeight: "1.5" }}>
          {message}
        </p>
        <button
          onClick={onClose}
          style={{
            padding: "10px 24px",
            backgroundColor: isError ? "#dc3545" : "#007bff",
            color: "white",
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