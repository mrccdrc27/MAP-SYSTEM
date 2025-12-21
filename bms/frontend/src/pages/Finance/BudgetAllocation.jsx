/* 
NOTE ON BUDGET MODIFICATION LOGIC:
This system follows strict accounting principles for immutability. 
"Modifying" a budget does NOT edit the historical record. Instead, it creates a 
NEW Journal Entry (Adjustment) for the specified amount on the current date.
The original entry remains as a historical record of the state at that time.
The cumulative effect of these entries determines the current budget balance.
*/
import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Search,
  ChevronDown,
  User,
  LogOut,
  Bell,
  Settings,
  X,
  Edit,
} from "lucide-react";
import LOGOMAP from "../../assets/MAP.jpg";
import "./BudgetAllocation.css";
import { useAuth } from "../../context/AuthContext";
import {
  getBudgetAdjustments,
  createBudgetAdjustment, // Using the correct endpoint
} from "../../API/budgetAllocationAPI";
import { getAllDepartments } from "../../API/departments";
import { getAccounts } from "../../API/dropdownAPI";
import ManageProfile from "./ManageProfile";

// Helper to get compact department display names
function getCompactDepartmentName(name) {
  if (!name) return "";

  // Map full names to compact but recognizable versions
  const compactMap = {
    "Merchandising / Merchandise Planning": "Merchandising",
    "Sales / Store Operations": "Sales",
    "Marketing / Marketing Communications": "Marketing",
    "Operations Department": "Operations",
    "IT Application & Data": "IT",
    "Logistics Management": "Logistics",
    "Human Resources": "HR",
    "Finance Department": "Finance",
  };

  // Return compact version if exists
  if (compactMap[name]) return compactMap[name];

  // For case-insensitive matching
  const lowerName = name.toLowerCase();
  for (const [key, value] of Object.entries(compactMap)) {
    if (key.toLowerCase() === lowerName) {
      return value;
    }
  }

  // For other names, just return as-is (or truncate if too long)
  return name.length > 15 ? name.substring(0, 15) + "..." : name;
}

// --- PAGINATION COMPONENT ---
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
            key={`page-${i}`}
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
              transition: "all 0.2s ease",
            }}
          >
            {i}
          </button>
        );
      }
    } else {
      pages.push(
        <button
          key="page-1"
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
            transition: "all 0.2s ease",
          }}
        >
          1
        </button>
      );
      if (currentPage - sideButtons > 2) {
        pages.push(
          <span key="start-ellipsis" style={{ padding: "8px 4px" }}>
            ...
          </span>
        );
      }
      let startPage = Math.max(2, currentPage - sideButtons);
      let endPage = Math.min(totalPages - 1, currentPage + sideButtons);
      if (currentPage + sideButtons >= totalPages - 1) {
        startPage = totalPages - pageLimit;
      }
      if (currentPage - sideButtons <= 2) {
        endPage = pageLimit + 1;
      }
      for (let i = startPage; i <= endPage; i++) {
        pages.push(
          <button
            key={`page-${i}`}
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
              transition: "all 0.2s ease",
            }}
          >
            {i}
          </button>
        );
      }
      if (currentPage + sideButtons < totalPages - 1) {
        pages.push(
          <span key="end-ellipsis" style={{ padding: "8px 4px" }}>
            ...
          </span>
        );
      }
      pages.push(
        <button
          key={`page-${totalPages}`}
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
            transition: "all 0.2s ease",
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
            cursor: "pointer",
            backgroundColor: "white",
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
            color: currentPage === 1 ? "#999" : "black",
            cursor: currentPage === 1 ? "not-allowed" : "pointer",
            borderRadius: "4px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            outline: "none",
            transition: "all 0.2s ease",
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
            color: currentPage === totalPages ? "#999" : "black",
            cursor: currentPage === totalPages ? "not-allowed" : "pointer",
            borderRadius: "4px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            outline: "none",
            transition: "all 0.2s ease",
          }}
        >
          Next
        </button>
      </div>
    </div>
  );
};

// --- MAIN COMPONENT ---
function BudgetAllocation() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  // --- STATE ---
  const [showBudgetDropdown, setShowBudgetDropdown] = useState(false);
  const [showExpenseDropdown, setShowExpenseDropdown] = useState(false);
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [showDepartmentDropdown, setShowDepartmentDropdown] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [showManageProfile, setShowManageProfile] = useState(false);

  const getUserRole = () => {
    if (!user) return "User";

    // Check deeply nested roles first (from JWT decoding)
    if (user.roles && user.roles.bms) return user.roles.bms;

    // Check direct role property (from Login API response user object)
    if (user.role) return user.role;

    // Default role names based on user type
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

  const isFinanceManager = userRole === "FINANCE_HEAD" || userRole === "ADMIN";

  const handleManageProfile = () => {
    setShowManageProfile(true);
    setShowProfileDropdown(false);
  };

  const handleCloseManageProfile = () => {
    setShowManageProfile(false);
  };

  // Data
  const [adjustments, setAdjustments] = useState([]);
  const [pagination, setPagination] = useState({ count: 0 });
  const [loading, setLoading] = useState(false);

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedDepartment, setSelectedDepartment] = useState("");

  // Options
  const [departmentOptions, setDepartmentOptions] = useState([]);
  const [accountOptions, setAccountOptions] = useState([]);

  // FIX: Define modalDropdowns state correctly here
  const [modalDropdowns, setModalDropdowns] = useState({
    categories: ["CapEx", "OpEx"], // Hardcoded categories for modal if backend doesn't provide filtering logic yet
    departments: [],
    debitAccounts: [],
    creditAccounts: [],
  });

  // Modal State
  const [showModifyModal, setShowModifyModal] = useState(false);
  const [modalType, setModalType] = useState("create");
  const [selectedRowId, setSelectedRowId] = useState(null);

  // ... (Modal Data, Validation, Date states) ...
  const [modalData, setModalData] = useState({
    id: null,
    ticket_id: "",
    date: "",
    department: "",
    category: "",
    debit_account: "",
    credit_account: "",
    amount: "",
  });

  const [fieldErrors, setFieldErrors] = useState({});
  const [formErrors, setFormErrors] = useState([]);
  const [showSuccess, setShowSuccess] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date());

  const categoryOptions = [
    { value: "", label: "All Categories" },
    { value: "CAPEX", label: "CapEx" },
    { value: "OPEX", label: "OpEx" },
  ];

  // --- API CALLS ---

  // Update modalDropdowns when departments are fetched
  useEffect(() => {
    const fetchDropdowns = async () => {
      try {
        const [deptRes, accRes] = await Promise.all([
          getAllDepartments(),
          getAccounts(),
        ]);

        const depts = deptRes.data.map((d) => ({
          value: d.name,
          label: d.name,
        }));
        setDepartmentOptions([
          { value: "", label: "All Departments" },
          ...depts,
        ]);

        setAccountOptions(accRes.data);

        // Initialize modal dropdowns
        setModalDropdowns((prev) => ({
          ...prev,
          departments: depts, // Use for modal department select
          debitAccounts: accRes.data, // Initially all accounts
          creditAccounts: accRes.data, // Initially all accounts
        }));
      } catch (error) {
        console.error("Failed to fetch dropdowns:", error);
      }
    };
    fetchDropdowns();
  }, []);

  // Update modal accounts when department changes (Client-side filtering logic)
  useEffect(() => {
    // In a real app, you might filter accounts by department here.
    // For now, we show all accounts as per requirements or keep it simple.
    // If filtering is needed, implement it here based on modalData.department
    if (accountOptions.length > 0) {
      setModalDropdowns((prev) => ({
        ...prev,
        debitAccounts: accountOptions,
        creditAccounts: accountOptions,
      }));
    }
  }, [modalData.department, accountOptions]);

  const fetchAdjustments = async () => {
    setLoading(true);
    try {
      const params = {
        page: currentPage,
        page_size: pageSize,
        search: debouncedSearchTerm,
        category: selectedCategory,
        department: selectedDepartment,
      };
      if (!params.category) delete params.category;
      if (!params.department) delete params.department;

      const response = await getBudgetAdjustments(params);
      setAdjustments(response.data.results);
      setPagination({ count: response.data.count });
    } catch (error) {
      console.error("Failed to fetch adjustments:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdjustments();
  }, [
    currentPage,
    pageSize,
    debouncedSearchTerm,
    selectedCategory,
    selectedDepartment,
  ]);

  useEffect(() => {
    const timerId = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
      setCurrentPage(1);
    }, 500);
    return () => clearTimeout(timerId);
  }, [searchTerm]);

  // --- HANDLERS ---
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

  const handleLogout = async () => await logout();
  const handleNavigate = (path) => {
    navigate(path);
    closeAllDropdowns();
  };

  const handleCategorySelect = (val) => {
    setSelectedCategory(val);
    closeAllDropdowns();
    setCurrentPage(1);
  };
  const handleDepartmentSelect = (val) => {
    setSelectedDepartment(val);
    closeAllDropdowns();
    setCurrentPage(1);
  };

  const getCategoryDisplay = () =>
    categoryOptions.find((o) => o.value === selectedCategory)?.label ||
    "All Categories";
  const getDepartmentDisplay = () =>
    departmentOptions.find((o) => o.value === selectedDepartment)?.label ||
    "All Departments";

  const getISODate = () => new Date().toISOString().split("T")[0];
  const formatAmountForModal = (val) =>
    val ? `₱${parseFloat(val).toFixed(2)}` : "";
  const formatTableAmount = (val) =>
    val
      ? `₱${parseFloat(val).toLocaleString("en-US", {
          minimumFractionDigits: 2,
        })}`
      : "₱0.00";

  const handleRowSelect = (entry) => {
    if (selectedRowId === entry.id) setSelectedRowId(null);
    else setSelectedRowId(entry.id);
  };

  const openModifyModalWithData = () => {
    if (!selectedRowId) return;
    // Find the entry from the current data
    const selectedEntry = adjustments.find((e) => e.id === selectedRowId);
    if (!selectedEntry) return;

    setModalType("modify");
    setModalData({
      id: selectedEntry.id,
      ticket_id: selectedEntry.ticket_id,
      date: getISODate(),
      // FIX: Use selectedEntry, not entry. Also apply the compact name helper if you want consistent naming
      department: selectedEntry.department_name || "",
      category: selectedEntry.category || "",
      debit_account: selectedEntry.debit_account || "",
      credit_account: selectedEntry.credit_account || "",
      amount: formatAmountForModal(selectedEntry.amount),
    });
    setFieldErrors({});
    setFormErrors([]);
    setShowModifyModal(true);
  };

  const closeModal = () => {
    setShowModifyModal(false);
    setFieldErrors({});
    setFormErrors([]);
  };

  const handleAmountChange = (e) => {
    const { value } = e.target;
    if (value === "") setModalData((p) => ({ ...p, amount: "" }));
    else {
      const clean = value.replace(/[^\d.]/g, "");
      if ((clean.match(/\./g) || []).length > 1) return;
      setModalData((p) => ({
        ...p,
        amount: `₱${clean.replace(/\B(?=(\d{3})+(?!\d))/g, ",")}`,
      }));
    }
    if (fieldErrors.amount) setFieldErrors((p) => ({ ...p, amount: null }));
  };

  const handleModalInputChange = (e) => {
    const { name, value } = e.target;
    setModalData((p) => ({ ...p, [name]: value }));
    if (fieldErrors[name]) setFieldErrors((p) => ({ ...p, [name]: null }));
    if (formErrors.length > 0) setFormErrors([]);
  };

  const clearAmount = () => setModalData((p) => ({ ...p, amount: "" }));

  const validateForm = () => {
    const errs = {};
    if (!modalData.department) errs.department = "Required";
    if (!modalData.category) errs.category = "Required";
    if (!modalData.debit_account) errs.debit_account = "Required";
    if (!modalData.credit_account) errs.credit_account = "Required";

    const amt = parseFloat(modalData.amount.replace(/[₱,]/g, ""));
    if (!amt || amt <= 0) errs.amount = "Must be > 0";

    if (
      modalData.debit_account === modalData.credit_account &&
      modalData.debit_account
    ) {
      errs.credit_account = "Cannot be same as debit";
    }
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleModalSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    try {
      const payload = {
        date: modalData.date,
        description: `Adjustment: ${modalData.debit_account} to ${modalData.credit_account}`,
        amount: parseFloat(modalData.amount.replace(/[₱,]/g, "")),
        department_name: modalData.department,
        category_name: modalData.category,
        source_account_name: modalData.debit_account, // Changed from debit_account_name
        destination_account_name: modalData.credit_account, // Changed from credit_account_name
      };

      await createBudgetAdjustment(payload);

      setShowModifyModal(false);
      setShowSuccess(true);
      fetchAdjustments(); // Refresh table
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (error) {
      console.error("Submission Error:", error);
      alert(
        `Failed: ${error.response?.data?.non_field_errors || error.message}`
      );
    }
  };

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

  // Handle page size
  const handlePageSizeChange = (newSize) => {
    setPageSize(newSize);
    setCurrentPage(1);
  };

  // Calculate Paginated Data (Fix for ReferenceError)
  const paginatedData = adjustments;

  return (
    <div
      className="app-container"
      style={{ minWidth: "1200px", overflowY: "auto", height: "100vh" }}
    >
      {/* Success Confirmation Modal - Updated message based on modal type */}
      {showSuccess && (
        <div
          className="success-modal-overlay"
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
            zIndex: 3000,
          }}
        >
          <div
            className="success-modal-container"
            style={{
              backgroundColor: "white",
              borderRadius: "8px",
              padding: "24px",
              maxWidth: "400px",
              textAlign: "center",
            }}
          >
            <h3
              style={{
                color: "#28a745",
                marginBottom: "16px",
                fontSize: "18px",
                fontWeight: "600",
              }}
            >
              ✓ Success!
            </h3>
            <p
              style={{
                marginBottom: "20px",
                fontSize: "14px",
                color: "#333",
              }}
            >
              {modalType === "modify"
                ? "Budget allocation has been successfully updated."
                : "Budget allocation has been successfully forwarded to the finance manager."}
            </p>
            <button
              onClick={() => setShowSuccess(false)}
              style={{
                padding: "8px 16px",
                backgroundColor: "#28a745",
                color: "white",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer",
                fontSize: "14px",
                outline: "none",
                transition: "background-color 0.2s ease",
              }}
              onMouseOver={(e) =>
                (e.currentTarget.style.backgroundColor = "#218838")
              }
              onMouseOut={(e) =>
                (e.currentTarget.style.backgroundColor = "#28a745")
              }
            >
              OK
            </button>
          </div>
        </div>
      )}

      {/* Navigation Bar - Preserved as is */}
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

      {/* Main Content - Updated with LedgerView layout */}
      <div
        className="content-container"
        style={{ padding: "20px", maxWidth: "1200px", margin: "0 auto" }}
      >
        {/* Conditionally render either BudgetAllocation content or ManageProfile */}
        {showManageProfile ? (
          <ManageProfile onClose={handleCloseManageProfile} />
        ) : (
          /* Page Container for everything - Updated with LedgerView styling */
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
            {/* Header Section - Updated with LedgerView layout */}
            <div
              className="top"
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "20px",
              }}
            >
              <h2 className="page-title">Budget Adjustment</h2>
              <div
                className="controls-container"
                style={{ display: "flex", gap: "10px" }}
              >
                <div style={{ position: "relative" }}>
                  <label
                    htmlFor="adjustment-search"
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
                    Search
                  </label>
                  <input
                    type="text"
                    id="adjustment-search"
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
                      width: "180px", // Reduced width
                    }}
                  />
                </div>

                {/* Department Filter Button - LedgerView Style */}
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
                      maxWidth: "200px", // Added max-width
                      cursor: "pointer",
                    }}
                  >
                    {/* Added truncation styling to the span */}
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
                        width: "250px", // Widen the dropdown menu itself to fit names
                        zIndex: 1000,
                        maxHeight: "300px",
                        overflowY: "auto",
                        boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
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
                            // Ensure text wraps if needed in the expanded menu
                            whiteSpace: "normal",
                            borderBottom: "1px solid #f0f0f0",
                          }}
                        >
                          {dept.label}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Category Filter - LedgerView Style */}
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

                {/* Modify Budget Button - Role Protected */}
                {isFinanceManager && (
                  <button
                    className="modify-budget-button"
                    onClick={openModifyModalWithData} // Calls the fixed function
                    disabled={!selectedRowId}
                    style={{
                      padding: "8px 16px",
                      border: "1px solid #ccc",
                      borderRadius: "4px",
                      backgroundColor: selectedRowId ? "#007bff" : "#e0e0e0",
                      color: selectedRowId ? "white" : "#888",
                      cursor: selectedRowId ? "pointer" : "not-allowed",
                      outline: "none",
                      fontSize: "14px",
                      whiteSpace: "nowrap",
                    }}
                  >
                    Modify Budget
                  </button>
                )}
              </div>
            </div>

            <div
              style={{
                height: "1px",
                backgroundColor: "#e0e0e0",
                marginBottom: "20px",
              }}
            ></div>

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
                        width: "10%",
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
                        width: "18%", // Increased from 15%
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
                      DEBIT ACCOUNT
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
                      CREDIT ACCOUNT
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
                  ) : paginatedData.length > 0 ? (
                    paginatedData.map((entry, index) => (
                      <tr
                        key={entry.id}
                        className={index % 2 === 1 ? "alternate-row" : ""}
                        style={{
                          backgroundColor:
                            index % 2 === 1 ? "#F8F8F8" : "#FFFFFF",
                          height: "50px",
                          cursor: "pointer",
                          backgroundColor:
                            selectedRowId === entry.id
                              ? "#e3f2fd"
                              : index % 2 === 1
                              ? "#F8F8F8"
                              : "#FFFFFF",
                        }}
                        onClick={() => handleRowSelect(entry)}
                      >
                        <td
                          style={{
                            padding: "0.75rem",
                            borderBottom: "1px solid #dee2e6",
                            fontSize: "14px",
                            fontWeight: "400",
                            color: "#000000",
                          }}
                        >
                          {entry.ticket_id}
                        </td>
                        <td
                          style={{
                            padding: "0.75rem",
                            borderBottom: "1px solid #dee2e6",
                            fontSize: "14px",
                            color: "#000000",
                          }}
                        >
                          {entry.date}
                        </td>
                        <td
                          style={{
                            padding: "0.75rem",
                            borderBottom: "1px solid #dee2e6",
                            fontSize: "14px",
                            color: "#000000",
                            paddingLeft: "1.00rem",
                          }}
                        >
                          {getCompactDepartmentName(entry.department_name) ||
                            "N/A"}
                        </td>
                        <td
                          style={{
                            padding: "0.35rem",
                            paddingRight: "0.1rem",
                            borderBottom: "1px solid #dee2e6",
                            fontSize: "14px",
                            fontWeight: "400",
                            color: "#000000",
                            textAlign: "left",
                          }}
                        >
                          {entry.category}
                        </td>
                        <td
                          style={{
                            padding: "0.75rem",
                            borderBottom: "1px solid #dee2e6",
                            fontSize: "14px",
                            color: "#000000",
                          }}
                        >
                          {entry.debit_account}
                        </td>
                        <td
                          style={{
                            padding: "0.75rem",
                            paddingLeft: "1.50rem",
                            borderBottom: "1px solid #dee2e6",
                            fontSize: "14px",
                            color: "#000000",
                          }}
                        >
                          {entry.credit_account}
                        </td>
                        <td
                          style={{
                            padding: "0.75rem",
                            borderBottom: "1px solid #dee2e6",
                            fontSize: "14px",
                            fontWeight: "400",
                            color: "#000000",
                          }}
                        >
                          {formatTableAmount(entry.amount)}
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
                        No budget adjustment entries found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Component with fixed functionality */}
            {pagination.count > 0 && !loading && (
              <Pagination
                currentPage={currentPage}
                pageSize={pageSize}
                totalItems={pagination.count}
                onPageChange={setCurrentPage}
                onPageSizeChange={handlePageSizeChange}
                pageSizeOptions={[5, 10, 20, 50]}
              />
            )}
          </div>
        )}
      </div>

      {/* Modify Budget Modal */}
      {showModifyModal && (
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
              width: "550px", // Increased width to match Expense Tracking modal
              maxWidth: "90%",
              maxHeight: "90vh",
              overflow: "auto",
              boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
            }}
          >
            <div className="modal-content" style={{ padding: "24px" }}>
              <h3
                className="modal-title"
                style={{
                  margin: "0 0 20px 0",
                  fontSize: "20px",
                  fontWeight: "bold",
                  color: "#0C0C0C",
                }}
              >
                {modalType === "modify"
                  ? "Modify Budget Entry"
                  : "Create New Budget Entry"}
              </h3>

              <form onSubmit={handleModalSubmit} className="budget-form">
                {/* Form-level validation summary - Reduced font size */}
                {formErrors.length > 0 && (
                  <div
                    className="form-errors"
                    style={{
                      backgroundColor: "#f8d7da",
                      border: "1px solid #f5c6cb",
                      borderRadius: "4px",
                      padding: "10px",
                      marginBottom: "16px",
                    }}
                  >
                    <strong
                      style={{
                        color: "#721c24",
                        marginBottom: "6px",
                        display: "block",
                        fontSize: "13px", // Reduced from default
                      }}
                    >
                      Please fix the following errors:
                    </strong>
                    <ul
                      style={{
                        margin: 0,
                        paddingLeft: "18px",
                        color: "#721c24",
                        fontSize: "12px", // Reduced from default
                      }}
                    >
                      {formErrors.map((error, index) => (
                        <li key={index}>{error}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Ticket ID - Auto-generated for new entries, read-only for modifications */}
                <div className="form-group" style={{ marginBottom: "16px" }}>
                  <label
                    htmlFor="ticket_id"
                    style={{
                      display: "block",
                      marginBottom: "8px",
                      fontWeight: "500",
                      fontSize: "14px",
                    }}
                  >
                    Ticket ID
                  </label>
                  <input
                    type="text"
                    id="ticket_id"
                    name="ticket_id"
                    value={modalData.ticket_id}
                    readOnly
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
                  <span
                    className="helper-text"
                    style={{
                      fontSize: "12px",
                      color: "#666",
                      marginTop: "4px",
                      display: "block",
                    }}
                  >
                    {modalType === "modify"
                      ? "Existing ticket ID"
                      : "System generated"}
                  </span>
                </div>

                {/* Date - UPDATED: Auto-generated for both create and modify */}
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
                    value={modalData.date}
                    readOnly
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
                  <span
                    className="helper-text"
                    style={{
                      fontSize: "12px",
                      color: "#666",
                      marginTop: "4px",
                      display: "block",
                    }}
                  >
                    {modalType === "modify"
                      ? "Auto-generated: Current date"
                      : "Auto-generated: Current date"}
                  </span>
                </div>

                {/* Department - REQUIRED */}
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
                    Department <span style={{ color: "red" }}>*</span>
                  </label>
                  <div
                    className="select-wrapper"
                    style={{ position: "relative" }}
                  >
                    <select
                      id="department"
                      name="department"
                      value={modalData.department}
                      onChange={handleModalInputChange}
                      required
                      className="form-control"
                      style={{
                        width: "100%",
                        padding: "8px 12px",
                        border: fieldErrors.department
                          ? "1px solid #dc3545"
                          : "1px solid #ccc",
                        borderRadius: "4px",
                        backgroundColor: "white",
                        appearance: "none",
                        outline: "none",
                        fontSize: "14px",
                      }}
                    >
                      <option value="">Select a department</option>
                      {/* Use modalDropdowns.departments here if populated, or departmentOptions (excluding "All Departments") */}
                      {modalDropdowns.departments.map((dept) => (
                        <option key={dept.value} value={dept.value}>
                          {dept.label}
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
                  {fieldErrors.department && (
                    <div
                      style={{
                        color: "#dc3545",
                        fontSize: "11px", // Reduced from 12px
                        marginTop: "4px",
                      }}
                    >
                      {fieldErrors.department}
                    </div>
                  )}
                </div>

                {/* Category - REQUIRED */}
                <div className="form-group" style={{ marginBottom: "16px" }}>
                  <label
                    htmlFor="category"
                    style={{
                      display: "block",
                      marginBottom: "8px",
                      fontWeight: "500",
                      fontSize: "14px",
                    }}
                  >
                    Category <span style={{ color: "red" }}>*</span>
                  </label>
                  <div
                    className="select-wrapper"
                    style={{ position: "relative" }}
                  >
                    <select
                      id="category"
                      name="category"
                      value={modalData.category}
                      onChange={handleModalInputChange}
                      required
                      className="form-control"
                      style={{
                        width: "100%",
                        padding: "8px 12px",
                        border: fieldErrors.category
                          ? "1px solid #dc3545"
                          : "1px solid #ccc",
                        borderRadius: "4px",
                        backgroundColor: "white",
                        appearance: "none",
                        outline: "none",
                        fontSize: "14px",
                      }}
                    >
                      <option value="">Select a category</option>
                      {modalDropdowns.categories.map((category) => (
                        <option key={category} value={category}>
                          {category}
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
                  {fieldErrors.category && (
                    <div
                      style={{
                        color: "#dc3545",
                        fontSize: "11px", // Reduced from 12px
                        marginTop: "4px",
                      }}
                    >
                      {fieldErrors.category}
                    </div>
                  )}
                </div>

                {/* Debit Account (sub-category in each department) */}
                <div className="form-group" style={{ marginBottom: "16px" }}>
                  <label
                    htmlFor="debit_account"
                    style={{
                      display: "block",
                      marginBottom: "8px",
                      fontWeight: "500",
                      fontSize: "14px",
                    }}
                  >
                    Debit From Account (Sub-category){" "}
                    <span style={{ color: "red" }}>*</span>
                  </label>
                  <div
                    className="select-wrapper"
                    style={{ position: "relative" }}
                  >
                    <select
                      id="debit_account"
                      name="debit_account"
                      value={modalData.debit_account}
                      onChange={handleModalInputChange}
                      required
                      disabled={!modalData.department}
                      className="form-control"
                      style={{
                        width: "100%",
                        padding: "8px 12px",
                        border: fieldErrors.debit_account
                          ? "1px solid #dc3545"
                          : "1px solid #ccc",
                        borderRadius: "4px",
                        backgroundColor: modalData.department
                          ? "white"
                          : "#f5f5f5",
                        appearance: "none",
                        outline: "none",
                        fontSize: "14px",
                      }}
                    >
                      <option value="">
                        {modalData.department
                          ? "Select a sub-category"
                          : "Select department first"}
                      </option>
                      {modalDropdowns.debitAccounts.map((acc) => (
                        <option key={acc.id} value={acc.value}>
                          {acc.name}
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
                  {fieldErrors.debit_account && (
                    <div
                      style={{
                        color: "#dc3545",
                        fontSize: "11px", // Reduced from 12px
                        marginTop: "4px",
                      }}
                    >
                      {fieldErrors.debit_account}
                    </div>
                  )}
                </div>

                {/* Credit Account (sub-category in each department) */}
                <div className="form-group" style={{ marginBottom: "16px" }}>
                  <label
                    htmlFor="credit_account"
                    style={{
                      display: "block",
                      marginBottom: "8px",
                      fontWeight: "500",
                      fontSize: "14px",
                    }}
                  >
                    Credit To Account (Sub-category){" "}
                    <span style={{ color: "red" }}>*</span>
                  </label>
                  <div
                    className="select-wrapper"
                    style={{ position: "relative" }}
                  >
                    <select
                      id="credit_account"
                      name="credit_account"
                      value={modalData.credit_account}
                      onChange={handleModalInputChange}
                      required
                      disabled={!modalData.department}
                      className="form-control"
                      style={{
                        width: "100%",
                        padding: "8px 12px",
                        border: fieldErrors.credit_account
                          ? "1px solid #dc3545"
                          : "1px solid #ccc",
                        borderRadius: "4px",
                        backgroundColor: modalData.department
                          ? "white"
                          : "#f5f5f5",
                        appearance: "none",
                        outline: "none",
                        fontSize: "14px",
                      }}
                    >
                      <option value="">
                        {modalData.department
                          ? "Select a sub-category"
                          : "Select department first"}
                      </option>
                      {modalDropdowns.creditAccounts.map((acc) => (
                        <option key={acc.id} value={acc.value}>
                          {acc.name}
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
                  {fieldErrors.credit_account && (
                    <div
                      style={{
                        color: "#dc3545",
                        fontSize: "11px", // Reduced from 12px
                        marginTop: "4px",
                      }}
                    >
                      {fieldErrors.credit_account}
                    </div>
                  )}
                </div>

                {/* Amount - REQUIRED (COPIED FROM EXPENSE TRACKING) */}
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
                  <div style={{ position: "relative" }}>
                    <input
                      type="text"
                      id="amount"
                      name="amount"
                      placeholder="₱0.00"
                      value={modalData.amount}
                      onChange={handleAmountChange}
                      required
                      className="form-control"
                      style={{
                        width: "100%",
                        padding: "8px 40px 8px 12px",
                        border: fieldErrors.amount
                          ? "1px solid #dc3545"
                          : "1px solid #e0e0e0",
                        borderRadius: "4px",
                        outline: "none",
                        fontSize: "14px",
                      }}
                    />
                    {modalData.amount && (
                      <button
                        type="button"
                        onClick={clearAmount}
                        style={{
                          position: "absolute",
                          right: "8px",
                          top: "50%",
                          transform: "translateY(-50%)",
                          background: "none",
                          border: "none",
                          cursor: "pointer",
                          padding: "4px",
                          borderRadius: "50%",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          outline: "none",
                        }}
                        onMouseDown={(e) => e.preventDefault()}
                      >
                        <X size={16} color="#666" />
                      </button>
                    )}
                  </div>
                  {fieldErrors.amount && (
                    <div
                      style={{
                        color: "#dc3545",
                        fontSize: "11px",
                        marginTop: "4px",
                      }}
                    >
                      {fieldErrors.amount}
                    </div>
                  )}
                </div>

                {/* Modal Actions with SMALLER BUTTONS */}
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
                      onClick={closeModal}
                      onMouseDown={(e) => e.preventDefault()}
                      style={{
                        padding: "6px 14px",
                        border: "1px solid #ccc",
                        borderRadius: "4px",
                        backgroundColor: "#f8f9fa",
                        color: "#333",
                        cursor: "pointer",
                        minWidth: "70px",
                        outline: "none",
                        fontSize: "13px",
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="btn-submit"
                      onMouseDown={(e) => e.preventDefault()}
                      style={{
                        padding: "6px 14px",
                        border: "1px solid #ccc",
                        borderRadius: "4px",
                        backgroundColor: "#007bff",
                        color: "white",
                        cursor: "pointer",
                        minWidth: "70px",
                        outline: "none",
                        fontSize: "13px",
                      }}
                    >
                      {modalType === "modify" ? "Update" : "Submit"}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default BudgetAllocation;
