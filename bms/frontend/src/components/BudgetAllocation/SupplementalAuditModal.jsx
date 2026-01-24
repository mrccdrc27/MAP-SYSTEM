import React from "react";
import { X } from "lucide-react";

const SupplementalAuditModal = ({ logs, onClose }) => {
  return (
    <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.5)", zIndex: 2000, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ backgroundColor: "white", borderRadius: "8px", width: "900px", maxWidth: "90%", maxHeight: "80vh", overflow: "hidden", display: "flex", flexDirection: "column", boxShadow: "0 4px 6px rgba(0,0,0,0.1)" }}>
        <div style={{ padding: "16px 24px", borderBottom: "1px solid #e9ecef", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h3 style={{ margin: 0, fontSize: "18px", fontWeight: "600" }}>Supplemental Budget Audit Logs</h3>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer" }}><X size={20} /></button>
        </div>

        <div style={{ padding: "24px", overflowY: "auto", flex: 1 }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
            <thead>
              <tr style={{ backgroundColor: "#f8f9fa", position: "sticky", top: 0 }}>
                <th style={{ padding: "12px", textAlign: "left", borderBottom: "2px solid #dee2e6" }}>TIMESTAMP</th>
                <th style={{ padding: "12px", textAlign: "left", borderBottom: "2px solid #dee2e6" }}>REQUEST ID</th>
                <th style={{ padding: "12px", textAlign: "left", borderBottom: "2px solid #dee2e6" }}>ACTION</th>
                <th style={{ padding: "12px", textAlign: "left", borderBottom: "2px solid #dee2e6" }}>ACTOR</th>
                <th style={{ padding: "12px", textAlign: "left", borderBottom: "2px solid #dee2e6" }}>DEPARTMENT</th>
                <th style={{ padding: "12px", textAlign: "left", borderBottom: "2px solid #dee2e6" }}>AMOUNT</th>
              </tr>
            </thead>
            <tbody>
              {logs.length === 0 ? (
                <tr><td colSpan="6" style={{ textAlign: "center", padding: "20px" }}>No logs available.</td></tr>
              ) : logs.map((log, index) => (
                <tr key={index} style={{ borderBottom: "1px solid #e9ecef" }}>
                  <td style={{ padding: "12px" }}>{log.timestamp}</td>
                  <td style={{ padding: "12px" }}>{log.request_id}</td>
                  <td style={{ padding: "12px" }}>
                    <span style={{ 
                      padding: "2px 8px", borderRadius: "4px", fontSize: "11px", fontWeight: "500",
                      backgroundColor: log.action === "Approved" ? "#d4edda" : log.action === "Rejected" ? "#f8d7da" : "#e2e3e5",
                      color: log.action === "Approved" ? "#155724" : log.action === "Rejected" ? "#721c24" : "#383d41"
                    }}>
                      {log.action}
                    </span>
                  </td>
                  <td style={{ padding: "12px" }}>{log.actor}</td>
                  <td style={{ padding: "12px" }}>{log.original.department_name}</td>
                  <td style={{ padding: "12px" }}>₱{parseFloat(log.original.amount).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default SupplementalAuditModal;