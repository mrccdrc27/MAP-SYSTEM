// QUestion: Are dates in the modal read-only, should it be today?

import React, { useState, useEffect } from "react";
import {
  Search,
  ChevronDown,
  Plus,
  User,
  LogOut,
  Bell,
  Settings,
  X,
  Paperclip,
  CheckCircle, // Added icon
  AlertCircle, // Added icon
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import LOGOMAP from "../../assets/MAP.jpg";
import "./ExpenseTracking.css";
import { useAuth } from "../../context/AuthContext";
import {
  getExpenseSummary,
  getExpenseTrackingList,
  getExpenseCategories,
  createExpense,
  getValidProjectAccounts,
  reviewExpense,
  markExpenseAsAccomplished,
} from "../../API/expenseAPI";
import { getAllDepartments } from "../../API/departments";
import ManageProfile from "./ManageProfile";

// --- INSERT: Alert Modal Component ---
const AlertModal = ({ isOpen, onClose, message, type = "info" }) => {
  if (!isOpen) return null;

  const isError = type === "error";
  const iconColor = isError ? "#dc3545" : "#28a745";
  const Icon = isError ? AlertCircle : CheckCircle;

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 4000, // Topmost layer
      }}
    >
      <div
        style={{
          backgroundColor: "white",
          borderRadius: "8px",
          width: "400px",
          maxWidth: "90%",
          padding: "24px",
          boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
          textAlign: "center",
          animation: "fadeIn 0.2s ease-out",
        }}
      >
        <div
          style={{
            marginBottom: "16px",
            display: "flex",
            justifyContent: "center",
          }}
        >
          <Icon size={48} color={iconColor} />
        </div>

        <h3
          style={{ margin: "0 0 10px 0", color: "#333", fontSize: "1.25rem" }}
        >
          {isError ? "Error" : "Success"}
        </h3>

        <p
          style={{
            margin: "0 0 24px 0",
            color: "#666",
            fontSize: "1rem",
            lineHeight: "1.5",
          }}
        >
          {message}
        </p>

        <button
          onClick={onClose}
          style={{
            padding: "10px 24px",
            backgroundColor: isError ? "#dc3545" : "#007bff",
            color: "white",
            border: "none",
            borderRadius: "4px",
            fontSize: "14px",
            fontWeight: "500",
            cursor: "pointer",
            outline: "none",
            minWidth: "100px",
          }}
        >
          OK
        </button>
      </div>
      <style>
        {`@keyframes fadeIn { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }`}
      </style>
    </div>
  );
};

// --- INSERT 1: Soft Cap Modal Component ---
const SoftCapModal = ({ isOpen, onClose, onSubmit, capInfo }) => {
  const [justification, setJustification] = useState("");

  if (!isOpen) return null;

  const handleSubmit = () => {
    if (!justification.trim() || justification.length < 10) {
      alert("Please provide a justification (minimum 10 characters).");
      return;
    }
    onSubmit(justification);
  };

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 3000, // Higher than Add Expense Modal
      }}
    >
      <div
        style={{
          backgroundColor: "#fff",
          padding: "24px",
          borderRadius: "8px",
          width: "500px",
          maxWidth: "90%",
          boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            marginBottom: "16px",
            gap: "10px",
          }}
        >
          <div style={{ color: "#f59e0b" }}>
            <Bell size={24} />
          </div>
          <h3 style={{ margin: 0, color: "#333", fontSize: "1.25rem" }}>
            Budget Soft Cap Exceeded
          </h3>
        </div>

        <div
          style={{
            backgroundColor: "#fff3cd",
            border: "1px solid #ffeeba",
            color: "#856404",
            padding: "12px",
            borderRadius: "4px",
            marginBottom: "16px",
            fontSize: "0.9rem",
          }}
        >
          {capInfo?.detail ||
            "This expense exceeds the designated soft cap for this category."}
        </div>

        {capInfo?.cap_info && (
          <div
            style={{ marginBottom: "16px", fontSize: "0.9rem", color: "#555" }}
          >
            <p style={{ margin: "4px 0" }}>
              <strong>Remaining:</strong> ₱
              {capInfo.cap_info.remaining?.toLocaleString()}
            </p>
            <p style={{ margin: "4px 0" }}>
              <strong>Requested:</strong> ₱
              {capInfo.cap_info.requested?.toLocaleString()}
            </p>
          </div>
        )}

        <label
          style={{ display: "block", marginBottom: "8px", fontWeight: "500" }}
        >
          Justification Required <span style={{ color: "red" }}>*</span>
        </label>
        <textarea
          value={justification}
          onChange={(e) => setJustification(e.target.value)}
          placeholder="Explain why this expense is necessary despite exceeding the budget guidance..."
          style={{
            width: "100%",
            minHeight: "100px",
            padding: "10px",
            border: "1px solid #ccc",
            borderRadius: "4px",
            marginBottom: "20px",
            fontSize: "14px",
            fontFamily: "inherit",
          }}
        />

        <div
          style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}
        >
          <button
            onClick={onClose}
            style={{
              padding: "8px 16px",
              border: "1px solid #ccc",
              borderRadius: "4px",
              backgroundColor: "white",
              cursor: "pointer",
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            style={{
              padding: "8px 16px",
              border: "none",
              borderRadius: "4px",
              backgroundColor: "#f59e0b", // Warning color
              color: "white",
              fontWeight: "500",
              cursor: "pointer",
            }}
          >
            Proceed with Exception
          </button>
        </div>
      </div>
    </div>
  );
};

const SearchableSelect = ({
  options,
  value,
  onChange,
  placeholder,
  disabled,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const wrapperRef = React.useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Find selected item label
  const selectedItem = options.find((opt) => opt.value === value);

  const filteredOptions = options.filter((opt) =>
    opt.label.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div ref={wrapperRef} style={{ position: "relative", width: "100%" }}>
      <div
        onClick={() => !disabled && setIsOpen(!isOpen)}
        style={{
          padding: "8px 12px",
          border: "1px solid #ccc",
          borderRadius: "4px",
          backgroundColor: disabled ? "#f5f5f5" : "white",
          cursor: disabled ? "not-allowed" : "pointer",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          minHeight: "38px", // Match input height
        }}
      >
        <span
          style={{
            color: selectedItem ? "#000" : "#666",
            fontSize: "14px",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {selectedItem ? selectedItem.label : placeholder}
        </span>
        <ChevronDown size={16} color="#666" />
      </div>

      {isOpen && !disabled && (
        <div
          style={{
            position: "absolute",
            top: "100%",
            left: 0,
            right: 0,
            zIndex: 2000,
            backgroundColor: "white",
            border: "1px solid #ccc",
            borderRadius: "4px",
            marginTop: "4px",
            boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
            maxHeight: "200px",
            overflowY: "auto",
          }}
        >
          <div
            style={{
              padding: "8px",
              position: "sticky",
              top: 0,
              background: "white",
            }}
          >
            <input
              type="text"
              placeholder="Type to filter..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              autoFocus
              style={{
                width: "100%",
                padding: "6px",
                border: "1px solid #ddd",
                borderRadius: "4px",
                fontSize: "13px",
                outline: "none",
              }}
            />
          </div>
          {filteredOptions.length > 0 ? (
            filteredOptions.map((opt) => (
              <div
                key={opt.value}
                onClick={() => {
                  onChange(opt.value);
                  setIsOpen(false);
                  setSearchTerm("");
                }}
                style={{
                  padding: "8px 12px",
                  cursor: "pointer",
                  fontSize: "14px",
                  borderBottom: "1px solid #f0f0f0",
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.backgroundColor = "#f0f8ff")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.backgroundColor = "white")
                }
              >
                {opt.label}
              </div>
            ))
          ) : (
            <div
              style={{ padding: "8px 12px", color: "#999", fontSize: "14px" }}
            >
              No results found
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// --- STATUS COMPONENT ---
const Status = ({ type, name }) => {
  const statusType = type ? type.toLowerCase() : "draft";
  return (
    <div className={`status-${statusType.split(" ").join("-")}`}>
      <div className="circle"></div>
      {name}
    </div>
  );
};


// --- PAGINATION COMPONENT (From Original) ---
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
          <span key="start-ellipsis" className="ellipsis">
            ...
          </span>
        );
      }

      if (currentPage + sideButtons > totalPages - 1) {
        startPage = totalPages - pageLimit;
      }
      if (currentPage - sideButtons < 2) {
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
          <span key="end-ellipsis" className="ellipsis">
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

const ExpenseTracking = () => {
  const { user, logout, getBmsRole } = useAuth();
  const navigate = useNavigate();

  // --- STATE ---
  const [showBudgetDropdown, setShowBudgetDropdown] = useState(false);
  const [showExpenseDropdown, setShowExpenseDropdown] = useState(false);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [showDepartmentDropdown, setShowDepartmentDropdown] = useState(false);

  const [showManageProfile, setShowManageProfile] = useState(false);
  const [showAddExpenseModal, setShowAddExpenseModal] = useState(false);

  // --- INSERT 2: New State for Soft Cap Logic ---
  const [showSoftCapModal, setShowSoftCapModal] = useState(false);
  const [softCapInfo, setSoftCapInfo] = useState(null);

  // --- INSERT: New Alert State ---
  const [alertState, setAlertState] = useState({
    isOpen: false,
    message: "",
    type: "info", // 'success' or 'error'
  });

  const showAlert = (message, type = "error") => {
    setAlertState({ isOpen: true, message, type });
  };

  const closeAlert = () => {
    setAlertState((prev) => ({ ...prev, isOpen: false }));
  };

  const [showReviewModal, setShowReviewModal] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState(null);
  const [reviewAction, setReviewAction] = useState(""); // "APPROVED" or "REJECTED"
  const [reviewNotes, setReviewNotes] = useState("");

  const [loading, setLoading] = useState(true);
  const [expenses, setExpenses] = useState([]);
  const [summaryData, setSummaryData] = useState({
    budget_remaining: "0.00",
    total_expenses_this_month: "0.00",
  });

  // Data Options
  const [categories, setCategories] = useState([]); // For modal (Sub-categories)
  const [departments, setDepartments] = useState([]); // All Departments
  const [projects, setProjects] = useState([]); // For modal

  // Filters
  const [selectedCategory, setSelectedCategory] = useState(""); // CAPEX/OPEX filter
  const [selectedDepartment, setSelectedDepartment] = useState(""); // Department ID filter
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);
  const [totalItems, setTotalItems] = useState(0);

  const handleOpenReview = (expense, action) => {
    setSelectedExpense(expense);
    setReviewAction(action);
    setReviewNotes("");
    setShowReviewModal(true);
  };

  const submitReview = async () => {
    if (!selectedExpense) return;
    try {
      await reviewExpense(selectedExpense.id, {
        status: reviewAction,
        notes: reviewNotes,
      });
      setShowReviewModal(false);
      setSelectedExpense(null);
      setReviewAction("");
      setReviewNotes("");

      // Refresh list
      const params = {
        page: currentPage,
        page_size: pageSize,
        search: debouncedSearchTerm,
      };
      const res = await getExpenseTrackingList(params);
      setExpenses(res.data.results);
    } catch (error) {
      showAlert("Failed to review expense: " + error.message, "error"); // UPDATED
    }
  };

  const handleMarkAccomplished = async (expense) => {
    if (!window.confirm("Mark this expense as accomplished?")) return;
    try {
      await markExpenseAsAccomplished(expense.id);
      // Refresh list logic
      const params = {
        page: currentPage,
        page_size: pageSize,
        search: debouncedSearchTerm,
      };
      const res = await getExpenseTrackingList(params);
      setExpenses(res.data.results);
    } catch (error) {
      showAlert("Failed to mark as accomplished: " + error.message, "error"); // UPDATED
    }
  };

  // Modal State
  const initialExpenseState = {
    project_id: "",
    category_code: "",
    vendor: "",
    amount: "",
    date: new Date().toISOString().split("T")[0],
    description: "",
    attachments: [],
  };
  const [newExpense, setNewExpense] = useState(initialExpenseState);
  const [currentDate, setCurrentDate] = useState(new Date());
  const fileInputRef = React.useRef(null);

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

  // Format date and time
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

  // --- EFFECTS ---

  // Initial Load
  useEffect(() => {
    const fetchDropdownData = async () => {
      try {
        const [summaryRes, departmentsRes, projectsRes] = await Promise.all([
          getExpenseSummary(),
          getAllDepartments(),
          getValidProjectAccounts(), // CHANGED: Fetch valid accounts instead of raw projects
        ]);
        setSummaryData(summaryRes.data);
        setDepartments(departmentsRes.data);
        setProjects(projectsRes.data); // Store the valid project data
      } catch (error) {
        console.error("Failed to fetch initial data:", error);
      }
    };
    fetchDropdownData();
  }, []);

  // Debounce Search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
      setCurrentPage(1);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Fetch Expenses
  useEffect(() => {
    const fetchExpenses = async () => {
      setLoading(true);
      try {
        const params = {
          page: currentPage,
          page_size: pageSize,
          search: debouncedSearchTerm,
        };

        if (selectedDepartment) params.department = selectedDepartment;
        if (selectedCategory)
          params.category__classification = selectedCategory;

        const res = await getExpenseTrackingList(params);
        setExpenses(res.data.results);
        setTotalItems(res.data.count);
      } catch (error) {
        console.error("Failed to fetch expenses:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchExpenses();
  }, [
    currentPage,
    pageSize,
    debouncedSearchTerm,
    selectedDepartment,
    selectedCategory,
  ]);

  // Clock
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
        !event.target.closest(".notification-container") &&
        !event.target.closest(".filter-dropdown")
      ) {
        setShowBudgetDropdown(false);
        setShowExpenseDropdown(false);
        setShowProfileDropdown(false);
        setShowNotifications(false);
        setShowCategoryDropdown(false);
        setShowDepartmentDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // --- HANDLERS ---

  const toggleBudgetDropdown = () => {
    setShowBudgetDropdown(!showBudgetDropdown);
    if (showExpenseDropdown) setShowExpenseDropdown(false);
    if (showProfileDropdown) setShowProfileDropdown(false);
    if (showNotifications) setShowNotifications(false);
  };

  const toggleExpenseDropdown = () => {
    setShowExpenseDropdown(!showExpenseDropdown);
    if (showBudgetDropdown) setShowBudgetDropdown(false);
    if (showProfileDropdown) setShowProfileDropdown(false);
    if (showNotifications) setShowNotifications(false);
  };

  const toggleProfileDropdown = () => {
    setShowProfileDropdown(!showProfileDropdown);
    if (showBudgetDropdown) setShowBudgetDropdown(false);
    if (showExpenseDropdown) setShowExpenseDropdown(false);
    if (showNotifications) setShowNotifications(false);
  };

  const toggleNotifications = () => {
    setShowNotifications(!showNotifications);
    if (showBudgetDropdown) setShowBudgetDropdown(false);
    if (showExpenseDropdown) setShowExpenseDropdown(false);
    if (showProfileDropdown) setShowProfileDropdown(false);
  };

  const handleCategorySelect = (category) => {
    setSelectedCategory(category);
    setCurrentPage(1);
    setShowCategoryDropdown(false);
  };

  const handleDepartmentSelect = (deptId) => {
    setSelectedDepartment(deptId);
    setCurrentPage(1);
    setShowDepartmentDropdown(false);
  };

  const handleNavigate = (path) => {
    navigate(path);
    setShowBudgetDropdown(false);
    setShowExpenseDropdown(false);
    setShowProfileDropdown(false);
    setShowNotifications(false);
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

  const fetchProjectCategories = async (projectId) => {
    try {
      const res = await getExpenseCategories(projectId); // Pass ID to filter on backend
      setCategories(res.data);
    } catch (err) {
      console.error("Error fetching categories", err);
      setCategories([]);
    }
  };

  const handleProjectChange = (projectId) => {
    // UPDATED: Now accepts the value directly from SearchableSelect
    setNewExpense((prev) => ({
      ...prev,
      project_id: projectId,
      category_code: "",
    }));
    if (projectId) {
      fetchProjectCategories(projectId);
    } else {
      setCategories([]);
    }
  };

  // --- UPDATED: Handle Input Change with Decimal Validation ---
  const handleModalInputChange = (e) => {
    const { name, value } = e.target;

    // Date Validation to prevent overflow
    if (name === "date") {
      if (value.length > 10) return;
    }

    // Amount Validation: Allow only numbers and up to 2 decimal places
    if (name === "amount") {
      // Regex: Optional digits, optional decimal point, max 2 digits after decimal
      const regex = /^\d*\.?\d{0,2}$/;
      if (value !== "" && !regex.test(value)) {
        return; // Ignore invalid input
      }
    }

    setNewExpense((prev) => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    const allowedTypes = ["image/jpeg", "image/png", "application/pdf"];

    const validFiles = files.filter((file) => allowedTypes.includes(file.type));
    if (validFiles.length !== files.length) {
      showAlert("Only JPG, PNG, and PDF files are allowed.", "error"); // UPDATED
    }

    setNewExpense((prev) => ({ ...prev, attachments: validFiles }));
  };

  const handleClearFiles = () => {
  setNewExpense((prev) => ({ ...prev, attachments: [] }));
  if (fileInputRef.current) {
    fileInputRef.current.value = "";
  }
};

  // --- UPDATED: Handle Submit with Custom Alert ---
  const handleSubmitExpense = async (e) => {
    e.preventDefault();

    if (parseFloat(newExpense.amount) < 0) {
      showAlert("Amount cannot be negative.", "error"); // UPDATED
      return;
    }
    const formData = new FormData();

    formData.append("project_id", newExpense.project_id);
    formData.append("category_code", newExpense.category_code);
    formData.append("vendor", newExpense.vendor);
    formData.append("amount", newExpense.amount);
    formData.append("date", newExpense.date);
    formData.append("description", newExpense.description || "");

    newExpense.attachments.forEach((file) => {
      formData.append("attachments", file);
    });

    try {
      await createExpense(formData);

      // Success flow
      setShowAddExpenseModal(false);
      setNewExpense(initialExpenseState);
      setCategories([]);
      handleClearFiles();

      // Refresh data
      const summaryRes = await getExpenseSummary();
      setSummaryData(summaryRes.data);
      const params = {
        page: currentPage,
        page_size: pageSize,
        search: debouncedSearchTerm,
      };
      if (selectedDepartment) params.department = selectedDepartment;
      if (selectedCategory) params.category__classification = selectedCategory;
      const expensesRes = await getExpenseTrackingList(params);
      setExpenses(expensesRes.data.results);
      setTotalItems(expensesRes.data.count);

      showAlert("Expense submitted successfully!", "success"); // UPDATED
    } catch (error) {
      console.error("Failed to submit expense:", error);

      // Soft Cap Check
      if (error.response?.data?.error === "BUDGET_SOFT_CAP_EXCEEDED") {
        setSoftCapInfo(error.response.data);
        setShowSoftCapModal(true);
        return;
      }

      const errorMsg =
        error.response?.data?.amount ||
        error.response?.data?.non_field_errors?.[0] ||
        error.response?.data?.detail ||
        "An unexpected error occurred.";

      showAlert(`Error: ${errorMsg}`, "error"); // UPDATED
    }
  };

  // --- UPDATED: Handle Soft Cap Submit with Custom Alert ---
  const handleSoftCapSubmit = async (justification) => {
    const formData = new FormData();

    formData.append("project_id", newExpense.project_id);
    formData.append("category_code", newExpense.category_code);
    formData.append("vendor", newExpense.vendor);
    formData.append("amount", newExpense.amount);
    formData.append("date", newExpense.date);
    formData.append("description", newExpense.description || "");
    formData.append("notes", justification);

    newExpense.attachments.forEach((file) => {
      formData.append("attachments", file);
    });

    try {
      await createExpense(formData);

      setShowSoftCapModal(false);
      setShowAddExpenseModal(false);
      setSoftCapInfo(null);
      setNewExpense(initialExpenseState);
      setCategories([]);
      handleClearFiles();

      // Refresh data logic...
      const summaryRes = await getExpenseSummary();
      setSummaryData(summaryRes.data);
      const params = {
        page: currentPage,
        page_size: pageSize,
        search: debouncedSearchTerm,
      };
      if (selectedDepartment) params.department = selectedDepartment;
      if (selectedCategory) params.category__classification = selectedCategory;
      const expensesRes = await getExpenseTrackingList(params);
      setExpenses(expensesRes.data.results);
      setTotalItems(expensesRes.data.count);

      showAlert("Expense submitted with exception justification.", "success"); // UPDATED
    } catch (error) {
      console.error("Failed to submit soft cap exception:", error);
      const errorMsg =
        error.response?.data?.detail || "Failed to submit exception.";
      showAlert(`Error: ${errorMsg}`, "error"); // UPDATED
    }
  };

  const getDepartmentDisplay = () => {
    if (!selectedDepartment) return "All Departments";
    const dept = departments.find((d) => d.id === parseInt(selectedDepartment));
    return dept ? dept.name : "All Departments";
  };

  // Helper to format options for the SearchableSelect
  const projectOptions = projects.map((p) => ({
    value: p.project_id,
    label: p.project_title,
  }));

  // Find selected project for department display
  const selectedProject = projects.find(
    (p) => p.project_id === parseInt(newExpense.project_id)
  );

  const getCategoryDisplay = () => {
    if (!selectedCategory) return "All Categories";
    return selectedCategory === "CAPEX" ? "CapEx" : "OpEx";
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
            <div
              className="notification-container"
              style={{ position: "relative" }}
            >
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
                    <h3 style={{ margin: 0, fontSize: "16px" }}>
                      Notifications
                    </h3>
                    <button
                      className="clear-all-btn"
                      onMouseDown={(e) => e.preventDefault()}
                      style={{
                        background: "none",
                        border: "none",
                        color: "#007bff",
                        cursor: "pointer",
                        outline: "none",
                      }}
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
                          color: "#666",
                        }}
                        onMouseDown={(e) => e.preventDefault()}
                      >
                        &times;
                      </button>
                    </div>
                    <div
                      className="notification-item"
                      style={{ display: "flex", padding: "8px 0" }}
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
                          color: "#666",
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
          <>
            {/* Budget Summary Cards */}
            <div
              className="budget-summary"
              style={{
                display: "flex",
                gap: "1rem",
                justifyContent: "space-between",
                marginBottom: "20px",
              }}
            >
              <div
                className="budget-card"
                style={{
                  flex: "1",
                  minWidth: "200px",
                  maxWidth: "400px",
                  height: "100px",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "center",
                  alignItems: "center",
                  padding: "15px",
                  boxSizing: "border-box",
                  backgroundColor: "white",
                  borderRadius: "8px",
                  boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
                }}
              >
                <div
                  className="budget-card-label"
                  style={{ marginBottom: "10px" }}
                >
                  <p style={{ margin: 0, fontSize: "14px", color: "#666" }}>
                    Budget Remaining
                  </p>
                </div>
                <div
                  className="budget-card-amount"
                  style={{ fontSize: "24px", fontWeight: "bold" }}
                >
                  ₱
                  {parseFloat(summaryData.budget_remaining).toLocaleString(
                    "en-US",
                    {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    }
                  )}
                </div>
              </div>

              <div
                className="budget-card"
                style={{
                  flex: "1",
                  minWidth: "200px",
                  maxWidth: "400px",
                  height: "100px",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "center",
                  alignItems: "center",
                  padding: "15px",
                  boxSizing: "border-box",
                  backgroundColor: "white",
                  borderRadius: "8px",
                  boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
                }}
              >
                <div
                  className="budget-card-label"
                  style={{ marginBottom: "10px" }}
                >
                  <p style={{ margin: 0, fontSize: "14px", color: "#666" }}>
                    Total Expenses This Month
                  </p>
                </div>
                <div
                  className="budget-card-amount"
                  style={{ fontSize: "24px", fontWeight: "bold" }}
                >
                  ₱
                  {parseFloat(
                    summaryData.total_expenses_this_month
                  ).toLocaleString("en-US", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </div>
              </div>
            </div>

            {/* Main Content */}
            <div
              className="expense-tracking"
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
                    fontSize: "29px",
                    fontWeight: "bold",
                    color: "#0C0C0C",
                  }}
                >
                  Expense Tracking
                </h2>

                <div
                  className="controls-container"
                  style={{
                    display: "flex",
                    gap: "10px",
                    alignItems: "center",
                    flexWrap: "nowrap",
                  }}
                >
                  {/* Search Bar */}
                  <div style={{ position: "relative", width: "180px" }}>
                    <input
                      type="text"
                      placeholder="Search"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="search-account-input"
                      style={{
                        width: "90%",
                        padding: "8px 12px",
                        border: "1px solid #ccc",
                        borderRadius: "4px",
                        outline: "none",
                        fontSize: "14px",
                      }}
                    />
                  </div>

                  {/* Department Filter */}
                  <div
                    className="filter-dropdown"
                    style={{ position: "relative", width: "180px" }}
                  >
                    <button
                      className={`filter-dropdown-btn ${
                        showDepartmentDropdown ? "active" : ""
                      }`}
                      onClick={() =>
                        setShowDepartmentDropdown(!showDepartmentDropdown)
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
                        minWidth: "160px",
                        width: "100%",
                      }}
                    >
                      <span
                        style={{
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {getDepartmentDisplay()}
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
                          maxHeight: "300px",
                          overflowY: "auto",
                        }}
                      >
                        <div
                          className={`category-dropdown-item ${
                            !selectedDepartment ? "active" : ""
                          }`}
                          onClick={() => handleDepartmentSelect("")}
                          onMouseDown={(e) => e.preventDefault()}
                          style={{
                            padding: "8px 12px",
                            cursor: "pointer",
                            backgroundColor: !selectedDepartment
                              ? "#f0f0f0"
                              : "white",
                            outline: "none",
                          }}
                        >
                          All Departments
                        </div>
                        {departments.map((dept) => (
                          <div
                            key={dept.id}
                            className={`category-dropdown-item ${
                              selectedDepartment === dept.id.toString()
                                ? "active"
                                : ""
                            }`}
                            onClick={() => handleDepartmentSelect(dept.id)}
                            onMouseDown={(e) => e.preventDefault()}
                            style={{
                              padding: "8px 12px",
                              cursor: "pointer",
                              backgroundColor:
                                selectedDepartment === dept.id.toString()
                                  ? "#f0f0f0"
                                  : "white",
                              outline: "none",
                            }}
                          >
                            {dept.name}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Category Filter */}
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
                              selectedCategory === "OPEX" ? "#f0f0f0" : "white",
                            outline: "none",
                          }}
                        >
                          OpEx
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Add Expense Button */}
                  <button
                    className="add-journal-button"
                    onClick={() => setShowAddExpenseModal(true)}
                    style={{
                      padding: "8px 16px",
                      border: "1px solid #ccc",
                      borderRadius: "4px",
                      backgroundColor: "#007bff",
                      color: "white",
                      cursor: "pointer",
                      outline: "none",
                      fontSize: "14px",
                      whiteSpace: "nowrap",
                    }}
                  >
                    Add Expense
                  </button>
                </div>
              </div>

              {/* Separator line */}
              <div
                style={{
                  height: "1px",
                  backgroundColor: "#e0e0e0",
                  marginBottom: "20px",
                }}
              ></div>

              {/* Expenses Table */}
              <div
                style={{
                  border: "1px solid #e0e0e0",
                  borderRadius: "4px",
                  height: "424px",
                  overflowY: "auto",
                  overflowX: "auto", // Changed from "hidden" to handle extra column
                }}
              >
                <table
                  className="ledger-table"
                  style={{
                    width: "100%",
                    borderCollapse: "collapse",
                    minWidth: "1100px", // Ensure minimum width for all columns
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
                          width: "10%",
                          padding: "0.75rem",
                          textAlign: "left",
                          borderBottom: "2px solid #dee2e6",
                          height: "50px",
                          verticalAlign: "middle",
                          fontSize: "14px",
                          fontWeight: "600",
                          color: "#333",
                        }}
                      >
                        TICKET ID
                      </th>
                      <th
                        style={{
                          width: "10%",
                          padding: "0.75rem",
                          textAlign: "left",
                          borderBottom: "2px solid #dee2e6",
                          height: "50px",
                          verticalAlign: "middle",
                          fontSize: "14px",
                          fontWeight: "600",
                          color: "#333",
                        }}
                      >
                        DATE
                      </th>
                      <th
                        style={{
                          width: "12%",
                          padding: "0.75rem",
                          textAlign: "left",
                          borderBottom: "2px solid #dee2e6",
                          height: "50px",
                          verticalAlign: "middle",
                          fontSize: "14px",
                          fontWeight: "600",
                          color: "#333",
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
                          height: "50px",
                          verticalAlign: "middle",
                          fontSize: "14px",
                          fontWeight: "600",
                          color: "#333",
                        }}
                      >
                        CATEGORY
                      </th>
                      <th
                        style={{
                          width: "12%",
                          padding: "0.75rem",
                          textAlign: "left",
                          borderBottom: "2px solid #dee2e6",
                          height: "50px",
                          verticalAlign: "middle",
                          fontSize: "14px",
                          fontWeight: "600",
                          color: "#333",
                        }}
                      >
                        SUB-CATEGORY
                      </th>
                      <th
                        style={{
                          width: "9%",
                          padding: "0.75rem",
                          textAlign: "left",
                          borderBottom: "2px solid #dee2e6",
                          height: "50px",
                          verticalAlign: "middle",
                          fontSize: "14px",
                          fontWeight: "600",
                          color: "#333",
                        }}
                      >
                        AMOUNT
                      </th>
                      <th
                        style={{
                          width: "12%",
                          padding: "0.75rem",
                          textAlign: "left",
                          borderBottom: "2px solid #dee2e6",
                          height: "50px",
                          verticalAlign: "middle",
                          fontSize: "14px",
                          fontWeight: "600",
                          color: "#333",
                        }}
                      >
                        STATUS
                      </th>
                      <th
                        style={{
                          width: "12%",
                          padding: "0.75rem",
                          textAlign: "left",
                          borderBottom: "2px solid #dee2e6",
                          height: "50px",
                          verticalAlign: "middle",
                          fontSize: "14px",
                          fontWeight: "600",
                          color: "#333",
                        }}
                      >
                        ACCOMPLISHED
                      </th>
                      {/* NEW: Only show for Finance Head/Admin */}
                      {isFinanceManager && (
                        <th
                          style={{
                            width: "12%",
                            padding: "0.75rem",
                            textAlign: "center",
                            borderBottom: "2px solid #dee2e6",
                            height: "50px",
                            verticalAlign: "middle",
                            fontWeight: "600",
                            fontSize: "14px",
                            color: "#333",
                          }}
                        >
                          ACTIONS
                        </th>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr>
                        <td
                          colSpan="8"
                          style={{
                            padding: "20px",
                            textAlign: "center",
                            height: "50px",
                            verticalAlign: "middle",
                            fontSize: "14px",
                          }}
                        >
                          Loading...
                        </td>
                      </tr>
                    ) : expenses.length === 0 ? (
                      <tr>
                        <td
                          colSpan="8"
                          style={{
                            padding: "20px",
                            textAlign: "center",
                            height: "50px",
                            verticalAlign: "middle",
                            fontSize: "14px",
                          }}
                        >
                          {searchTerm || selectedDepartment || selectedCategory
                            ? "No expenses match your search criteria."
                            : "No expenses found."}
                        </td>
                      </tr>
                    ) : (
                      expenses.map((expense, index) => (
                        <tr
                          key={expense.id}
                          className={index % 2 === 1 ? "alternate-row" : ""}
                          style={{
                            backgroundColor:
                              index % 2 === 1 ? "#F8F8F8" : "#FFFFFF",
                            color: "#0C0C0C",
                            height: "50px",
                            transition: "background-color 0.2s ease",
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = "#fcfcfc";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor =
                              index % 2 === 1 ? "#F8F8F8" : "#FFFFFF";
                          }}
                        >
                          <td
                            style={{
                              padding: "0.75rem",
                              borderBottom: "1px solid #dee2e6",
                              verticalAlign: "middle",
                              wordWrap: "break-word",
                              overflowWrap: "break-word",
                              whiteSpace: "normal",
                              fontSize: "13px",
                            }}
                          >
                            <div
                              style={{
                                maxWidth: "100%",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                              }}
                            >
                              {expense.reference_no}
                            </div>
                          </td>
                          <td
                            style={{
                              padding: "0.75rem",
                              borderBottom: "1px solid #dee2e6",
                              verticalAlign: "middle",
                              wordWrap: "break-word",
                              overflowWrap: "break-word",
                              whiteSpace: "normal",
                              fontSize: "13px",
                            }}
                          >
                            <div
                              style={{
                                maxWidth: "100%",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                              }}
                            >
                              {expense.date}
                            </div>
                          </td>
                          <td
                            style={{
                              padding: "0.75rem",
                              borderBottom: "1px solid #dee2e6",
                              verticalAlign: "middle",
                              wordWrap: "break-word",
                              overflowWrap: "break-word",
                              whiteSpace: "normal",
                              fontSize: "13px",
                            }}
                          >
                            <div
                              style={{
                                maxWidth: "100%",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                              }}
                            >
                              {expense.department_name}
                            </div>
                          </td>
                          <td
                            style={{
                              padding: "0.75rem",
                              borderBottom: "1px solid #dee2e6",
                              verticalAlign: "middle",
                              wordWrap: "break-word",
                              overflowWrap: "break-word",
                              whiteSpace: "normal",
                              fontSize: "13px",
                            }}
                          >
                            <div
                              style={{
                                maxWidth: "100%",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                              }}
                            >
                              {expense.category_name || "-"}
                            </div>
                          </td>
                          <td
                            style={{
                              padding: "0.75rem",
                              borderBottom: "1px solid #dee2e6",
                              verticalAlign: "middle",
                              wordWrap: "break-word",
                              overflowWrap: "break-word",
                              whiteSpace: "normal",
                              fontSize: "13px",
                            }}
                          >
                            <div
                              style={{
                                maxWidth: "100%",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                              }}
                            >
                              {expense.sub_category_name}
                            </div>
                          </td>
                          <td
                            style={{
                              padding: "0.75rem",
                              borderBottom: "1px solid #dee2e6",
                              verticalAlign: "middle",
                              wordWrap: "break-word",
                              overflowWrap: "break-word",
                              whiteSpace: "normal",
                              fontSize: "13px",
                              // fontWeight: "bold",
                            }}
                          >
                            <div
                              style={{
                                maxWidth: "100%",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                              }}
                            >
                              ₱
                              {parseFloat(expense.amount).toLocaleString(
                                "en-US",
                                {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2,
                                }
                              )}
                            </div>
                          </td>
                          <td
                            style={{
                              padding: "0.75rem",
                              borderBottom: "1px solid #dee2e6",
                              verticalAlign: "middle",
                              wordWrap: "break-word",
                              overflowWrap: "break-word",
                              whiteSpace: "normal",
                              fontSize: "13px",
                            }}
                          >
                            <div
                              style={{
                                maxWidth: "100%",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                              }}
                            >
                              <Status
                                type={expense.status}
                                name={expense.status}
                              />
                            </div>
                          </td>
                          <td
                            style={{
                              padding: "0.75rem",
                              borderBottom: "1px solid #dee2e6",
                              verticalAlign: "middle",
                              wordWrap: "break-word",
                              overflowWrap: "break-word",
                              whiteSpace: "normal",
                              fontSize: "13px",
                              color:
                                expense.accomplished === "Yes"
                                  ? "#2e7d32"
                                  : "#c62828",
                              // fontWeight:
                              //   expense.accomplished === "Yes"
                              //     ? "bold"
                              //     : "normal",
                            }}
                          >
                            <div
                              style={{
                                maxWidth: "100%",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                              }}
                            >
                              {expense.accomplished}
                            </div>
                          </td>
                          {/* Action Buttons */}
                          {isFinanceManager && (
                            <td
                              style={{
                                padding: "0.75rem",
                                borderBottom: "1px solid #dee2e6",
                                textAlign: "center",
                                verticalAlign: "middle",
                              }}
                            >
                              <div
                                style={{
                                  display: "flex",
                                  gap: "6px",
                                  justifyContent: "center",
                                  flexWrap: "wrap",
                                }}
                              >
                                {/* Review Action: Only if SUBMITTED */}
                                {expense.status === "SUBMITTED" && (
                                  <button
                                    onClick={() =>
                                      handleOpenReview(expense, "APPROVED")
                                    }
                                    style={{
                                      backgroundColor: "#007bff",
                                      color: "white",
                                      border: "none",
                                      borderRadius: "4px",
                                      padding: "6px 12px",
                                      cursor: "pointer",
                                      fontSize: "12px",
                                      fontWeight: "500",
                                      transition: "all 0.2s ease",
                                      minWidth: "70px",
                                    }}
                                    onMouseEnter={(e) =>
                                      (e.currentTarget.style.backgroundColor =
                                        "#0056b3")
                                    }
                                    onMouseLeave={(e) =>
                                      (e.currentTarget.style.backgroundColor =
                                        "#007bff")
                                    }
                                  >
                                    Review
                                  </button>
                                )}

                                {/* Accomplish Action: Only if APPROVED and not yet Accomplished */}
                                {expense.status === "APPROVED" &&
                                  expense.accomplished === "No" && (
                                    <button
                                      onClick={() =>
                                        handleMarkAccomplished(expense)
                                      }
                                      style={{
                                        backgroundColor: "#17a2b8",
                                        color: "white",
                                        border: "none",
                                        borderRadius: "4px",
                                        padding: "6px 12px",
                                        cursor: "pointer",
                                        fontSize: "12px",
                                        fontWeight: "500",
                                        transition: "all 0.2s ease",
                                        minWidth: "85px",
                                      }}
                                      onMouseEnter={(e) =>
                                        (e.currentTarget.style.backgroundColor =
                                          "#138496")
                                      }
                                      onMouseLeave={(e) =>
                                        (e.currentTarget.style.backgroundColor =
                                          "#17a2b8")
                                      }
                                    >
                                      Mark Done
                                    </button>
                                  )}
                              </div>
                            </td>
                          )}
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination Component */}
              {expenses.length > 0 && (
                <Pagination
                  currentPage={currentPage}
                  pageSize={pageSize}
                  totalItems={totalItems}
                  onPageChange={setCurrentPage}
                  onPageSizeChange={(newSize) => {
                    setPageSize(newSize);
                    setCurrentPage(1);
                  }}
                  pageSizeOptions={[5, 10, 20, 50]}
                />
              )}
            </div>
          </>
        )}

        {/* Add Expense Modal */}
        {showAddExpenseModal && (
          <div
            className="modal-overlay"
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: "rgba(0, 0, 0, 0.5)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 2000,
            }}
          >
            <div
              className="modal-container"
              style={{
                backgroundColor: "white",
                borderRadius: "8px",
                width: "550px",
                maxWidth: "90%",
                maxHeight: "90vh",
                overflow: "visible", // Changed to visible for dropdown overflow
                display: "flex",
                flexDirection: "column",
                boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
              }}
            >
              <div
                className="modal-content"
                style={{ padding: "24px", overflowY: "auto" }}
              >
                <h3
                  className="modal-title"
                  style={{
                    margin: "0 0 20px 0",
                    fontSize: "20px",
                    fontWeight: "bold",
                    color: "#0C0C0C",
                  }}
                >
                  Add Expense
                </h3>

                <form onSubmit={handleSubmitExpense} className="budget-form">
                  {/* Project Selection */}
                  <div className="form-group" style={{ marginBottom: "16px" }}>
                    <label
                      htmlFor="project_id"
                      style={{
                        display: "block",
                        marginBottom: "8px",
                        fontWeight: "500",
                        fontSize: "14px",
                      }}
                    >
                      Project <span style={{ color: "red" }}>*</span>
                    </label>
                    <SearchableSelect
                      options={projectOptions}
                      value={parseInt(newExpense.project_id)}
                      onChange={handleProjectChange}
                      placeholder="Select or type a project..."
                    />
                  </div>

                  {/* Department (Read-only) */}
                  <div className="form-group" style={{ marginBottom: "16px" }}>
                    <label
                      htmlFor="department"
                      style={{
                        display: "block",
                        marginBottom: "8px",
                        fontWeight: "500",
                        fontSize: "14px",
                      }}
                    >
                      Department
                    </label>
                    <input
                      type="text"
                      id="department"
                      readOnly
                      value={
                        selectedProject
                          ? selectedProject.department_name
                          : "Select Project First"
                      }
                      className="form-control"
                      style={{
                        width: "100%",
                        padding: "8px 12px",
                        border: "1px solid #ccc",
                        borderRadius: "4px",
                        backgroundColor: "#f5f5f5",
                        cursor: "not-allowed",
                        outline: "none",
                        fontSize: "14px",
                      }}
                    />
                  </div>

                  {/* Date - Editable with validation */}
                  <div className="form-group" style={{ marginBottom: "16px" }}>
                    <label
                      htmlFor="date"
                      style={{
                        display: "block",
                        marginBottom: "8px",
                        fontWeight: "500",
                        fontSize: "14px",
                      }}
                    >
                      Date
                    </label>
                    <input
                      type="date"
                      id="date"
                      name="date"
                      max="9999-12-31" // Prevents overflow via picker
                      value={newExpense.date}
                      onChange={handleModalInputChange}
                      className="form-control"
                      style={{
                        width: "100%",
                        padding: "8px 12px",
                        border: "1px solid #ccc",
                        borderRadius: "4px",
                        outline: "none",
                        fontSize: "14px",
                      }}
                    />
                  </div>

                  {/* Sub-Category */}
                  <div className="form-group" style={{ marginBottom: "16px" }}>
                    <label
                      htmlFor="category_code"
                      style={{
                        display: "block",
                        marginBottom: "8px",
                        fontWeight: "500",
                        fontSize: "14px",
                      }}
                    >
                      Sub-Category <span style={{ color: "red" }}>*</span>
                    </label>
                    <div
                      className="select-wrapper"
                      style={{ position: "relative" }}
                    >
                      <select
                        id="category_code"
                        name="category_code"
                        value={newExpense.category_code}
                        onChange={handleModalInputChange}
                        required
                        disabled={!newExpense.project_id}
                        className="form-control"
                        style={{
                          width: "100%",
                          padding: "8px 12px",
                          border: "1px solid #ccc",
                          borderRadius: "4px",
                          // Visual feedback for disabled state
                          backgroundColor: newExpense.project_id
                            ? "white"
                            : "#f5f5f5",
                          appearance: "none",
                          outline: "none",
                          fontSize: "14px",
                        }}
                      >
                        <option value="">
                          {newExpense.project_id
                            ? "Select a sub-category"
                            : "Select project first"}
                        </option>
                        {categories.map((category, index) => (
                          <option
                            key={`${category.code}-${index}`}
                            value={category.code}
                          >
                            {category.name}
                          </option>
                        ))}
                      </select>
                      <ChevronDown
                        size={16}
                        style={{
                          position: "absolute",
                          right: "12px",
                          top: "50%",
                          transform: "translateY(-50%)",
                          pointerEvents: "none",
                        }}
                      />
                    </div>
                  </div>

                  {/* Vendor - Typeable */}
                  <div className="form-group" style={{ marginBottom: "16px" }}>
                    <label
                      htmlFor="vendor"
                      style={{
                        display: "block",
                        marginBottom: "8px",
                        fontWeight: "500",
                        fontSize: "14px",
                      }}
                    >
                      Vendor <span style={{ color: "red" }}>*</span>
                    </label>
                    <input
                      type="text"
                      id="vendor"
                      name="vendor"
                      value={newExpense.vendor}
                      onChange={handleModalInputChange}
                      required
                      placeholder="Enter vendor name"
                      className="form-control"
                      style={{
                        width: "100%",
                        padding: "8px 12px",
                        border: "1px solid #ccc",
                        borderRadius: "4px",
                        outline: "none",
                        fontSize: "14px",
                      }}
                    />
                  </div>

                  {/* Amount with Peso Sign */}
                  <div className="form-group" style={{ marginBottom: "16px" }}>
                    <label
                      htmlFor="amount"
                      style={{
                        display: "block",
                        marginBottom: "8px",
                        fontWeight: "500",
                        fontSize: "14px",
                      }}
                    >
                      Amount <span style={{ color: "red" }}>*</span>
                    </label>
                    <div
                      style={{
                        position: "relative",
                        display: "flex",
                        alignItems: "center",
                      }}
                    >
                      <span
                        style={{
                          position: "absolute",
                          left: "12px",
                          color: "#666",
                          fontSize: "14px",
                          pointerEvents: "none",
                        }}
                      >
                        ₱
                      </span>
                      <input
                        type="number"
                        id="amount"
                        name="amount"
                        placeholder="0.00"
                        value={newExpense.amount}
                        onChange={handleModalInputChange}
                        onKeyDown={(e) => {
                          // Block negative sign and scientific notation 'e'
                          if (e.key === "-" || e.key === "e") {
                            e.preventDefault();
                          }
                        }}
                        required
                        min="0"
                        step="0.01"
                        className="form-control"
                        style={{
                          width: "100%",
                          padding: "8px 12px 8px 30px", // Left padding for symbol
                          border: "1px solid #ccc",
                          borderRadius: "4px",
                          outline: "none",
                          fontSize: "14px",
                        }}
                      />
                    </div>
                  </div>

                  {/* Description */}
                  <div className="form-group" style={{ marginBottom: "16px" }}>
                    <label
                      htmlFor="description"
                      style={{
                        display: "block",
                        marginBottom: "8px",
                        fontWeight: "500",
                        fontSize: "14px",
                      }}
                    >
                      Description
                    </label>
                    <textarea
                      id="description"
                      name="description"
                      value={newExpense.description}
                      onChange={handleModalInputChange}
                      className="form-control"
                      style={{
                        width: "100%",
                        padding: "8px 12px",
                        border: "1px solid #ccc",
                        borderRadius: "4px",
                        outline: "none",
                        fontSize: "14px",
                        minHeight: "80px",
                        resize: "vertical",
                      }}
                    />
                  </div>

                  {/* Attachment */}
                  <div className="form-group" style={{ marginBottom: "16px" }}>
                    <label
                      htmlFor="attachment"
                      style={{
                        display: "block",
                        marginBottom: "8px",
                        fontWeight: "500",
                        fontSize: "14px",
                      }}
                    >
                      Attachments
                    </label>
                    <div
                      style={{
                        border: "2px dashed #ccc",
                        borderRadius: "4px",
                        padding: "20px",
                        textAlign: "center",
                        cursor: "pointer",
                        position: "relative",
                        backgroundColor: "#fafafa",
                      }}
                      onClick={() => fileInputRef.current.click()}
                    >
                      <input
                        type="file"
                        // --- MODIFICATION START: Add Ref ---
                        ref={fileInputRef}
                        // --- MODIFICATION END ---
                        id="file-input" // Keep ID if needed for other CSS, but ref handles logic
                        multiple
                        accept=".jpg,.jpeg,.png,.pdf"
                        onChange={handleFileChange}
                        style={{ display: "none" }}
                      />
                      {newExpense.attachments.length > 0 ? (
                        <div>
                          <Paperclip
                            size={20}
                            style={{ marginBottom: "8px", color: "#007bff" }}
                          />
                          <p
                            style={{
                              margin: "4px 0",
                              fontWeight: "600",
                              fontSize: "14px",
                              color: "#007bff",
                            }}
                          >
                            {newExpense.attachments.length} file(s) selected
                          </p>
                          <ul
                            style={{
                              listStyle: "none",
                              padding: 0,
                              margin: "5px 0",
                              fontSize: "12px",
                              color: "#666",
                            }}
                          >
                            {newExpense.attachments.map((file, idx) => (
                              <li
                                key={idx}
                                style={{
                                  whiteSpace: "nowrap",
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                  maxWidth: "200px",
                                  margin: "0 auto",
                                }}
                              >
                                {file.name}
                              </li>
                            ))}
                          </ul>
                          <p
                            style={{
                              margin: "0",
                              fontSize: "11px",
                              color: "#999",
                            }}
                          >
                            Click to change files
                          </p>
                        </div>
                      ) : (
                        <div>
                          <Paperclip
                            size={20}
                            style={{ marginBottom: "8px", color: "#999" }}
                          />
                          <p
                            style={{
                              margin: "4px 0",
                              fontWeight: "500",
                              fontSize: "14px",
                            }}
                          >
                            Click to upload files
                          </p>
                          <p
                            style={{
                              margin: "0",
                              fontSize: "12px",
                              color: "#666",
                            }}
                          >
                            Supported formats: JPG, PNG, PDF
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Modal Actions */}
                  <div className="modal-actions" style={{ marginTop: "24px" }}>
                    <div
                      className="button-row"
                      style={{
                        display: "flex",
                        gap: "10px",
                        justifyContent: "flex-end",
                      }}
                    >
                      <button
                        type="button"
                        className="btn-cancel"
                        onClick={() => {
                          setShowAddExpenseModal(false);
                          setNewExpense(initialExpenseState);
                          setCategories([]);
                          handleClearFiles();
                        }}
                        onMouseDown={(e) => e.preventDefault()}
                        style={{
                          padding: "8px 16px",
                          border: "1px solid #ccc",
                          borderRadius: "4px",
                          backgroundColor: "#f8f9fa",
                          color: "#333",
                          cursor: "pointer",
                          minWidth: "80px",
                          outline: "none",
                          fontSize: "14px",
                          fontWeight: "500",
                        }}
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="btn-submit"
                        onMouseDown={(e) => e.preventDefault()}
                        style={{
                          padding: "8px 16px",
                          border: "none",
                          borderRadius: "4px",
                          backgroundColor: "#007bff",
                          color: "white",
                          cursor: "pointer",
                          minWidth: "80px",
                          outline: "none",
                          fontSize: "14px",
                          fontWeight: "500",
                          boxShadow: "0 2px 4px rgba(0,123,255,0.2)",
                        }}
                      >
                        Submit
                      </button>
                    </div>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* Status component CSS */}
        <style jsx>{`
          .status-active,
          .status-inactive,
          .status-draft,
          .status-submitted,
          .status-approved,
          .status-rejected {
            display: inline-flex;
            height: auto;
            min-height: 4vh;
            width: fit-content;
            flex-direction: row;
            align-items: center;
            padding: 4px 12px;
            border-radius: 40px;
            gap: 5px;
            font-size: 0.75rem;
            overflow: visible;
            white-space: normal;
            max-width: 100%;
          }

          .status-active .circle,
          .status-inactive .circle,
          .status-draft .circle,
          .status-submitted .circle,
          .status-approved .circle,
          .status-rejected .circle {
            height: 6px;
            width: 6px;
            border-radius: 50%;
            margin-right: 3px;
            animation: statusPulse 2s infinite;
          }

          @keyframes statusPulse {
            0% {
              box-shadow: 0 0 0 0 rgba(var(--pulse-color), 0.4);
            }
            70% {
              box-shadow: 0 0 0 6px rgba(var(--pulse-color), 0);
            }
            100% {
              box-shadow: 0 0 0 0 rgba(var(--pulse-color), 0);
            }
          }

          .status-approved,
          .status-active {
            background-color: #e8f5e8;
            color: #2e7d32;
          }

          .status-approved .circle,
          .status-active .circle {
            background-color: #2e7d32;
            --pulse-color: 46, 125, 50;
          }

          .status-rejected,
          .status-inactive {
            background-color: #ffebee;
            color: #c62828;
          }

          .status-rejected .circle,
          .status-inactive .circle {
            background-color: #c62828;
            --pulse-color: 198, 40, 40;
          }

          .status-submitted {
            background-color: #e3f2fd;
            color: #0d47a1;
          }

          .status-submitted .circle {
            background-color: #0d47a1;
            --pulse-color: 13, 71, 161;
          }

          .status-draft {
            background-color: #f5f5f5;
            color: #424242;
          }

          .status-draft .circle {
            background-color: #424242;
            --pulse-color: 66, 66, 66;
          }
        `}</style>
      </div>

      {/* Review Modal */}
      {showReviewModal && selectedExpense && (
        <div
          className="modal-overlay"
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0,0,0,0.5)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 3000,
          }}
        >
          <div
            className="modal-container"
            style={{
              backgroundColor: "white",
              padding: "24px",
              borderRadius: "8px",
              width: "500px",
              boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
            }}
          >
            <div style={{ marginBottom: "20px" }}>
              <h3
                style={{
                  margin: "0 0 8px 0",
                  color: "#333",
                  fontSize: "20px",
                  fontWeight: "bold",
                }}
              >
                Review Expense
              </h3>
              <p
                style={{
                  margin: "0 0 16px 0",
                  color: "#666",
                  fontSize: "14px",
                }}
              >
                Ticket ID: <strong>{selectedExpense.reference_no}</strong>
              </p>

              {/* Expense Details */}
              <div
                style={{
                  backgroundColor: "#f8f9fa",
                  borderRadius: "6px",
                  padding: "12px",
                  marginBottom: "20px",
                  border: "1px solid #e9ecef",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginBottom: "8px",
                  }}
                >
                  <span style={{ fontSize: "13px", color: "#666" }}>
                    Amount:
                  </span>
                  <span style={{ fontSize: "13px", fontWeight: "500" }}>
                    ₱
                    {parseFloat(selectedExpense.amount).toLocaleString(
                      "en-US",
                      {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      }
                    )}
                  </span>
                </div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginBottom: "8px",
                  }}
                >
                  <span style={{ fontSize: "13px", color: "#666" }}>
                    Department:
                  </span>
                  <span style={{ fontSize: "13px", fontWeight: "500" }}>
                    {selectedExpense.department_name}
                  </span>
                </div>
                <div
                  style={{ display: "flex", justifyContent: "space-between" }}
                >
                  <span style={{ fontSize: "13px", color: "#666" }}>
                    Category:
                  </span>
                  <span style={{ fontSize: "13px", fontWeight: "500" }}>
                    {selectedExpense.category_name ||
                      selectedExpense.sub_category_name}
                  </span>
                </div>
              </div>
            </div>

            <div style={{ marginBottom: "24px" }}>
              <label
                style={{
                  display: "block",
                  marginBottom: "8px",
                  fontWeight: "500",
                  fontSize: "14px",
                  color: "#333",
                }}
              >
                Decision:
              </label>
              <div
                style={{ display: "flex", gap: "10px", marginBottom: "16px" }}
              >
                <button
                  type="button"
                  onClick={() => setReviewAction("APPROVED")}
                  style={{
                    flex: 1,
                    padding: "10px",
                    backgroundColor:
                      reviewAction === "APPROVED" ? "#28a745" : "#f8f9fa",
                    color: reviewAction === "APPROVED" ? "white" : "#495057",
                    border: `1px solid ${
                      reviewAction === "APPROVED" ? "#28a745" : "#ced4da"
                    }`,
                    borderRadius: "4px",
                    cursor: "pointer",
                    fontSize: "14px",
                    fontWeight: "500",
                    transition: "all 0.2s ease",
                    outline: "none",
                  }}
                >
                  Approve
                </button>
                <button
                  type="button"
                  onClick={() => setReviewAction("REJECTED")}
                  style={{
                    flex: 1,
                    padding: "10px",
                    backgroundColor:
                      reviewAction === "REJECTED" ? "#dc3545" : "#f8f9fa",
                    color: reviewAction === "REJECTED" ? "white" : "#495057",
                    border: `1px solid ${
                      reviewAction === "REJECTED" ? "#dc3545" : "#ced4da"
                    }`,
                    borderRadius: "4px",
                    cursor: "pointer",
                    fontSize: "14px",
                    fontWeight: "500",
                    transition: "all 0.2s ease",
                    outline: "none",
                  }}
                >
                  Reject
                </button>
              </div>

              <label
                style={{
                  display: "block",
                  marginBottom: "8px",
                  fontWeight: "500",
                  fontSize: "14px",
                  color: "#333",
                }}
              >
                Notes:
              </label>
              <textarea
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
                placeholder="Enter review notes or reason for decision..."
                style={{
                  width: "100%",
                  height: "100px",
                  padding: "12px",
                  borderRadius: "4px",
                  border: "1px solid #ced4da",
                  backgroundColor: "#f8f9fa", // Grey filled background
                  fontSize: "14px",
                  resize: "vertical",
                  outline: "none",
                  transition: "all 0.2s ease",
                  fontFamily: "inherit",
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = "#007bff";
                  e.target.style.backgroundColor = "white"; // Changes to white when focused
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = "#ced4da";
                  e.target.style.backgroundColor = "#f8f9fa"; // Returns to grey when not focused
                }}
              />
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: "10px",
                paddingTop: "16px",
                borderTop: "1px solid #e9ecef",
              }}
            >
              <button
                onClick={() => {
                  setShowReviewModal(false);
                  setSelectedExpense(null);
                  setReviewAction("");
                  setReviewNotes("");
                }}
                style={{
                  padding: "8px 16px",
                  backgroundColor: "#f8f9fa",
                  border: "1px solid #ced4da",
                  borderRadius: "4px",
                  cursor: "pointer",
                  fontSize: "14px",
                  fontWeight: "500",
                  color: "#495057",
                  transition: "all 0.2s ease",
                  outline: "none",
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.backgroundColor = "#e9ecef")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.backgroundColor = "#f8f9fa")
                }
              >
                Cancel
              </button>
              <button
                onClick={submitReview}
                disabled={!reviewAction}
                style={{
                  padding: "8px 16px",
                  backgroundColor: !reviewAction
                    ? "#6c757d"
                    : reviewAction === "APPROVED"
                    ? "#28a745"
                    : "#dc3545",
                  color: "white",
                  border: "none",
                  borderRadius: "4px",
                  cursor: !reviewAction ? "not-allowed" : "pointer",
                  fontSize: "14px",
                  fontWeight: "500",
                  transition: "all 0.2s ease",
                  outline: "none",
                  boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
                }}
                onMouseEnter={(e) => {
                  if (reviewAction) {
                    e.currentTarget.style.backgroundColor =
                      reviewAction === "APPROVED" ? "#218838" : "#c82333";
                  }
                }}
                onMouseLeave={(e) => {
                  if (reviewAction) {
                    e.currentTarget.style.backgroundColor =
                      reviewAction === "APPROVED" ? "#28a745" : "#dc3545";
                  }
                }}
              >
                Submit Review
              </button>
            </div>
          </div>
        </div>
      )}
      {/* AlertModal */}
      <AlertModal
        isOpen={alertState.isOpen}
        message={alertState.message}
        type={alertState.type}
        onClose={closeAlert}
      />

      {/* Soft Cap Modal */}
      <SoftCapModal
        isOpen={showSoftCapModal}
        onClose={() => {
          setShowSoftCapModal(false);
          setSoftCapInfo(null);
        }}
        onSubmit={handleSoftCapSubmit}
        capInfo={softCapInfo}
      />
    </div>
  );
};

export default ExpenseTracking;
