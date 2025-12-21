import React, { useState, useEffect, useCallback } from "react";
import {
  Search,
  ChevronDown,
  User,
  LogOut,
  Bell,
  Settings,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import LOGOMAP from "../../assets/MAP.jpg";
import "./LedgerView.css";
import { useAuth } from "../../context/AuthContext";
import { getLedgerEntries } from "../../API/ledgerAPI";
// MODIFIED: Added department API import
import { getAllDepartments } from "../../API/departments";
import ManageProfile from "./ManageProfile";

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

const LedgerView = () => {
  // Navigation and UI State
  const [showBudgetDropdown, setShowBudgetDropdown] = useState(false);
  const [showExpenseDropdown, setShowExpenseDropdown] = useState(false);
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [showDepartmentDropdown, setShowDepartmentDropdown] = useState(false);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  // User profile data
  const getUserRole = () => {
    if (!user) return "User";
    if (user.roles?.bms) return user.roles.bms;
    if (user.role_display) return user.role_display;
    if (user.role) return user.role;
    if (user.is_superuser) return "ADMIN";
    if (user.is_staff) return "STAFF";
    return "User";
  };

  const userRole = getUserRole();
  const userProfile = {
    name: user
      ? `${user.first_name || ""} ${user.last_name || ""}`.trim() || "User"
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
      {/* Navigation Bar */}
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
          {/* Logo and System Name */}
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

          {/* Main Navigation Links */}
          <div
            className="navbar-links"
            style={{ display: "flex", gap: "20px" }}
          >
            <Link to="/dashboard" className="nav-link">
              Dashboard
            </Link>

            {/* Budget Dropdown */}
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

            {/* Expense Dropdown */}
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

          {/* User Controls */}
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

            {/* Notification Icon */}
            <div className="notification-container">
              <div
                className="notification-icon"
                onClick={toggleNotifications}
                onMouseDown={(e) => e.preventDefault()}
                style={{ position: "relative", cursor: "pointer" }}
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
              {showNotifications && (
                <div
                  className="notification-panel"
                  style={{
                    position: "absolute",
                    top: "100%",
                    right: 0,
                    backgroundColor: "white",
                    border: "1px solid #ccc",
                    borderRadius: "8px",
                    padding: "10px",
                    width: "300px",
                    zIndex: 1000,
                  }}
                >
                  {/* Notification content here */}
                </div>
              )}
            </div>

            {/* Profile Dropdown */}
            <div className="profile-container" style={{ position: "relative" }}>
              <div
                className="profile-trigger"
                onClick={toggleProfileDropdown}
                onMouseDown={(e) => e.preventDefault()}
                style={{
                  display: "flex",
                  alignItems: "center",
                  cursor: "pointer",
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
                    <div>
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
                      transition: "background-color 0.2s ease",
                      color: "#000", // Black text color
                    }}
                    onMouseDown={(e) => e.preventDefault()}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = "#f0f0f0"; // Light gray hover
                      e.currentTarget.style.color = "#000"; // Keep black text on hover
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = "transparent";
                      e.currentTarget.style.color = "#000"; // Keep black text
                    }}
                  >
                    <User size={16} style={{ marginRight: "8px" }} />
                    Manage Profile
                  </div>
                  {userProfile.role === "ADMIN" && (
                    <div
                      className="dropdown-item"
                      style={{
                        display: "flex",
                        alignItems: "center",
                        padding: "8px 0",
                        cursor: "pointer",
                        transition: "background-color 0.2s ease",
                        color: "#000",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = "#f0f0f0";
                        e.currentTarget.style.color = "#000";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = "transparent";
                        e.currentTarget.style.color = "#000";
                      }}
                    >
                      <Settings size={16} style={{ marginRight: "8px" }} /> User
                      Management
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
                      transition: "background-color 0.2s ease",
                      color: "#000",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = "#f0f0f0";
                      e.currentTarget.style.color = "#000";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = "transparent";
                      e.currentTarget.style.color = "#000";
                    }}
                  >
                    <LogOut size={16} style={{ marginRight: "8px" }} /> Log Out
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div
        className="content-container"
        style={{ padding: "20px", maxWidth: "1200px", margin: "0 auto" }}
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
              <h2 className="page-title">Ledger View</h2>
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

                {/* Department Filter Button - Added before Category */}
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

                {/* Category Filter Button - Updated to only CapEx and OpEx */}
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
                        width: "15%",
                        padding: "0.75rem",
                        textAlign: "left",
                        borderBottom: "2px solid #dee2e6",
                        fontWeight: "600",
                      }}
                    >
                      TICKET ID
                    </th>
                    <th
                      style={{
                        width: "11%",
                        padding: "0.75rem",
                        textAlign: "left",
                        borderBottom: "2px solid #dee2e6",
                        fontWeight: "600",
                      }}
                    >
                      DATE
                    </th>
                    <th
                      style={{
                        width: "18%",
                        padding: "0.75rem",
                        textAlign: "left",
                        borderBottom: "2px solid #dee2e6",
                        fontWeight: "600",
                      }}
                    >
                      DEPARTMENT
                    </th>
                    <th
                      style={{
                        width: "12%",
                        padding: "0.75rem",
                        textAlign: "left",
                        borderBottom: "2px solid #dee2e6",
                        fontWeight: "600",
                      }}
                    >
                      CATEGORY
                    </th>
                    <th
                      style={{
                        width: "21%",
                        padding: "0.75rem",
                        textAlign: "left",
                        borderBottom: "2px solid #dee2e6",
                        fontWeight: "600",
                      }}
                    >
                      SUB-CATEGORY
                    </th>
                    <th
                      style={{
                        width: "17%",
                        padding: "0.75rem",
                        textAlign: "left",
                        borderBottom: "2px solid #dee2e6",
                        fontWeight: "600",
                      }}
                    >
                      ACCOUNT
                    </th>
                    <th
                      style={{
                        width: "12%",
                        padding: "0.75rem",
                        textAlign: "left",
                        borderBottom: "2px solid #dee2e6",
                        fontWeight: "600",
                      }}
                    >
                      AMOUNT
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
                            padding: "0.75rem",
                            borderBottom: "1px solid #dee2e6",
                            fontSize: "14px",
                            fontWeight: "400",
                            color: "#000000", // Changed to black
                          }}
                        >
                          {entry.reference_id}
                        </td>
                        <td
                          style={{
                            padding: "0.75rem",
                            borderBottom: "1px solid #dee2e6",
                            fontSize: "14px",
                            color: "#000000", // Changed to black
                          }}
                        >
                          {entry.date} {/* Now shows YYYY-MM-DD format */}
                        </td>
                        <td
                          style={{
                            padding: "0.75rem",
                            borderBottom: "1px solid #dee2e6",
                            fontSize: "14px",
                            color: "#000000", // Changed to black
                          }}
                        >
                          {entry.department}
                        </td>
                        <td
                          style={{
                            padding: "0.75rem",
                            borderBottom: "1px solid #dee2e6",
                            fontSize: "14px",
                            fontWeight: "400",
                            color: "#000000", // Changed to black
                            textAlign: "left",
                          }}
                        >
                          {entry.category} {/* Now only shows CapEx or OpEx */}
                        </td>
                        <td
                          style={{
                            padding: "0.75rem",
                            borderBottom: "1px solid #dee2e6",
                            fontSize: "14px",
                            color: "#000000", // Changed to black
                          }}
                        >
                          {/* Ensure this matches serializer field name */}
                          {entry.sub_category || "General"}
                        </td>
                        <td
                          style={{
                            padding: "0.75rem",
                            borderBottom: "1px solid #dee2e6",
                            fontSize: "14px",
                            color: "#000000", // Changed to black
                          }}
                        >
                          {entry.account}
                        </td>
                        <td
                          style={{
                            padding: "0.75rem",
                            borderBottom: "1px solid #dee2e6",
                            fontSize: "14px",
                            fontWeight: "400",
                            color: "#000000", // Changed to black
                          }}
                        >
                          {formatAmount(entry.amount)}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan="7"
                        className="no-results"
                        style={{ padding: "20px", textAlign: "center" }}
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
    </div>
  );
};

export default LedgerView;
