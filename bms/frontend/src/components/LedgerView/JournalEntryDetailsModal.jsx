import React from "react";
import {
  ArrowLeft,
  Download,
  User as UserIcon,
  CheckCircle,
} from "lucide-react";
import * as XLSX from "xlsx";
import StatusBadge from "../ProposalHistory/StatusBadge";
import Navigation from "../Navigation/Navigation";

const AuditTrailTimeline = ({ history }) => {
  if (!history || history.length === 0) return null;
  return (
    <div style={{ marginTop: "20px" }}>
      <h4
        style={{
          marginBottom: "15px",
          color: "#333",
          fontSize: "14px",
          fontWeight: "600",
        }}
      >
        Audit Information
      </h4>
      <div style={{ position: "relative" }}>
        {history.map((entry, index) => (
          <div
            key={index}
            style={{
              marginBottom: "15px",
              padding: "12px",
              backgroundColor: "#f8f9fa",
              borderRadius: "6px",
              border: "1px solid #e0e0e0",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "8px",
              }}
            >
              <div
                style={{ display: "flex", alignItems: "center", gap: "8px" }}
              >
                <CheckCircle size={14} color="#0d6832" />
                <strong style={{ fontSize: "13px" }}>{entry.action}</strong>
              </div>
              <div style={{ fontSize: "11px", color: "#666" }}>
                {new Date(entry.date).toLocaleString()}
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <UserIcon size={12} />
              <span style={{ fontSize: "12px" }}>{entry.user}</span>
            </div>
            {entry.comments && (
              <div
                style={{
                  marginTop: "8px",
                  padding: "8px",
                  backgroundColor: "white",
                  border: "1px solid #dee2e6",
                  borderRadius: "4px",
                  fontSize: "12px",
                  color: "#555",
                }}
              >
                <strong>Note:</strong> {entry.comments}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

const JournalEntryDetailsModal = ({
  isOpen,
  entry,
  loading,
  onClose,
  userProfile,
  currentDate,
  onLogout,
  onManageProfile,
  isFinanceManager,
}) => {
  if (!isOpen || !entry) return null;

  const formatAmount = (val) => {
    const num = parseFloat(val);
    if (isNaN(num)) return "₱0.00";
    return `₱${num.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const handleExportDetailReport = () => {
    const metadata = [
      ["JOURNAL ENTRY REPORT"],
      ["Generated On", new Date().toLocaleString()],
      [],
      ["Ticket ID", entry.entry_id || "N/A"],
      ["Date", entry.date],
      ["Department", entry.department_name || "N/A"],
      ["Category", entry.category],
      ["Status", entry.status],
      ["Description", entry.description],
      ["Total Amount", formatAmount(entry.total_amount)],
      [],
      ["DOUBLE ENTRY DETAILS"],
      ["Account Code", "Account Name", "Type", "Amount"],
    ];
    const tableRows = (entry.lines || []).map((line) => [
      line.account_code,
      line.account_name,
      line.transaction_type,
      formatAmount(line.amount),
    ]);
    const worksheet = XLSX.utils.aoa_to_sheet([...metadata, ...tableRows]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "JE Details");
    XLSX.writeFile(workbook, `JE_Detail_${entry.entry_id}.xlsx`);
  };

  const auditTrail = [
    {
      action: "CREATED / POSTED",
      date: entry.created_at,
      user: entry.created_by || "System",
      comments: entry.description,
    },
  ];

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
      <Navigation
        userProfile={userProfile}
        currentDate={currentDate}
        onLogout={onLogout}
        onManageProfile={onManageProfile}
        isFinanceManager={isFinanceManager}
      />

      {/* MODIFICATION START: Added marginTop to clear the navbar */}
      <div
        style={{
          flex: 1,
          overflow: "auto",
          padding: "20px",
          maxWidth: "1200px",
          margin: "70px auto 0 auto",
          width: "100%",
        }}
      >
        {/* MODIFICATION END */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "20px",
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
            <ArrowLeft size={16} /> <span>Back to Ledger View</span>
          </button>
          <button
            onClick={handleExportDetailReport}
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
            }}
          >
            <span>Export Report</span> <Download size={16} />
          </button>
        </div>

        <div
          style={{
            backgroundColor: "white",
            borderRadius: "8px",
            padding: "20px",
            boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
          }}
        >
          {loading ? (
            <div style={{ textAlign: "center", padding: "40px" }}>
              Loading details...
            </div>
          ) : (
            <>
              <div
                style={{
                  marginBottom: "25px",
                  padding: "20px",
                  backgroundColor: "#f8f9fa",
                  borderRadius: "8px",
                  border: "1px solid #e9ecef",
                }}
              >
                <h4
                  style={{
                    margin: "0 0 15px 0",
                    color: "#6c757d",
                    fontSize: "12px",
                    textTransform: "uppercase",
                    fontWeight: "600",
                  }}
                >
                  JOURNAL ENTRY DETAILS
                </h4>
                <h3
                  style={{
                    margin: "0 0 20px 0",
                    fontSize: "18px",
                    fontWeight: "600",
                  }}
                >
                  {entry.entry_id || "N/A"}
                </h3>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                    gap: "15px",
                  }}
                >
                  <div>
                    <div style={{ fontSize: "11px", color: "#6c757d" }}>
                      Department:
                    </div>
                    <div style={{ fontSize: "13px", fontWeight: "500" }}>
                      {entry.department_name || entry.department}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: "11px", color: "#6c757d" }}>
                      Category:
                    </div>
                    <div style={{ fontSize: "13px", fontWeight: "500" }}>
                      {entry.category}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: "11px", color: "#6c757d" }}>
                      Status:
                    </div>
                    <StatusBadge type="posted" name="POSTED" />
                  </div>
                  <div>
                    <div style={{ fontSize: "11px", color: "#6c757d" }}>
                      Total Amount:
                    </div>
                    <div style={{ fontSize: "13px", fontWeight: "600" }}>
                      {formatAmount(entry.total_amount)}
                    </div>
                  </div>
                </div>
              </div>

              <div
                style={{
                  marginBottom: "20px",
                  padding: "20px",
                  border: "1px solid #e9ecef",
                  borderRadius: "8px",
                }}
              >
                <h4
                  style={{
                    marginBottom: "15px",
                    fontSize: "14px",
                    fontWeight: "600",
                  }}
                >
                  Double Entry Details
                </h4>
                <table
                  style={{
                    width: "100%",
                    borderCollapse: "collapse",
                    fontSize: "13px",
                  }}
                >
                  <thead style={{ backgroundColor: "#f8f9fa" }}>
                    <tr>
                      <th
                        style={{
                          padding: "10px",
                          textAlign: "left",
                          border: "1px solid #dee2e6",
                        }}
                      >
                        Account Code
                      </th>
                      <th
                        style={{
                          padding: "10px",
                          textAlign: "left",
                          border: "1px solid #dee2e6",
                        }}
                      >
                        Account Name
                      </th>
                      <th
                        style={{
                          padding: "10px",
                          textAlign: "left",
                          border: "1px solid #dee2e6",
                        }}
                      >
                        Type
                      </th>
                      <th
                        style={{
                          padding: "10px",
                          textAlign: "left",
                          border: "1px solid #dee2e6",
                        }}
                      >
                        Amount
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {entry.lines?.map((line, idx) => (
                      <tr key={idx}>
                        <td
                          style={{
                            padding: "10px",
                            border: "1px solid #dee2e6",
                          }}
                        >
                          {line.account_code}
                        </td>
                        <td
                          style={{
                            padding: "10px",
                            border: "1px solid #dee2e6",
                          }}
                        >
                          {line.account_name}
                        </td>
                        <td
                          style={{
                            padding: "10px",
                            border: "1px solid #dee2e6",
                          }}
                        >
                          <span
                            style={{
                              backgroundColor:
                                line.transaction_type === "DEBIT"
                                  ? "#d4edda"
                                  : "#f8d7da",
                              color:
                                line.transaction_type === "DEBIT"
                                  ? "#155724"
                                  : "#721c24",
                              padding: "4px 8px",
                              borderRadius: "4px",
                              fontSize: "12px",
                              fontWeight: "600",
                            }}
                          >
                            {line.transaction_type}
                          </span>
                        </td>
                        <td
                          style={{
                            padding: "10px",
                            border: "1px solid #dee2e6",
                          }}
                        >
                          {formatAmount(line.amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div
                style={{
                  padding: "20px",
                  border: "1px solid #e9ecef",
                  borderRadius: "8px",
                }}
              >
                <AuditTrailTimeline history={auditTrail} />
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default JournalEntryDetailsModal;
