import React from "react";
import { ChevronDown } from "lucide-react";
import Pagination from "../common/Pagination";
import AllocationStatusBadge from "./AllocationStatusBadge";

const SupplementalBudgetTab = ({
  requests, loading, pagination,
  searchTerm, setSearchTerm,
  selectedDepartment, departmentOptions, handleDepartmentSelect,
  isFinanceManager, handleApprove, handleReject, handleViewDetails,
  currentPage, pageSize, setCurrentPage, setPageSize,
  showDepartmentDropdown, toggleDepartmentDropdown,
  getDepartmentDisplay, getCompactDepartmentName,
  handleRequestOpen, handleAuditOpen
}) => {

  return (
    <>
      <div className="top" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
        <h2 className="page-title" style={{ margin: 0, fontSize: "24px", fontWeight: "bold" }}>Supplemental Budget Approval</h2>
        <div className="controls-container" style={{ display: "flex", gap: "10px" }}>
          
          <input type="text" placeholder="Search..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} 
                 style={{ padding: "8px 12px", border: "1px solid #ccc", borderRadius: "4px", fontSize: "13px", width: "180px", background: "white" }} />

          {/* Department Filter */}
          <div className="filter-dropdown" style={{ position: "relative" }}>
            <button onClick={toggleDepartmentDropdown} style={{ padding: "8px 12px", border: "1px solid #ccc", borderRadius: "4px", backgroundColor: "white", display: "flex", alignItems: "center", gap: "5px", minWidth: "160px", maxWidth: "200px", justifyContent: "space-between", cursor: "pointer" }}>
              <span style={{ flex: 1, textAlign: "left", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", fontSize: "13px" }}>{getDepartmentDisplay()}</span>
              <ChevronDown size={14} />
            </button>
            {showDepartmentDropdown && (
              <div className="dropdown-menu" style={{ position: "absolute", top: "100%", left: 0, backgroundColor: "white", border: "1px solid #ccc", borderRadius: "4px", width: "250px", zIndex: 1000, maxHeight: "300px", overflowY: "auto", padding: "0" }}>
                {departmentOptions.map(dept => (
                  <div key={dept.value} onClick={() => handleDepartmentSelect(dept.value)} className="dropdown-item" style={{ padding: "8px 12px", cursor: "pointer", fontSize: "13px", whiteSpace: "normal" }}>{dept.label}</div>
                ))}
              </div>
            )}
          </div>

          {!isFinanceManager && (
            <button onClick={handleRequestOpen} style={{ padding: "8px 16px", background: "#28a745", color: "white", border: "none", borderRadius: "4px", cursor: "pointer", fontSize: "13px", fontWeight: "500" }}>+ Request Supplemental</button>
          )}

          {isFinanceManager && (
            <button onClick={handleAuditOpen} style={{ padding: "8px 16px", border: "none", borderRadius: "4px", backgroundColor: "#007bff", color: "white", cursor: "pointer", fontSize: "13px", fontWeight: "500" }}>Audit Logs</button>
          )}
        </div>
      </div>

      <div style={{ height: "1px", backgroundColor: "#e0e0e0", marginBottom: "20px" }}></div>

      <div style={{ flex: "1 1 auto", overflowY: "auto", border: "1px solid #e0e0e0", borderRadius: "4px" }}>
        <table className="ledger-table" style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
          <thead style={{ position: "sticky", top: 0, zIndex: 1, backgroundColor: "#f8f9fa" }}>
            <tr>
              {["REQUEST ID", "DEPARTMENT", "CATEGORY", "AMOUNT", "DATE SUBMITTED", "STATUS", "ACTIONS"].map(h => (
                <th key={h} style={{ padding: "12px", textAlign: "left", borderBottom: "2px solid #dee2e6" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? <tr><td colSpan="7" style={{ padding: "20px", textAlign: "center" }}>Loading...</td></tr> : 
              requests.length > 0 ? requests.map((req, index) => (
                <tr key={req.id} style={{ backgroundColor: index % 2 ? "#F8F8F8" : "white", borderBottom: "1px solid #dee2e6" }}>
                  <td style={{ padding: "12px" }}>{req.request_id}</td>
                  <td style={{ padding: "12px" }}>{getCompactDepartmentName(req.department_name)}</td>
                  <td style={{ padding: "12px" }}>{req.category_name}</td>
                  <td style={{ padding: "12px" }}>₱{parseFloat(req.amount).toLocaleString()}</td>
                  <td style={{ padding: "12px" }}>{req.date_submitted}</td>
                  <td style={{ padding: "12px" }}><AllocationStatusBadge status={req.status} /></td>
                  <td style={{ padding: "12px" }}>
                    {isFinanceManager && req.status === "PENDING" ? (
                      <div style={{ display: "flex", gap: "5px" }}>
                        <button onClick={() => handleApprove(req.id)} style={{ background: "#28a745", color: "white", border: "none", padding: "4px 8px", borderRadius: "4px", cursor: "pointer", fontSize: "11px" }}>Approve</button>
                        <button onClick={() => handleReject(req.id)} style={{ background: "#dc3545", color: "white", border: "none", padding: "4px 8px", borderRadius: "4px", cursor: "pointer", fontSize: "11px" }}>Reject</button>
                      </div>
                    ) : (
                      <button onClick={() => handleViewDetails(req)} style={{ padding: "4px 8px", border: "none", borderRadius: "4px", backgroundColor: "#007bff", color: "white", cursor: "pointer", fontSize: "11px" }}>View</button>
                    )}
                  </td>
                </tr>
              )) : <tr><td colSpan="7" style={{ padding: "20px", textAlign: "center" }}>No pending requests found.</td></tr>}
          </tbody>
        </table>
      </div>

      {pagination.count > 0 && !loading && (
        <Pagination currentPage={currentPage} pageSize={pageSize} totalItems={pagination.count} onPageChange={setCurrentPage} onPageSizeChange={(s) => { setPageSize(s); setCurrentPage(1); }} />
      )}
    </>
  );
};

export default SupplementalBudgetTab;