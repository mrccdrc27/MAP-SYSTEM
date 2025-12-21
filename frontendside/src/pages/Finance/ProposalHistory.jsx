/*
1. Overview
The Proposal History page serves as the audit trail for the Budget Management System. Unlike the "Budget Proposal" page (which shows the current state of active proposals), the History page tracks actions and status changes over time. It allows Finance Managers and Department Heads to see who modified a proposal, when it happened, and what the outcome was (Approved, Rejected, Updated).

2. Frontend Implementation (ProposalHistory.jsx)
Data Source: Fetches data from getProposalHistory (Endpoint: /budget-proposals/history/).
Columns:
Ticket ID: The external reference ID (e.g., TKT-FIN-2025-004).
Department: The department associated with the proposal.
Category: High-level classification (CapEx or OpEx).
Sub-Category: Specific cost element (e.g., "Audit Fees", "Server Hosting").
Last Modified: Timestamp of the specific action (Submission, Approval, Rejection).
Modified By: The user (Finance Head, Dept Head) who performed the action.
Status: The state resulting from the action (Approved, Rejected, Submitted).
Interactions:
Clicking a Row: Opens a Detail Modal that fetches the full proposal data using getProposalDetail(proposal_pk).
Filters: Server-side filtering for Department, Category, and Status.
Print: Allows printing the detailed view of a historical proposal record.

3. Backend Logic (Behind the Scenes)
Model: ProposalHistory (in models.py).
This model is distinct from BudgetProposal. It acts as a log.
One BudgetProposal can have multiple ProposalHistory entries (e.g., one for "Created", one for "Submitted", one for "Approved").
Data Generation (Seeder):
The controlled_seeder.py was updated to explicitly create ProposalHistory records whenever it creates a seed proposal.
Example: When the seeder creates an "Approved" proposal, it creates two history records: one for the initial "SUBMITTED" action by the User, and one for the "APPROVED" action by the Finance Head.
Serializers (serializers_budget.py):
ProposalHistorySerializer: Flattens the relationship between the History log and the parent Proposal to provide fields like department and category directly to the table without N+1 query issues.
Logic: It dynamically determines "Category" (CapEx/OpEx) based on the proposal's items to ensure consistent reporting.

4. Workflow Example
User A submits a proposal.
Backend: Creates BudgetProposal record AND ProposalHistory record (Action: SUBMITTED).
Frontend History: Shows row "Modified By: User A", "Status: SUBMITTED".
Finance Head reviews and approves it.
Backend: Updates BudgetProposal status to APPROVED. Creates new ProposalHistory record (Action: APPROVED).
Frontend History: Shows new row (at top) "Modified By: Finance Head", "Status: APPROVED".

*/

import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ChevronDown,
  Search,
  User,
  LogOut,
  Bell,
  Settings,
  ArrowLeft,
  Printer,
  X,
} from "lucide-react";
import LOGOMAP from "../../assets/MAP.jpg";
import "./ProposalHistory.css";
import { useAuth } from "../../context/AuthContext";
import {
  getProposalHistory,
  getProposalDetail,
} from "../../API/proposalAPI";
import { getAllDepartments } from "../../API/departments";
import ManageProfile from "./ManageProfile";

// Status Component
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

// Pagination Component
const Pagination = ({
  currentPage,
  pageSize,
  totalItems,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [6, 10, 25, 50],
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

    // Always show 1
    pages.push(
      <button
        key={1}
        onClick={() => handlePageClick(1)}
        style={{
          padding: "8px 12px",
          border: "1px solid #ccc",
          backgroundColor: 1 === currentPage ? "#007bff" : "white",
          color: 1 === currentPage ? "white" : "black",
          cursor: "pointer",
          borderRadius: "4px",
          minWidth: "35px",
        }}
      >
        1
      </button>
    );

    let startPage = Math.max(2, currentPage - 1);
    let endPage = Math.min(totalPages - 1, currentPage + 1);

    if (startPage > 2) {
      pages.push(
        <span key="start-ellipsis" style={{ padding: "8px" }}>
          ...
        </span>
      );
    }

    for (let i = startPage; i <= endPage; i++) {
      pages.push(
        <button
          key={i}
          onClick={() => handlePageClick(i)}
          style={{
            padding: "8px 12px",
            border: "1px solid #ccc",
            backgroundColor: i === currentPage ? "#007bff" : "white",
            color: i === currentPage ? "white" : "black",
            cursor: "pointer",
            borderRadius: "4px",
            minWidth: "35px",
          }}
        >
          {i}
        </button>
      );
    }

    if (endPage < totalPages - 1) {
      pages.push(
        <span key="end-ellipsis" style={{ padding: "8px" }}>
          ...
        </span>
      );
    }

    // Always show last page if > 1
    if (totalPages > 1) {
      pages.push(
        <button
          key={totalPages}
          onClick={() => handlePageClick(totalPages)}
          style={{
            padding: "8px 12px",
            border: "1px solid #ccc",
            backgroundColor: totalPages === currentPage ? "#007bff" : "white",
            color: totalPages === currentPage ? "white" : "black",
            cursor: "pointer",
            borderRadius: "4px",
            minWidth: "35px",
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
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginTop: "20px",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <span style={{ fontSize: "14px" }}>Show</span>
        <select
          value={pageSize}
          onChange={(e) => onPageSizeChange(Number(e.target.value))}
          style={{
            padding: "6px",
            borderRadius: "4px",
            border: "1px solid #ccc",
            backgroundColor: "white", // Fixed grey fill issue
            color: "#333",
            cursor: "pointer",
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

      <div style={{ display: "flex", gap: "5px" }}>
        <button
          onClick={() => handlePageClick(currentPage - 1)}
          disabled={currentPage === 1}
          style={{
            padding: "8px 12px",
            border: "1px solid #ccc",
            backgroundColor: currentPage === 1 ? "#f0f0f0" : "white",
            cursor: currentPage === 1 ? "not-allowed" : "pointer",
            borderRadius: "4px",
          }}
        >
          Prev
        </button>
        {renderPageNumbers()}
        <button
          onClick={() => handlePageClick(currentPage + 1)}
          disabled={currentPage === totalPages || totalPages === 0}
          style={{
            padding: "8px 12px",
            border: "1px solid #ccc",
            backgroundColor:
              currentPage === totalPages || totalPages === 0
                ? "#f0f0f0"
                : "white",
            cursor:
              currentPage === totalPages || totalPages === 0
                ? "not-allowed"
                : "pointer",
            borderRadius: "4px",
          }}
        >
          Next
        </button>
      </div>
    </div>
  );
};

const ProposalHistory = () => {
  // Navigation State
  const [showBudgetDropdown, setShowBudgetDropdown] = useState(false);
  const [showExpenseDropdown, setShowExpenseDropdown] = useState(false);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showManageProfile, setShowManageProfile] = useState(false);

  // Filter Dropdowns State
  const [showDepartmentDropdown, setShowDepartmentDropdown] = useState(false);
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);

  const navigate = useNavigate();
  const { user, logout } = useAuth();

  // Data State
  const [history, setHistory] = useState([]);
  const [pagination, setPagination] = useState({ count: 0 });
  const [loading, setLoading] = useState(true);

  // Filter State
  const [selectedDepartment, setSelectedDepartment] = useState("");
  const [departmentOptions, setDepartmentOptions] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(6);

  // View Detail Modal State
  const [showDetailPopup, setShowDetailPopup] = useState(false);
  const [selectedDetail, setSelectedDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Current Date
  const [currentDate, setCurrentDate] = useState(new Date());

  // Constants
  const categoryOptions = [
    { value: "", label: "All Categories" },
    { value: "CapEx", label: "Asset (CapEx)" }, // Mapped for UI
    { value: "OpEx", label: "Expense (OpEx)" }, // Mapped for UI
  ];

  const statusOptions = [
    { value: "", label: "All Status" },
    { value: "APPROVED", label: "Approved" },
    { value: "REJECTED", label: "Rejected" },
    { value: "SUBMITTED", label: "Submitted" },
    { value: "UPDATED", label: "Updated" },
    { value: "REVIEWED", label: "Reviewed" },
  ];

  // Utility function to shorten department names
  const shortenDepartmentName = (name, maxLength = 20) => {
    if (!name || name.length <= maxLength) return name;

    // Common abbreviations
    const abbreviations = {
      Department: "Dept.",
      Management: "Mgmt.",
      Operations: "Ops.",
      Merchandise: "Merch.",
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
    return shortened.substring(0, maxLength - 3) + "...";
  };
  // --- Effects ---

  // Timer for Clock
  useEffect(() => {
    const interval = setInterval(() => setCurrentDate(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  // Debounce Search
  useEffect(() => {
    const timerId = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
      setCurrentPage(1);
    }, 500);
    return () => clearTimeout(timerId);
  }, [searchTerm]);

  // In the useEffect that fetches departments:
  useEffect(() => {
    const fetchDepartments = async () => {
      try {
        const res = await getAllDepartments();
        const opts = res.data.map((d) => ({
          value: d.id,
          label: d.name,
          code: d.code, // Add code field
        }));
        setDepartmentOptions([
          { value: "", label: "All Departments", code: "All Departments" }, // Fix: Add code here
          ...opts,
        ]);
      } catch (err) {
        console.error("Failed to fetch departments", err);
      }
    };
    fetchDepartments();
  }, []);

  // Fetch History Data
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const params = {
          page: currentPage,
          page_size: pageSize,
          search: debouncedSearchTerm,
          action: selectedStatus, // Backend uses 'action' to filter status history
          category:
            selectedCategory === "CapEx"
              ? "Asset"
              : selectedCategory === "OpEx"
              ? "Expense"
              : "", // Mapping simplistic logic or handle backend to accept CapEx
          department: selectedDepartment, // ID
        };

        // Clean params
        Object.keys(params).forEach(
          (key) => !params[key] && delete params[key]
        );

        const res = await getProposalHistory(params);
        setHistory(res.data.results);
        setPagination({ count: res.data.count });
      } catch (error) {
        console.error("Failed to fetch history:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [
    currentPage,
    pageSize,
    debouncedSearchTerm,
    selectedDepartment,
    selectedCategory,
    selectedStatus,
  ]);

  const handleCloseDetailPopup = () => {
    setShowDetailPopup(false);
    setSelectedRowId(null); // Clear selection when modal closes
    setSelectedDetail(null);
  };
  // Click Outside Handler
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        !event.target.closest(".nav-dropdown") &&
        !event.target.closest(".profile-container") &&
        !event.target.closest(".notification-container") &&
        !event.target.closest(".filter-dropdown")
      ) {
        setShowBudgetDropdown(false);
        setShowExpenseDropdown(false);
        setShowProfileDropdown(false);
        setShowNotifications(false);
        setShowDepartmentDropdown(false);
        setShowCategoryDropdown(false);
        setShowStatusDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // --- Handlers ---
  const [selectedRowId, setSelectedRowId] = useState(null);

  const handleRowClick = async (proposalPk, itemId) => {
    if (!proposalPk) return;
    setSelectedRowId(itemId); // Track which row is selected
    setDetailLoading(true);
    setShowDetailPopup(true);
    try {
      const res = await getProposalDetail(proposalPk);
      setSelectedDetail({ ...res.data, id: itemId }); // Store item ID for comparison
    } catch (err) {
      console.error("Failed to fetch proposal detail", err);
    } finally {
      setDetailLoading(false);
    }
  };

  // MODIFIED: Add Handle Export
  const handleExport = async () => {
    if (!selectedDetail) return;
    try {
      const response = await exportProposal(selectedDetail.id);

      // Create a URL for the blob
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;

      // Try to extract filename from header, otherwise default
      const filename = `budget_proposal_${
        selectedDetail.external_system_id || selectedDetail.id
      }.xlsx`;
      link.setAttribute("download", filename);

      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error("Failed to export proposal:", error);
      alert("Failed to download export file.");
    }
  };

  const handlePrint = () => {
    const printContent = document.getElementById("printable-area");
    const printWindow = window.open("", "_blank");
    printWindow.document.write(`
      <html>
        <head>
          <title>Print Proposal</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            .header { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #000; }
            .section { margin-bottom: 20px; }
            .label { font-weight: bold; width: 150px; display: inline-block; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            th, td { border: 1px solid #ccc; padding: 8px; text-align: left; }
            th { background-color: #f0f0f0; }
            img { max-width: 200px; }
          </style>
        </head>
        <body>
          ${printContent.innerHTML}
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  const getUserRole = () => {
    if (!user) return "User";
    if (user.roles?.bms) return user.roles.bms;
    if (user.is_superuser) return "ADMIN";
    return "User";
  };

  const userProfile = {
    name: user
      ? `${user.first_name || ""} ${user.last_name || ""}`.trim()
      : "User",
    role: getUserRole(),
    avatar:
      user?.profile_picture ||
      "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80",
  };

  // --- Render ---

  return (
    <div
      className="app-container"
      style={{ minWidth: "1200px", overflowY: "auto", height: "100vh" }}
    >
      {/* Navbar */}
      <nav
        className="navbar"
        style={{ position: "static", marginBottom: "20px" }}
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
            style={{ display: "flex", alignItems: "center", gap: "12px" }}
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
                alt="Logo"
                style={{ height: "100%", width: "100%", objectFit: "contain" }}
              />
            </div>
            <span
              style={{ fontWeight: 700, fontSize: "1.3rem", color: "#007bff" }}
            >
              BudgetPro
            </span>
          </div>

          <div
            className="navbar-links"
            style={{ display: "flex", gap: "20px" }}
          >
            <Link to="/dashboard" className="nav-link">
              Dashboard
            </Link>

            <div className="nav-dropdown">
              <div
                className={`nav-link ${showBudgetDropdown ? "active" : ""}`}
                onClick={() => setShowBudgetDropdown(!showBudgetDropdown)}
              >
                Budget{" "}
                <ChevronDown
                  size={14}
                  className={showBudgetDropdown ? "rotated" : ""}
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
                    onClick={() => navigate("/finance/budget-proposal")}
                  >
                    Budget Proposal
                  </div>
                  <div
                    className="dropdown-item"
                    onClick={() => navigate("/finance/proposal-history")}
                  >
                    Proposal History
                  </div>
                  <div
                    className="dropdown-item"
                    onClick={() => navigate("/finance/ledger-view")}
                  >
                    Ledger View
                  </div>
                  <div
                    className="dropdown-item"
                    onClick={() => navigate("/finance/budget-allocation")}
                  >
                    Budget Allocation
                  </div>
                  <div
                    className="dropdown-item"
                    onClick={() => navigate("/finance/budget-variance-report")}
                  >
                    Budget Variance Report
                  </div>
                </div>
              )}
            </div>

            <div className="nav-dropdown">
              <div
                className={`nav-link ${showExpenseDropdown ? "active" : ""}`}
                onClick={() => setShowExpenseDropdown(!showExpenseDropdown)}
              >
                Expense{" "}
                <ChevronDown
                  size={14}
                  className={showExpenseDropdown ? "rotated" : ""}
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
                    onClick={() => navigate("/finance/expense-tracking")}
                  >
                    Expense Tracking
                  </div>
                  <div
                    className="dropdown-item"
                    onClick={() => navigate("/finance/expense-history")}
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
                color: "#007bff",
                fontWeight: 500,
              }}
            >
              {currentDate.toLocaleDateString("en-US", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              })}{" "}
              |{" "}
              {currentDate.toLocaleTimeString("en-US", {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </div>

            <div
              className="notification-container"
              style={{ position: "relative" }}
            >
              <div
                onClick={() => setShowNotifications(!showNotifications)}
                style={{ cursor: "pointer" }}
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
                onClick={() => setShowProfileDropdown(!showProfileDropdown)}
                style={{ cursor: "pointer" }}
              >
                <img
                  src={userProfile.avatar}
                  alt="Avatar"
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
                    style={{
                      display: "flex",
                      alignItems: "center",
                      marginBottom: "10px",
                    }}
                  >
                    <img
                      src={userProfile.avatar}
                      alt="Profile"
                      style={{
                        width: "40px",
                        height: "40px",
                        borderRadius: "50%",
                        marginRight: "10px",
                      }}
                    />
                    <div>
                      <div style={{ fontWeight: "bold" }}>
                        {userProfile.name}
                      </div>
                      <div
                        style={{
                          fontSize: "12px",
                          backgroundColor: "#e9ecef",
                          borderRadius: "10px",
                          padding: "2px 8px",
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
                  <div className="dropdown-item" onClick={handleManageProfile}>
                    <User size={16} style={{ marginRight: "8px" }} /> Manage
                    Profile
                  </div>
                  <div className="dropdown-item" onClick={logout}>
                    <LogOut size={16} style={{ marginRight: "8px" }} /> Log Out
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Content */}
      <div
        className="content-container"
        style={{ padding: "20px", maxWidth: "1200px", margin: "0 auto" }}
      >
        {showManageProfile ? (
          <ManageProfile onClose={() => setShowManageProfile(false)} />
        ) : (
          <div
            className="proposal-history"
            style={{
              backgroundColor: "white",
              borderRadius: "8px",
              boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
              padding: "20px",
              minHeight: "calc(80vh - 100px)",
            }}
          >
            {/* Header Controls */}
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
                  fontSize: "29px",
                  fontWeight: "bold",
                  color: "#0C0C0C",
                }}
              >
                Proposal History
              </h2>

              <div
                className="controls-container"
                style={{ display: "flex", gap: "10px" }}
              >
                <div style={{ position: "relative" }}>
                  <input
                    type="text"
                    placeholder="Search"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="search-account-input"
                    style={{
                      padding: "8px 12px",
                      border: "1px solid #ccc",
                      borderRadius: "4px",
                      outline: "none",
                    }}
                  />
                </div>

                {/* Department Filter */}
                <div
                  className="filter-dropdown"
                  style={{ position: "relative" }}
                >
                  <button
                    onClick={() =>
                      setShowDepartmentDropdown(!showDepartmentDropdown)
                    }
                    className={`filter-dropdown-btn ${
                      showDepartmentDropdown ? "active" : ""
                    }`}
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
                      justifyContent: "space-between",
                    }}
                  >
                    <span
                      style={{
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        maxWidth: "140px",
                      }}
                    >
                      {selectedDepartment
                        ? departmentOptions.find(
                            (d) => d.value === selectedDepartment
                          )?.code || "Select Department"
                        : "All Departments"}
                    </span>
                    <ChevronDown size={14} />
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
                        width: "100%",
                        zIndex: 1000,
                        maxHeight: "200px",
                        overflowY: "auto",
                      }}
                    >
                      {departmentOptions.map((dept) => (
                        <div
                          key={dept.value}
                          onClick={() => {
                            setSelectedDepartment(dept.value);
                            setShowDepartmentDropdown(false);
                            setCurrentPage(1);
                          }}
                          className="category-dropdown-item"
                          style={{
                            padding: "8px 12px",
                            cursor: "pointer",
                            backgroundColor:
                              selectedDepartment === dept.value
                                ? "#f0f0f0"
                                : "white",
                            outline: "none",
                            fontSize: "14px",
                          }}
                          title={dept.label} // Show full name on hover
                        >
                          {dept.code}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Status Filter - UPDATED */}
                <div
                  className="filter-dropdown"
                  style={{ position: "relative" }}
                >
                  <button
                    onClick={() => setShowStatusDropdown(!showStatusDropdown)}
                    className={`filter-dropdown-btn ${
                      showStatusDropdown ? "active" : ""
                    }`}
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
                      justifyContent: "space-between",
                    }}
                  >
                    <span>
                      {selectedStatus
                        ? statusOptions.find((s) => s.value === selectedStatus)
                            ?.label
                        : "All Status"}
                    </span>
                    <ChevronDown size={14} />
                  </button>
                  {showStatusDropdown && (
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
                      {statusOptions.map((st) => (
                        <div
                          key={st.value}
                          onClick={() => {
                            setSelectedStatus(st.value);
                            setShowStatusDropdown(false);
                            setCurrentPage(1);
                          }}
                          className="category-dropdown-item"
                          style={{
                            padding: "8px 12px",
                            cursor: "pointer",
                            backgroundColor:
                              selectedStatus === st.value ? "#f0f0f0" : "white",
                            outline: "none",
                          }}
                        >
                          {st.label}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div
              style={{
                height: "1px",
                backgroundColor: "#e0e0e0",
                marginBottom: "20px",
              }}
            ></div>

            {/* Table */}
            <div style={{ overflowX: "auto" }}>
              <table
                className="ledger-table"
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  tableLayout: "fixed",
                }}
              >
                <thead>
                  <tr style={{ backgroundColor: "#f8f9fa" }}>
                    <th
                      style={{
                        padding: "0.75rem",
                        borderBottom: "2px solid #dee2e6",
                        width: "15%",
                      }}
                    >
                      TICKET ID
                    </th>
                    <th
                      style={{
                        padding: "0.75rem",
                        borderBottom: "2px solid #dee2e6",
                        width: "15%",
                      }}
                    >
                      DEPARTMENT
                    </th>
                    <th
                      style={{
                        padding: "0.75rem",
                        borderBottom: "2px solid #dee2e6",
                        width: "10%",
                      }}
                    >
                      CATEGORY
                    </th>
                    <th
                      style={{
                        padding: "0.75rem",
                        borderBottom: "2px solid #dee2e6",
                        width: "15%",
                      }}
                    >
                      SUB-CATEGORY
                    </th>
                    <th
                      style={{
                        padding: "0.75rem",
                        borderBottom: "2px solid #dee2e6",
                        width: "18%",
                      }}
                    >
                      LAST MODIFIED
                    </th>
                    <th
                      style={{
                        padding: "0.75rem",
                        borderBottom: "2px solid #dee2e6",
                        width: "15%",
                      }}
                    >
                      MODIFIED BY
                    </th>
                    <th
                      style={{
                        padding: "0.75rem",
                        borderBottom: "2px solid #dee2e6",
                        width: "12%",
                      }}
                    >
                      STATUS
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td
                        colSpan="7"
                        style={{ textAlign: "center", padding: "20px" }}
                      >
                        Loading...
                      </td>
                    </tr>
                  ) : history.length > 0 ? (
                    history.map((item, index) => (
                      <tr
                        key={item.id}
                        onClick={() =>
                          handleRowClick(item.proposal_pk, item.id)
                        }
                        className={`${index % 2 === 1 ? "alternate-row " : ""}${
                          selectedRowId === item.id ? "selected-row" : ""
                        }`}
                        style={{
                          backgroundColor:
                            selectedRowId === item.id
                              ? "#f0f8ff" // Selected color - light blue
                              : index % 2 === 1
                              ? "#F8F8F8"
                              : "#FFFFFF",
                          color: "#0C0C0C",
                          height: "50px",
                          transition: "background-color 0.2s ease",
                          cursor: "pointer",
                          borderBottom: "1px solid #dee2e6",
                        }}
                        onMouseEnter={(e) => {
                          if (selectedRowId !== item.id) {
                            e.currentTarget.style.backgroundColor = "#f5f5f5"; // Hover color
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (selectedRowId !== item.id) {
                            e.currentTarget.style.backgroundColor =
                              index % 2 === 1 ? "#F8F8F8" : "#FFFFFF";
                          }
                        }}
                      >
                        <td
                          style={{
                            padding: "0.75rem",
                            wordWrap: "break-word",
                            whiteSpace: "normal",
                          }}
                        >
                          {item.proposal_id || "N/A"}
                        </td>
                        <td style={{ padding: "0.75rem" }}>
                          {shortenDepartmentName(item.department)}
                        </td>
                        <td style={{ padding: "0.75rem" }}>{item.category}</td>
                        <td style={{ padding: "0.75rem" }}>
                          {item.subcategory}
                        </td>
                        <td
                          style={{
                            padding: "0.75rem",
                            wordWrap: "break-word",
                            whiteSpace: "normal",
                          }}
                        >
                          {new Date(item.last_modified).toLocaleString()}
                        </td>
                        <td style={{ padding: "0.75rem", fontWeight: "500" }}>
                          {item.last_modified_by}
                        </td>
                        <td style={{ padding: "0.75rem" }}>
                          <Status type={item.status} name={item.status} />
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan="7"
                        style={{ textAlign: "center", padding: "20px" }}
                      >
                        No history found.
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
              />
            )}
          </div>
        )}
      </div>

      {/* View Detail Modal */}
      {showDetailPopup && (
        <div
          className="popup-overlay"
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0,0,0,0.5)",
            zIndex: 1100,
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <div
            className="review-popup"
            style={{
              backgroundColor: "white",
              borderRadius: "8px",
              width: "800px",
              maxWidth: "90vw",
              maxHeight: "90vh",
              overflowY: "auto",
              padding: "20px",
            }}
          >
            <div
              className="popup-header"
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                borderBottom: "1px solid #eee",
                paddingBottom: "10px",
                marginBottom: "20px",
              }}
            >
              <div
                style={{ display: "flex", alignItems: "center", gap: "10px" }}
              >
                <button
                  onClick={() => setShowDetailPopup(false)}
                  style={{
                    border: "none",
                    background: "none",
                    cursor: "pointer",
                    color: "#007bff",
                  }}
                >
                  <ArrowLeft size={20} />
                </button>
                <h2 style={{ margin: 0 }}>Proposal Details</h2>
              </div>
              <div style={{ display: "flex", gap: "10px" }}>
              
                <button
                  onClick={handlePrint}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "5px",
                    padding: "8px 12px",
                    border: "1px solid #007bff",
                    borderRadius: "4px",
                    backgroundColor: "white",
                    color: "#007bff",
                    cursor: "pointer",
                  }}
                >
                  <Printer size={16} /> Print
                </button>
                <button
                  onClick={() => setShowDetailPopup(false)}
                  style={{
                    border: "none",
                    background: "none",
                    cursor: "pointer",
                  }}
                >
                  <X size={24} />
                </button>
              </div>
            </div>

            {detailLoading || !selectedDetail ? (
              <div style={{ textAlign: "center", padding: "40px" }}>
                Loading details...
              </div>
            ) : (
              <div id="printable-area">
                <div
                  className="proposal-header"
                  style={{ marginBottom: "20px" }}
                >
                  <h3 style={{ margin: "0 0 5px 0" }}>
                    {selectedDetail.title}
                  </h3>
                  <div style={{ color: "#666", fontSize: "14px" }}>
                    Ticket ID: {selectedDetail.external_system_id} | Status:{" "}
                    {selectedDetail.status}
                  </div>
                </div>

                <div
                  className="details-grid"
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "20px",
                    marginBottom: "20px",
                  }}
                >
                  <div>
                    {/* MODIFIED: Use new serializer fields */}
                    <strong>Category:</strong> {selectedDetail.category}
                  </div>
                  <div>
                    <strong>Sub-Category:</strong>{" "}
                    {selectedDetail.sub_category ||
                      selectedDetail.items?.[0]?.cost_element ||
                      "N/A"}
                  </div>
                  <div>
                    <strong>Department:</strong>{" "}
                    {selectedDetail.department_name}
                  </div>
                  <div>
                    <strong>Submitted By:</strong>{" "}
                    {selectedDetail.submitted_by_name}
                  </div>
                  <div>
                    <strong>Budget Amount:</strong> ₱
                    {parseFloat(selectedDetail.total_cost).toLocaleString()}
                  </div>
                  <div>
                    <strong>Date Submitted:</strong>{" "}
                    {new Date(selectedDetail.submitted_at).toLocaleDateString()}
                  </div>
                </div>

                <div className="section" style={{ marginBottom: "20px" }}>
                  <h4
                    style={{
                      borderBottom: "1px solid #eee",
                      paddingBottom: "5px",
                    }}
                  >
                    Project Summary
                  </h4>
                  <p>{selectedDetail.project_summary}</p>
                </div>

                <div className="section" style={{ marginBottom: "20px" }}>
                  <h4
                    style={{
                      borderBottom: "1px solid #eee",
                      paddingBottom: "5px",
                    }}
                  >
                    Project Description
                  </h4>
                  <p>{selectedDetail.project_description}</p>
                </div>

                <div className="section" style={{ marginBottom: "20px" }}>
                  <h4
                    style={{
                      borderBottom: "1px solid #eee",
                      paddingBottom: "5px",
                    }}
                  >
                    Period of Performance
                  </h4>
                  <p>
                    {new Date(
                      selectedDetail.performance_start_date
                    ).toLocaleDateString()}{" "}
                    to{" "}
                    {new Date(
                      selectedDetail.performance_end_date
                    ).toLocaleDateString()}
                  </p>
                </div>

                {selectedDetail.items && (
                  <div className="section" style={{ marginBottom: "20px" }}>
                    <h4
                      style={{
                        borderBottom: "1px solid #eee",
                        paddingBottom: "5px",
                      }}
                    >
                      Cost Elements
                    </h4>
                    <table
                      style={{ width: "100%", borderCollapse: "collapse" }}
                    >
                      <thead>
                        <tr style={{ backgroundColor: "#f8f9fa" }}>
                          <th
                            style={{
                              padding: "8px",
                              borderBottom: "1px solid #ddd",
                              textAlign: "left",
                            }}
                          >
                            Description
                          </th>
                          <th
                            style={{
                              padding: "8px",
                              borderBottom: "1px solid #ddd",
                              textAlign: "right",
                            }}
                          >
                            Cost
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedDetail.items.map((item, i) => (
                          <tr key={i}>
                            <td
                              style={{
                                padding: "8px",
                                borderBottom: "1px solid #eee",
                              }}
                            >
                              {item.description}
                            </td>
                            <td
                              style={{
                                padding: "8px",
                                borderBottom: "1px solid #eee",
                                textAlign: "right",
                              }}
                            >
                              ₱
                              {parseFloat(item.estimated_cost).toLocaleString()}
                            </td>
                          </tr>
                        ))}
                        <tr>
                          <td
                            style={{
                              padding: "8px",
                              fontWeight: "bold",
                              textAlign: "right",
                            }}
                          >
                            Total:
                          </td>
                          <td
                            style={{
                              padding: "8px",
                              fontWeight: "bold",
                              textAlign: "right",
                              color: "#007bff",
                            }}
                          >
                            ₱
                            {parseFloat(
                              selectedDetail.total_cost
                            ).toLocaleString()}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                )}

                {(selectedDetail.status === "APPROVED" ||
                  selectedDetail.status === "REJECTED") && (
                  <div
                    className="section"
                    style={{
                      marginTop: "30px",
                      padding: "15px",
                      backgroundColor: "#f9f9f9",
                      borderRadius: "4px",
                    }}
                  >
                    <h4>Finance Review</h4>
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "1fr 1fr",
                        gap: "15px",
                      }}
                    >
                      <div>
                        <strong>Reviewed By:</strong>{" "}
                        {selectedDetail.approved_by_name ||
                          selectedDetail.rejected_by_name ||
                          selectedDetail.finance_operator_name}
                      </div>
                      <div>
                        <strong>Date:</strong>{" "}
                        {new Date(
                          selectedDetail.approval_date ||
                            selectedDetail.rejection_date
                        ).toLocaleDateString()}
                      </div>
                      {selectedDetail.signature && (
                        <div
                          style={{ gridColumn: "span 2", marginTop: "10px" }}
                        >
                          <strong>Signature:</strong>
                          <br />
                          <img
                            src={selectedDetail.signature}
                            alt="Signature"
                            style={{
                              maxHeight: "60px",
                              border: "1px solid #ddd",
                              marginTop: "5px",
                            }}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ProposalHistory;
