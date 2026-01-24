import React from "react";
import {
  ArrowLeft,
  Download,
  User as UserIcon,
  Calendar,
  CheckCircle,
  XCircle,
  FileText,
  RefreshCw,
} from "lucide-react";
import StatusBadge from "./StatusBadge";

const AuditTrailModal = ({
  isOpen,
  loading,
  selectedAuditTrail,
  proposalHistory,
  auditProposalDetails,
  onClose,
  onExport,
  renderNavbar,
  shortenDepartmentName,
}) => {
  if (!isOpen) return null;

  const getStatusIcon = (status) => {
    switch (status?.toLowerCase()) {
      case "approved": return <CheckCircle size={14} color="#0d6832" />;
      case "rejected": return <XCircle size={14} color="#9b1c1c" />;
      case "submitted": return <FileText size={14} color="#1a56db" />;
      case "updated": return <RefreshCw size={14} color="#92400e" />;
      default: return <FileText size={14} color="#374151" />;
    }
  };

  const getSequentialStats = () => {
    if (!proposalHistory || proposalHistory.length === 0)
      return { count: 0, first: "N/A", last: "N/A" };
    const sorted = [...proposalHistory].sort(
      (a, b) => new Date(a.last_modified) - new Date(b.last_modified),
    );
    return {
      count: proposalHistory.length,
      first: new Date(sorted[0].last_modified).toLocaleDateString(),
      last: new Date(sorted[sorted.length - 1].last_modified).toLocaleDateString(),
    };
  };

  const auditStats = getSequentialStats();
  const displayComment =
    proposalHistory.find((h) => h.comments && h.comments.trim().length > 0)
      ?.comments || "No comments recorded.";

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "white",
        zIndex: 1100,
        overflow: "auto",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {renderNavbar()}
      <div
        style={{
          flex: 1,
          overflow: "auto",
          padding: "20px",
          maxWidth: "1200px",
          margin: "0 auto",
          width: "100%",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "20px",
            flexWrap: "wrap",
            gap: "10px",
          }}
        >
          <button
            onClick={onClose}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "5px",
              padding: "8px 12px",
              backgroundColor: "#f8f9fa",
              border: "1px solid #dee2e6",
              borderRadius: "4px",
              cursor: "pointer",
              fontSize: "13px",
              outline: "none",
            }}
          >
            <ArrowLeft size={16} /> <span>Back to Proposal History</span>
          </button>
          <button
            onClick={onExport}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "8px 16px",
              backgroundColor: "#007bff",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
              fontSize: "13px",
              outline: "none",
            }}
          >
            <span>Export Report</span> <Download size={16} />
          </button>
        </div>

        {loading || !selectedAuditTrail ? (
          <div style={{ textAlign: "center", padding: "40px" }}>Loading audit trail...</div>
        ) : (
          <div
            style={{
              backgroundColor: "white",
              borderRadius: "8px",
              padding: "20px",
              boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
            }}
          >
            {/* Context Section */}
            <div
              style={{
                marginBottom: "25px",
                padding: "20px",
                backgroundColor: "#f8f9fa",
                borderRadius: "8px",
                border: "1px solid #e9ecef",
              }}
            >
              <h4 style={{ margin: "0 0 15px 0", color: "#6c757d", fontSize: "12px", textTransform: "uppercase", fontWeight: "600" }}>
                AUDIT TRAIL CONTEXT
              </h4>
              <h3 style={{ margin: "0 0 20px 0", fontSize: "18px", fontWeight: "600", color: "#333" }}>
                {selectedAuditTrail.proposal_id || "N/A"}
              </h3>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "15px" }}>
                <div>
                  <div style={{ fontSize: "11px", color: "#6c757d" }}>Department:</div>
                  <div style={{ fontSize: "13px", fontWeight: "500" }}>{shortenDepartmentName(selectedAuditTrail.department)}</div>
                </div>
                <div>
                  <div style={{ fontSize: "11px", color: "#6c757d" }}>Category:</div>
                  <div style={{ fontSize: "13px", fontWeight: "500" }}>{selectedAuditTrail.category}</div>
                </div>
                <div>
                  <div style={{ fontSize: "11px", color: "#6c757d" }}>Status:</div>
                  <StatusBadge
                    type={auditProposalDetails?.status || selectedAuditTrail.status}
                    name={auditProposalDetails?.status || selectedAuditTrail.status}
                  />
                </div>
                <div>
                  <div style={{ fontSize: "11px", color: "#6c757d" }}>Last Modified:</div>
                  <div style={{ fontSize: "13px" }}>{new Date(selectedAuditTrail.last_modified).toLocaleString()}</div>
                </div>
              </div>
            </div>

            {/* MODIFICATION START: Dynamic Proposal Context Section */}
            <div
              className="complete-details-section"
              style={{
                backgroundColor: "#fff",
                padding: "20px",
                borderRadius: "8px",
                marginBottom: "20px",
                border: "1px solid #e9ecef",
              }}
            >
              <h4 style={{ margin: "0 0 15px 0", fontSize: "14px", color: "#333", fontWeight: "600" }}>
                Complete Proposal Details (Current)
              </h4>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "15px", fontSize: "13px" }}>
                <div>
                  <strong style={{ color: "#6c757d" }}>Total Budget:</strong>
                  <div style={{ marginTop: "4px" }}>
                    ₱{auditProposalDetails ? parseFloat(auditProposalDetails.total_cost).toLocaleString(undefined, { minimumFractionDigits: 2 }) : "0.00"}
                  </div>
                </div>
                <div>
                  <strong style={{ color: "#6c757d" }}>Fiscal Year:</strong>
                  <div style={{ marginTop: "4px" }}>{auditProposalDetails?.fiscal_year_name || "2026"}</div>
                </div>
                <div>
                  <strong style={{ color: "#6c757d" }}>Sub-Category:</strong>
                  <div style={{ marginTop: "4px" }}>{selectedAuditTrail.subcategory}</div>
                </div>
                <div>
                  <strong style={{ color: "#6c757d" }}>Performance Period:</strong>
                  <div style={{ marginTop: "4px" }}>
                    {auditProposalDetails ? `${new Date(auditProposalDetails.performance_start_date).toLocaleDateString()} - ${new Date(auditProposalDetails.performance_end_date).toLocaleDateString()}` : "N/A"}
                  </div>
                </div>
              </div>
            </div>
            {/* MODIFICATION END */}

            {/* Change Log Table */}
            <div style={{ marginBottom: "20px", padding: "20px", border: "1px solid #e9ecef", borderRadius: "8px" }}>
              <h4 style={{ marginBottom: "15px", fontSize: "14px", fontWeight: "600" }}>Status Change Log</h4>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
                <thead style={{ backgroundColor: "#f8f9fa" }}>
                  <tr>
                    <th style={{ padding: "8px", border: "1px solid #e0e0e0", textAlign: "left" }}>Before</th>
                    <th style={{ padding: "8px", border: "1px solid #e0e0e0", textAlign: "left" }}>After</th>
                  </tr>
                </thead>
                <tbody>
                  {proposalHistory.filter((h) => h.previous_status !== h.status).length > 0 ? (
                    proposalHistory
                      .filter((h) => h.previous_status !== h.status)
                      .map((change, idx) => (
                        <tr key={idx}>
                          <td style={{ padding: "8px", border: "1px solid #e0e0e0", backgroundColor: "#fde8e8", color: "#9b1c1c" }}>
                            {change.previous_status || "-"}
                          </td>
                          <td style={{ padding: "8px", border: "1px solid #e0e0e0", backgroundColor: "#e6f4ea", color: "#0d6832" }}>
                            {change.status}
                          </td>
                        </tr>
                      ))
                  ) : (
                    <tr>
                      <td colSpan="2" style={{ padding: "10px", textAlign: "center", color: "#666", fontStyle: "italic" }}>No status changes recorded.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Timeline */}
            <div style={{ marginBottom: "20px", padding: "20px", border: "1px solid #e9ecef", borderRadius: "8px" }}>
              <h4 style={{ marginBottom: "15px", fontSize: "14px", fontWeight: "600" }}>Change History Timeline</h4>
              {proposalHistory.map((entry, idx) => (
                <div key={idx} style={{ marginBottom: "15px", padding: "12px", backgroundColor: "#f8f9fa", borderRadius: "6px", border: "1px solid #e0e0e0" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      {getStatusIcon(entry.status)} <strong>{entry.status}</strong>
                    </div>
                    <div style={{ fontSize: "11px", color: "#666" }}>{new Date(entry.last_modified).toLocaleString()}</div>
                  </div>
                  <div style={{ fontSize: "12px", display: "flex", alignItems: "center", gap: "6px" }}>
                    <UserIcon size={12} /> {entry.last_modified_by}
                  </div>
                  {entry.comments && (
                    <div style={{ marginTop: "8px", padding: "8px", backgroundColor: "#fff", borderLeft: "2px solid #007bff", fontSize: "12px" }}>
                      {entry.comments}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* User Comments section */}
            <div style={{ marginBottom: "20px", padding: "20px", border: "1px solid #e9ecef", borderRadius: "8px" }}>
              <h4 style={{ marginBottom: "15px", fontSize: "14px", color: "#495057", fontWeight: "600" }}>User Comments & Reasons for Changes</h4>
              <div style={{ padding: "15px", backgroundColor: "#f8f9fa", borderRadius: "4px", borderLeft: "3px solid #007bff", fontSize: "13px", lineHeight: "1.6" }}>
                {displayComment}
              </div>
            </div>

            {/* Sequential Stats */}
            <div style={{ padding: "20px", border: "1px solid #e9ecef", borderRadius: "8px" }}>
              <h4 style={{ marginBottom: "15px", fontSize: "14px", fontWeight: "600" }}>Sequential Audit Trail</h4>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "15px" }}>
                <div style={{ textAlign: "center", padding: "15px", backgroundColor: "#f8f9fa", borderRadius: "6px" }}>
                  <div style={{ fontSize: "24px", fontWeight: "bold", color: "#007bff" }}>{auditStats.count}</div>
                  <div style={{ fontSize: "12px", color: "#6c757d" }}>Modifications</div>
                </div>
                <div style={{ textAlign: "center", padding: "15px", backgroundColor: "#f8f9fa", borderRadius: "6px" }}>
                  <div style={{ fontSize: "14px", fontWeight: "bold" }}>{auditStats.first}</div>
                  <div style={{ fontSize: "12px", color: "#6c757d" }}>First Action</div>
                </div>
                <div style={{ textAlign: "center", padding: "15px", backgroundColor: "#f8f9fa", borderRadius: "6px" }}>
                  <div style={{ fontSize: "14px", fontWeight: "bold" }}>{auditStats.last}</div>
                  <div style={{ fontSize: "12px", color: "#6c757d" }}>Last Action</div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AuditTrailModal;