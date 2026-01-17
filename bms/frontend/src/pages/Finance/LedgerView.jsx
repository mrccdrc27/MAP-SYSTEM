import React, { useState, useEffect, useCallback } from "react";
import {
  Search,
  ChevronDown,
  User,
  LogOut,
  Bell,
  Settings,
  Eye,
  FileDown,
  X,
  Calendar,
  User as UserIcon,
  Clock,
  FileText,
  ArrowLeft,
  Download,
  RefreshCw,
  CheckCircle,
  XCircle,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import LOGOMAP from "../../assets/MAP.jpg";
import "./LedgerView.css";
import { useAuth } from "../../context/AuthContext";
import { getLedgerEntries, getJournalEntryDetails } from "../../API/ledgerAPI";
import { getAllDepartments } from "../../API/departments";
import ManageProfile from "./ManageProfile";
import * as XLSX from "xlsx"; // For Excel export

// Status Component (from Proposal History)
const Status = ({ type, name }) => {
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

// Audit Trail Timeline
const AuditTrailTimeline = ({ history }) => {
  if (!history || history.length === 0) return null;

  return (
    <div style={{ marginTop: "20px" }}>
      <h4 style={{ marginBottom: "15px", color: "#333", fontSize: "14px" }}>
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
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <CheckCircle size={14} color="#0d6832" />
                <strong style={{ fontSize: "13px" }}>{entry.action}</strong>
              </div>
              <div style={{ fontSize: "11px", color: "#666" }}>
                {new Date(entry.date).toLocaleString()}
              </div>
            </div>
            
            <div style={{ marginBottom: "8px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <UserIcon size={12} />
                <span style={{ fontSize: "12px" }}>{entry.user}</span>
              </div>
            </div>

            {/* Explicitly Render Comment */}
            {entry.comments && (
               <div style={{ 
                   marginTop: "8px", 
                   padding: "8px", 
                   backgroundColor: "white", 
                   border: "1px solid #dee2e6", 
                   borderRadius: "4px",
                   fontSize: "12px",
                   color: "#555"
               }}>
                   <strong>Note:</strong> {entry.comments}
               </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};


// Pagination Component (Preserved)
const Pagination = ({
  currentPage,
  pageSize,
  totalItems,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [5, 10, 20, 50, 100],
}) => {
  const totalPages = Math.ceil(totalItems / pageSize);

  const handlePageClick = (page) => {
    if (page >= 1 && page <= totalPages) {
      onPageChange(page);
    }
  };

  const renderPageNumbers = () => {
    const pages = [];
    const pageLimit = 5;
    const sideButtons = Math.floor(pageLimit / 2);

    if (totalPages <= pageLimit + 2) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(
          <button
            key={i}
            className={`pageButton ${i === currentPage ? "active" : ""}`}
            onClick={() => handlePageClick(i)}
            onMouseDown={(e) => e.preventDefault()}
            style={{
              padding: "8px 12px",
              border: "1px solid #ccc",
              backgroundColor: i === currentPage ? "#007bff" : "white",
              color: i === currentPage ? "white" : "black",
              cursor: "pointer",
              borderRadius: "4px",
              minWidth: "40px",
              outline: "none",
            }}
          >
            {i}
          </button>
        );
      }
    } else {
      pages.push(
        <button
          key={1}
          className={`pageButton ${1 === currentPage ? "active" : ""}`}
          onClick={() => handlePageClick(1)}
          onMouseDown={(e) => e.preventDefault()}
          style={{
            padding: "8px 12px",
            border: "1px solid #ccc",
            backgroundColor: 1 === currentPage ? "#007bff" : "white",
            color: 1 === currentPage ? "white" : "black",
            cursor: "pointer",
            borderRadius: "4px",
            minWidth: "40px",
            outline: "none",
          }}
        >
          1
        </button>
      );

      let startPage = Math.max(2, currentPage - sideButtons);
      let endPage = Math.min(totalPages - 1, currentPage + sideButtons);

      if (currentPage - sideButtons > 2) {
        pages.push(
          <span
            key="start-ellipsis"
            className="ellipsis"
            style={{ padding: "8px 4px" }}
          >
            ...
          </span>
        );
      }

      if (currentPage + sideButtons >= totalPages - 1) {
        startPage = totalPages - pageLimit;
      }
      if (currentPage - sideButtons <= 2) {
        endPage = pageLimit + 1;
      }

      for (let i = startPage; i <= endPage; i++) {
        pages.push(
          <button
            key={i}
            className={`pageButton ${i === currentPage ? "active" : ""}`}
            onClick={() => handlePageClick(i)}
            onMouseDown={(e) => e.preventDefault()}
            style={{
              padding: "8px 12px",
              border: "1px solid #ccc",
              backgroundColor: i === currentPage ? "#007bff" : "white",
              color: i === currentPage ? "white" : "black",
              cursor: "pointer",
              borderRadius: "4px",
              minWidth: "40px",
              outline: "none",
            }}
          >
            {i}
          </button>
        );
      }

      if (currentPage + sideButtons < totalPages - 1) {
        pages.push(
          <span
            key="end-ellipsis"
            className="ellipsis"
            style={{ padding: "8px 4px" }}
          >
            ...
          </span>
        );
      }

      pages.push(
        <button
          key={totalPages}
          className={`pageButton ${totalPages === currentPage ? "active" : ""}`}
          onClick={() => handlePageClick(totalPages)}
          onMouseDown={(e) => e.preventDefault()}
          style={{
            padding: "8px 12px",
            border: "1px solid #ccc",
            backgroundColor: totalPages === currentPage ? "#007bff" : "white",
            color: totalPages === currentPage ? "white" : "black",
            cursor: "pointer",
            borderRadius: "4px",
            minWidth: "40px",
            outline: "none",
          }}
        >
          {totalPages}
        </button>
      );
    }
    return pages;
  };

  return (
    <div
      className="paginationContainer"
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginTop: "20px",
        padding: "10px 0",
      }}
    >
      <div
        className="pageSizeSelector"
        style={{ display: "flex", alignItems: "center", gap: "8px" }}
      >
        <label htmlFor="pageSize" style={{ fontSize: "14px" }}>
          Show
        </label>
        <select
          id="pageSize"
          value={pageSize}
          onChange={(e) => onPageSizeChange(Number(e.target.value))}
          style={{
            padding: "6px 8px",
            border: "1px solid #ccc",
            borderRadius: "4px",
            outline: "none",
          }}
        >
          {pageSizeOptions.map((size) => (
            <option key={size} value={size}>
              {size}
            </option>
          ))}
        </select>
        <span style={{ fontSize: "14px" }}>items per page</span>
      </div>

      <div
        className="pageNavigation"
        style={{ display: "flex", alignItems: "center", gap: "5px" }}
      >
        <button
          onClick={() => handlePageClick(currentPage - 1)}
          disabled={currentPage === 1}
          onMouseDown={(e) => e.preventDefault()}
          style={{
            padding: "8px 12px",
            border: "1px solid #ccc",
            backgroundColor: currentPage === 1 ? "#f0f0f0" : "white",
            cursor: currentPage === 1 ? "not-allowed" : "pointer",
            borderRadius: "4px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            outline: "none",
          }}
        >
          Prev
        </button>
        {renderPageNumbers()}
        <button
          onClick={() => handlePageClick(currentPage + 1)}
          disabled={currentPage === totalPages}
          onMouseDown={(e) => e.preventDefault()}
          style={{
            padding: "8px 12px",
            border: "1px solid #ccc",
            backgroundColor: currentPage === totalPages ? "#f0f0f0" : "white",
            cursor: currentPage === totalPages ? "not-allowed" : "pointer",
            borderRadius: "4px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            outline: "none",
          }}
        >
          Next
        </button>
      </div>
    </div>
  );
};

// NEW: Render Navbar Component (to reuse in popup)
const renderNavbar = (
  showBudgetDropdown,
  showExpenseDropdown,
  showProfileDropdown,
  showNotifications,
  toggleBudgetDropdown,
  toggleExpenseDropdown,
  toggleProfileDropdown,
  toggleNotifications,
  handleNavigate,
  formattedDay,
  formattedDate,
  formattedTime,
  userProfile,
  handleManageProfile,
  userRole,
  handleLogout
) => {
  return (
    <nav
      className="navbar"
      style={{
        position: "static",
        marginBottom: "20px",
        backgroundColor: "white",
        borderBottom: "1px solid #e0e0e0",
      }}
    >
      <div
        className="navbar-content"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "0 20px",
          height: "60px",
        }}
      >
        <div
          className="navbar-brand"
          style={{
            display: "flex",
            alignItems: "center",
            height: "60px",
            overflow: "hidden",
            gap: "12px",
          }}
        >
          <div
            style={{
              height: "45px",
              width: "45px",
              borderRadius: "8px",
              overflow: "hidden",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "#fff",
            }}
          >
            <img
              src={LOGOMAP}
              alt="System Logo"
              className="navbar-logo"
              style={{
                height: "100%",
                width: "100%",
                objectFit: "contain",
                display: "block",
              }}
            />
          </div>
          <span
            className="system-name"
            style={{
              fontWeight: 700,
              fontSize: "1.3rem",
              color: "var(--primary-color, #007bff)",
            }}
          >
            BudgetPro
          </span>
        </div>

        <div className="navbar-links" style={{ display: "flex", gap: "20px" }}>
          <Link to="/dashboard" className="nav-link">
            Dashboard
          </Link>

          <div className="nav-dropdown">
            <div
              className={`nav-link ${showBudgetDropdown ? "active" : ""}`}
              onClick={toggleBudgetDropdown}
              onMouseDown={(e) => e.preventDefault()}
              style={{ outline: "none" }}
            >
              Budget{" "}
              <ChevronDown
                size={14}
                className={`dropdown-arrow ${
                  showBudgetDropdown ? "rotated" : ""
                }`}
              />
            </div>
            {showBudgetDropdown && (
              <div
                className="dropdown-menu"
                style={{
                  position: "absolute",
                  top: "100%",
                  left: 0,
                  zIndex: 1000,
                }}
              >
                <div
                  className="dropdown-item"
                  onClick={() => handleNavigate("/finance/budget-proposal")}
                >
                  Budget Proposal
                </div>
                <div
                  className="dropdown-item"
                  onClick={() => handleNavigate("/finance/proposal-history")}
                >
                  Proposal History
                </div>
                <div
                  className="dropdown-item"
                  onClick={() => handleNavigate("/finance/ledger-view")}
                >
                  Ledger View
                </div>
                <div
                  className="dropdown-item"
                  onClick={() => handleNavigate("/finance/budget-allocation")}
                >
                  Budget Allocation
                </div>
                <div
                  className="dropdown-item"
                  onClick={() =>
                    handleNavigate("/finance/budget-variance-report")
                  }
                >
                  Budget Variance Report
                </div>
              </div>
            )}
          </div>

          <div className="nav-dropdown">
            <div
              className={`nav-link ${showExpenseDropdown ? "active" : ""}`}
              onClick={toggleExpenseDropdown}
              onMouseDown={(e) => e.preventDefault()}
              style={{ outline: "none" }}
            >
              Expense{" "}
              <ChevronDown
                size={14}
                className={`dropdown-arrow ${
                  showExpenseDropdown ? "rotated" : ""
                }`}
              />
            </div>
            {showExpenseDropdown && (
              <div
                className="dropdown-menu"
                style={{
                  position: "absolute",
                  top: "100%",
                  left: 0,
                  zIndex: 1000,
                }}
              >
                <div
                  className="dropdown-item"
                  onClick={() => handleNavigate("/finance/expense-tracking")}
                >
                  Expense Tracking
                </div>
                <div
                  className="dropdown-item"
                  onClick={() => handleNavigate("/finance/expense-history")}
                >
                  Expense History
                </div>
              </div>
            )}
          </div>
        </div>

        <div
          className="navbar-controls"
          style={{ display: "flex", alignItems: "center", gap: "15px" }}
        >
          <div
            className="date-time-badge"
            style={{
              background: "#f3f4f6",
              borderRadius: "16px",
              padding: "4px 14px",
              fontSize: "0.95rem",
              color: "#007bff",
              fontWeight: 500,
              display: "flex",
              alignItems: "center",
            }}
          >
            {formattedDay}, {formattedDate} | {formattedTime}
          </div>

          <div className="notification-container">
            <div
              className="notification-icon"
              onClick={toggleNotifications}
              onMouseDown={(e) => e.preventDefault()}
              style={{
                position: "relative",
                cursor: "pointer",
                outline: "none",
              }}
            >
              <Bell size={20} />
              <span
                className="notification-badge"
                style={{
                  position: "absolute",
                  top: "-5px",
                  right: "-5px",
                  backgroundColor: "red",
                  color: "white",
                  borderRadius: "50%",
                  width: "16px",
                  height: "16px",
                  fontSize: "10px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                3
              </span>
            </div>
          </div>

          <div className="profile-container" style={{ position: "relative" }}>
            <div
              className="profile-trigger"
              onClick={toggleProfileDropdown}
              onMouseDown={(e) => e.preventDefault()}
              style={{
                display: "flex",
                alignItems: "center",
                cursor: "pointer",
                outline: "none",
              }}
            >
              <img
                src={userProfile.avatar}
                alt="User avatar"
                className="profile-image"
                style={{ width: "32px", height: "32px", borderRadius: "50%" }}
              />
            </div>

            {showProfileDropdown && (
              <div
                className="profile-dropdown"
                style={{
                  position: "absolute",
                  top: "100%",
                  right: 0,
                  backgroundColor: "white",
                  border: "1px solid #ccc",
                  borderRadius: "8px",
                  padding: "10px",
                  width: "250px",
                  zIndex: 1000,
                }}
              >
                <div
                  className="profile-info-section"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    marginBottom: "10px",
                  }}
                >
                  <img
                    src={userProfile.avatar}
                    alt="Profile"
                    className="profile-dropdown-image"
                    style={{
                      width: "40px",
                      height: "40px",
                      borderRadius: "50%",
                      marginRight: "10px",
                    }}
                  />
                  <div className="profile-details">
                    <div
                      className="profile-name"
                      style={{ fontWeight: "bold" }}
                    >
                      {userProfile.name}
                    </div>
                    <div
                      className="profile-role-badge"
                      style={{
                        backgroundColor: "#e9ecef",
                        padding: "2px 8px",
                        borderRadius: "12px",
                        fontSize: "12px",
                        display: "inline-block",
                      }}
                    >
                      {userProfile.role}
                    </div>
                  </div>
                </div>
                <div
                  className="dropdown-divider"
                  style={{
                    height: "1px",
                    backgroundColor: "#eee",
                    margin: "10px 0",
                  }}
                ></div>
                <div
                  className="dropdown-item"
                  onClick={handleManageProfile}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    padding: "8px 0",
                    cursor: "pointer",
                    outline: "none",
                  }}
                  onMouseDown={(e) => e.preventDefault()}
                >
                  <User size={16} style={{ marginRight: "8px" }} />
                  <span>Manage Profile</span>
                </div>
                {userRole === "ADMIN" && (
                  <div
                    className="dropdown-item"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      padding: "8px 0",
                      cursor: "pointer",
                      outline: "none",
                    }}
                    onMouseDown={(e) => e.preventDefault()}
                  >
                    <Settings size={16} style={{ marginRight: "8px" }} />
                    <span>User Management</span>
                  </div>
                )}
                <div
                  className="dropdown-divider"
                  style={{
                    height: "1px",
                    backgroundColor: "#eee",
                    margin: "10px 0",
                  }}
                ></div>
                <div
                  className="dropdown-item"
                  onClick={handleLogout}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    padding: "8px 0",
                    cursor: "pointer",
                    outline: "none",
                  }}
                  onMouseDown={(e) => e.preventDefault()}
                >
                  <LogOut size={16} style={{ marginRight: "8px" }} />
                  <span>Log Out</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

// MODIFIED: JournalEntryDetailsModal to accept and render API data
const JournalEntryDetailsModal = ({
  entry,
  onClose,
  loading,
  showBudgetDropdown,
  showExpenseDropdown,
  showProfileDropdown,
  showNotifications,
  toggleBudgetDropdown,
  toggleExpenseDropdown,
  toggleProfileDropdown,
  toggleNotifications,
  handleNavigate,
  formattedDay,
  formattedDate,
  formattedTime,
  userProfile,
  handleManageProfile,
  userRole,
  handleLogout,
}) => {
  if (!entry) return null;

  const formatAmount = (val) => {
    // FIX: Handle cases where val might be undefined or string
    const num = parseFloat(val);
    if (isNaN(num)) return "₱0.00";
    return `₱${num.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  // Create mock audit trail with Finance Manager tag
  const getAuditTrail = () => {
    return [
      {
        status: "CREATED",
        last_modified: new Date(Date.now() - 86400000 * 3).toISOString(),
        last_modified_by: "System User",
        comments: "Journal entry created",
      },
      {
        status: "PROCESSED",
        last_modified: new Date(Date.now() - 86400000 * 2).toISOString(),
        last_modified_by: "Finance Dept",
        comments: "Transaction processed",
      },
      {
        status: "POSTED",
        last_modified: new Date(Date.now() - 86400000 * 1).toISOString(),
        last_modified_by: "Finance Manager",
        comments: "Posted to ledger",
      },
    ];
  };

  // --- NEW: Export Detail Function ---
  const handleExportDetailReport = () => {
    try {
      // 1. Prepare Metadata Rows
      const metadata = [
        ["JOURNAL ENTRY REPORT"],
        ["Generated On", new Date().toLocaleString()],
        [], // Spacer
        ["Ticket ID", entry.entry_id || entry.reference_id || "N/A"],
        ["Date", entry.date],
        ["Department", entry.department_name || entry.department || "N/A"],
        ["Category", entry.category],
        ["Sub-Category", entry.sub_category || "General"],
        ["Status", entry.status],
        ["Description", entry.description],
        ["Total Amount", formatAmount(entry.total_amount)],
        [], // Spacer
        ["DOUBLE ENTRY DETAILS"], // Section Header
      ];

      // 2. Prepare Table Headers
      const tableHeaders = ["Account Code", "Account Name", "Type", "Amount"];

      // 3. Prepare Table Data
      const tableRows = (entry.lines || []).map((line) => [
        line.account_code,
        line.account_name,
        line.transaction_type,
        formatAmount(line.amount), // Use formatted amount with ₱
      ]);

      // 4. Combine into single sheet data structure
      const sheetData = [...metadata, tableHeaders, ...tableRows];

      // 5. Create Worksheet
      const worksheet = XLSX.utils.aoa_to_sheet(sheetData);

      // 6. Styling: Adjust column widths
      const wscols = [
        { wch: 15 }, // Code
        { wch: 30 }, // Name
        { wch: 15 }, // Type
        { wch: 20 }, // Amount
      ];
      worksheet["!cols"] = wscols;

      // 7. Create Workbook and Download
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Journal Entry Details");
      
      const filename = `JE_Detail_${entry.entry_id || "Report"}.xlsx`;
      XLSX.writeFile(workbook, filename);
      
    } catch (error) {
      console.error("Detail export failed:", error);
      alert("Failed to export details.");
    }
  };

  // Create double entry data
  const getDoubleEntryData = () => {
    return [
      {
        account: entry.account,
        entry_type: "DEBIT",
        department: entry.department,
        amount: entry.amount,
      },
      {
        account: "Counterpart Account",
        entry_type: "CREDIT",
        department: entry.department,
        amount: entry.amount,
      },
    ];
  };

  // 1. Audit Trail: Map from Created At/By
  const auditTrail = [
    {
      action: "CREATED / POSTED",
      date: entry.created_at,
      user: entry.created_by || "System",
      comments: entry.description, // Map description here
    },
  ];

  // 2. Double Entries: Map from 'lines' array
  const doubleEntries = entry.lines || [];

  // Utility function to shorten department names
  const shortenDepartmentName = (name, maxLength = 20) => {
    if (!name) return "N/A";
    if (name.length <= maxLength) return name;

    const abbreviations = {
      Department: "Dept.",
      Management: "Mgmt.",
      Operations: "Ops.",
      Merchandising: "Merch.",
      Marketing: "Mktg.",
      Logistics: "Log.",
      "Human Resources": "HR",
      "Information Technology": "IT",
      Finance: "Fin.",
    };

    let shortened = name;
    for (const [full, abbr] of Object.entries(abbreviations)) {
      shortened = shortened.replace(new RegExp(full, "gi"), abbr);
    }

    if (shortened.length <= maxLength) return shortened;
    return name.length > maxLength
      ? name.substring(0, maxLength) + "..."
      : name;
  };

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
      {/* Navbar inside modal - full navbar like main page */}
      {renderNavbar(
        showBudgetDropdown,
        showExpenseDropdown,
        showProfileDropdown,
        showNotifications,
        toggleBudgetDropdown,
        toggleExpenseDropdown,
        toggleProfileDropdown,
        toggleNotifications,
        handleNavigate,
        formattedDay,
        formattedDate,
        formattedTime,
        userProfile,
        handleManageProfile,
        userRole,
        handleLogout
      )}

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
            className="back-button"
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
              alignSelf: "flex-start",
              fontSize: "13px",
              outline: "none",
            }}
            onMouseDown={(e) => e.preventDefault()}
          >
            <ArrowLeft size={16} /> <span>Back to Ledger View</span>
          </button>

          {/* Export Button - Changed to "Export Report" */}
          <button
            onClick={handleExportDetailReport}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              padding: "8px 16px",
              backgroundColor: "#007bff",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
              fontWeight: "500",
              fontSize: "13px",
              outline: "none",
              order: 2,
              minWidth: "140px",
            }}
            onMouseDown={(e) => e.preventDefault()}
          >
            <span>Export Report</span>
            <Download size={16} style={{ marginLeft: "5px" }} />
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
            <div
              style={{ textAlign: "center", padding: "40px", fontSize: "13px" }}
            >
              Loading journal entry details...
            </div>
          ) : (
            <>
              {/* Journal Entry Context - Horizontal Breakdown */}
              <div
                className="audit-header"
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

                {/* Main Ticket ID */}
                <h3
                  className="proposal-title"
                  style={{
                    margin: "0 0 20px 0",
                    fontSize: "18px",
                    fontWeight: "600",
                    color: "#333",
                  }}
                >
                  {entry.entry_id || entry.reference_id || "N/A"}
                </h3>

                {/* Horizontal Breakdown Grid */}
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                    gap: "15px",
                  }}
                >
                  <div>
                    <div
                      style={{
                        fontSize: "11px",
                        color: "#6c757d",
                        marginBottom: "4px",
                      }}
                    >
                      Department:
                    </div>
                    <div style={{ fontSize: "13px", fontWeight: "500" }}>
                      {shortenDepartmentName(entry.department_name || entry.department)}
                    </div>
                  </div>
                  <div>
                    <div
                      style={{
                        fontSize: "11px",
                        color: "#6c757d",
                        marginBottom: "4px",
                      }}
                    >
                      Category:
                    </div>
                    <div style={{ fontSize: "13px", fontWeight: "500" }}>
                      {entry.category}
                    </div>
                  </div>
                  <div>
                    <div
                      style={{
                        fontSize: "11px",
                        color: "#6c757d",
                        marginBottom: "4px",
                      }}
                    >
                      Sub-Category:
                    </div>
                    <div style={{ fontSize: "13px", fontWeight: "500" }}>
                      {entry.sub_category || "General"}
                    </div>
                  </div>
                  <div>
                    <div
                      style={{
                        fontSize: "11px",
                        color: "#6c757d",
                        marginBottom: "4px",
                      }}
                    >
                      Status:
                    </div>
                    <div style={{ fontSize: "13px" }}>
                      <Status type="APPROVED" name="POSTED" />
                    </div>
                  </div>
                </div>

                {/* Additional Info Grid */}
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                    gap: "15px",
                    marginTop: "15px",
                    paddingTop: "15px",
                    borderTop: "1px solid #e9ecef",
                  }}
                >
                  <div>
                    <div
                      style={{
                        fontSize: "11px",
                        color: "#6c757d",
                        marginBottom: "4px",
                      }}
                    >
                      Account (Primary):
                    </div>

                    <div style={{ fontSize: "13px" }}>
                      {/* Show the first line account as summary, or N/A */}
                      {entry.lines && entry.lines.length > 0
                        ? entry.lines[0].account_name
                        : "Mixed"}
                    </div>
                  </div>
                  <div>
                    <div
                      style={{
                        fontSize: "11px",
                        color: "#6c757d",
                        marginBottom: "4px",
                      }}
                    >
                      Date:
                    </div>
                    <div style={{ fontSize: "13px" }}>{entry.date}</div>
                  </div>
                  <div>
                    <div
                      style={{
                        fontSize: "11px",
                        color: "#6c757d",
                        marginBottom: "4px",
                      }}
                    >
                      Total Amount:
                    </div>
                    {/* FIX: Use total_amount instead of amount */}
                    <div style={{ fontSize: "13px", fontWeight: "500" }}>
                      {formatAmount(entry.total_amount)}
                    </div>
                  </div>
                </div>
              </div>

              {/* Double Entry Table - REAL DATA */}
              <div
                className="double-entry-section"
                style={{
                  marginBottom: "20px",
                  backgroundColor: "white",
                  padding: "20px",
                  borderRadius: "8px",
                  border: "1px solid #e9ecef",
                }}
              >
                <h4
                  style={{
                    margin: "0 0 15px 0",
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
                    border: "1px solid #dee2e6",
                    fontSize: "13px",
                  }}
                >
                  <thead>
                    <tr style={{ backgroundColor: "#f8f9fa" }}>
                      <th style={{ padding: "10px", textAlign: "left" }}>
                        Account Code
                      </th>
                      <th style={{ padding: "10px", textAlign: "left" }}>
                        Account Name
                      </th>
                      <th style={{ padding: "10px", textAlign: "left" }}>
                        Type
                      </th>
                      <th style={{ padding: "10px", textAlign: "left" }}>
                        Amount
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {doubleEntries.map((line, index) => (
                      <tr
                        key={index}
                        style={{
                          backgroundColor: index % 2 === 0 ? "#fff" : "#f8f9fa",
                        }}
                      >
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

              {/* Audit Trail */}
              <div
                className="timeline-section"
                style={{
                  padding: "20px",
                  borderRadius: "8px",
                  border: "1px solid #e9ecef",
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

const LedgerView = () => {
  // Navigation and UI State
  const [showBudgetDropdown, setShowBudgetDropdown] = useState(false);
  const [showExpenseDropdown, setShowExpenseDropdown] = useState(false);
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [showDepartmentDropdown, setShowDepartmentDropdown] = useState(false);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const navigate = useNavigate();
  const { user, logout, getBmsRole } = useAuth();

  // MODIFIED: Updated getUserRole logic to correctly handle the role array from Central Auth
  const getUserRole = () => {
    // Debug logs removed for production
    if (!user) return "User";

    // 1. Try to get the BMS specific role using the Context helper
    if (getBmsRole) {
      const bmsRole = getBmsRole();
      if (bmsRole) return bmsRole;
    }

    // 2. Fallback: Check direct role property (Legacy)
    if (user.role && typeof user.role === "string") return user.role;

    // 3. Fallback: Check boolean flags
    if (user.is_superuser) return "ADMIN";
    if (user.is_staff) return "STAFF";

    return "User";
  };

  const userRole = getBmsRole ? getBmsRole() : (user?.role || "User");
  const isFinanceManager = ["ADMIN", "FINANCE_HEAD"].includes(userRole);

  const userProfile = {
    // CHANGED: Added fallback to full_name or username if first/last names are empty (common with JWT auth)
    name: user
      ? (`${user.first_name || ""} ${user.last_name || ""}`.trim() || user.full_name || user.username || "User")
      : "User",
    role: userRole,
    avatar:
      user?.profile_picture ||
      "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80",
  };

  // API Data State
  const [ledgerEntries, setLedgerEntries] = useState([]);
  const [pagination, setPagination] = useState({ count: 0 });
  const [loading, setLoading] = useState(true);

  // Filter and Pagination State
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedDepartment, setSelectedDepartment] = useState("");
  const [departmentOptions, setDepartmentOptions] = useState([]);

  // Date/Time State
  const [currentDate, setCurrentDate] = useState(new Date());

  // NEW: Journal Entry Details State
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  // NEW: Export State
  const [exporting, setExporting] = useState(false);

  // Category options - only CapEx and OpEx
  const categoryOptions = [
    { value: "", label: "All Categories" },
    { value: "CAPEX", label: "CapEx" },
    { value: "OPEX", label: "OpEx" },
  ];

  const [showManageProfile, setShowManageProfile] = useState(false);

  // --- API CALLS ---

  // 1. Fetch Dropdowns
  useEffect(() => {
    const fetchDropdowns = async () => {
      try {
        const deptRes = await getAllDepartments();
        setDepartmentOptions([
          { value: "", label: "All Departments" },
          ...deptRes.data.map((d) => ({ value: d.id, label: d.name })), // Use ID, not code
        ]);
      } catch (error) {
        console.error("Failed to fetch departments:", error);
      }
    };
    fetchDropdowns();
  }, []);

  // 2. Fetch Ledger Data
  useEffect(() => {
    const fetchLedgerData = async () => {
      setLoading(true);
      try {
        const params = {
          page: currentPage,
          page_size: pageSize,
          search: debouncedSearchTerm,
          category: selectedCategory,
          department_id: selectedDepartment, // Backend expects 'department_id', not 'department'
        };

        // Clean params
        if (!params.category) delete params.category;
        if (!params.department) delete params.department;

        const response = await getLedgerEntries(params);

        setLedgerEntries(response.data.results);
        setPagination(response.data);
      } catch (error) {
        console.error("Failed to fetch ledger entries:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchLedgerData();
  }, [
    currentPage,
    pageSize,
    debouncedSearchTerm,
    selectedCategory,
    selectedDepartment,
  ]);

  // Debounce search term
  useEffect(() => {
    const timerId = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
      setCurrentPage(1);
    }, 500);
    return () => clearTimeout(timerId);
  }, [searchTerm]);

  // Update current date/time
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentDate(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        !event.target.closest(".nav-dropdown") &&
        !event.target.closest(".profile-container") &&
        !event.target.closest(".filter-dropdown")
      ) {
        closeAllDropdowns();
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Navigation dropdown handlers
  const closeAllDropdowns = () => {
    setShowBudgetDropdown(false);
    setShowExpenseDropdown(false);
    setShowCategoryDropdown(false);
    setShowDepartmentDropdown(false);
    setShowProfileDropdown(false);
    setShowNotifications(false);
  };

  const toggleBudgetDropdown = () => {
    const s = !showBudgetDropdown;
    closeAllDropdowns();
    setShowBudgetDropdown(s);
  };
  const toggleExpenseDropdown = () => {
    const s = !showExpenseDropdown;
    closeAllDropdowns();
    setShowExpenseDropdown(s);
  };
  const toggleDepartmentDropdown = () => {
    const s = !showDepartmentDropdown;
    closeAllDropdowns();
    setShowDepartmentDropdown(s);
  };
  const toggleCategoryDropdown = () => {
    const s = !showCategoryDropdown;
    closeAllDropdowns();
    setShowCategoryDropdown(s);
  };
  const toggleNotifications = () => {
    const s = !showNotifications;
    closeAllDropdowns();
    setShowNotifications(s);
  };
  const toggleProfileDropdown = () => {
    const s = !showProfileDropdown;
    closeAllDropdowns();
    setShowProfileDropdown(s);
  };

  // Filter handlers
  const handleCategorySelect = (categoryValue) => {
    setSelectedCategory(categoryValue);
    setShowCategoryDropdown(false);
    setCurrentPage(1);
  };

  const handleDepartmentSelect = (deptValue) => {
    setSelectedDepartment(deptValue);
    setShowDepartmentDropdown(false);
    setCurrentPage(1);
  };

  // NEW: Handle Journal Entry Click
  const handleJournalEntryClick = async (listEntry) => {
    // 1. Show loading state immediately
    setDetailsLoading(true);
    setShowDetailsModal(true);
    setSelectedEntry(null); // Clear previous data

    try {
      // 2. Fetch full details using the reference_id (e.g., JE-2026-001)
      // listEntry is the row from the table, containing reference_id
      const response = await getJournalEntryDetails(listEntry.reference_id);

      // 3. Update state with full details
      setSelectedEntry(response.data);
    } catch (error) {
      console.error("Failed to fetch JE details:", error);
      alert("Could not load details.");
      setShowDetailsModal(false);
    } finally {
      setDetailsLoading(false);
    }
  };

  // NEW: Close Details Modal
  const handleCloseDetailsModal = () => {
    setShowDetailsModal(false);
    setSelectedEntry(null);
  };

  

  // NEW: Export Functionality
  const handleExportLedger = async () => {
    setExporting(true);

    try {
      // Generate 7-digit token
      const token = Math.floor(1000000 + Math.random() * 9000000).toString();

      // Get current date for filename
      const today = new Date();
      const dateString = today.toISOString().split("T")[0].replace(/-/g, "");
      const filename = `ledger_view_${dateString}_${token}.xlsx`;

      // Prepare data for Excel
      const exportData = ledgerEntries.map((item) => ({
        "TICKET ID": item.reference_id,
        DATE: item.date,
        DEPARTMENT: item.department,
        CATEGORY: item.category,
        "SUB-CATEGORY": item.sub_category || "General",
        ACCOUNT: item.account,
        // MODIFIED: Added Peso Sign and Formatting to Amount in Export
        "AMOUNT": `₱${parseFloat(item.amount).toLocaleString("en-US", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}`,
      }));

      // Add summary row if there's data
      if (exportData.length > 0) {
        const totalAmount = ledgerEntries.reduce(
          (sum, item) => sum + parseFloat(item.amount),
          0
        );
        exportData.push({
          "TICKET ID": "SUMMARY",
          DATE: "",
          DEPARTMENT: "",
          CATEGORY: "TOTAL",
          "SUB-CATEGORY": "",
          ACCOUNT: "",
          // MODIFIED: Added Peso Sign to Total
          "AMOUNT": `₱${totalAmount.toLocaleString("en-US", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}`,
        });
      }

      // Create worksheet
      const worksheet = XLSX.utils.json_to_sheet(exportData);

      // Auto-size columns
      const wscols = [
        { wch: 15 },
        { wch: 12 },
        { wch: 18 },
        { wch: 12 },
        { wch: 21 },
        { wch: 17 },
        { wch: 15 },
      ];
      worksheet["!cols"] = wscols;

      // Create workbook
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Ledger View");

      // Generate and download file
      XLSX.writeFile(workbook, filename);

      // Show success message
      setTimeout(() => {
        alert(
          `Export completed successfully!\nFile: ${filename}\nRecords exported: ${ledgerEntries.length}`
        );
      }, 500);
    } catch (error) {
      console.error("Export failed:", error);
      alert("Export failed. Please try again.");
    } finally {
      setExporting(false);
    }
  };

  const handleNavigate = (path) => {
    navigate(path);
    closeAllDropdowns();
  };

  const handleLogout = async () => {
    await logout();
  };

  const handleManageProfile = () => {
    setShowManageProfile(true);
    setShowProfileDropdown(false);
  };

  const handleCloseManageProfile = () => {
    setShowManageProfile(false);
  };

  // Get display label for filters
  const getCategoryDisplay = () => {
    const option = categoryOptions.find(
      (opt) => opt.value === selectedCategory
    );
    return option ? option.label : "All Categories";
  };

  const getDepartmentDisplay = () => {
    const option = departmentOptions.find(
      (opt) => opt.value === selectedDepartment
    );
    return option ? option.label : "All Departments";
  };

  // Formatters
  const formattedDay = currentDate.toLocaleDateString("en-US", {
    weekday: "long",
  });
  const formattedDate = currentDate.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
  const formattedTime = currentDate
    .toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    })
    .toUpperCase();

  const formatAmount = (val) => {
    return `₱${parseFloat(val).toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  return (
    <div
      className="app-container"
      style={{ minWidth: "1200px", overflowY: "auto", height: "100vh" }}
    >
      {/* Main Navbar */}
      {renderNavbar(
        showBudgetDropdown,
        showExpenseDropdown,
        showProfileDropdown,
        showNotifications,
        toggleBudgetDropdown,
        toggleExpenseDropdown,
        toggleProfileDropdown,
        toggleNotifications,
        handleNavigate,
        formattedDay,
        formattedDate,
        formattedTime,
        userProfile,
        handleManageProfile,
        userRole,
        handleLogout
      )}

      {/* Main Content */}
      <div
        className="content-container"
        style={{
          padding: "10px 20px",
          maxWidth: "1400px",
          margin: "0 auto",
          width: "95%",
        }}
      >
        {/* Conditionally render either Dashboard content or ManageProfile */}
        {showManageProfile ? (
          <ManageProfile onClose={handleCloseManageProfile} />
        ) : (
          <div
            className="ledger-container"
            style={{
              backgroundColor: "white",
              borderRadius: "8px",
              boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
              padding: "20px",
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
              minHeight: "calc(80vh - 100px)",
            }}
          >
            {/* Header Section */}
            <div
              className="top"
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "20px",
              }}
            >
              <h2
                className="page-title"
                style={{
                  margin: 0,
                  fontSize: "24px",
                  fontWeight: "bold",
                  color: "#0C0C0C",
                }}
              >
                Ledger View
              </h2>
              <div
                className="controls-container"
                style={{ display: "flex", gap: "10px" }}
              >
                <div style={{ position: "relative" }}>
                  <label
                    htmlFor="ledger-search"
                    style={{
                      border: "0",
                      clip: "rect(0 0 0 0)",
                      height: "1px",
                      margin: "-1px",
                      overflow: "hidden",
                      padding: "0",
                      position: "absolute",
                      width: "1px",
                    }}
                  >
                    Search by Ticket ID or Account
                  </label>
                  <input
                    type="text"
                    id="ledger-search"
                    name="search"
                    autoComplete="off"
                    placeholder="Search"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="search-account-input"
                    style={{
                      padding: "8px 12px",
                      border: "1px solid #ccc",
                      borderRadius: "4px",
                      outline: "none",
                      width: "200px",
                    }}
                  />
                </div>

                {/* Department Filter Button */}
                <div
                  className="filter-dropdown"
                  style={{ position: "relative" }}
                >
                  <button
                    className={`filter-dropdown-btn ${
                      showDepartmentDropdown ? "active" : ""
                    }`}
                    onClick={toggleDepartmentDropdown}
                    onMouseDown={(e) => e.preventDefault()}
                    style={{
                      padding: "8px 12px",
                      border: "1px solid #ccc",
                      borderRadius: "4px",
                      backgroundColor: "white",
                      display: "flex",
                      alignItems: "center",
                      gap: "5px",
                      outline: "none",
                      minWidth: "160px",
                      maxWidth: "200px",
                      cursor: "pointer",
                    }}
                  >
                    <span
                      style={{
                        flex: 1,
                        textAlign: "left",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {getDepartmentDisplay()}
                    </span>
                    <ChevronDown size={14} style={{ flexShrink: 0 }} />
                  </button>
                  {showDepartmentDropdown && (
                    <div
                      className="category-dropdown-menu"
                      style={{
                        position: "absolute",
                        top: "100%",
                        left: 0,
                        backgroundColor: "white",
                        border: "1px solid #ccc",
                        borderRadius: "4px",
                        width: "250px", // Widen to prevent truncate on menu
                        zIndex: 1000,
                        maxHeight: "300px",
                        overflowY: "auto",
                      }}
                    >
                      {departmentOptions.map((dept) => (
                        <div
                          key={dept.value}
                          className={`category-dropdown-item ${
                            selectedDepartment === dept.value ? "active" : ""
                          }`}
                          onClick={() => handleDepartmentSelect(dept.value)}
                          onMouseDown={(e) => e.preventDefault()}
                          style={{
                            padding: "8px 12px",
                            cursor: "pointer",
                            backgroundColor:
                              selectedDepartment === dept.value
                                ? "#f0f0f0"
                                : "white",
                            outline: "none",
                            whiteSpace: "normal", // Wrap text in menu
                          }}
                        >
                          {dept.label}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Category Filter Button */}
                <div
                  className="filter-dropdown"
                  style={{ position: "relative" }}
                >
                  <button
                    className={`filter-dropdown-btn ${
                      showCategoryDropdown ? "active" : ""
                    }`}
                    onClick={toggleCategoryDropdown}
                    onMouseDown={(e) => e.preventDefault()}
                    style={{
                      padding: "8px 12px",
                      border: "1px solid #ccc",
                      borderRadius: "4px",
                      backgroundColor: "white",
                      display: "flex",
                      alignItems: "center",
                      gap: "5px",
                      outline: "none",
                      minWidth: "140px",
                      cursor: "pointer",
                    }}
                  >
                    <span>{getCategoryDisplay()}</span>
                    <ChevronDown size={14} />
                  </button>
                  {showCategoryDropdown && (
                    <div
                      className="category-dropdown-menu"
                      style={{
                        position: "absolute",
                        top: "100%",
                        left: 0,
                        backgroundColor: "white",
                        border: "1px solid #ccc",
                        borderRadius: "4px",
                        width: "100%",
                        zIndex: 1000,
                        maxHeight: "200px",
                        overflowY: "auto",
                      }}
                    >
                      {categoryOptions.map((category) => (
                        <div
                          key={category.value}
                          className={`category-dropdown-item ${
                            selectedCategory === category.value ? "active" : ""
                          }`}
                          onClick={() => handleCategorySelect(category.value)}
                          onMouseDown={(e) => e.preventDefault()}
                          style={{
                            padding: "8px 12px",
                            cursor: "pointer",
                            backgroundColor:
                              selectedCategory === category.value
                                ? "#f0f0f0"
                                : "white",
                            outline: "none",
                          }}
                        >
                          {category.label}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Export Button */}
                <button
                  onClick={handleExportLedger}
                  disabled={exporting || ledgerEntries.length === 0}
                  onMouseDown={(e) => e.preventDefault()}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "8px",
                    padding: "8px 16px",
                    backgroundColor: "#007bff",
                    color: "white",
                    border: "none",
                    borderRadius: "4px",
                    cursor: exporting ? "not-allowed" : "pointer",
                    fontWeight: "500",
                    fontSize: "13px",
                    outline: "none",
                    minWidth: "120px",
                    opacity: exporting ? 0.7 : 1,
                  }}
                >
                  {exporting ? (
                    <>
                      <div
                        style={{
                          width: "16px",
                          height: "16px",
                          border: "2px solid rgba(255,255,255,0.3)",
                          borderTop: "2px solid white",
                          borderRadius: "50%",
                          animation: "spin 1s linear infinite",
                        }}
                      />
                      <span>Exporting...</span>
                    </>
                  ) : (
                    <>
                      <span>Export</span>
                      <Download size={16} style={{ marginLeft: "5px" }} />
                    </>
                  )}
                </button>
              </div>
            </div>

            <div
              style={{
                height: "1px",
                backgroundColor: "#e0e0e0",
                marginBottom: "20px",
              }}
            ></div>

            {/* Table Container */}
            <div
              style={{
                flex: "1 1 auto",
                overflowY: "auto",
                border: "1px solid #e0e0e0",
                borderRadius: "4px",
              }}
            >
              <table
                className="ledger-table"
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  tableLayout: "fixed",
                  fontSize: "13px",
                }}
              >
                <thead>
                  <tr
                    style={{
                      backgroundColor: "#f8f9fa",
                      position: "sticky",
                      top: 0,
                      zIndex: 1,
                    }}
                  >
                    <th
                      style={{
                        width: "14%",
                        padding: "12px",
                        textAlign: "left",
                        borderBottom: "2px solid #dee2e6",
                        fontWeight: "600",
                        fontSize: "13px",
                      }}
                    >
                      TICKET ID
                    </th>
                    <th
                      style={{
                        width: "10%",
                        padding: "12px",
                        textAlign: "left",
                        borderBottom: "2px solid #dee2e6",
                        fontWeight: "600",
                        fontSize: "13px",
                      }}
                    >
                      DATE
                    </th>
                    <th
                      style={{
                        width: "18%",
                        padding: "12px",
                        textAlign: "left",
                        borderBottom: "2px solid #dee2e6",
                        fontWeight: "600",
                        fontSize: "13px",
                      }}
                    >
                      DEPARTMENT
                    </th>
                    <th
                      style={{
                        width: "10%",
                        padding: "12px",
                        textAlign: "left",
                        borderBottom: "2px solid #dee2e6",
                        fontWeight: "600",
                        fontSize: "13px",
                      }}
                    >
                      CATEGORY
                    </th>
                    <th
                      style={{
                        width: "18%",
                        padding: "12px",
                        textAlign: "left",
                        borderBottom: "2px solid #dee2e6",
                        fontWeight: "600",
                        fontSize: "13px",
                      }}
                    >
                      SUB-CATEGORY
                    </th>
                    <th
                      style={{
                        width: "16%",
                        padding: "12px",
                        textAlign: "left",
                        borderBottom: "2px solid #dee2e6",
                        fontWeight: "600",
                        fontSize: "13px",
                      }}
                    >
                      ACCOUNT
                    </th>
                    <th
                      style={{
                        width: "9%",
                        padding: "12px",
                        textAlign: "left",
                        borderBottom: "2px solid #dee2e6",
                        fontWeight: "600",
                        fontSize: "13px",
                      }}
                    >
                      AMOUNT
                    </th>
                    <th
                      style={{
                        width: "8%",
                        padding: "12px",
                        textAlign: "center",
                        borderBottom: "2px solid #dee2e6",
                        fontWeight: "600",
                        fontSize: "13px",
                      }}
                    >
                      ACTIONS
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td
                        colSpan="8"
                        style={{
                          textAlign: "center",
                          padding: "20px",
                          fontSize: "13px",
                        }}
                      >
                        Loading...
                      </td>
                    </tr>
                  ) : ledgerEntries.length > 0 ? (
                    ledgerEntries.map((entry, index) => (
                      <tr
                        key={index}
                        className={index % 2 === 1 ? "alternate-row" : ""}
                        style={{
                          backgroundColor:
                            index % 2 === 1 ? "#F8F8F8" : "#FFFFFF",
                          height: "50px",
                        }}
                      >
                        <td
                          style={{
                            padding: "12px",
                            borderBottom: "1px solid #dee2e6",
                            fontSize: "13px",
                            fontWeight: "400",
                            color: "#000000",
                          }}
                        >
                          {entry.reference_id}
                        </td>
                        <td
                          style={{
                            padding: "12px",
                            borderBottom: "1px solid #dee2e6",
                            fontSize: "13px",
                            color: "#000000",
                          }}
                        >
                          {entry.date}
                        </td>
                        <td
                          style={{
                            padding: "12px",
                            borderBottom: "1px solid #dee2e6",
                            fontSize: "13px",
                            color: "#000000",
                          }}
                        >
                          {entry.department}
                        </td>
                        <td
                          style={{
                            padding: "12px",
                            borderBottom: "1px solid #dee2e6",
                            fontSize: "13px",
                            fontWeight: "400",
                            color: "#000000",
                            textAlign: "left",
                          }}
                        >
                          {entry.category}
                        </td>
                        <td
                          style={{
                            padding: "12px",
                            borderBottom: "1px solid #dee2e6",
                            fontSize: "13px",
                            color: "#000000",
                          }}
                        >
                          {entry.sub_category || "General"}
                        </td>
                        <td
                          style={{
                            padding: "12px",
                            borderBottom: "1px solid #dee2e6",
                            fontSize: "13px",
                            color: "#000000",
                          }}
                        >
                          {entry.account}
                        </td>
                        <td
                          style={{
                            padding: "12px",
                            borderBottom: "1px solid #dee2e6",
                            fontSize: "13px",
                            fontWeight: "400",
                            color: "#000000",
                          }}
                        >
                          {formatAmount(entry.amount)}
                        </td>
                        <td
                          style={{
                            padding: "12px",
                            borderBottom: "1px solid #dee2e6",
                            textAlign: "center",
                          }}
                        >
                          {/* View Button */}
                          <button
                            onClick={() => handleJournalEntryClick(entry)}
                            onMouseDown={(e) => e.preventDefault()}
                            style={{
                              padding: "6px 12px",
                              backgroundColor: "#007bff",
                              color: "white",
                              border: "none",
                              borderRadius: "4px",
                              cursor: "pointer",
                              fontSize: "12px",
                              fontWeight: "500",
                            }}
                          >
                            View
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan="8"
                        className="no-results"
                        style={{
                          padding: "20px",
                          textAlign: "center",
                          fontSize: "13px",
                        }}
                      >
                        No transactions match your search criteria.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {pagination.count > 0 && !loading && (
              <Pagination
                currentPage={currentPage}
                pageSize={pageSize}
                totalItems={pagination.count}
                onPageChange={setCurrentPage}
                onPageSizeChange={(newSize) => {
                  setPageSize(newSize);
                  setCurrentPage(1);
                }}
                pageSizeOptions={[5, 10, 20, 50]}
              />
            )}
          </div>
        )}
      </div>

      {/* NEW: Journal Entry Details Modal with Full Navbar */}
      {showDetailsModal && (
        <JournalEntryDetailsModal
          entry={selectedEntry}
          onClose={handleCloseDetailsModal}
          loading={detailsLoading}
          showBudgetDropdown={showBudgetDropdown}
          showExpenseDropdown={showExpenseDropdown}
          showProfileDropdown={showProfileDropdown}
          showNotifications={showNotifications}
          toggleBudgetDropdown={toggleBudgetDropdown}
          toggleExpenseDropdown={toggleExpenseDropdown}
          toggleProfileDropdown={toggleProfileDropdown}
          toggleNotifications={toggleNotifications}
          handleNavigate={handleNavigate}
          formattedDay={formattedDay}
          formattedDate={formattedDate}
          formattedTime={formattedTime}
          userProfile={userProfile}
          handleManageProfile={handleManageProfile}
          userRole={userRole}
          handleLogout={handleLogout}
        />
      )}
    </div>
  );
};

export default LedgerView;
