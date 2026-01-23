import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom"; // Added useLocation
import { ChevronDown, Bell, User, LogOut } from "lucide-react";
import LOGOMAP from "../../assets/MAP.jpg";
import "./Navigation.css";

const Navigation = ({
  userProfile,
  currentDate,
  onLogout,
  onManageProfile,
  activeView = "dashboard",
  onViewChange,
  isFinanceManager = false,
}) => {
  const navigate = useNavigate();
  const location = useLocation(); // Get current route

  // Dropdown states
  const [showBudgetDropdown, setShowBudgetDropdown] = useState(false);
  const [showExpenseDropdown, setShowExpenseDropdown] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);

  const closeAllDropdowns = () => {
    setShowBudgetDropdown(false);
    setShowExpenseDropdown(false);
    setShowNotifications(false);
    setShowProfileDropdown(false);
  };

  const handleNavigate = (path) => {
    navigate(path);
    closeAllDropdowns();
  };

  const toggleDropdown = (setter, currentState) => {
    closeAllDropdowns();
    setter(!currentState);
  };

  // --- NEW HANDLERS FOR VIEW SWITCHING ---
  const handleFiscalYearClick = () => {
    // Check if we are already on the dashboard route
    if (location.pathname.includes("/finance/dashboard")) {
      // If already on dashboard, just switch the view using the prop callback
      onViewChange?.("fiscal-year");
    } else {
      // If on another page, navigate to dashboard with state
      navigate("/finance/dashboard", { state: { view: "fiscal-year" } });
    }
  };

  const handleDashboardClick = () => {
    if (location.pathname.includes("/finance/dashboard")) {
      onViewChange?.("dashboard");
    } else {
      navigate("/finance/dashboard", { state: { view: "dashboard" } });
    }
  };

  // Date formatting
  const formattedTime = currentDate.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "numeric",
    hour12: true,
  });

  const formattedDay = currentDate.toLocaleDateString("en-US", {
    weekday: "long",
  });

  const formattedDate = currentDate.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <nav className="navbar">
      <div className="navbar-content">
        {/* Logo and System Name */}
        <div className="navbar-brand">
          <div className="navbar-logo-wrapper">
            <img src={LOGOMAP} alt="System Logo" className="navbar-logo" />
          </div>
          <span className="system-name">BudgetPro</span>
        </div>

        {/* Main Navigation Links */}
        <div className="navbar-links">
          {/* Dashboard Toggle */}
          <button
            onClick={handleDashboardClick}
            className={`nav-link ${activeView === "dashboard" ? "active" : ""}`}
          >
            Dashboard
          </button>

          {/* Only Finance Head sees this tab */}
          {isFinanceManager && (
            <button
              onClick={handleFiscalYearClick}
              className={`nav-link ${activeView === "fiscal-year" ? "active" : ""}`}
            >
              FY Management
            </button>
          )}

          {/* Budget Dropdown */}
          <div className="nav-dropdown">
            <div
              className={`nav-link ${showBudgetDropdown ? "active" : ""}`}
              onClick={() =>
                toggleDropdown(setShowBudgetDropdown, showBudgetDropdown)
              }
              onMouseDown={(e) => e.preventDefault()}
            >
              Budget{" "}
              <ChevronDown
                size={14}
                className={`dropdown-arrow ${showBudgetDropdown ? "rotated" : ""}`}
              />
            </div>
            {showBudgetDropdown && (
              <div className="dropdown-menu">
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
              onClick={() =>
                toggleDropdown(setShowExpenseDropdown, showExpenseDropdown)
              }
              onMouseDown={(e) => e.preventDefault()}
            >
              Expense{" "}
              <ChevronDown
                size={14}
                className={`dropdown-arrow ${showExpenseDropdown ? "rotated" : ""}`}
              />
            </div>
            {showExpenseDropdown && (
              <div className="dropdown-menu">
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
        <div className="navbar-controls">
          <div className="date-time-badge">
            {formattedDay}, {formattedDate} | {formattedTime}
          </div>

          {/* Notifications */}
          <div className="notification-container">
            <div
              className="notification-icon"
              onClick={() =>
                toggleDropdown(setShowNotifications, showNotifications)
              }
              onMouseDown={(e) => e.preventDefault()}
            >
              <Bell size={20} />
              <span className="notification-badge">3</span>
            </div>

            {showNotifications && (
              <div className="notification-panel">
                <div className="notification-header">
                  <h3>Notifications</h3>
                  <button
                    className="clear-all-btn"
                    onMouseDown={(e) => e.preventDefault()}
                  >
                    Clear All
                  </button>
                </div>
                <div className="notification-list">
                  <div className="notification-item">
                    <div className="notification-icon-wrapper">
                      <Bell size={16} />
                    </div>
                    <div className="notification-content">
                      <div className="notification-title">Budget Approved</div>
                      <div className="notification-message">
                        Your Q3 budget has been approved
                      </div>
                      <div className="notification-time">2 hours ago</div>
                    </div>
                    <button
                      className="notification-delete"
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
          <div className="profile-container">
            <div
              className="profile-trigger"
              onClick={() =>
                toggleDropdown(setShowProfileDropdown, showProfileDropdown)
              }
              onMouseDown={(e) => e.preventDefault()}
            >
              <img
                src={userProfile.avatar}
                alt="User avatar"
                className="profile-image"
              />
            </div>

            {showProfileDropdown && (
              <div className="profile-dropdown">
                <div className="profile-info-section">
                  <img
                    src={userProfile.avatar}
                    alt="Profile"
                    className="profile-dropdown-image"
                  />
                  <div className="profile-details">
                    <div className="profile-name">{userProfile.name}</div>
                    <div className="profile-role-badge">{userProfile.role}</div>
                  </div>
                </div>
                <div className="dropdown-divider"></div>
                <div
                  className="dropdown-item"
                  onClick={onManageProfile}
                  onMouseDown={(e) => e.preventDefault()}
                >
                  <User size={16} />
                  <span>Manage Profile</span>
                </div>
                <div className="dropdown-divider"></div>
                <div
                  className="dropdown-item"
                  onClick={onLogout}
                  onMouseDown={(e) => e.preventDefault()}
                >
                  <LogOut size={16} />
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

export default Navigation;
