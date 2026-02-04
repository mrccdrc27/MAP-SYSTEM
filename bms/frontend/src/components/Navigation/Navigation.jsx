import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { ChevronDown, Bell, User, LogOut, Building2 } from "lucide-react";
import LOGOMAP from "../../assets/MAP.jpg";
import { formatRoleForDisplay } from "../../utils/roleFormatter";
import {
  getDepartmentInfo,
  getShortDepartmentName,
} from "../../utils/departmentUtils";
import "./Navigation.css";

const Navigation = ({
  userProfile,
  currentDate,
  onLogout,
  onManageProfile,
  activeView = "dashboard",
  onViewChange,
  isFinanceManager = false,
  notifications = [],
  onClearNotifications = null,
}) => {
  const navigate = useNavigate();
  const location = useLocation();

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

  // --- VIEW SWITCHING HANDLERS ---
  const handleFiscalYearClick = () => {
    navigate("/finance/dashboard", { state: { view: "fiscal-year" } });
    closeAllDropdowns();
  };

  const handleDashboardClick = () => {
    navigate("/finance/dashboard", { state: { view: "dashboard" } });
    closeAllDropdowns();
  };

  // --- ACTIVE STATE LOGIC ---
  const isDashboardActive =
    location.pathname === "/finance/dashboard" && activeView === "dashboard";
  const isFiscalYearActive =
    location.pathname === "/finance/dashboard" && activeView === "fiscal-year";

  const isBudgetDropdownActive = [
    "/finance/budget-proposal",
    "/finance/proposal-history",
    "/finance/ledger-view",
    "/finance/budget-allocation",
    "/finance/budget-variance-report",
  ].some((path) => location.pathname === path);

  const isExpenseDropdownActive = [
    "/finance/expense-tracking",
    "/finance/expense-history",
  ].some((path) => location.pathname === path);

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

  // ✅ Format role and department for display
  const formattedRole = formatRoleForDisplay(userProfile.role);
  const departmentInfo = getDepartmentInfo(userProfile);

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
          <button
            onClick={handleDashboardClick}
            className={`nav-link ${isDashboardActive ? "active" : ""}`}
          >
            Dashboard
          </button>

          {isFinanceManager && (
            <button
              onClick={handleFiscalYearClick}
              className={`nav-link ${isFiscalYearActive ? "active" : ""}`}
            >
              FY Management
            </button>
          )}

          {/* Budget Dropdown */}
          <div className="nav-dropdown">
            <div
              className={`nav-link ${showBudgetDropdown || isBudgetDropdownActive ? "active" : ""}`}
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
              className={`nav-link ${showExpenseDropdown || isExpenseDropdownActive ? "active" : ""}`}
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
              {notifications.length > 0 && (
                <span className="notification-badge">
                  {notifications.length}
                </span>
              )}
            </div>

            {showNotifications && (
              <div className="notification-panel">
                <div className="notification-header">
                  <h3>Notifications</h3>
                  <button
                    className="clear-all-btn"
                    onClick={(e) => {
                      e.preventDefault();
                      if (onClearNotifications) onClearNotifications();
                    }}
                  >
                    Clear All
                  </button>
                </div>
                <div className="notification-list">
                  {notifications.length === 0 ? (
                    <div className="notification-empty">
                      No new notifications
                    </div>
                  ) : (
                    notifications.map((n) => (
                      <div className="notification-item" key={n.id}>
                        <div className="notification-icon-wrapper">
                          <Bell size={16} />
                        </div>
                        <div className="notification-content">
                          <div className="notification-title">{n.title}</div>
                          <div className="notification-message">
                            {n.message}
                          </div>
                          <div className="notification-time">{n.time}</div>
                        </div>
                        <button
                          className="notification-delete"
                          onMouseDown={(e) => e.preventDefault()}
                        >
                          &times;
                        </button>
                      </div>
                    ))
                  )}
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
                    <div className="profile-role-badge">{formattedRole}</div>
                    {departmentInfo && (
                      <div className="profile-department-badge">
                        <Building2 size={12} />
                        <span>{departmentInfo.shortName}</span>
                      </div>
                    )}
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
