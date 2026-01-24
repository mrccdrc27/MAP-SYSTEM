import React from "react";

const StatusBadge = ({ type, name }) => {
  const getStatusStyle = () => {
    switch (type?.toLowerCase()) {
      case "approved":
        return {
          backgroundColor: "#e6f4ea",
          color: "#0d6832",
          borderColor: "#a3d9b1",
        };
      case "rejected":
        return {
          backgroundColor: "#fde8e8",
          color: "#9b1c1c",
          borderColor: "#f5b7b1",
        };
      case "submitted":
        return {
          backgroundColor: "#e8f4fd",
          color: "#1a56db",
          borderColor: "#a4cafe",
        };
      case "updated":
        return {
          backgroundColor: "#fef3c7",
          color: "#92400e",
          borderColor: "#fcd34d",
        };
      case "reviewed":
        return {
          backgroundColor: "#f0f9ff",
          color: "#0369a1",
          borderColor: "#bae6fd",
        };
        // MODIFICATION START: Added Posted status for Ledger
      case "posted":
        return {
          backgroundColor: "#e6f4ea",
          color: "#0d6832",
          borderColor: "#a3d9b1",
        };
      default:
        return {
          backgroundColor: "#f3f4f6",
          color: "#374151",
          borderColor: "#d1d5db",
        };
    }
  };

  const style = getStatusStyle();

  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "4px 12px",
        borderRadius: "12px",
        fontSize: "12px",
        fontWeight: "500",
        border: `1px solid ${style.borderColor}`,
        backgroundColor: style.backgroundColor,
        color: style.color,
      }}
    >
      <div
        style={{
          width: "6px",
          height: "6px",
          borderRadius: "50%",
          marginRight: "6px",
          backgroundColor: style.color,
        }}
      ></div>
      {name}
    </div>
  );
};

export default StatusBadge;