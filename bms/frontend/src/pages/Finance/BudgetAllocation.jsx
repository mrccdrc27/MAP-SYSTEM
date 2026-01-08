/* 
NOTE ON BUDGET MODIFICATION LOGIC:
This system follows strict accounting principles for immutability. 
"Modifying" a budget does NOT edit the historical record. Instead, it creates a 
NEW Journal Entry (Adjustment) for the specified amount on the current date.
The original entry remains as a historical record of the state at that time.
The cumulative effect of these entries determines the current budget balance.
*/

// TODO: Make Department Code dropdown/automatic based on operators department. Fix negative can be inputed in the supplemental budget amount.
import React, { useState, useEffect, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Search,
  ChevronDown,
  User,
  LogOut,
  Bell,
  Settings,
  X,
  CheckCircle,
  XCircle,
  Eye,
  FileText,
  Calendar,
  Filter,
} from "lucide-react";
import LOGOMAP from "../../assets/MAP.jpg";
import "./BudgetAllocation.css";
import { useAuth } from "../../context/AuthContext";
import {
  getBudgetAdjustments,
  createBudgetAdjustment,
  requestSupplementalBudget,
  getSupplementalBudgetRequests,
  approveSupplementalRequest,
  rejectSupplementalRequest,
} from "../../API/budgetAllocationAPI";
import { getExpenseCategories, getProjects } from "../../API/expenseAPI";
import { getAllDepartments } from "../../API/departments";
import { getAccounts } from "../../API/dropdownAPI";
import ManageProfile from "./ManageProfile";

// --- SUPPLEMENTAL BUDGET COMPONENTS ---

// 1. Searchable Select (For Projects)
const SearchableSelect = ({
  options,
  value,
  onChange,
  placeholder,
  disabled,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const wrapperRef = React.useRef(null); // Ensure React is imported or use useRef directly

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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
          minHeight: "38px",
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

// 2. Helper to get compact names
function getCompactDepartmentName(name) {
  if (!name) return "";
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
  if (compactMap[name]) return compactMap[name];
  return name.length > 15 ? name.substring(0, 15) + "..." : name;
}

// Date Filter Component with Calendar UI
const DateFilter = ({ dateFilter, setDateFilter }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(dateFilter);

  const months = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  const getDaysInMonth = (year, month) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (year, month) => {
    return new Date(year, month, 1).getDay();
  };

  const handlePrevMonth = () => {
    setCurrentMonth(
      new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1)
    );
  };

  const handleNextMonth = () => {
    setCurrentMonth(
      new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1)
    );
  };

  const handleDateSelect = (day) => {
    const selected = new Date(
      currentMonth.getFullYear(),
      currentMonth.getMonth(),
      day
    );
    const formattedDate = selected.toISOString().split("T")[0];
    setSelectedDate(formattedDate);
    setDateFilter(formattedDate);
    setIsOpen(false);
  };

  const handleClear = () => {
    setSelectedDate("");
    setDateFilter("");
    setIsOpen(false);
  };

  const renderCalendar = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const daysInMonth = getDaysInMonth(year, month);
    const firstDay = getFirstDayOfMonth(year, month);

    const days = [];

    // Empty cells for days before the first day of the month
    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="calendar-day empty"></div>);
    }

    // Days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = new Date(year, month, day).toISOString().split("T")[0];
      const isSelected = selectedDate === dateStr;
      const isToday =
        new Date().toDateString() === new Date(year, month, day).toDateString();

      days.push(
        <div
          key={`day-${day}`}
          className={`calendar-day ${isSelected ? "selected" : ""} ${
            isToday ? "today" : ""
          }`}
          onClick={() => handleDateSelect(day)}
          style={{
            padding: "6px",
            textAlign: "center",
            cursor: "pointer",
            borderRadius: "4px",
            backgroundColor: isSelected
              ? "#007bff"
              : isToday
              ? "#e3f2fd"
              : "transparent",
            color: isSelected ? "white" : isToday ? "#007bff" : "inherit",
            fontWeight: isSelected || isToday ? "600" : "400",
            fontSize: "13px",
          }}
        >
          {day}
        </div>
      );
    }

    return days;
  };

  return (
    <div style={{ position: "relative", display: "inline-block" }}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "6px",
          padding: "8px 12px",
          border: "1px solid #ccc",
          borderRadius: "4px",
          backgroundColor: "white",
          cursor: "pointer",
          fontSize: "14px",
          color: selectedDate ? "#007bff" : "#666",
          height: "40px",
          minWidth: "140px",
          outline: "none",
        }}
      >
        <Calendar size={16} />
        <span
          style={{
            flex: 1,
            textAlign: "left",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {selectedDate || "Date"}
        </span>
        <ChevronDown size={16} />
      </button>

      {isOpen && (
        <div
          style={{
            position: "absolute",
            top: "100%",
            right: 0,
            backgroundColor: "white",
            border: "1px solid #ccc",
            borderRadius: "8px",
            boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
            zIndex: 1000,
            width: "280px",
            padding: "12px",
            marginTop: "4px",
          }}
        >
          {/* Calendar Header */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "12px",
            }}
          >
            <button
              onClick={handlePrevMonth}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: "4px",
                fontSize: "16px",
                outline: "none",
              }}
            >
              ‹
            </button>
            <div style={{ fontSize: "14px", fontWeight: "600" }}>
              {months[currentMonth.getMonth()]} {currentMonth.getFullYear()}
            </div>
            <button
              onClick={handleNextMonth}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: "4px",
                fontSize: "16px",
                outline: "none",
              }}
            >
              ›
            </button>
          </div>

          {/* Day Headers */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(7, 1fr)",
              gap: "3px",
              marginBottom: "6px",
            }}
          >
            {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((day) => (
              <div
                key={day}
                style={{
                  textAlign: "center",
                  fontSize: "11px",
                  color: "#666",
                  fontWeight: "500",
                }}
              >
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Grid */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(7, 1fr)",
              gap: "3px",
            }}
          >
            {renderCalendar()}
          </div>

          {/* Action Buttons */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginTop: "12px",
            }}
          >
            <button
              onClick={handleClear}
              style={{
                padding: "6px 12px",
                border: "1px solid #dc3545",
                borderRadius: "4px",
                backgroundColor: "white",
                color: "#dc3545",
                cursor: "pointer",
                fontSize: "13px",
                outline: "none",
              }}
            >
              Clear
            </button>
            <button
              onClick={() => setIsOpen(false)}
              style={{
                padding: "6px 12px",
                border: "1px solid #007bff",
                borderRadius: "4px",
                backgroundColor: "#007bff",
                color: "white",
                cursor: "pointer",
                fontSize: "13px",
                outline: "none",
              }}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// Supplemental Request Status Badge
const StatusBadge = ({ status }) => {
  const getStatusColor = (status) => {
    switch (status) {
      case "Pending":
        return { bg: "#fff3cd", text: "#856404", border: "#ffeaa7" };
      case "Approved":
        return { bg: "#d4edda", text: "#155724", border: "#c3e6cb" };
      case "Rejected":
        return { bg: "#f8d7da", text: "#721c24", border: "#f5c6cb" };
      default:
        return { bg: "#e2e3e5", text: "#383d41", border: "#d6d8db" };
    }
  };

  const colors = getStatusColor(status);

  return (
    <span
      style={{
        backgroundColor: colors.bg,
        color: colors.text,
        padding: "4px 10px",
        borderRadius: "12px",
        fontSize: "12px",
        fontWeight: "500",
        border: `1px solid ${colors.border}`,
        display: "inline-flex",
        alignItems: "center",
        gap: "4px",
      }}
    >
      {status === "Approved" && <CheckCircle size={12} />}
      {status === "Rejected" && <XCircle size={12} />}
      {status}
    </span>
  );
};

const ConfirmationModal = ({
  isOpen,
  title,
  message,
  onConfirm,
  onCancel,
  confirmText = "Confirm",
  confirmColor = "#007bff",
}) => {
  if (!isOpen) return null;
  return (
    <div
      className="modal-overlay"
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(0,0,0,0.5)",
        zIndex: 3000,
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <div
        style={{
          backgroundColor: "white",
          padding: "24px",
          borderRadius: "8px",
          width: "400px",
          textAlign: "center",
          boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
        }}
      >
        <h3 style={{ marginTop: 0, fontSize: "18px" }}>{title}</h3>
        <p style={{ color: "#666", marginBottom: "24px" }}>{message}</p>
        <div style={{ display: "flex", justifyContent: "center", gap: "10px" }}>
          <button
            onClick={onCancel}
            style={{
              padding: "8px 16px",
              border: "1px solid #ccc",
              background: "white",
              borderRadius: "4px",
              cursor: "pointer",
            }}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            style={{
              padding: "8px 16px",
              border: "none",
              background: confirmColor,
              color: "white",
              borderRadius: "4px",
              cursor: "pointer",
            }}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};
// View Details Modal for Supplemental Requests
const ViewDetailsModal = ({ request, onClose }) => {
  const formatCurrency = (amount) =>
    `₱${parseFloat(amount).toLocaleString("en-US", {
      minimumFractionDigits: 2,
    })}`;

  return (
    <div
      className="modal-overlay"
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(0,0,0,0.5)",
        zIndex: 2000,
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <div
        style={{
          backgroundColor: "white",
          borderRadius: "8px",
          width: "600px",
          maxHeight: "90vh",
          overflow: "auto",
          boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
        }}
      >
        <div
          style={{
            padding: "16px 24px",
            borderBottom: "1px solid #e9ecef",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <h3 style={{ margin: 0, fontSize: "18px" }}>
            Supplemental Request Details
          </h3>
          <button
            onClick={onClose}
            style={{ background: "none", border: "none", cursor: "pointer" }}
          >
            <X size={20} />
          </button>
        </div>
        <div style={{ padding: "24px" }}>
          <div
            style={{
              marginBottom: "24px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <h4 style={{ margin: 0, fontSize: "16px" }}>
              ID: {request.request_id}
            </h4>
            <StatusBadge status={request.status} />
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "16px",
              marginBottom: "24px",
            }}
          >
            <div>
              <label
                style={{ display: "block", fontSize: "12px", color: "#666" }}
              >
                Department
              </label>
              <strong>{request.department_name}</strong>
            </div>
            <div>
              <label
                style={{ display: "block", fontSize: "12px", color: "#666" }}
              >
                Date Submitted
              </label>
              <strong>{request.date_submitted}</strong>
            </div>
            <div>
              <label
                style={{ display: "block", fontSize: "12px", color: "#666" }}
              >
                Category
              </label>
              <strong>{request.category_name}</strong>
            </div>
            <div>
              <label
                style={{ display: "block", fontSize: "12px", color: "#666" }}
              >
                Requested Amount
              </label>
              <strong style={{ color: "#007bff" }}>
                {formatCurrency(request.amount)}
              </strong>
            </div>
          </div>

          <div style={{ marginBottom: "24px" }}>
            <label
              style={{ display: "block", fontSize: "12px", color: "#666" }}
            >
              Reason
            </label>
            <div
              style={{
                padding: "12px",
                background: "#f8f9fa",
                borderRadius: "6px",
              }}
            >
              {request.reason}
            </div>
          </div>

          <div style={{ marginBottom: "24px" }}>
            <label
              style={{ display: "block", fontSize: "12px", color: "#666" }}
            >
              Requester
            </label>
            <div>{request.requester_name}</div>
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <button
              onClick={onClose}
              style={{
                padding: "8px 16px",
                background: "#f8f9fa",
                border: "1px solid #ccc",
                borderRadius: "4px",
                cursor: "pointer",
              }}
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Audit Log Modal
const AuditLogModal = ({ logs, onClose }) => {
  return (
    <div className="modal-overlay" style={modalOverlayStyle}>
      <div
        className="modal-container"
        style={{ ...modalContainerStyle, width: "900px", maxHeight: "80vh" }}
      >
        <div className="modal-header" style={modalHeaderStyle}>
          <h3 style={{ margin: 0, fontSize: "18px", fontWeight: "600" }}>
            Supplemental Budget Audit Logs
          </h3>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: "4px",
              outline: "none",
            }}
          >
            <X size={20} />
          </button>
        </div>

        <div className="modal-body" style={{ padding: "24px" }}>
          <div style={{ maxHeight: "60vh", overflowY: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr
                  style={{
                    backgroundColor: "#f8f9fa",
                    position: "sticky",
                    top: 0,
                    zIndex: 1,
                  }}
                >
                  <th style={tableHeaderStyle}>TIMESTAMP</th>
                  <th style={tableHeaderStyle}>REQUEST ID</th>
                  <th style={tableHeaderStyle}>ACTION</th>
                  <th style={tableHeaderStyle}>ACTOR</th>
                  <th style={tableHeaderStyle}>DEPARTMENT</th>
                  <th style={tableHeaderStyle}>AMOUNT</th>
                </tr>
              </thead>
              <tbody>
                {logs.length === 0 ? (
                  <tr>
                    <td
                      colSpan="6"
                      style={{ textAlign: "center", padding: "20px" }}
                    >
                      No logs available.
                    </td>
                  </tr>
                ) : (
                  logs.map((log, index) => (
                    <tr
                      key={index}
                      style={{ borderBottom: "1px solid #e9ecef" }}
                    >
                      <td style={tableCellStyle}>{log.timestamp}</td>
                      <td style={tableCellStyle}>{log.request_id}</td>
                      <td style={tableCellStyle}>
                        <span
                          style={{
                            padding: "2px 8px",
                            borderRadius: "4px",
                            fontSize: "12px",
                            fontWeight: "500",
                            backgroundColor:
                              log.action === "Approved"
                                ? "#d4edda"
                                : log.action === "Rejected"
                                ? "#f8d7da"
                                : "#e2e3e5",
                            color:
                              log.action === "Approved"
                                ? "#155724"
                                : log.action === "Rejected"
                                ? "#721c24"
                                : "#383d41",
                          }}
                        >
                          {log.action}
                        </span>
                      </td>
                      <td style={tableCellStyle}>{log.actor}</td>
                      <td style={tableCellStyle}>
                        {log.original.department_name}
                      </td>
                      <td style={tableCellStyle}>
                        ₱{parseFloat(log.original.amount).toLocaleString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

// --- STYLES ---
const modalOverlayStyle = {
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
};

const modalContainerStyle = {
  backgroundColor: "white",
  borderRadius: "8px",
  width: "600px",
  maxWidth: "90%",
  maxHeight: "90vh",
  overflow: "auto",
  boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
};

const modalHeaderStyle = {
  padding: "16px 24px",
  borderBottom: "1px solid #e9ecef",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
};

const detailLabelStyle = {
  display: "block",
  fontSize: "12px",
  color: "#6c757d",
  marginBottom: "4px",
  fontWeight: "500",
};

const detailValueStyle = {
  margin: 0,
  fontSize: "14px",
  fontWeight: "400",
  color: "#212529",
};

const tableHeaderStyle = {
  padding: "12px 16px",
  textAlign: "left",
  borderBottom: "2px solid #dee2e6",
  fontWeight: "600",
  fontSize: "14px",
  color: "#495057",
};

const tableCellStyle = {
  padding: "12px 16px",
  fontSize: "14px",
  color: "#212529",
};

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
          key="page-1"
          className={`pageButton ${1 === currentPage ? "active" : ""}`}
          onClick={() => handlePageClick(1)}
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
          }}
        >
          Prev
        </button>
        {renderPageNumbers()}
        <button
          onClick={() => handlePageClick(currentPage + 1)}
          disabled={currentPage === totalPages}
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
  const { user, logout, getBmsRole } = useAuth();

  // --- STATE ---
  const [showBudgetDropdown, setShowBudgetDropdown] = useState(false);
  const [showExpenseDropdown, setShowExpenseDropdown] = useState(false);
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [showDepartmentDropdown, setShowDepartmentDropdown] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [showManageProfile, setShowManageProfile] = useState(false);

  // Supplemental Budget State
  const [activeTab, setActiveTab] = useState("budgetAdjustment"); // 'budgetAdjustment' or 'supplementalBudget'
  const [showSupplementalFilters, setShowSupplementalFilters] = useState(false);
  const [showSupplementalDeptDropdown, setShowSupplementalDeptDropdown] =
    useState(false);

  // NEW: Action dropdown state for Modify/Add Budget
  const [showActionDropdown, setShowActionDropdown] = useState(false);
  const [selectedAction, setSelectedAction] = useState("modify"); // 'modify' or 'add'

  // Supplemental Request Data
  const [supplementalRequests, setSupplementalRequests] = useState([]);
  const [supplementalPagination, setSupplementalPagination] = useState({
    count: 0,
  });
  const [supplementalLoading, setSupplementalLoading] = useState(false);

  // Supplemental Filters
  const [supplementalSearch, setSupplementalSearch] = useState("");
  const [supplementalDeptFilter, setSupplementalDeptFilter] = useState("");
  const [supplementalDateFilter, setSupplementalDateFilter] = useState("");
  const [supplementalCurrentPage, setSupplementalCurrentPage] = useState(1);
  const [supplementalPageSize, setSupplementalPageSize] = useState(5);

  // Supplemental Modals
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [showAuditModal, setShowAuditModal] = useState(false);
  const [auditLogs, setAuditLogs] = useState([]);

  // Request Modal State
  const [showRequestModal, setShowRequestModal] = useState(false);

  // Confirmation Modal State
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: "",
    message: "",
    onConfirm: null,
    confirmColor: "#007bff",
  });

  // --- ADD THIS STATE for Display Name ---
  const [requestData, setRequestData] = useState({
    department_input: "", // ID for API
    department_display: "", // Name for UI (NEW)
    project_id: "",
    category_id: "",
    amount: "",
    reason: "",
  });

  // MODIFIED: Updated getUserRole logic to correctly handle the role array from Central Auth
  // Auth Helpers
  const getUserRole = () => {
    if (getBmsRole) {
      const role = getBmsRole();
      if (role) return role;
    }
    if (user?.role) return user.role;
    if (user?.is_superuser) return "ADMIN";
    return "User";
  };
  const userRole = getUserRole();
  const isFinanceManager = userRole === "FINANCE_HEAD" || userRole === "ADMIN";
  const userProfile = {
    name: user
      ? `${user.first_name || ""} ${user.last_name || ""}`.trim() || "User"
      : "User",
    role: userRole,
    avatar:
      user?.profile_picture ||
      "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-1.2.1&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80",
  };

  // --- HELPERS ---
  const handleManageProfile = () => setShowManageProfile(true);
  const handleCloseManageProfile = () => setShowManageProfile(false);
  const handleLogout = async () => await logout();
  const handleNavigate = (path) => navigate(path);

  const getSupplementalDeptDisplay = () =>
    departmentOptions.find((o) => o.value === supplementalDeptFilter)?.label ||
    "All Departments";

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
  const [projects, setProjects] = useState([]); // Projects list
  const [modalDropdowns, setModalDropdowns] = useState({
    categories: ["CapEx", "OpEx"],
    departments: [],
    debitAccounts: [],
    creditAccounts: [],
    expenseCategories: [],
  });
  const [projectCategories, setProjectCategories] = useState([]);

  const [showModifyModal, setShowModifyModal] = useState(false);
  const [modalType, setModalType] = useState("modify");
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
  const [currentDate] = useState(new Date());

  const categoryOptions = [
    { value: "", label: "All Categories" },
    { value: "CAPEX", label: "CapEx" },
    { value: "OPEX", label: "OpEx" },
  ];

  // --- SUPPLEMENTAL BUDGET FUNCTIONS ---

  // --- SUPPLEMENTAL LOGIC ---
  const fetchSupplementalRequests = useCallback(async () => {
    setSupplementalLoading(true);
    try {
      const params = {
        page: supplementalCurrentPage,
        page_size: supplementalPageSize,
        search: supplementalSearch,
      };
      if (supplementalDeptFilter) params.search = supplementalDeptFilter;

      const response = await getSupplementalBudgetRequests(params);
      setSupplementalRequests(response.data.results);
      setSupplementalPagination({ count: response.data.count });
    } catch (error) {
      console.error("Failed to fetch requests:", error);
    } finally {
      setSupplementalLoading(false);
    }
  }, [
    supplementalCurrentPage,
    supplementalPageSize,
    supplementalDeptFilter,
    supplementalSearch,
  ]);

  useEffect(() => {
    if (activeTab === "supplementalBudget") fetchSupplementalRequests();
  }, [activeTab, fetchSupplementalRequests]);

  // Confirmation Wrappers
  const initiateApprove = (requestId) => {
    setConfirmModal({
      isOpen: true,
      title: "Approve Request",
      message:
        "Are you sure you want to approve this supplemental budget request? This will update the ledger.",
      confirmColor: "#28a745",
      onConfirm: () => handleApproveRequest(requestId),
    });
  };

  const initiateReject = (requestId) => {
    setConfirmModal({
      isOpen: true,
      title: "Reject Request",
      message: "Are you sure you want to reject this request?",
      confirmColor: "#dc3545",
      onConfirm: () => handleRejectRequest(requestId),
    });
  };

  const handleApproveRequest = async (requestId) => {
    setConfirmModal((prev) => ({ ...prev, isOpen: false })); // Close modal
    try {
      await approveSupplementalRequest(requestId);
      setShowSuccess(true); // Show success modal instead of alert
      fetchSupplementalRequests();
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (error) {
      alert("Failed to approve request.");
    }
  };

  const handleRejectRequest = async (requestId) => {
    setConfirmModal((prev) => ({ ...prev, isOpen: false })); // Close modal
    try {
      await rejectSupplementalRequest(requestId);
      alert("Request rejected."); // Or use success modal with different text
      fetchSupplementalRequests();
    } catch (error) {
      alert("Failed to reject request.");
    }
  };

  const handleSupplementalSubmit = async (e) => {
    e.preventDefault();

    // Debug Log
    console.log("Submitting Request Data:", requestData);

    const amountVal = parseFloat(requestData.amount);
    if (isNaN(amountVal) || amountVal <= 0) {
      alert("Invalid amount");
      return;
    }
    if (!requestData.project_id) {
      alert("Project is required");
      return;
    }
    if (!requestData.department_input) {
      alert("Department is missing. Please refresh.");
      return;
    }

    try {
      const payload = {
        department_input: requestData.department_input,
        project_id: parseInt(requestData.project_id),
        category_id: parseInt(requestData.category_id),
        amount: amountVal,
        reason: requestData.reason,
      };

      await requestSupplementalBudget(payload);

      setShowRequestModal(false);
      setRequestData((prev) => ({
        ...prev,
        amount: "",
        reason: "",
        project_id: "",
        category_id: "",
      })); // Keep dept/project
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
      if (activeTab === "supplementalBudget") fetchSupplementalRequests();
    } catch (error) {
      console.error(error);
      alert("Failed to submit request.");
    }
  };

  // View request details
  const handleViewDetails = (request) => {
    setSelectedRequest(request);
    setShowDetailsModal(true);
  };

  // View audit logs
  const handleViewAuditLogs = async () => {
    try {
      // Fetch historical requests
      const response = await getSupplementalBudgetRequests({
        page_size: 100,
      });

      const logs = response.data.results.map((req) => {
        let timestamp = req.date_submitted;
        let actor = req.requester_name;
        let actionLabel = "Submitted";

        if (req.status === "APPROVED") {
          timestamp = req.approval_date || timestamp;
          actor = req.approver_name || "Finance Manager";
          actionLabel = "Approved";
        } else if (req.status === "REJECTED") {
          timestamp = req.rejection_date || timestamp;
          actor = req.rejector_name || "Finance Manager";
          actionLabel = "Rejected";
        }

        return {
          original: req, // Keep original data
          timestamp: timestamp,
          request_id: req.request_id,
          action: actionLabel,
          actor: actor,
          remarks: req.reason,
        };
      });

      setAuditLogs(logs);
      setShowAuditModal(true);
    } catch (error) {
      console.error("Failed to fetch audit logs:", error);
    }
  };

  // --- API CALLS ---

  // MODIFIED: Fetch dropdowns including projects
  useEffect(() => {
    const fetchDropdowns = async () => {
      try {
        const [deptRes, accRes, projRes] = await Promise.all([
          getAllDepartments(),
          getAccounts(),
          getProjects(),
        ]);

        const depts = deptRes.data.map((d) => ({
          value: d.name,
          label: d.name,
          id: d.id,
          code: d.code,
        }));
        setDepartmentOptions([
          { value: "", label: "All Departments" },
          ...depts,
        ]);
        setAccountOptions(accRes.data);
        setProjects(projRes.data);

        // Initial Modal Dropdowns
        setModalDropdowns((prev) => ({
          ...prev,
          departments: depts,
          debitAccounts: accRes.data,
          creditAccounts: accRes.data,
          // expenseCategories will be loaded dynamically based on project
        }));
      } catch (error) {
        console.error("Failed to fetch dropdowns:", error);
      }
    };
    fetchDropdowns();
  }, []);

  // --- AUTO-FILL LOGIC (FIXED) ---
  useEffect(() => {
    // 1. Wait for everything to be ready
    if (!user || isFinanceManager || departmentOptions.length === 0) return;

    let targetDeptId = "";
    let targetDeptName = "";

    console.log("🔍 Auto-fill Attempt. User:", user);

    // 2. Try ID directly (if available)
    if (user.department_id) {
      targetDeptId = String(user.department_id);
      // Find name for display
      const match = departmentOptions.find(
        (d) => String(d.id) === targetDeptId
      );
      if (match) targetDeptName = match.label;
    }
    // 3. Fallback: Match by Name (The likely scenario based on your logs)
    else if (user.department) {
      const userDeptName = user.department; // "Operations Department"
      console.log("👉 Trying to match name:", userDeptName);

      // Find option where label matches user.department
      const match = departmentOptions.find((d) => d.label === userDeptName);

      if (match) {
        console.log("✅ Match Found:", match);
        targetDeptId = String(match.id); // Use the ID from the dropdown option
        targetDeptName = match.label;
      } else {
        console.warn("❌ No match found in options:", departmentOptions);
      }
    }

    // 4. Update State if found
    if (targetDeptId) {
      console.log("🚀 Setting State:", targetDeptId, targetDeptName);
      setRequestData((prev) => ({
        ...prev,
        department_input: targetDeptId,
        department_display: targetDeptName,
      }));
    }
  }, [user, isFinanceManager, departmentOptions]);

  // Filtered Projects (Derived State)
  const availableProjects = projects.filter((p) => {
    // If Operator, filter by their department ID
    if (!isFinanceManager && user.department_id) {
      // If project API returns department_id, compare.
      // If it only returns department_name, we compare that.
      // Assuming p.department_id exists (standard practice)
      if (p.department_id)
        return String(p.department_id) === String(user.department_id);
      // Fallback to name
      if (p.department_name) return p.department_name === user.department_name;
    }
    return true;
  });

  // 4. Handle Project Selection -> Fetch Categories
  const handleRequestProjectChange = async (projectId) => {
    // Update state
    setRequestData((prev) => ({
      ...prev,
      project_id: projectId,
      category_id: "", // Reset category when project changes
    }));

    if (!projectId) {
      setProjectCategories([]);
      return;
    }

    try {
      const res = await getExpenseCategories(projectId);
      setProjectCategories(res.data);
    } catch (error) {
      console.error("Failed to fetch categories for project", error);
    }
  };

  // --- PROJECT FILTERING (FIXED) ---
  const filteredProjects = projects
    .filter((p) => {
      // Strict Filter: Only show projects belonging to the selected department
      // We use requestData.department_input which is now reliably "4" (String)
      if (requestData.department_input) {
        // Check if project has a department field.
        // Based on simpleProjectSerializer, it usually has 'department' (ID) or 'department_name'
        // Let's check both to be safe.

        // If project.department is ID (e.g. 4)
        if (p.department == requestData.department_input) return true;

        // If project has department_id
        if (p.department_id == requestData.department_input) return true;

        // If we only have name, we can't strict match ID, but we should have ID.
        return false;
      }
      return true; // Show all if no department selected (e.g. Finance Manager view)
    })
    .map((p) => ({
      value: p.id,
      label: p.name,
    }));

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

  const fetchAdjustments = useCallback(async () => {
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
  }, [
    currentPage,
    pageSize,
    debouncedSearchTerm,
    selectedCategory,
    selectedDepartment,
  ]);

  useEffect(() => {
    fetchAdjustments();
  }, [fetchAdjustments]);

  useEffect(() => {
    const timerId = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
      setCurrentPage(1);
    }, 500);
    return () => clearTimeout(timerId);
  }, [searchTerm]);

  // Fetch supplemental requests when tab is active
  useEffect(() => {
    if (activeTab === "supplementalBudget") {
      fetchSupplementalRequests();
    }
  }, [
    activeTab,
    supplementalCurrentPage,
    supplementalPageSize,
    supplementalDeptFilter,
    supplementalDateFilter,
    supplementalSearch,
    fetchSupplementalRequests,
  ]);

  // --- HANDLERS ---
  const closeAllDropdowns = () => {
    setShowBudgetDropdown(false);
    setShowExpenseDropdown(false);
    setShowCategoryDropdown(false);
    setShowDepartmentDropdown(false);
    setShowProfileDropdown(false);
    setShowNotifications(false);
    setShowSupplementalDeptDropdown(false);
    setShowActionDropdown(false);
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
  const toggleSupplementalDeptDropdown = () => {
    const s = !showSupplementalDeptDropdown;
    closeAllDropdowns();
    setShowSupplementalDeptDropdown(s);
  };
  const toggleActionDropdown = () => {
    const s = !showActionDropdown;
    closeAllDropdowns();
    setShowActionDropdown(s);
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
  const handleSupplementalDeptSelect = (val) => {
    setSupplementalDeptFilter(val);
    closeAllDropdowns();
    setSupplementalCurrentPage(1);
  };
  const handleActionSelect = (action) => {
    setSelectedAction(action);
    closeAllDropdowns();

    if (action === "add") {
      if (isFinanceManager) {
        // Finance Manager adds via direct adjustment (existing modal)
        openModalWithAction();
      } else {
        // Operator requests supplemental budget (new modal)
        setShowRequestModal(true);
      }
    } else if (action === "modify") {
      if (selectedRowId) {
        openModalWithAction();
      }
    }
  };

  const getCategoryDisplay = () =>
    categoryOptions.find((o) => o.value === selectedCategory)?.label ||
    "All Categories";
  const getDepartmentDisplay = () =>
    departmentOptions.find((o) => o.value === selectedDepartment)?.label ||
    "All Departments";
  const getActionDisplay = () => {
    return selectedAction === "modify" ? "Modify Budget" : "Add Budget";
  };

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

  const openModalWithAction = () => {
    setModalType(selectedAction);

    if (selectedAction === "modify") {
      // For Modify Budget, we need a selected row
      if (!selectedRowId) {
        // Don't show alert, just return
        return;
      }
      const selectedEntry = adjustments.find((e) => e.id === selectedRowId);
      if (!selectedEntry) return;

      setModalData({
        id: selectedEntry.id,
        ticket_id: selectedEntry.ticket_id,
        date: getISODate(),
        department: selectedEntry.department_name || "",
        category: selectedEntry.category || "",
        debit_account: selectedEntry.debit_account || "",
        credit_account: selectedEntry.credit_account || "",
        amount: formatAmountForModal(selectedEntry.amount),
      });
    } else {
      // For Add Budget, start with empty form
      setModalData({
        id: null,
        ticket_id: "", // REMOVED: "N/A" placeholder
        date: getISODate(),
        department: "",
        category: "",
        debit_account: "",
        credit_account: "",
        amount: "",
      });
    }

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
      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal((prev) => ({ ...prev, isOpen: false }))}
        confirmColor={confirmModal.confirmColor}
      />

      {/* Success Modal */}
      {showSuccess && (
        <div
          className="success-modal-overlay"
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0,0,0,0.5)",
            zIndex: 3000,
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <div
            style={{
              backgroundColor: "white",
              padding: "24px",
              borderRadius: "8px",
              textAlign: "center",
            }}
          >
            <h3 style={{ color: "#28a745" }}>Success!</h3>
            <p>Action completed successfully.</p>
          </div>
        </div>
      )}

      {/* View Details Modal */}
      {showDetailsModal && selectedRequest && (
        <ViewDetailsModal
          request={selectedRequest}
          onClose={() => setShowDetailsModal(false)}
          onApprove={handleApproveRequest}
          onReject={handleRejectRequest}
        />
      )}

      {/* Audit Log Modal */}
      {showAuditModal && (
        <AuditLogModal
          logs={auditLogs}
          onClose={() => setShowAuditModal(false)}
        />
      )}

      {/* Navigation Bar */}
      <nav
        className="navbar"
        style={{ position: "static", marginBottom: "20px" }}
      >
        {/* ... [Keep your existing navbar content exactly as it is] ... */}
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
                style={{ outline: "none", cursor: "pointer" }}
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
                style={{ outline: "none", cursor: "pointer" }}
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
                      style={{ outline: "none", cursor: "pointer" }}
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
        style={{
          padding: "10px 20px",
          maxWidth: "1400px",
          margin: "0 auto",
          width: "95%",
        }}
      >
        {/* Conditionally render either BudgetAllocation content or ManageProfile */}
        {showManageProfile ? (
          <ManageProfile onClose={handleCloseManageProfile} />
        ) : (
          /* Page Container for everything - Updated with Tab functionality */
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
              minHeight: "calc(90vh - 140px)", // Adjusted height as requested
            }}
          >
            {/* Tab Navigation with Date Filter on the right side */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "20px",
              }}
            >
              <div
                className="tab-navigation"
                style={{
                  display: "flex",
                  borderBottom: "1px solid #e0e0e0",
                  flex: 1,
                }}
              >
                <button
                  className={`tab-button ${
                    activeTab === "budgetAdjustment" ? "active" : ""
                  }`}
                  onClick={() => setActiveTab("budgetAdjustment")}
                  style={{
                    padding: "10px 20px",
                    border: "none",
                    backgroundColor: "transparent",
                    cursor: "pointer",
                    fontSize: "16px",
                    fontWeight:
                      activeTab === "budgetAdjustment" ? "600" : "400",
                    color:
                      activeTab === "budgetAdjustment" ? "#007bff" : "#666",
                    borderBottom:
                      activeTab === "budgetAdjustment"
                        ? "2px solid #007bff"
                        : "none",
                    outline: "none",
                  }}
                >
                  Budget Adjustment
                </button>
                <button
                  className={`tab-button ${
                    activeTab === "supplementalBudget" ? "active" : ""
                  }`}
                  onClick={() => setActiveTab("supplementalBudget")}
                  style={{
                    padding: "10px 20px",
                    border: "none",
                    backgroundColor: "transparent",
                    cursor: "pointer",
                    fontSize: "16px",
                    fontWeight:
                      activeTab === "supplementalBudget" ? "600" : "400",
                    color:
                      activeTab === "supplementalBudget" ? "#007bff" : "#666",
                    borderBottom:
                      activeTab === "supplementalBudget"
                        ? "2px solid #007bff"
                        : "none",
                    outline: "none",
                  }}
                >
                  Supplemental Budget Approval
                </button>
              </div>

              {/* Date Filter placed on the right side of tab navigation */}
              <div style={{ marginLeft: "20px" }}>
                <DateFilter
                  dateFilter={supplementalDateFilter}
                  setDateFilter={setSupplementalDateFilter}
                />
              </div>
            </div>

            {/* Conditional Rendering Based on Active Tab */}
            {activeTab === "budgetAdjustment" ? (
              /* BUDGET ADJUSTMENT CONTENT (Existing Content) */
              <>
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
                                selectedDepartment === dept.value
                                  ? "active"
                                  : ""
                              }`}
                              onClick={() => handleDepartmentSelect(dept.value)}
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
                                selectedCategory === category.value
                                  ? "active"
                                  : ""
                              }`}
                              onClick={() =>
                                handleCategorySelect(category.value)
                              }
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

                    {/* UPDATED: Single Blue Button with Dropdown for Modify/Add Budget */}
                    {isFinanceManager && (
                      <div
                        className="filter-dropdown"
                        style={{ position: "relative" }}
                      >
                        <button
                          className={`filter-dropdown-btn ${
                            showActionDropdown ? "active" : ""
                          }`}
                          onClick={toggleActionDropdown}
                          style={{
                            padding: "8px 16px",
                            border: "none",
                            borderRadius: "4px",
                            backgroundColor: "#007bff",
                            color: "white",
                            display: "flex",
                            alignItems: "center",
                            gap: "5px",
                            outline: "none",
                            minWidth: "140px",
                            cursor: "pointer",
                            fontWeight: "500",
                            fontSize: "14px",
                          }}
                        >
                          <span>{getActionDisplay()}</span>
                          <ChevronDown size={14} />
                        </button>
                        {showActionDropdown && (
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
                              boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
                            }}
                          >
                            <div
                              className={`category-dropdown-item ${
                                selectedAction === "modify" ? "active" : ""
                              }`}
                              onClick={() => handleActionSelect("modify")}
                              style={{
                                padding: "8px 12px",
                                cursor: "pointer",
                                backgroundColor:
                                  selectedAction === "modify"
                                    ? "#f0f0f0"
                                    : "white",
                                outline: "none",
                                fontSize: "14px",
                              }}
                            >
                              Modify Budget
                            </div>
                            <div
                              className={`category-dropdown-item ${
                                selectedAction === "add" ? "active" : ""
                              }`}
                              onClick={() => handleActionSelect("add")}
                              style={{
                                padding: "8px 12px",
                                cursor: "pointer",
                                backgroundColor:
                                  selectedAction === "add"
                                    ? "#f0f0f0"
                                    : "white",
                                outline: "none",
                                fontSize: "14px",
                              }}
                            >
                              Add Budget
                            </div>
                          </div>
                        )}
                      </div>
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
                            fontSize: "14px",
                            color: "#495057",
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
                            fontSize: "14px",
                            color: "#495057",
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
                            fontSize: "14px",
                            color: "#495057",
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
                            fontSize: "14px",
                            color: "#495057",
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
                            fontSize: "14px",
                            color: "#495057",
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
                            fontSize: "14px",
                            color: "#495057",
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
                            fontSize: "14px",
                            color: "#495057",
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
                            style={{
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
                              {getCompactDepartmentName(
                                entry.department_name
                              ) || "N/A"}
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
              </>
            ) : (
              /* SUPPLEMENTAL BUDGET CONTENT - UPDATED TO MATCH BUDGET ADJUSTMENT LAYOUT */
              <>
                {/* Header Section - Matching Budget Adjustment Layout */}
                <div
                  className="top"
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: "20px",
                  }}
                >
                  <h2 className="page-title">Supplemental Budget Approval</h2>
                  <div
                    className="controls-container"
                    style={{
                      display: "flex",
                      gap: "10px",
                      alignItems: "center",
                    }}
                  >
                    {/* Search Input - Matching Budget Adjustment */}
                    <div style={{ position: "relative" }}>
                      <label
                        htmlFor="supplemental-search"
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
                        id="supplemental-search"
                        name="search"
                        autoComplete="off"
                        placeholder="Search"
                        value={supplementalSearch}
                        onChange={(e) => setSupplementalSearch(e.target.value)}
                        className="search-account-input"
                        style={{
                          padding: "8px 12px",
                          border: "1px solid #ccc",
                          borderRadius: "4px",
                          outline: "none",
                          width: "180px",
                        }}
                      />
                    </div>

                    {/* Department Filter - Matching Budget Adjustment Layout */}
                    <div
                      className="filter-dropdown"
                      style={{ position: "relative" }}
                    >
                      <button
                        className={`filter-dropdown-btn ${
                          showSupplementalDeptDropdown ? "active" : ""
                        }`}
                        onClick={toggleSupplementalDeptDropdown}
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
                        {/* Added truncation styling to match Budget Adjustment */}
                        <span
                          style={{
                            flex: 1,
                            textAlign: "left",
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          }}
                        >
                          {getSupplementalDeptDisplay()}
                        </span>
                        <ChevronDown size={14} style={{ flexShrink: 0 }} />
                      </button>
                      {showSupplementalDeptDropdown && (
                        <div
                          className="category-dropdown-menu"
                          style={{
                            position: "absolute",
                            top: "100%",
                            left: 0,
                            backgroundColor: "white",
                            border: "1px solid #ccc",
                            borderRadius: "4px",
                            width: "250px", // Same width as Budget Adjustment
                            zIndex: 1000,
                            maxHeight: "300px",
                            overflowY: "auto",
                            boxShadow: "0 4px 6px rgba(0,0,0,0.1)", // Same shadow
                          }}
                        >
                          {departmentOptions.map((dept) => (
                            <div
                              key={dept.value}
                              className={`category-dropdown-item ${
                                supplementalDeptFilter === dept.value
                                  ? "active"
                                  : ""
                              }`}
                              onClick={() =>
                                handleSupplementalDeptSelect(dept.value)
                              }
                              style={{
                                padding: "8px 12px", // Same padding
                                cursor: "pointer",
                                backgroundColor:
                                  supplementalDeptFilter === dept.value
                                    ? "#f0f0f0"
                                    : "white",
                                outline: "none",
                                // Ensure text wraps if needed in the expanded menu
                                whiteSpace: "normal",
                                borderBottom: "1px solid #f0f0f0", // Same border
                                fontSize: "14px", // Same font size
                              }}
                            >
                              {dept.label}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Operator Request Button - Visible if NOT Finance Manager */}
                    {!isFinanceManager && (
                      <button
                        onClick={() => setShowRequestModal(true)}
                        style={{
                          padding: "8px 16px",
                          background: "#28a745",
                          color: "white",
                          border: "none",
                          borderRadius: "4px",
                          cursor: "pointer",
                          fontWeight: "500",
                          fontSize: "14px",
                          whiteSpace: "nowrap",
                        }}
                      >
                        + Request Supplemental
                      </button>
                    )}

                    {/* Audit Log Button - Updated to match styling and remove black outline */}
                    {isFinanceManager && (
                      <button
                        onClick={handleViewAuditLogs}
                        style={{
                          padding: "8px 16px",
                          border: "none",
                          borderRadius: "4px",
                          backgroundColor: "#007bff",
                          color: "white",
                          cursor: "pointer",
                          outline: "none",
                          fontSize: "14px",
                          whiteSpace: "nowrap",
                          fontWeight: "500",
                        }}
                      >
                        Audit Logs
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

                {/* Supplemental Requests Table - Updated to match Budget Adjustment fonts and styling */}
                <div
                  style={{
                    flex: "1 1 auto",
                    overflowY: "auto",
                    border: "1px solid #e0e0e0",
                    borderRadius: "4px",
                  }}
                >
                  <table
                    className="supplemental-table"
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
                            fontSize: "14px",
                            color: "#495057",
                          }}
                        >
                          REQUEST ID
                        </th>
                        <th
                          style={{
                            width: "18%",
                            padding: "0.75rem",
                            textAlign: "left",
                            borderBottom: "2px solid #dee2e6",
                            fontWeight: "600",
                            fontSize: "14px",
                            color: "#495057",
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
                            fontSize: "14px",
                            color: "#495057",
                          }}
                        >
                          CATEGORY
                        </th>
                        <th
                          style={{
                            width: "10%",
                            padding: "0.75rem",
                            textAlign: "left",
                            borderBottom: "2px solid #dee2e6",
                            fontWeight: "600",
                            fontSize: "14px",
                            color: "#495057",
                          }}
                        >
                          REQUESTED AMOUNT
                        </th>
                        <th
                          style={{
                            width: "15%",
                            padding: "0.75rem",
                            textAlign: "left",
                            borderBottom: "2px solid #dee2e6",
                            fontWeight: "600",
                            fontSize: "14px",
                            color: "#495057",
                          }}
                        >
                          DATE SUBMITTED
                        </th>
                        <th
                          style={{
                            width: "15%",
                            padding: "0.75rem",
                            textAlign: "left",
                            borderBottom: "2px solid #dee2e6",
                            fontWeight: "600",
                            fontSize: "14px",
                            color: "#495057",
                          }}
                        >
                          STATUS
                        </th>
                        <th
                          style={{
                            width: "15%",
                            padding: "0.75rem",
                            textAlign: "left",
                            borderBottom: "2px solid #dee2e6",
                            fontWeight: "600",
                            fontSize: "14px",
                            color: "#495057",
                          }}
                        >
                          ACTIONS
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {supplementalLoading ? (
                        <tr>
                          <td
                            colSpan="7"
                            style={{ textAlign: "center", padding: "20px" }}
                          >
                            Loading...
                          </td>
                        </tr>
                      ) : supplementalRequests.length > 0 ? (
                        supplementalRequests.map((request, index) => (
                          <tr
                            key={request.id}
                            style={{
                              height: "50px",
                              backgroundColor:
                                index % 2 === 1 ? "#F8F8F8" : "#FFFFFF",
                              borderBottom: "1px solid #dee2e6",
                            }}
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
                              {request.request_id}
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
                              {getCompactDepartmentName(
                                request.department_name
                              ) || "N/A"}
                            </td>
                            <td
                              style={{
                                padding: "0.75rem",
                                borderBottom: "1px solid #dee2e6",
                                fontSize: "14px",
                                fontWeight: "400",
                                color: "#000000",
                                textAlign: "left",
                              }}
                            >
                              {request.category_name}
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
                              ₱
                              {parseFloat(request.amount).toLocaleString(
                                "en-US",
                                {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2,
                                }
                              )}
                            </td>
                            <td
                              style={{
                                padding: "0.75rem",
                                borderBottom: "1px solid #dee2e6",
                                fontSize: "14px",
                                color: "#000000",
                              }}
                            >
                              {request.date_submitted}
                            </td>
                            <td
                              style={{
                                padding: "0.75rem",
                                borderBottom: "1px solid #dee2e6",
                                fontSize: "14px",
                                color: "#000000",
                              }}
                            >
                              <StatusBadge status={request.status} />
                            </td>
                            <td
                              style={{
                                padding: "0.75rem",
                                borderBottom: "1px solid #dee2e6",
                                fontSize: "14px",
                                color: "#000000",
                                // FIX: Prevent overflow of action buttons
                                maxWidth: "110px",
                                minWidth: "90px",
                                width: "10%",
                                textAlign: "left",
                                verticalAlign: "middle",
                                overflow: "visible",
                              }}
                            >
                              {/* Only FM can see action buttons */}
                              {isFinanceManager &&
                              request.status === "PENDING" ? (
                                <div style={{ display: "flex", gap: "5px" }}>
                                  <button
                                    onClick={() =>
                                      handleApproveRequest(request.id)
                                    }
                                    style={{
                                      background: "#28a745",
                                      color: "white",
                                      border: "none",
                                      padding: "4px 8px",
                                      borderRadius: "4px",
                                      cursor: "pointer",
                                      fontSize: "12px",
                                    }}
                                  >
                                    Approve
                                  </button>
                                  <button
                                    onClick={() =>
                                      handleRejectRequest(request.id)
                                    }
                                    style={{
                                      background: "#dc3545",
                                      color: "white",
                                      border: "none",
                                      padding: "4px 8px",
                                      borderRadius: "4px",
                                      cursor: "pointer",
                                      fontSize: "12px",
                                    }}
                                  >
                                    Reject
                                  </button>
                                </div>
                              ) : (
                                // Optional: View button for everyone (if details modal supports it)
                                <button
                                  onClick={() => handleViewDetails(request)}
                                  style={{
                                    padding: "6px 12px",
                                    border: "none",
                                    borderRadius: "4px",
                                    backgroundColor: "#007bff",
                                    color: "white",
                                    cursor: "pointer",
                                    fontSize: "13px",
                                    outline: "none",
                                  }}
                                >
                                  View
                                </button>
                              )}
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
                            No pending supplemental requests found.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Pagination for Supplemental Requests - Matching Budget Adjustment */}
                {supplementalPagination.count > 0 && !supplementalLoading && (
                  <Pagination
                    currentPage={supplementalCurrentPage}
                    pageSize={supplementalPageSize}
                    totalItems={supplementalPagination.count}
                    onPageChange={setSupplementalCurrentPage}
                    onPageSizeChange={setSupplementalPageSize}
                    pageSizeOptions={[5, 10, 20, 50]}
                  />
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* Modify/Add Budget Modal */}
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
                  : "Add New Budget Entry"}
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

                {/* Ticket ID - UPDATED: Removed "N/A" placeholder */}
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
                  {/* REMOVED: Helper text "Will be generated by system" */}
                </div>

                {/* Date - UPDATED: Removed "Auto-generated: Current date" helper text */}
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
                  {/* REMOVED: Helper text "Auto-generated: Current date" */}
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
                        cursor: "pointer",
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
                        cursor: "pointer",
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
                        cursor: modalData.department
                          ? "pointer"
                          : "not-allowed",
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
                        cursor: modalData.department
                          ? "pointer"
                          : "not-allowed",
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
                      onClick={closeModal}
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

      {/* --- MODIFICATION START: Updated Request Modal --- */}
      {/* REQUEST MODAL (OPERATOR) */}
      {showRequestModal && (
        <div
          className="modal-overlay"
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.5)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 2000,
          }}
        >
          <div
            style={{
              background: "white",
              padding: "24px",
              borderRadius: "8px",
              width: "500px",
              boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
            }}
          >
            <h3 style={{ marginBottom: "20px" }}>
              Request Supplemental Budget
            </h3>
            <form onSubmit={handleSupplementalSubmit}>
              {/* Department (Read-Only Display) */}
              <div style={{ marginBottom: "15px" }}>
                <label
                  style={{
                    display: "block",
                    marginBottom: "5px",
                    fontWeight: "500",
                  }}
                >
                  Department
                </label>
                <input
                  type="text"
                  value={requestData.department_display || "All Departments"}
                  disabled
                  className="form-control"
                  style={{
                    backgroundColor: "#f5f5f5",
                    width: "100%",
                    padding: "8px",
                    border: "1px solid #ccc",
                    borderRadius: "4px",
                  }}
                />
                {!isFinanceManager && (
                  <small style={{ color: "#666" }}>
                    Auto-selected based on your profile.
                  </small>
                )}
              </div>
              {/* Project (Searchable) */}
              <div style={{ marginBottom: "15px" }}>
                <label
                  style={{
                    display: "block",
                    marginBottom: "5px",
                    fontWeight: "500",
                  }}
                >
                  Project
                </label>
                <SearchableSelect
                  options={filteredProjects} // Use the filtered list
                  value={parseInt(requestData.project_id)}
                  onChange={handleRequestProjectChange} // Use the new handler
                  placeholder="Select Project..."
                />
              </div>
              {/* Category (Filtered by Project) */}
              <div style={{ marginBottom: "15px" }}>
                <label
                  style={{
                    display: "block",
                    marginBottom: "5px",
                    fontWeight: "500",
                  }}
                >
                  Category
                </label>
                <select
                  value={requestData.category_id}
                  onChange={(e) =>
                    setRequestData({
                      ...requestData,
                      category_id: e.target.value,
                    })
                  }
                  className="form-control"
                  required
                  disabled={!requestData.project_id} // Disable if no project
                >
                  <option value="">Select Category</option>
                  {/* Use projectCategories instead of modalDropdowns.expenseCategories */}
                  {projectCategories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name} ({cat.classification})
                    </option>
                  ))}
                </select>
              </div>
              {/* Amount */}
              <div style={{ marginBottom: "15px" }}>
                <label
                  style={{
                    display: "block",
                    marginBottom: "5px",
                    fontWeight: "500",
                  }}
                >
                  Amount
                </label>
                <input
                  type="number"
                  value={requestData.amount}
                  onChange={(e) =>
                    setRequestData({ ...requestData, amount: e.target.value })
                  }
                  className="form-control"
                  style={{
                    width: "100%",
                    padding: "8px",
                    border: "1px solid #ccc",
                    borderRadius: "4px",
                  }}
                  required
                  step="0.01"
                  min="0.01"
                />
              </div>
              {/* Reason */}
              <div style={{ marginBottom: "20px" }}>
                <label
                  style={{
                    display: "block",
                    marginBottom: "5px",
                    fontWeight: "500",
                  }}
                >
                  Justification
                </label>
                <textarea
                  value={requestData.reason}
                  onChange={(e) =>
                    setRequestData({ ...requestData, reason: e.target.value })
                  }
                  className="form-control"
                  style={{
                    width: "100%",
                    padding: "8px",
                    border: "1px solid #ccc",
                    borderRadius: "4px",
                    minHeight: "80px",
                  }}
                  required
                ></textarea>
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  gap: "10px",
                }}
              >
                <button
                  type="button"
                  onClick={() => setShowRequestModal(false)}
                  style={{
                    padding: "8px 16px",
                    border: "1px solid #ccc",
                    background: "white",
                    borderRadius: "4px",
                    cursor: "pointer",
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{
                    padding: "8px 16px",
                    border: "none",
                    background: "#007bff",
                    color: "white",
                    borderRadius: "4px",
                    cursor: "pointer",
                  }}
                >
                  Submit Request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* --- MODIFICATION END --- */}
    </div>
  );
}
export default BudgetAllocation;
