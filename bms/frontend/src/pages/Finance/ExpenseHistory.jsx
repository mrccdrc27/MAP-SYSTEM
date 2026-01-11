/* CONTEXT: Expense Detail Modal Logic & "Not Linked" Fallback

Why do some expenses show full Project Proposal details while others show a simple "Expense Details" view?

1. Data Model Hierarchy:
    - Expenses are ideally linked to a Project, which is linked to a BudgetProposal.
    - However, the database model allows `Expense.project` to be null to support ad-hoc/general expenses.

2. Seeder & Data State:
    - In the backend seeder, Projects (and thus Allocations) are primarily created for 'APPROVED' proposals.
     - If expenses exist from previous seed runs or specific status flows (e.g. SUBMITTED) where the Project
      was not fully instantiated, the expense exists but the link to the Proposal is missing.

3. Frontend Logic:
  - We fetch `proposal_id` via `getExpenseDetailsForModal`.
  - If valid, we fetch and display the full Proposal narrative (Project Summary, Cost Elements).
  - If null, we render the defensive "Fallback View" (Description, Amount, Category) to prevent UI crashes.
*/

import React, { useState, useEffect } from "react";
import {
  Search,
  ChevronDown,
  ArrowLeft,
  User,
  LogOut,
  Bell,
  Settings,
  Download,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import LOGOMAP from "../../assets/MAP.jpg";
import "./ExpenseHistory.css";
import { useAuth } from "../../context/AuthContext";
import {
  getExpenseHistoryList,
  getExpenseCategories,
  getExpenseDetailsForModal,
  getProposalDetails,
} from "../../API/expenseAPI";
import * as XLSX from "xlsx";
// Import ManageProfile component
import ManageProfile from "./ManageProfile";

// Pagination Component (Kept as is)
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
            style={{ padding: "8px", userSelect: "none" }}
          >
            ...
          </span>
        );
      }

      if (currentPage + sideButtons >= totalPages - 1) {
        startPage = totalPages - pageLimit;
      }
      if (currentPage - sideButtons <= 2) {
        endPage = pageLimit;
      }

      for (let i = startPage; i <= endPage; i++) {
        if (i > 1 && i < totalPages) {
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
      }

      if (currentPage + sideButtons < totalPages - 2) {
        pages.push(
          <span
            key="end-ellipsis"
            style={{ padding: "8px", userSelect: "none" }}
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

const ExpenseHistory = () => {
  const { user, logout, getBmsRole } = useAuth();
  const [showBudgetDropdown, setShowBudgetDropdown] = useState(false);
  const [showExpenseDropdown, setShowExpenseDropdown] = useState(false);
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showManageProfile, setShowManageProfile] = useState(false);

  const navigate = useNavigate();

  // API Data State
  const [expenses, setExpenses] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ count: 0 });

  // Filter State
  const [selectedCategory, setSelectedCategory] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);

  // View Modal State
  const [selectedExpense, setSelectedExpense] = useState(null);
  const [selectedProposalDetails, setSelectedProposalDetails] = useState(null);
  const [viewModalLoading, setViewModalLoading] = useState(false);

  // --- Handlers (MOVED TO CORRECT SCOPE) ---

  const toggleBudgetDropdown = () => {
    setShowBudgetDropdown(!showBudgetDropdown);
    if (showExpenseDropdown) setShowExpenseDropdown(false);
    if (showCategoryDropdown) setShowCategoryDropdown(false);
    if (showProfileDropdown) setShowProfileDropdown(false);
    if (showNotifications) setShowNotifications(false);
  };

  const toggleExpenseDropdown = () => {
    setShowExpenseDropdown(!showExpenseDropdown);
    if (showBudgetDropdown) setShowBudgetDropdown(false);
    if (showCategoryDropdown) setShowCategoryDropdown(false);
    if (showProfileDropdown) setShowProfileDropdown(false);
    if (showNotifications) setShowNotifications(false);
  };

  const toggleCategoryDropdown = () => {
    setShowCategoryDropdown(!showCategoryDropdown);
    if (showBudgetDropdown) setShowBudgetDropdown(false);
    if (showExpenseDropdown) setShowExpenseDropdown(false);
    if (showProfileDropdown) setShowProfileDropdown(false);
    if (showNotifications) setShowNotifications(false);
  };

  const toggleNotifications = () => {
    setShowNotifications(!showNotifications);
    if (showBudgetDropdown) setShowBudgetDropdown(false);
    if (showExpenseDropdown) setShowExpenseDropdown(false);
    if (showCategoryDropdown) setShowCategoryDropdown(false);
    if (showProfileDropdown) setShowProfileDropdown(false);
  };

  const toggleProfileDropdown = () => {
    setShowProfileDropdown(!showProfileDropdown);
    if (showBudgetDropdown) setShowBudgetDropdown(false);
    if (showExpenseDropdown) setShowExpenseDropdown(false);
    if (showCategoryDropdown) setShowCategoryDropdown(false);
    if (showNotifications) setShowNotifications(false);
  };

  // Helper function to get category display name
  const getCategoryDisplay = () => {
    if (!selectedCategory) return "All Categories";
    return selectedCategory === "CAPEX" ? "CapEx" : "OpEx";
  };

  // Export Report Handler for Excel (.xlsx) - Fixed Version
  const handleExportReport = () => {
  if (!selectedExpense) return;

  try {
    // Helper to format currency
    const formatCurrency = (amount) =>
      `₱${parseFloat(amount).toLocaleString("en-US", { minimumFractionDigits: 2 })}`;

    // 1. Prepare Metadata Rows (Header)
    const data = [
      ["EXPENSE REPORT"],
      ["Generated On", new Date().toLocaleString()],
      [], // Spacer
      ["TRANSACTION DETAILS"],
      ["Date", selectedExpense.date],
      ["Description", selectedExpense.description],
      ["Amount", formatCurrency(selectedExpense.amount)],
      ["Vendor", selectedExpense.vendor || "N/A"],
      ["Department", selectedExpense.department_name || "N/A"],
      ["Category", selectedExpense.category_name || "N/A"],
      ["Sub-Category", selectedExpense.sub_category_name || "N/A"],
      [], // Spacer
    ];

    // 2. Prepare Project Details (if linked)
    if (selectedProposalDetails) {
      data.push(["PROJECT DETAILS"]);
      data.push(["Project Title", selectedProposalDetails.title]);
      data.push(["End Date", selectedProposalDetails.performance_end_date]);
      data.push(["Summary", selectedProposalDetails.project_summary || ""]);
      data.push([
        "Description",
        selectedProposalDetails.project_description || "",
      ]);
      data.push([]); // Spacer

      // Cost Elements Table Header
      data.push(["COST ELEMENTS"]);
      data.push(["Type", "Description", "Estimated Cost"]);

      // Cost Elements Rows
      if (
        selectedProposalDetails.items &&
        selectedProposalDetails.items.length > 0
      ) {
        selectedProposalDetails.items.forEach((item) => {
          data.push([
            item.cost_element,
            item.description || "",
            formatCurrency(item.estimated_cost),
          ]);
        });
      }

      // Total Row
      const total =
        selectedProposalDetails.total_cost || selectedProposalDetails.amount;
      data.push(["TOTAL", "", formatCurrency(total)]);
    } else {
      data.push(["PROJECT LINK"]);
      data.push(["Status", "Not linked to a project proposal"]);
    }

    // 3. Create Worksheet
    const worksheet = XLSX.utils.aoa_to_sheet(data);

    // 4. Formatting: Set Column Widths
    const wscols = [{ wch: 20 }, { wch: 60 }, { wch: 20 }];
    worksheet["!cols"] = wscols;

    // 5. Create Workbook and Download
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Expense Details");

    // Generate filename
    const safeId =
      selectedExpense.transaction_id || selectedExpense.id || "Report";
    const filename = `Expense_Report_${safeId}.xlsx`;

    XLSX.writeFile(workbook, filename);
  } catch (error) {
    console.error("Error exporting report:", error);
    alert("Failed to export report. Please try again.");
  }
};

  // Current Date State
  const [currentDate, setCurrentDate] = useState(new Date());

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

  // Debounce Search
  useEffect(() => {
    const timerId = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
      setCurrentPage(1);
    }, 500);
    return () => clearTimeout(timerId);
  }, [searchTerm]);

  // Clock
  useEffect(() => {
    const interval = setInterval(() => setCurrentDate(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  // Fetch Categories on Mount
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const res = await getExpenseCategories();
        setCategories([
          { code: "", name: "All Categories" },
          { code: "CAPEX", name: "CapEx" },
          { code: "OPEX", name: "OpEx" },
        ]);
      } catch (error) {
        console.error("Failed to fetch categories", error);
      }
    };
    fetchCategories();
  }, []);

  // Fetch Expenses - Updated Params logic
  useEffect(() => {
    const fetchExpenses = async () => {
      setLoading(true);
      try {
        const params = {
          page: currentPage,
          page_size: pageSize,
          search: debouncedSearchTerm,
          category__classification:
            selectedCategory !== "" ? selectedCategory : undefined,
        };

        // Clean empty params
        Object.keys(params).forEach(
          (key) => params[key] === undefined && delete params[key]
        );

        const res = await getExpenseHistoryList(params);
        setExpenses(res.data.results);
        setPagination(res.data);
      } catch (error) {
        console.error("Failed to fetch expenses:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchExpenses();
  }, [currentPage, pageSize, debouncedSearchTerm, selectedCategory]);

  // Dropdown Close Handler
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
        setShowCategoryDropdown(false);
        setShowProfileDropdown(false);
        setShowNotifications(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Handlers
  const handleCategorySelect = (code) => {
    setSelectedCategory(code);
    setCurrentPage(1);
    setShowCategoryDropdown(false);
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

  const handleViewExpense = async (expense) => {
    setViewModalLoading(true);
    setSelectedExpense(expense); // Keep table data as fallback
    setSelectedProposalDetails(null);

    try {
      // 1. Get Expense Details for Modal (this now includes vendor, etc.)
      const detailsRes = await getExpenseDetailsForModal(expense.id);
      const modalData = detailsRes.data;

      // Create a merged expense object with all data
      const fullExpenseData = {
        ...expense, // Keep table data
        ...modalData, // Override with modal data (includes vendor)
      };

      setSelectedExpense(fullExpenseData);
      const proposalId = modalData.proposal_id;

      if (proposalId) {
        // 2. Fetch Proposal Details
        const proposalRes = await getProposalDetails(proposalId);
        setSelectedProposalDetails(proposalRes.data);
      } else {
        setSelectedProposalDetails(null);
      }
    } catch (error) {
      console.error("Failed to fetch details", error);
      // Fallback: use table data (may not have vendor)
    } finally {
      setViewModalLoading(false);
    }
  };

  const handleBackToList = () => {
    setSelectedExpense(null);
    setSelectedProposalDetails(null);
  };

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
                onClick={toggleBudgetDropdown}
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
                onClick={toggleExpenseDropdown}
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
                fontSize: "0.95rem",
                color: "#007bff",
                fontWeight: 500,
              }}
            >
              {formattedDay}, {formattedDate} | {formattedTime}
            </div>
            <div className="notification-container">
              <div
                className="notification-icon"
                onClick={toggleNotifications}
                style={{ cursor: "pointer", position: "relative" }}
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
                style={{ cursor: "pointer" }}
              >
                <img
                  src={userProfile.avatar}
                  alt="User"
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
                          borderRadius: "12px",
                          padding: "2px 8px",
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
                  <div className="dropdown-item" onClick={handleLogout}>
                    <LogOut size={16} style={{ marginRight: "8px" }} /> Log Out
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>

      <div
        className="content-container"
        style={{
          padding: "10px 20px",
          maxWidth: "1400px",
          margin: "0 auto",
          width: "95%",
        }}
      >
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
            {!selectedExpense ? (
              <>
                <div
                  className="top"
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: "20px",
                  }}
                >
                  <h2 className="page-title">Expense History</h2>

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
                          width: "300px",
                        }}
                      />
                    </div>

                    {/* Updated Category Filter - Matching ExpenseTracking Layout */}
                    <div
                      className="filter-dropdown"
                      style={{ position: "relative", width: "150px" }}
                    >
                      <button
                        className={`filter-dropdown-btn ${
                          showCategoryDropdown ? "active" : ""
                        }`}
                        onClick={() =>
                          setShowCategoryDropdown(!showCategoryDropdown)
                        }
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
                          width: "100%",
                          justifyContent: "space-between",
                        }}
                      >
                        <span
                          style={{
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {getCategoryDisplay()}
                        </span>
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
                          <div
                            className={`category-dropdown-item ${
                              !selectedCategory ? "active" : ""
                            }`}
                            onClick={() => handleCategorySelect("")}
                            onMouseDown={(e) => e.preventDefault()}
                            style={{
                              padding: "8px 12px",
                              cursor: "pointer",
                              backgroundColor: !selectedCategory
                                ? "#f0f0f0"
                                : "white",
                              outline: "none",
                            }}
                          >
                            All Categories
                          </div>
                          <div
                            className={`category-dropdown-item ${
                              selectedCategory === "CAPEX" ? "active" : ""
                            }`}
                            onClick={() => handleCategorySelect("CAPEX")}
                            onMouseDown={(e) => e.preventDefault()}
                            style={{
                              padding: "8px 12px",
                              cursor: "pointer",
                              backgroundColor:
                                selectedCategory === "CAPEX"
                                  ? "#f0f0f0"
                                  : "white",
                              outline: "none",
                            }}
                          >
                            CapEx
                          </div>
                          <div
                            className={`category-dropdown-item ${
                              selectedCategory === "OPEX" ? "active" : ""
                            }`}
                            onClick={() => handleCategorySelect("OPEX")}
                            onMouseDown={(e) => e.preventDefault()}
                            style={{
                              padding: "8px 12px",
                              cursor: "pointer",
                              backgroundColor:
                                selectedCategory === "OPEX"
                                  ? "#f0f0f0"
                                  : "white",
                              outline: "none",
                            }}
                          >
                            OpEx
                          </div>
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
                <div
                  style={{
                    flex: 1,
                    overflow: "auto",
                    border: "1px solid #e0e0e0",
                    borderRadius: "4px",
                    position: "relative",
                  }}
                >
                  <table
                    className="ledger-table"
                    style={{
                      width: "100%",
                      borderCollapse: "collapse",
                      tableLayout: "fixed",
                      minWidth: "800px",
                    }}
                  >
                    <thead>
                      <tr
                        style={{
                          backgroundColor: "#f8f9fa",
                          position: "sticky",
                          top: 0,
                          zIndex: 10,
                        }}
                      >
                        <th
                          style={{
                            width: "12%",
                            padding: "0.75rem",
                            textAlign: "left",
                            borderBottom: "2px solid #dee2e6",
                            backgroundColor: "#f8f9fa",
                          }}
                        >
                          DATE
                        </th>
                        <th
                          style={{
                            width: "25%",
                            padding: "0.75rem",
                            textAlign: "left",
                            borderBottom: "2px solid #dee2e6",
                            backgroundColor: "#f8f9fa",
                          }}
                        >
                          DESCRIPTION
                        </th>
                        <th
                          style={{
                            width: "18%",
                            padding: "0.75rem",
                            textAlign: "left",
                            borderBottom: "2px solid #dee2e6",
                            backgroundColor: "#f8f9fa",
                          }}
                        >
                          DEPARTMENT
                        </th>
                        <th
                          style={{
                            width: "10%",
                            padding: "0.75rem",
                            textAlign: "left",
                            borderBottom: "2px solid #dee2e6",
                            backgroundColor: "#f8f9fa",
                          }}
                        >
                          CATEGORY
                        </th>
                        <th
                          style={{
                            width: "15%",
                            padding: "0.75rem",
                            textAlign: "left",
                            borderBottom: "2px solid #dee2e6",
                            backgroundColor: "#f8f9fa",
                          }}
                        >
                          SUB-CATEGORY
                        </th>
                        <th
                          style={{
                            width: "12%",
                            padding: "0.75rem",
                            textAlign: "right",
                            borderBottom: "2px solid #dee2e6",
                            backgroundColor: "#f8f9fa",
                          }}
                        >
                          AMOUNT
                        </th>
                        <th
                          style={{
                            width: "10%",
                            padding: "0.75rem",
                            textAlign: "center",
                            borderBottom: "2px solid #dee2e6",
                            backgroundColor: "#f8f9fa",
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
                            colSpan="7"
                            style={{ padding: "20px", textAlign: "center" }}
                          >
                            Loading...
                          </td>
                        </tr>
                      ) : expenses.length > 0 ? (
                        expenses.map((expense, index) => (
                          <tr
                            key={expense.id}
                            className={index % 2 === 1 ? "alternate-row" : ""}
                            style={{
                              backgroundColor:
                                index % 2 === 1 ? "#F8F8F8" : "#FFFFFF",
                              height: "50px",
                            }}
                          >
                            <td
                              style={{
                                padding: "0.75rem",
                                borderBottom: "1px solid #dee2e6",
                              }}
                            >
                              {expense.date}
                            </td>
                            <td
                              style={{
                                padding: "0.75rem",
                                borderBottom: "1px solid #dee2e6",
                              }}
                            >
                              {expense.description}
                            </td>
                            <td
                              style={{
                                padding: "0.75rem",
                                borderBottom: "1px solid #dee2e6",
                              }}
                            >
                              {expense.department_name || "N/A"}
                            </td>
                            <td
                              style={{
                                padding: "0.75rem",
                                borderBottom: "1px solid #dee2e6",
                              }}
                            >
                              {expense.category_name || "N/A"}
                            </td>
                            <td
                              style={{
                                padding: "0.75rem",
                                borderBottom: "1px solid #dee2e6",
                              }}
                            >
                              {expense.sub_category_name || "N/A"}
                            </td>
                            <td
                              style={{
                                padding: "0.75rem",
                                borderBottom: "1px solid #dee2e6",
                                textAlign: "right",
                              }}
                            >
                              ₱
                              {parseFloat(expense.amount).toLocaleString(
                                "en-US",
                                { minimumFractionDigits: 2 }
                              )}
                            </td>
                            <td
                              style={{
                                padding: "0.75rem",
                                borderBottom: "1px solid #dee2e6",
                                textAlign: "center",
                              }}
                            >
                              <button
                                onClick={() => handleViewExpense(expense)}
                                style={{
                                  padding: "5px 15px",
                                  backgroundColor: "#007bff",
                                  color: "white",
                                  border: "none",
                                  borderRadius: "4px",
                                  cursor: "pointer",
                                  outline: "none", // Removes default outline
                                }}
                                onMouseDown={(e) => {
                                  e.preventDefault(); // Prevents black circle on click
                                  e.stopPropagation();
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
                            colSpan="7"
                            style={{ padding: "20px", textAlign: "center" }}
                          >
                            No expenses found.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {pagination.count > 0 && (
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
              </>
            ) : (
              <div
                className="budget-proposal-view"
                style={{
                  display: "flex",
                  flexDirection: "column",
                  height: "100%",
                  overflow: "hidden",
                }}
              >
                {/* Top Bar with Back and Export Buttons */}
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: "20px",
                  }}
                >
                  <button
                    className="back-button"
                    onClick={handleBackToList}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "5px",
                      padding: "8px 12px",
                      backgroundColor: "#f8f9fa",
                      border: "1px solid #dee2e6",
                      borderRadius: "4px",
                      cursor: "pointer",
                      outline: "none", // Removes default outline
                      fontSize: "13px",
                    }}
                    onMouseDown={(e) => {
                      e.preventDefault(); // Prevents black circle on click
                      e.stopPropagation();
                    }}
                  >
                    <ArrowLeft size={14} /> <span>Back to Expenses</span>
                  </button>

                  {/* Updated Export Report Button - Blue with White Text, Icon on Right, No Hover Effect */}
                  <button
                    onClick={handleExportReport}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      padding: "6px 14px",
                      backgroundColor: "#007bff",
                      color: "white",
                      border: "none",
                      borderRadius: "4px",
                      cursor: "pointer",
                      fontWeight: "500",
                      fontSize: "13px",
                      outline: "none", // Removes default outline
                      flexDirection: "row-reverse", // Places icon on the right
                    }}
                    onMouseDown={(e) => {
                      e.preventDefault(); // Prevents black circle on click
                      e.stopPropagation();
                    }}
                  >
                    <Download size={14} />
                    <span>Export Report</span>
                  </button>
                </div>

                <div
                  style={{ flex: 1, overflow: "auto", paddingRight: "10px" }}
                >
                  {viewModalLoading ? (
                    <div>Loading details...</div>
                  ) : selectedProposalDetails ? (
                    <>
                      {/* Existing Proposal Details */}
                      <div
                        className="proposal-header"
                        style={{ marginBottom: "20px" }}
                      >
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "flex-start",
                            marginBottom: "10px",
                            flexWrap: "wrap",
                            gap: "10px",
                          }}
                        >
                          <div>
                            <h4
                              style={{
                                margin: "0 0 5px 0",
                                color: "#6c757d",
                                fontSize: "0.9rem",
                                textTransform: "uppercase",
                              }}
                            >
                              Linked Project Context
                            </h4>
                            <h3
                              className="proposal-title"
                              style={{
                                margin: "0 0 5px 0",
                                fontSize: "1.5rem",
                                fontWeight: "600",
                                color: "#333",
                              }}
                            >
                              {selectedProposalDetails.title}
                            </h3>
                          </div>
                          <div
                            className="proposal-date"
                            style={{
                              color: "#6c757d",
                              fontSize: "0.9rem",
                              whiteSpace: "nowrap",
                            }}
                          >
                            Performance End Date:{" "}
                            {selectedProposalDetails.performance_end_date}
                          </div>
                        </div>
                      </div>

                      {/* Transaction Details Section */}
                      <div
                        className="expense-summary-section"
                        style={{
                          backgroundColor: "#f8f9fa",
                          padding: "20px",
                          borderRadius: "8px",
                          marginBottom: "25px",
                          border: "1px solid #e9ecef",
                        }}
                      >
                        <h4
                          style={{
                            margin: "0 0 15px 0",
                            fontSize: "1.2rem",
                            color: "#333",
                            fontWeight: "600",
                          }}
                        >
                          Transaction Details
                        </h4>
                        <div
                          style={{
                            display: "grid",
                            gridTemplateColumns: "1fr 1fr",
                            gap: "15px",
                          }}
                        >
                          <div>
                            <strong style={{ color: "#6c757d" }}>Date:</strong>
                            <div style={{ marginTop: "4px", fontSize: "1rem" }}>
                              {selectedExpense.date}
                            </div>
                          </div>
                          <div>
                            <strong style={{ color: "#6c757d" }}>
                              Amount:
                            </strong>
                            <div style={{ marginTop: "4px" }}>
                              <span
                                style={{
                                  color: "#28a745",
                                  fontWeight: "bold",
                                  fontSize: "1.1rem",
                                }}
                              >
                                ₱
                                {parseFloat(
                                  selectedExpense.amount
                                ).toLocaleString("en-US", {
                                  minimumFractionDigits: 2,
                                })}
                              </span>
                            </div>
                          </div>
                          <div style={{ gridColumn: "1 / -1" }}>
                            <strong style={{ color: "#6c757d" }}>
                              Description:
                            </strong>
                            <div
                              style={{
                                marginTop: "4px",
                                fontSize: "1rem",
                                lineHeight: "1.4",
                              }}
                            >
                              {selectedExpense.description}
                            </div>
                          </div>
                          <div>
                            <strong style={{ color: "#6c757d" }}>
                              Vendor:
                            </strong>
                            <div style={{ marginTop: "4px", fontSize: "1rem" }}>
                              {selectedExpense.vendor || "N/A"}
                            </div>
                          </div>
                        </div>
                        {/* Attachments Display */}
                        {selectedExpense.attachments && selectedExpense.attachments.length > 0 && (
                          <div style={{ marginTop: "20px", paddingTop: "15px", borderTop: "1px solid #dee2e6" }}>
                            <strong style={{ color: "#6c757d", display: "block", marginBottom: "10px" }}>
                              Attachments ({selectedExpense.attachments.length}):
                            </strong>
                            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                              {selectedExpense.attachments.map((attachment, idx) => (
                                <a
                                  key={idx}
                                  href={attachment.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "8px",
                                    padding: "10px 12px",
                                    backgroundColor: "white",
                                    borderRadius: "4px",
                                    border: "1px solid #dee2e6",
                                    textDecoration: "none",
                                    color: "#007bff",
                                    fontSize: "14px",
                                    transition: "all 0.2s ease",
                                  }}
                                  onMouseEnter={(e) => {
                                    e.currentTarget.style.backgroundColor = "#f0f8ff";
                                    e.currentTarget.style.borderColor = "#007bff";
                                  }}
                                  onMouseLeave={(e) => {
                                    e.currentTarget.style.backgroundColor = "white";
                                    e.currentTarget.style.borderColor = "#dee2e6";
                                  }}
                                >
                                  <Download size={16} />
                                  <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                    {attachment.name}
                                  </span>
                                </a>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      <div
                        className="proposal-section"
                        style={{
                          marginBottom: "25px",
                          backgroundColor: "white",
                          padding: "20px",
                          borderRadius: "8px",
                          border: "1px solid #e9ecef",
                        }}
                      >
                        <h4
                          className="section-label"
                          style={{
                            margin: "0 0 15px 0",
                            fontSize: "1rem",
                            color: "#495057",
                            fontWeight: "600",
                            textTransform: "uppercase",
                            letterSpacing: "0.5px",
                          }}
                        >
                          Project Summary
                        </h4>
                        <p
                          className="section-content"
                          style={{
                            margin: "0",
                            lineHeight: "1.6",
                            color: "#333",
                          }}
                        >
                          {selectedProposalDetails.project_summary}
                        </p>
                      </div>

                      <div
                        className="proposal-section"
                        style={{
                          marginBottom: "25px",
                          backgroundColor: "white",
                          padding: "20px",
                          borderRadius: "8px",
                          border: "1px solid #e9ecef",
                        }}
                      >
                        <h4
                          className="section-label"
                          style={{
                            margin: "0 0 15px 0",
                            fontSize: "1rem",
                            color: "#495057",
                            fontWeight: "600",
                            textTransform: "uppercase",
                            letterSpacing: "0.5px",
                          }}
                        >
                          Project Description
                        </h4>
                        <p
                          className="section-content"
                          style={{
                            margin: "0",
                            lineHeight: "1.6",
                            color: "#333",
                          }}
                        >
                          {selectedProposalDetails.project_description}
                        </p>
                      </div>

                      <div
                        className="proposal-section"
                        style={{
                          backgroundColor: "white",
                          padding: "20px",
                          borderRadius: "8px",
                          border: "1px solid #e9ecef",
                        }}
                      >
                        <h4
                          className="section-label"
                          style={{
                            margin: "0 0 20px 0",
                            fontSize: "1rem",
                            color: "#495057",
                            fontWeight: "600",
                            textTransform: "uppercase",
                            letterSpacing: "0.5px",
                          }}
                        >
                          Cost Elements
                        </h4>
                        <div
                          className="cost-table"
                          style={{
                            border: "1px solid #dee2e6",
                            borderRadius: "6px",
                            overflow: "hidden",
                            boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
                          }}
                        >
                          <div
                            className="cost-header"
                            style={{
                              display: "flex",
                              backgroundColor: "#f8f9fa",
                              padding: "15px 20px",
                              fontWeight: "600",
                              borderBottom: "1px solid #dee2e6",
                              color: "#495057",
                              fontSize: "0.9rem",
                              textTransform: "uppercase",
                            }}
                          >
                            <div style={{ flex: "1" }}>Type</div>
                            <div style={{ flex: "2" }}>Description</div>
                            <div style={{ flex: "1", textAlign: "right" }}>
                              Estimated Cost
                            </div>
                          </div>
                          {selectedProposalDetails.items &&
                            selectedProposalDetails.items.map((item, idx) => (
                              <div
                                className="cost-row"
                                key={idx}
                                style={{
                                  display: "flex",
                                  padding: "15px 20px",
                                  borderBottom: "1px solid #e9ecef",
                                  backgroundColor:
                                    idx % 2 === 0 ? "#fff" : "#fcfcfc",
                                  alignItems: "center",
                                }}
                              >
                                <div
                                  style={{
                                    flex: "1",
                                    display: "flex",
                                    alignItems: "center",
                                  }}
                                >
                                  <span
                                    style={{
                                      width: "10px",
                                      height: "10px",
                                      backgroundColor: "#007bff",
                                      borderRadius: "50%",
                                      marginRight: "12px",
                                    }}
                                  ></span>
                                  <span style={{ fontWeight: "500" }}>
                                    {item.cost_element}
                                  </span>
                                </div>
                                <div style={{ flex: "2", color: "#666" }}>
                                  {item.description}
                                </div>
                                <div
                                  style={{
                                    flex: "1",
                                    textAlign: "right",
                                    fontWeight: "500",
                                    color: "#333",
                                  }}
                                >
                                  ₱
                                  {parseFloat(
                                    item.estimated_cost
                                  ).toLocaleString("en-US", {
                                    minimumFractionDigits: 2,
                                  })}
                                </div>
                              </div>
                            ))}
                          <div
                            className="cost-row total"
                            style={{
                              display: "flex",
                              padding: "20px",
                              backgroundColor: "#f8f9fa",
                              fontWeight: "600",
                              fontSize: "1.1rem",
                              borderTop: "2px solid #dee2e6",
                            }}
                          >
                            <div style={{ flex: "1" }}></div>
                            <div
                              style={{
                                flex: "2",
                                fontWeight: "bold",
                                color: "#495057",
                              }}
                            >
                              TOTAL
                            </div>
                            <div
                              style={{
                                flex: "1",
                                textAlign: "right",
                                fontWeight: "bold",
                                color: "#28a745",
                              }}
                            >
                              ₱
                              {parseFloat(
                                selectedProposalDetails.total_cost ||
                                  selectedProposalDetails.amount
                              ).toLocaleString("en-US", {
                                minimumFractionDigits: 2,
                              })}
                            </div>
                          </div>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div>
                      <h3>Expense Details</h3>
                      <p>
                        <strong>Description:</strong>{" "}
                        {selectedExpense.description}
                      </p>
                      <p>
                        <strong>Vendor:</strong>{" "}
                        {selectedExpense.vendor || "N/A"}
                      </p>
                      <p>
                        <strong>Amount:</strong> ₱
                        {parseFloat(selectedExpense.amount).toLocaleString(
                          "en-US",
                          { minimumFractionDigits: 2 }
                        )}
                      </p>
                      <p>
                        <strong>Date:</strong> {selectedExpense.date}
                      </p>
                      <p>
                        <strong>Department:</strong>{" "}
                        {selectedExpense.department_name || "N/A"}
                      </p>
                      <p>
                        <strong>Category:</strong>{" "}
                        {selectedExpense.category_name || "N/A"}
                      </p>
                      <p>
                        <strong>Sub-Category:</strong>{" "}
                        {selectedExpense.sub_category_name || "N/A"}
                      </p>
                      <p style={{ color: "#666", marginTop: "20px" }}>
                        <em>
                          This expense is not linked to a full project proposal
                          structure or details are unavailable.
                        </em>
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ExpenseHistory;
