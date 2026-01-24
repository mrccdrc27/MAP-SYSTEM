import React from "react";
import { CheckCircle, XCircle, Clock } from "lucide-react";

const AllocationStatusBadge = ({ status }) => {
  const getStatusConfig = (s) => {
    switch (s?.toUpperCase()) {
      case "APPROVED": return { bg: "#d4edda", color: "#155724", border: "#c3e6cb", icon: CheckCircle };
      case "REJECTED": return { bg: "#f8d7da", color: "#721c24", border: "#f5c6cb", icon: XCircle };
      case "PENDING": return { bg: "#fff3cd", color: "#856404", border: "#ffeaa7", icon: Clock };
      default: return { bg: "#e2e3e5", color: "#383d41", border: "#d6d8db", icon: null };
    }
  };

  const config = getStatusConfig(status);
  const Icon = config.icon;

  return (
    <span style={{
      backgroundColor: config.bg, color: config.color, border: `1px solid ${config.border}`,
      padding: "4px 8px", borderRadius: "12px", fontSize: "11px", fontWeight: "600",
      display: "inline-flex", alignItems: "center", gap: "4px", textTransform: "capitalize"
    }}>
      {Icon && <Icon size={12} />}
      {status ? status.toLowerCase() : "Unknown"}
    </span>
  );
};

export default AllocationStatusBadge;