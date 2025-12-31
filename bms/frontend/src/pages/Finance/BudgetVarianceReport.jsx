/* 
LOGIC EXPLANATION (verify this if correct):
1. Variance Calculation: ((Actual - Budget) / Budget) * 100.
   - Negative % (Green) = Under Budget (Good).
   - Positive % (Red) = Over Budget (Bad).
2. Visual Indicators:
   - Green Down Arrow: Spending is below limit.
   - Red Up Arrow: Spending exceeds limit.
   - Orange: Zero budget or nearing limit (<5% remaining).
3. "0 Items": Only leaf nodes (sub-categories) show item counts. Parent categories aggregate values.
*/

import React, { useState, useEffect } from "react";
import {
  ChevronDown,
  Download,
  User,
  LogOut,
  Bell,
  Settings,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Minus,
  CheckCircle,
  XCircle,
  AlertCircle,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import LOGOMAP from "../../assets/MAP.jpg";
import "./BudgetVarianceReport.css";
import { useAuth } from "../../context/AuthContext";
import {
  getBudgetVarianceReport,
  exportBudgetVarianceReport,
} from "../../API/reportAPI";
import { getFiscalYears } from "../../API/dropdownAPI";
import ManageProfile from "./ManageProfile";

// --- HELPER FUNCTIONS ---

const calculateVariancePercentage = (budget, actual) => {
  if (!budget || budget === 0) return 0;
  // Variance % usually means "How much of the budget have we used?"
  // If we used 10% (Green), 90% (Yellow), 110% (Red).
  // Current formula: ((Actual - Budget) / Budget) * 100
  // Example: (500 - 1000) / 1000 = -0.5 (-50%) -> This implies 50% under budget.
  // Example: (1500 - 1000) / 1000 = 0.5 (50%) -> This implies 50% OVER budget.
  return ((actual - budget) / budget) * 100;
};

const getVarianceColor = (percentage, available) => {
  // If Available is negative, we have overspent -> RED
  if (available < 0) return "#dc2626";

  // If Variance % is positive, it means Actual > Budget -> RED
  if (percentage > 0) return "#dc2626";

  // If we are getting close (e.g., -5% variance, meaning we used 95% of budget) -> YELLOW
  if (percentage > -10 && percentage <= 0) return "#f59e0b";

  // Otherwise, we are well under budget -> GREEN
  return "#10b981";
};

const getStatusIcon = (percentage, available) => {
  if (available < 0 || percentage > 0)
    return <XCircle size={16} color="#dc2626" />;
  if (percentage > -10) return <AlertCircle size={16} color="#f59e0b" />;
  return <CheckCircle size={16} color="#10b981" />;
};

const getTrendArrow = (percentage) => {
  // Positive variance means we exceeded budget -> Up Arrow (Red usually in cost context)
  if (percentage > 0) return <TrendingUp size={16} color="#dc2626" />;
  // Negative variance means we saved money -> Down Arrow (Green)
  if (percentage < 0) return <TrendingDown size={16} color="#10b981" />;
  return <Minus size={16} color="#6b7280" />;
};

// --- COMPONENT: ReportRow ---
const ReportRow = ({ item, level }) => {
  const variancePercentage = calculateVariancePercentage(
    item.budget,
    item.actual
  );

  // Determine row style based on hierarchy level
  const isRoot = level === 0;
  const isDept = level === 1;
  const isItem = level >= 2;

  const availableColor = getVarianceColor(variancePercentage, item.available); // Use helper
  const StatusIcon = getStatusIcon(variancePercentage, item.available);
  const TrendArrow = getTrendArrow(variancePercentage);

  const indentStyle = {
    paddingLeft: `${12 + level * 20}px`,
    fontWeight: isRoot ? "800" : isDept ? "600" : "400",
    backgroundColor: isRoot ? "#e6f2ff" : isDept ? "#f9fafb" : "transparent",
    borderLeft: isRoot ? "4px solid #007bff" : "none",
  };

  const formatCurrency = (value) => {
    return `₱${parseFloat(value).toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  return (
    <tr
      className={`level-${level}-row`}
      style={isRoot ? { borderTop: "2px solid #dee2e6" } : {}}
    >
      <td style={indentStyle}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          {isRoot && (
            <div
              style={{
                width: "4px",
                height: "16px",
                backgroundColor: "#007bff",
                borderRadius: "2px",
              }}
            ></div>
          )}
          <span
            style={{ fontSize: isItem ? "0.9rem" : "1rem", color: "#374151" }}
          >
            {item.category.toUpperCase()}
          </span>
          {/* MODIFICATION: Only show item count if children exist and length > 0 */}
          {!isItem && item.children && item.children.length > 0 && (
            <span style={{ fontSize: "11px", color: "#6b7280" }}>
              ({item.children.length} items)
            </span>
          )}
        </div>
      </td>
      <td>
        <div
          style={{ fontWeight: isRoot ? "700" : "400", fontSize: "0.95rem" }}
        >
          {formatCurrency(item.budget)}
        </div>
      </td>
      <td>
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <span
            style={{ fontWeight: isRoot ? "700" : "400", fontSize: "0.95rem" }}
          >
            {formatCurrency(item.actual)}
          </span>
          {/* Variance Indicator */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              fontSize: "11px",
              color: availableColor, // Use calculated color
            }}
          >
            {TrendArrow}
            {Math.abs(variancePercentage).toFixed(1)}%
          </div>
        </div>
      </td>
      <td>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          {StatusIcon}
          <span
            style={{
              color: availableColor,
              fontWeight: "700",
              fontSize: "0.95rem",
            }}
          >
            {formatCurrency(item.available)}
          </span>
        </div>
      </td>
    </tr>
  );
};

// --- MAIN PAGE COMPONENT ---
const BudgetVarianceReport = () => {
  // Navigation
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  // State
  const [showBudgetDropdown, setShowBudgetDropdown] = useState(false);
  const [showExpenseDropdown, setShowExpenseDropdown] = useState(false);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showManageProfile, setShowManageProfile] = useState(false);

  const [reportData, setReportData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fiscalYears, setFiscalYears] = useState([]);

  // Filters
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1); // Default to current
  const [selectedYearId, setSelectedYearId] = useState("");
  const [currentDate, setCurrentDate] = useState(new Date());

  const [reportSummary, setReportSummary] = useState({
    totalBudget: 0,
    totalActual: 0,
    totalAvailable: 0,
  });

  const months = [
    { value: "", label: "All Year" },
    { value: 1, label: "January" },
    { value: 2, label: "February" },
    { value: 3, label: "March" },
    { value: 4, label: "April" },
    { value: 5, label: "May" },
    { value: 6, label: "June" },
    { value: 7, label: "July" },
    { value: 8, label: "August" },
    { value: 9, label: "September" },
    { value: 10, label: "October" },
    { value: 11, label: "November" },
    { value: 12, label: "December" },
  ];

  // User Profile Data
  const userRole = user?.roles?.bms || user?.role || "User";
  const userProfile = {
    name: user
      ? `${user.first_name} ${user.last_name}`.trim() || "User"
      : "User",
    role: userRole,
    avatar:
      user?.profile_picture ||
      "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80",
  };

  // --- API LOGIC ---

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const res = await getFiscalYears();
        setFiscalYears(res.data);
        const activeYear = res.data.find((fy) => fy.is_active);
        if (activeYear) {
          setSelectedYearId(activeYear.id);
        } else if (res.data.length > 0) {
          setSelectedYearId(res.data[0].id);
        }
      } catch (error) {
        console.error("Failed to fetch fiscal years:", error);
      }
    };
    fetchInitialData();
  }, []);

  useEffect(() => {
    if (!selectedYearId) return;

    const fetchReport = async () => {
      setLoading(true);
      try {
        const params = {
          fiscal_year_id: selectedYearId,
          month: selectedMonth || null,
        };
        const res = await getBudgetVarianceReport(params);
        setReportData(res.data);

        // Calculate Totals for Footer
        const totals = res.data.reduce(
          (acc, curr) => {
            acc.totalBudget += parseFloat(curr.budget);
            acc.totalActual += parseFloat(curr.actual);
            acc.totalAvailable += parseFloat(curr.available);
            return acc;
          },
          { totalBudget: 0, totalActual: 0, totalAvailable: 0 }
        );
        setReportSummary(totals);
      } catch (error) {
        console.error("Failed to fetch report:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchReport();
  }, [selectedYearId, selectedMonth]);

  // Clock
  useEffect(() => {
    const interval = setInterval(() => setCurrentDate(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  // --- HANDLERS ---
  const handleExport = async () => {
    if (!selectedYearId) return;
    try {
      const params = {
        fiscal_year_id: selectedYearId,
        month: selectedMonth || null,
      };
      const response = await exportBudgetVarianceReport(params);
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `Budget_Variance_Report.xlsx`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error("Export failed:", error);
    }
  };

  // Dropdown Logic
  const closeAllDropdowns = () => {
    setShowBudgetDropdown(false);
    setShowExpenseDropdown(false);
    setShowProfileDropdown(false);
    setShowNotifications(false);
  };
  // (Toggle functions condensed for brevity - same logic as before)
  const toggleBudgetDropdown = () => {
    closeAllDropdowns();
    setShowBudgetDropdown(!showBudgetDropdown);
  };
  const toggleExpenseDropdown = () => {
    closeAllDropdowns();
    setShowExpenseDropdown(!showExpenseDropdown);
  };
  const toggleProfileDropdown = () => {
    closeAllDropdowns();
    setShowProfileDropdown(!showProfileDropdown);
  };
  const toggleNotifications = () => {
    closeAllDropdowns();
    setShowNotifications(!showNotifications);
  };

  const handleNavigate = (path) => {
    navigate(path);
    closeAllDropdowns();
  };
  const handleLogout = async () => await logout();
  const handleManageProfile = () => {
    setShowManageProfile(true);
    setShowProfileDropdown(false);
  };
  const handleCloseManageProfile = () => setShowManageProfile(false);

  // Recursive Render
  const renderReportRows = (nodes, level = 0) => {
    return nodes.flatMap((node) => [
      <ReportRow key={node.code || Math.random()} item={node} level={level} />,
      ...(node.children && node.children.length > 0
        ? renderReportRows(node.children, level + 1)
        : []),
    ]);
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

  // FIX: Define formatCurrency here so it's accessible in the footer
  const formatCurrency = (value) => {
    return `₱${parseFloat(value).toLocaleString("en-US", {
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
                color: "#007bff",
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
            {/* Timestamp/Date */}
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

            {/* Notification Icon */}
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
                  <div
                    className="notification-header"
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: "10px",
                    }}
                  >
                    <h3>Notifications</h3>
                    <button
                      className="clear-all-btn"
                      onMouseDown={(e) => e.preventDefault()}
                      style={{ outline: "none" }}
                    >
                      Clear All
                    </button>
                  </div>
                  <div className="notification-list">
                    <div
                      className="notification-item"
                      style={{
                        display: "flex",
                        padding: "8px 0",
                        borderBottom: "1px solid #eee",
                      }}
                    >
                      <div
                        className="notification-icon-wrapper"
                        style={{ marginRight: "10px" }}
                      >
                        <Bell size={16} />
                      </div>
                      <div className="notification-content" style={{ flex: 1 }}>
                        <div
                          className="notification-title"
                          style={{ fontWeight: "bold" }}
                        >
                          Budget Approved
                        </div>
                        <div className="notification-message">
                          Your Q3 budget has been approved
                        </div>
                        <div
                          className="notification-time"
                          style={{ fontSize: "12px", color: "#666" }}
                        >
                          2 hours ago
                        </div>
                      </div>
                      <button
                        className="notification-delete"
                        style={{
                          background: "none",
                          border: "none",
                          cursor: "pointer",
                          outline: "none",
                        }}
                        onMouseDown={(e) => e.preventDefault()}
                      >
                        &times;
                      </button>
                    </div>
                    <div
                      className="notification-item"
                      style={{
                        display: "flex",
                        padding: "8px 0",
                        borderBottom: "1px solid #eee",
                      }}
                    >
                      <div
                        className="notification-icon-wrapper"
                        style={{ marginRight: "10px" }}
                      >
                        <Bell size={16} />
                      </div>
                      <div className="notification-content" style={{ flex: 1 }}>
                        <div
                          className="notification-title"
                          style={{ fontWeight: "bold" }}
                        >
                          Expense Report
                        </div>
                        <div className="notification-message">
                          New expense report needs review
                        </div>
                        <div
                          className="notification-time"
                          style={{ fontSize: "12px", color: "#666" }}
                        >
                          5 hours ago
                        </div>
                      </div>
                      <button
                        className="notification-delete"
                        style={{
                          background: "none",
                          border: "none",
                          cursor: "pointer",
                          outline: "none",
                        }}
                        onMouseDown={(e) => e.preventDefault()}
                      >
                        &times;
                      </button>
                    </div>
                  </div>
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
                  {userProfile.role === "Admin" && (
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

      {/* Main Content */}
      <div
        className="content-container"
        style={{ padding: "10px 20px", maxWidth: "1400px", margin: "0 auto", width: "95%" }}
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
              <h2 className="page-title">Budget Variance Report</h2>
              <div
                className="controls-container"
                style={{ display: "flex", gap: "15px", alignItems: "center" }}
              >
                <div
                  className="date-selection"
                  style={{ display: "flex", gap: "10px", alignItems: "center" }}
                >
                  <select
                    className="month-select"
                    value={selectedMonth}
                    onChange={(e) =>
                      setSelectedMonth(
                        e.target.value === "" ? "" : parseInt(e.target.value)
                      )
                    }
                    style={{
                      padding: "8px 12px",
                      border: "1px solid #ccc",
                      borderRadius: "4px",
                    }}
                  >
                    {months.map((month) => (
                      <option key={month.value} value={month.value}>
                        {month.label}
                      </option>
                    ))}
                  </select>
                  <select
                    className="year-select"
                    value={selectedYearId}
                    onChange={(e) =>
                      setSelectedYearId(parseInt(e.target.value))
                    }
                    style={{
                      padding: "8px 12px",
                      border: "1px solid #ccc",
                      borderRadius: "4px",
                    }}
                  >
                    <option value="">Select Year</option>
                    {fiscalYears.map((year) => (
                      <option key={year.id} value={year.id}>
                        {year.name}
                      </option>
                    ))}
                  </select>
                </div>
                {/* Export Report button */}
                <button
                  className="export-button"
                  onClick={handleExport}
                  disabled={loading}
                  style={{
                    padding: "8px 16px",
                    border: "none",
                    borderRadius: "4px",
                    backgroundColor: "#007bff",
                    color: "#ffffff",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    cursor: "pointer",
                    outline: "none",
                  }}
                  onMouseDown={(e) => e.preventDefault()}
                  onFocus={(e) => e.target.blur()}
                >
                  <span style={{ color: "#ffffff" }}>Export Report</span>
                  <Download size={16} color="#ffffff" />
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

            {/* Report Table Container */}
            <div
              style={{
                flex: 1,
                overflow: "auto",
                border: "1px solid #e0e0e0",
                borderRadius: "4px",
              }}
            >
              <table
                className="report-table"
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
                      zIndex: 10,
                    }}
                  >
                    <th
                      style={{
                        width: "40%",
                        padding: "0.75rem",
                        textAlign: "left",
                        borderBottom: "2px solid #dee2e6",
                      }}
                    >
                      CATEGORY
                    </th>
                    <th
                      style={{
                        width: "20%",
                        padding: "0.75rem",
                        textAlign: "left",
                        borderBottom: "2px solid #dee2e6",
                      }}
                    >
                      BUDGET
                    </th>
                    <th
                      style={{
                        width: "20%",
                        padding: "0.75rem",
                        textAlign: "left",
                        borderBottom: "2px solid #dee2e6",
                      }}
                    >
                      ACTUAL (VARIANCE)
                    </th>
                    <th
                      style={{
                        width: "20%",
                        padding: "0.75rem",
                        textAlign: "left",
                        borderBottom: "2px solid #dee2e6",
                      }}
                    >
                      AVAILABLE (STATUS)
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td
                        colSpan="4"
                        style={{ textAlign: "center", padding: "20px" }}
                      >
                        Loading report...
                      </td>
                    </tr>
                  ) : reportData.length > 0 ? (
                    <>
                      {renderReportRows(reportData)}
                      {/* Grand Total Row */}
                      {reportData.length > 0 && (
                        <tr
                          style={{
                            backgroundColor: "#007bff",
                            color: "white",
                            fontWeight: "700",
                          }}
                        >
                          <td style={{ padding: "0.75rem", textAlign: "left" }}>
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "8px",
                              }}
                            >
                              <TrendingUp size={16} color="#ffffff" />
                              OVERALL TOTAL
                            </div>
                          </td>
                          <td style={{ padding: "0.75rem", textAlign: "left" }}>
                            {formatCurrency(reportSummary.totalBudget)}
                          </td>
                          <td style={{ padding: "0.75rem", textAlign: "left" }}>
                            {formatCurrency(reportSummary.totalActual)}
                          </td>
                          <td style={{ padding: "0.75rem", textAlign: "left" }}>
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "8px",
                              }}
                            >
                              {reportSummary.totalAvailable >= 0 ? (
                                <CheckCircle size={16} color="#ffffff" />
                              ) : (
                                <XCircle size={16} color="#ffffff" />
                              )}
                              {formatCurrency(reportSummary.totalAvailable)}
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  ) : (
                    <tr>
                      <td
                        colSpan="4"
                        style={{ textAlign: "center", padding: "20px" }}
                      >
                        No data available for the selected period.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BudgetVarianceReport;
