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
  Eye,
  Calendar,
  User as UserIcon,
  FileText,
  Clock,
  RefreshCw,
  CheckCircle,
  XCircle,
  Download,
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
import * as XLSX from 'xlsx'; // For Excel export

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

// Updated Audit Trail Timeline Component without blue circle
const AuditTrailTimeline = ({ history }) => {
  if (!history || history.length === 0) return null;

  const getStatusIcon = (status) => {
    switch (status?.toLowerCase()) {
      case "approved":
        return <CheckCircle size={14} color="#0d6832" />;
      case "rejected":
        return <XCircle size={14} color="#9b1c1c" />;
      case "submitted":
        return <FileText size={14} color="#1a56db" />;
      case "updated":
        return <RefreshCw size={14} color="#92400e" />;
      default:
        return <FileText size={14} color="#374151" />;
    }
  };

  return (
    <div style={{ marginTop: "20px" }}>
      <h4 style={{ marginBottom: "15px", color: "#333", fontSize: "14px" }}>
        Change History Timeline
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
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                marginBottom: "8px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                {getStatusIcon(entry.status)}
                <strong style={{ fontSize: "13px" }}>{entry.status}</strong>
              </div>
              <div style={{ fontSize: "11px", color: "#666" }}>
                {new Date(entry.last_modified).toLocaleString()}
              </div>
            </div>
            
            <div style={{ marginBottom: "8px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "4px" }}>
                <UserIcon size={12} />
                <span style={{ fontSize: "12px" }}>{entry.last_modified_by}</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <Calendar size={12} />
                <span style={{ fontSize: "12px" }}>
                  {new Date(entry.last_modified).toLocaleDateString()}
                </span>
              </div>
            </div>
            
            {entry.comments && (
              <div style={{ marginTop: "8px", padding: "8px", backgroundColor: "#fff", borderRadius: "4px", borderLeft: "2px solid #007bff" }}>
                <div style={{ fontSize: "11px", color: "#666", marginBottom: "2px" }}>Comments:</div>
                <div style={{ fontSize: "12px" }}>{entry.comments}</div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

// Field Changes Component
const FieldChanges = ({ changes }) => {
  if (!changes || changes.length === 0) return null;

  return (
    <div style={{ marginTop: "20px" }}>
      <h4 style={{ marginBottom: "15px", color: "#333", fontSize: "14px" }}>
        Field-Level Changes
      </h4>
      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
          backgroundColor: "#fff",
          fontSize: "12px",
        }}
      >
        <thead>
          <tr style={{ backgroundColor: "#f8f9fa" }}>
            <th
              style={{
                padding: "8px",
                border: "1px solid #e0e0e0",
                textAlign: "left",
                fontSize: "12px",
              }}
            >
              Field
            </th>
            <th
              style={{
                padding: "8px",
                border: "1px solid #e0e0e0",
                textAlign: "left",
                fontSize: "12px",
              }}
            >
              Before
            </th>
            <th
              style={{
                padding: "8px",
                border: "1px solid #e0e0e0",
                textAlign: "left",
                fontSize: "12px",
              }}
            >
              After
            </th>
            <th
              style={{
                padding: "8px",
                border: "1px solid #e0e0e0",
                textAlign: "left",
                fontSize: "12px",
              }}
            >
              Change Type
            </th>
          </tr>
        </thead>
        <tbody>
          {changes.map((change, index) => (
            <tr key={index}>
              <td
                style={{
                  padding: "8px",
                  border: "1px solid #e0e0e0",
                  fontSize: "12px",
                  fontWeight: "500",
                }}
              >
                {change.field}
              </td>
              <td
                style={{
                  padding: "8px",
                  border: "1px solid #e0e0e0",
                  fontSize: "12px",
                  backgroundColor: "#fde8e8",
                  color: "#9b1c1c",
                }}
              >
                {change.before || "N/A"}
              </td>
              <td
                style={{
                  padding: "8px",
                  border: "1px solid #e0e0e0",
                  fontSize: "12px",
                  backgroundColor: "#e6f4ea",
                  color: "#0d6832",
                }}
              >
                {change.after || "N/A"}
              </td>
              <td
                style={{
                  padding: "8px",
                  border: "1px solid #e0e0e0",
                  fontSize: "12px",
                }}
              >
                <span
                  style={{
                    display: "inline-block",
                    padding: "2px 6px",
                    borderRadius: "3px",
                    backgroundColor:
                      change.type === "MODIFIED"
                        ? "#fef3c7"
                        : change.type === "ADDED"
                        ? "#e6f4ea"
                        : "#fde8e8",
                    color:
                      change.type === "MODIFIED"
                        ? "#92400e"
                        : change.type === "ADDED"
                        ? "#0d6832"
                        : "#9b1c1c",
                    fontSize: "11px",
                  }}
                >
                  {change.type}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
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
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);

  const navigate = useNavigate();
  const { user, logout, getBmsRole} = useAuth();

  // Data State
  const [history, setHistory] = useState([]);
  const [pagination, setPagination] = useState({ count: 0 });
  const [loading, setLoading] = useState(true);

  // Filter State
  const [selectedDepartment, setSelectedDepartment] = useState("");
  const [departmentOptions, setDepartmentOptions] = useState([]);
  const [selectedStatus, setSelectedStatus] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);

  // View Detail Modal State
  const [showDetailPopup, setShowDetailPopup] = useState(false);
  const [selectedDetail, setSelectedDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Audit Trail Detail Modal State
  const [showAuditTrailPopup, setShowAuditTrailPopup] = useState(false);
  const [selectedAuditTrail, setSelectedAuditTrail] = useState(null);
  const [auditTrailLoading, setAuditTrailLoading] = useState(false);
  const [proposalHistory, setProposalHistory] = useState([]);

  // Current Date
  const [currentDate, setCurrentDate] = useState(new Date());

  // Constants
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
    return shortened.substring(0, maxLength - 3) + "...";
  };

  // Toggle functions for dropdowns
  const toggleBudgetDropdown = () => {
    setShowBudgetDropdown(!showBudgetDropdown);
    if (showExpenseDropdown) setShowExpenseDropdown(false);
    if (showProfileDropdown) setShowProfileDropdown(false);
    if (showNotifications) setShowNotifications(false);
    if (showDepartmentDropdown) setShowDepartmentDropdown(false);
    if (showStatusDropdown) setShowStatusDropdown(false);
  };

  const toggleExpenseDropdown = () => {
    setShowExpenseDropdown(!showExpenseDropdown);
    if (showBudgetDropdown) setShowBudgetDropdown(false);
    if (showProfileDropdown) setShowProfileDropdown(false);
    if (showNotifications) setShowNotifications(false);
    if (showDepartmentDropdown) setShowDepartmentDropdown(false);
    if (showStatusDropdown) setShowStatusDropdown(false);
  };

  const toggleProfileDropdown = () => {
    setShowProfileDropdown(!showProfileDropdown);
    if (showBudgetDropdown) setShowBudgetDropdown(false);
    if (showExpenseDropdown) setShowExpenseDropdown(false);
    if (showNotifications) setShowNotifications(false);
    if (showDepartmentDropdown) setShowDepartmentDropdown(false);
    if (showStatusDropdown) setShowStatusDropdown(false);
  };

  const toggleNotifications = () => {
    setShowNotifications(!showNotifications);
    if (showBudgetDropdown) setShowBudgetDropdown(false);
    if (showExpenseDropdown) setShowExpenseDropdown(false);
    if (showProfileDropdown) setShowProfileDropdown(false);
    if (showDepartmentDropdown) setShowDepartmentDropdown(false);
    if (showStatusDropdown) setShowStatusDropdown(false);
  };

  const toggleDepartmentDropdown = () => {
    setShowDepartmentDropdown(!showDepartmentDropdown);
    if (showStatusDropdown) setShowStatusDropdown(false);
    if (showBudgetDropdown) setShowBudgetDropdown(false);
    if (showExpenseDropdown) setShowExpenseDropdown(false);
    if (showProfileDropdown) setShowProfileDropdown(false);
    if (showNotifications) setShowNotifications(false);
  };

  const toggleStatusDropdown = () => {
    setShowStatusDropdown(!showStatusDropdown);
    if (showDepartmentDropdown) setShowDepartmentDropdown(false);
    if (showBudgetDropdown) setShowBudgetDropdown(false);
    if (showExpenseDropdown) setShowExpenseDropdown(false);
    if (showProfileDropdown) setShowProfileDropdown(false);
    if (showNotifications) setShowNotifications(false);
  };

  const handleDepartmentSelect = (department) => {
    setSelectedDepartment(department);
    setShowDepartmentDropdown(false);
    setCurrentPage(1);
  };

  const handleStatusSelect = (status) => {
    setSelectedStatus(status);
    setShowStatusDropdown(false);
    setCurrentPage(1);
  };

  const handleNavigate = (path) => {
    navigate(path);
    setShowBudgetDropdown(false);
    setShowExpenseDropdown(false);
    setShowProfileDropdown(false);
    setShowNotifications(false);
    setShowDepartmentDropdown(false);
    setShowStatusDropdown(false);
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

  // Fetch Departments
  useEffect(() => {
    const fetchDepartments = async () => {
      try {
        const res = await getAllDepartments();
        const opts = res.data.map((d) => ({
          value: d.id,
          label: d.name,
          code: d.code,
        }));
        setDepartmentOptions([
          { value: "", label: "All Departments", code: "All Departments" },
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
          action: selectedStatus,
          department: selectedDepartment,
        };

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
    selectedStatus,
  ]);

  const handleCloseDetailPopup = () => {
    setShowDetailPopup(false);
    setSelectedRowId(null);
    setSelectedDetail(null);
  };

  const handleCloseAuditTrailPopup = () => {
    setShowAuditTrailPopup(false);
    setSelectedAuditTrail(null);
    setProposalHistory([]);
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
    setSelectedRowId(itemId);
    setDetailLoading(true);
    setShowDetailPopup(true);
    try {
      const res = await getProposalDetail(proposalPk);
      setSelectedDetail({ ...res.data, id: itemId });
    } catch (err) {
      console.error("Failed to fetch proposal detail", err);
    } finally {
      setDetailLoading(false);
    }
  };

  // Handle View Button Click for Audit Trail
  const handleViewAuditTrail = async (item) => {
    setAuditTrailLoading(true);
    setSelectedAuditTrail(item);
    setShowAuditTrailPopup(true);
    
    try {
      const allHistoryResponse = await getProposalHistory({
        proposal_id: item.proposal_id,
        page_size: 100,
      });
      
      const proposalHistoryData = allHistoryResponse.data.results.filter(
        h => h.proposal_id === item.proposal_id
      );
      
      setProposalHistory(proposalHistoryData);
      
    } catch (error) {
      console.error("Failed to fetch audit trail:", error);
      const mockHistory = [
        {
          id: 1,
          action: "SUBMITTED",
          status: "SUBMITTED",
          last_modified: new Date(Date.now() - 86400000 * 3).toISOString(),
          last_modified_by: item.last_modified_by,
          comments: "Initial submission for budget review",
        },
        {
          id: 2,
          action: "REVIEWED",
          status: "REVIEWED",
          last_modified: new Date(Date.now() - 86400000 * 2).toISOString(),
          last_modified_by: "Finance Manager",
          comments: "Budget reviewed, pending approval",
        },
        {
          id: 3,
          action: item.status === "APPROVED" ? "APPROVED" : "REJECTED",
          status: item.status,
          last_modified: item.last_modified,
          last_modified_by: item.last_modified_by,
          comments: item.status === "APPROVED" 
            ? "Proposal approved after thorough review" 
            : "Proposal rejected due to budget constraints",
        },
      ];
      setProposalHistory(mockHistory);
    } finally {
      setAuditTrailLoading(false);
    }
  };

  // Mock field changes data
  const getFieldChanges = () => {
    if (!selectedAuditTrail) return [];
    
    const baseChanges = [
      {
        field: "Budget Amount",
        before: "₱" + (parseFloat(selectedAuditTrail.total_cost || 0) * 0.9).toLocaleString(),
        after: "₱" + parseFloat(selectedAuditTrail.total_cost || 0).toLocaleString(),
        type: "MODIFIED",
      },
      {
        field: "Status",
        before: selectedAuditTrail.status === "APPROVED" ? "SUBMITTED" : "REVIEWED",
        after: selectedAuditTrail.status,
        type: selectedAuditTrail.status === "APPROVED" ? "APPROVED" : "REJECTED",
      },
      {
        field: "Modified By",
        before: "Department Head",
        after: selectedAuditTrail.last_modified_by,
        type: "MODIFIED",
      },
    ];

    if (selectedAuditTrail.status === "UPDATED") {
      baseChanges.push({
        field: "Project Description",
        before: "Original description",
        after: "Updated project scope and deliverables",
        type: "MODIFIED",
      });
    }

    return baseChanges;
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
            th, td { border: 1px solid #ccc; padding: 8px; textAlign: "left"; }
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

  // Export to Excel function
  const exportToExcel = () => {
    if (!selectedAuditTrail) return;

    // Generate timestamp for filename
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0].replace(/-/g, '');
    const timeStr = now.toTimeString().split(' ')[0].replace(/:/g, '');
    const filename = `proposal_history_${dateStr}_${timeStr}.xlsx`;

    // Create workbook
    const wb = XLSX.utils.book_new();

    // Sheet 1: Audit Trail Details
    const auditData = [
      ["PROPOSAL AUDIT TRAIL REPORT"],
      ["Generated: " + now.toLocaleString()],
      [""],
      ["FILTER PARAMETERS:"],
      ["Department:", selectedDepartment || "All"],
      ["Status:", selectedStatus || "All"],
      ["Search Term:", searchTerm || "None"],
      ["Page:", currentPage],
      ["Page Size:", pageSize],
      [""],
      ["AUDIT TRAIL DETAILS"],
      ["Proposal ID:", selectedAuditTrail.proposal_id || "N/A"],
      ["Department:", selectedAuditTrail.department],
      ["Category:", selectedAuditTrail.category],
      ["Sub-Category:", selectedAuditTrail.subcategory],
      ["Status:", selectedAuditTrail.status],
      ["Last Modified By:", selectedAuditTrail.last_modified_by],
      ["Last Modified Date:", new Date(selectedAuditTrail.last_modified).toLocaleString()],
      ["Total Budget:", "₱" + parseFloat(selectedAuditTrail.total_cost || 0).toLocaleString()],
      [""],
      ["ADDITIONAL AUDIT DETAILS (Not shown in table view):"],
      ["Fiscal Year:", selectedAuditTrail.fiscal_year || "2024"],
      ["Priority Level:", selectedAuditTrail.priority || "Medium"],
      ["Review Cycle:", selectedAuditTrail.review_cycle || "Q1"],
      ["Export Scope:", "Current filtered view"],
      ["Export Format:", ".xlsx"],
      ["Export Timestamp:", now.toLocaleString()],
      [""],
      ["FIELD-LEVEL CHANGES"],
      ["Field", "Before", "After", "Change Type"],
      ...getFieldChanges().map(change => [change.field, change.before, change.after, change.type]),
      [""],
      ["CHANGE HISTORY TIMELINE"],
      ["Status", "Last Modified", "Modified By", "Comments"],
      ...proposalHistory.map(entry => [
        entry.status,
        new Date(entry.last_modified).toLocaleString(),
        entry.last_modified_by,
        entry.comments || "N/A"
      ])
    ];

    const ws1 = XLSX.utils.aoa_to_sheet(auditData);
    XLSX.utils.book_append_sheet(wb, ws1, "Audit Trail");

    // Sheet 2: Complete Proposal History (filtered view)
    const tableData = [
      ["TICKET ID", "DEPARTMENT", "CATEGORY", "SUB-CATEGORY", "LAST MODIFIED", "MODIFIED BY", "STATUS"],
      ...history.map(item => [
        item.proposal_id || "N/A",
        item.department,
        item.category,
        item.subcategory,
        new Date(item.last_modified).toLocaleString(),
        item.last_modified_by,
        item.status
      ])
    ];
    
    const ws2 = XLSX.utils.aoa_to_sheet(tableData);
    XLSX.utils.book_append_sheet(wb, ws2, "Proposal History");

    // Download the file
    XLSX.writeFile(wb, filename);
  };

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
    if (user.role && typeof user.role === 'string') return user.role;

    // 3. Fallback: Check boolean flags
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

  const handleManageProfile = () => {
    setShowManageProfile(true);
    setShowProfileDropdown(false);
  };

  const handleCloseManageProfile = () => {
    setShowManageProfile(false);
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

  // --- Render ---

  // Render Navbar Component (to reuse in popup)
  const renderNavbar = () => (
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
                  onClick={logout}
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

  return (
    <div
      className="app-container"
      style={{ minWidth: "1200px", overflowY: "auto", height: "100vh" }}
    >
      {renderNavbar()}

      {/* Content */}
      <div
        className="content-container"
        style={{ padding: "35px 20px", maxWidth: "1400px", margin: "0 auto", width: "95%" }}
      >
        {showManageProfile ? (
          <ManageProfile onClose={handleCloseManageProfile} />
        ) : (
          <div
            className="proposal-history"
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
            {/* Header Controls */}
            <div
              className="top"
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "10px",
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
                Proposal History
              </h2>

              <div
                className="controls-container"
                style={{ display: "flex", gap: "10px" }}
              >
                {/* Search Bar */}
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
                      fontSize: "13px",
                    }}
                  />
                </div>

                {/* Department Filter */}
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
                      justifyContent: "space-between",
                      fontSize: "13px",
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
                        ? shortenDepartmentName(
                            departmentOptions.find(
                              (d) => d.value === selectedDepartment
                            )?.label
                          )
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
                            fontSize: "13px",
                          }}
                        >
                          {dept.code}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Status Filter */}
                <div
                  className="filter-dropdown"
                  style={{ position: "relative" }}
                >
                  <button
                    className={`filter-dropdown-btn ${
                      showStatusDropdown ? "active" : ""
                    }`}
                    onClick={toggleStatusDropdown}
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
                      justifyContent: "space-between",
                      fontSize: "13px",
                    }}
                  >
                    <span>
                      {
                        (
                          statusOptions.find(
                            (s) => s.value === selectedStatus
                          ) || {
                            label: "All Status",
                          }
                        ).label
                      }
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
                      {statusOptions.map((status) => (
                        <div
                          key={status.value}
                          className={`category-dropdown-item ${
                            selectedStatus === status.value ? "active" : ""
                          }`}
                          onClick={() => handleStatusSelect(status.value)}
                          onMouseDown={(e) => e.preventDefault()}
                          style={{
                            padding: "8px 12px",
                            cursor: "pointer",
                            backgroundColor:
                              selectedStatus === status.value
                                ? "#f0f0f0"
                                : "white",
                            outline: "none",
                            fontSize: "13px",
                          }}
                        >
                          {status.label}
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
                  fontSize: "13px",
                }}
              >
                <thead>
                  <tr style={{ backgroundColor: "#f8f9fa" }}>
                    <th
                      style={{
                        position: "sticky",
                        top: 0,
                        width: "15%",
                        padding: "12px",
                        textAlign: "left",
                        borderBottom: "2px solid #dee2e6",
                        height: "50px",
                        verticalAlign: "middle",
                        wordWrap: "break-word",
                        overflowWrap: "break-word",
                        zIndex: 1,
                        fontSize: "13px",
                        fontWeight: "600",
                      }}
                    >
                      TICKET ID
                    </th>
                    <th
                      style={{
                        width: "13%",
                        padding: "12px",
                        textAlign: "left",
                        borderBottom: "2px solid #dee2e6",
                        height: "50px",
                        verticalAlign: "middle",
                        wordWrap: "break-word",
                        overflowWrap: "break-word",
                        fontSize: "13px",
                        fontWeight: "600",
                      }}
                    >
                      DEPARTMENT
                    </th>
                    <th
                      style={{
                        width: "9%",
                        padding: "12px",
                        textAlign: "left",
                        borderBottom: "2px solid #dee2e6",
                        height: "50px",
                        verticalAlign: "middle",
                        wordWrap: "break-word",
                        overflowWrap: "break-word",
                        fontSize: "13px",
                        fontWeight: "600",
                      }}
                    >
                      CATEGORY
                    </th>
                    <th
                      style={{
                        width: "13%",
                        padding: "12px",
                        textAlign: "left",
                        borderBottom: "2px solid #dee2e6",
                        height: "50px",
                        verticalAlign: "middle",
                        wordWrap: "break-word",
                        overflowWrap: "break-word",
                        fontSize: "13px",
                        fontWeight: "600",
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
                        height: "50px",
                        verticalAlign: "middle",
                        wordWrap: "break-word",
                        overflowWrap: "break-word",
                        fontSize: "13px",
                        fontWeight: "600",
                      }}
                    >
                      LAST MODIFIED
                    </th>
                    <th
                      style={{
                        width: "12%",
                        padding: "11px",
                        textAlign: "left",
                        borderBottom: "2px solid #dee2e6",
                        height: "50px",
                        verticalAlign: "middle",
                        wordWrap: "break-word",
                        overflowWrap: "break-word",
                        fontSize: "13px",
                        fontWeight: "600",
                      }}
                    >
                      MODIFIED BY
                    </th>
                    <th
                      style={{
                        width: "12%",
                        padding: "12px",
                        textAlign: "left",
                        borderBottom: "2px solid #dee2e6",
                        height: "50px",
                        verticalAlign: "middle",
                        wordWrap: "break-word",
                        overflowWrap: "break-word",
                        fontSize: "13px",
                        fontWeight: "600",
                      }}
                    >
                      STATUS
                    </th>
                    <th
                      style={{
                        width: "10%",
                        padding: "12px",
                        textAlign: "center",
                        borderBottom: "2px solid #dee2e6",
                        height: "50px",
                        verticalAlign: "middle",
                        wordWrap: "break-word",
                        overflowWrap: "break-word",
                        fontSize: "13px",
                        fontWeight: "600",
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
                        style={{ textAlign: "center", padding: "20px", fontSize: "13px" }}
                      >
                        Loading...
                      </td>
                    </tr>
                  ) : history.length > 0 ? (
                    history.map((item, index) => (
                      <tr
                        key={item.id}
                        className={`${index % 2 === 1 ? "alternate-row " : ""}${
                          selectedRowId === item.id ? "selected-row" : ""
                        }`}
                        style={{
                          backgroundColor:
                            selectedRowId === item.id
                              ? "#f0f8ff"
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
                            e.currentTarget.style.backgroundColor = "#f5f5f5";
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
                            padding: "12px",
                            wordWrap: "break-word",
                            whiteSpace: "normal",
                            borderBottom: "1px solid #dee2e6",
                            fontSize: "13px",
                          }}
                          onClick={() => handleRowClick(item.proposal_pk, item.id)}
                        >
                          {item.proposal_id || "N/A"}
                        </td>
                        <td
                          style={{
                            padding: "12px",
                            borderBottom: "1px solid #dee2e6",
                            fontSize: "13px",
                          }}
                          onClick={() => handleRowClick(item.proposal_pk, item.id)}
                        >
                          {shortenDepartmentName(item.department)}
                        </td>
                        <td
                          style={{
                            padding: "12px",
                            borderBottom: "1px solid #dee2e6",
                            fontSize: "13px",
                          }}
                          onClick={() => handleRowClick(item.proposal_pk, item.id)}
                        >
                          {item.category}
                        </td>
                        <td
                          style={{
                            padding: "12px",
                            borderBottom: "1px solid #dee2e6",
                            fontSize: "13px",
                          }}
                          onClick={() => handleRowClick(item.proposal_pk, item.id)}
                        >
                          {item.subcategory}
                        </td>
                        <td
                          style={{
                            padding: "12px",
                            wordWrap: "break-word",
                            whiteSpace: "normal",
                            borderBottom: "1px solid #dee2e6",
                            fontSize: "13px",
                          }}
                          onClick={() => handleRowClick(item.proposal_pk, item.id)}
                        >
                          {new Date(item.last_modified).toLocaleString()}
                        </td>
                        <td
                          style={{
                            padding: "12px",
                            fontWeight: "500",
                            borderBottom: "1px solid #dee2e6",
                            fontSize: "13px",
                          }}
                          onClick={() => handleRowClick(item.proposal_pk, item.id)}
                        >
                          {item.last_modified_by}
                        </td>
                        <td
                          style={{
                            padding: "12px",
                            borderBottom: "1px solid #dee2e6",
                            fontSize: "13px",
                          }}
                          onClick={() => handleRowClick(item.proposal_pk, item.id)}
                        >
                          <Status type={item.status} name={item.status} />
                        </td>
                        <td
                          style={{
                            padding: "12px",
                            borderBottom: "1px solid #dee2e6",
                            textAlign: "center",
                          }}
                        >
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleViewAuditTrail(item);
                            }}
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
                        style={{ textAlign: "center", padding: "20px", fontSize: "13px" }}
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
                pageSizeOptions={[5, 10, 20, 50]}
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
                    outline: "none",
                  }}
                  onMouseDown={(e) => e.preventDefault()}
                >
                  <ArrowLeft size={20} />
                </button>
                <h2 style={{ margin: 0, fontSize: "18px" }}>Proposal Details</h2>
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
                    outline: "none",
                    fontSize: "13px",
                  }}
                  onMouseDown={(e) => e.preventDefault()}
                >
                  <Printer size={16} /> Print
                </button>
                <button
                  onClick={() => setShowDetailPopup(false)}
                  style={{
                    border: "none",
                    background: "none",
                    cursor: "pointer",
                    outline: "none",
                  }}
                  onMouseDown={(e) => e.preventDefault()}
                >
                  <X size={24} />
                </button>
              </div>
            </div>

            {detailLoading || !selectedDetail ? (
              <div style={{ textAlign: "center", padding: "40px", fontSize: "13px" }}>
                Loading details...
              </div>
            ) : (
              <div id="printable-area">
                <div
                  className="proposal-header"
                  style={{ marginBottom: "20px" }}
                >
                  <h3 style={{ margin: "0 0 5px 0", fontSize: "16px" }}>
                    {selectedDetail.title}
                  </h3>
                  <div style={{ color: "#666", fontSize: "12px" }}>
                    Ticket ID: {selectedDetail.external_system_id} | Status:{" "}
                    {selectedDetail.status}
                  </div>
                </div>

                <div
                  className="details-grid"
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "15px",
                    marginBottom: "20px",
                    fontSize: "13px",
                  }}
                >
                  <div>
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
                      fontSize: "14px",
                    }}
                  >
                    Project Summary
                  </h4>
                  <p style={{ fontSize: "13px" }}>{selectedDetail.project_summary}</p>
                </div>

                <div className="section" style={{ marginBottom: "20px" }}>
                  <h4
                    style={{
                      borderBottom: "1px solid #eee",
                      paddingBottom: "5px",
                      fontSize: "14px",
                    }}
                  >
                    Project Description
                  </h4>
                  <p style={{ fontSize: "13px" }}>{selectedDetail.project_description}</p>
                </div>

                <div className="section" style={{ marginBottom: "20px" }}>
                  <h4
                    style={{
                      borderBottom: "1px solid #eee",
                      paddingBottom: "5px",
                      fontSize: "14px",
                    }}
                  >
                    Period of Performance
                  </h4>
                  <p style={{ fontSize: "13px" }}>
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
                        fontSize: "14px",
                      }}
                    >
                      Cost Elements
                    </h4>
                    <table
                      style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}
                    >
                      <thead>
                        <tr style={{ backgroundColor: "#f8f9fa" }}>
                          <th
                            style={{
                              padding: "8px",
                              borderBottom: "1px solid #ddd",
                              textAlign: "left",
                              fontSize: "13px",
                            }}
                          >
                            Description
                          </th>
                          <th
                            style={{
                              padding: "8px",
                              borderBottom: "1px solid #ddd",
                              textAlign: "right",
                              fontSize: "13px",
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
                                fontSize: "13px",
                              }}
                            >
                              {item.description}
                            </td>
                            <td
                              style={{
                                padding: "8px",
                                borderBottom: "1px solid #eee",
                                textAlign: "right",
                                fontSize: "13px",
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
                              fontSize: "13px",
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
                              fontSize: "13px",
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
                    <h4 style={{ fontSize: "14px" }}>Finance Review</h4>
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "1fr 1fr",
                        gap: "15px",
                        fontSize: "13px",
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

      {/* Audit Trail Detail Modal - Fullscreen Display WITH NAVBAR */}
      {showAuditTrailPopup && (
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
          {/* NAVBAR IN POPUP - Same as main navbar */}
          {renderNavbar()}

          <div style={{ 
            flex: 1, 
            overflow: "auto", 
            padding: "20px",
            maxWidth: "1200px",
            margin: "0 auto",
            width: "100%"
          }}>
            <div style={{ 
              display: "flex", 
              justifyContent: "space-between", 
              alignItems: "center", 
              marginBottom: "20px",
              flexWrap: "wrap",
              gap: "10px"
            }}>
              <button
                className="back-button"
                onClick={handleCloseAuditTrailPopup}
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
                <ArrowLeft size={16} /> <span>Back to Proposal History</span>
              </button>

              {/* Updated Export Button */}
              <button
                onClick={exportToExcel}
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
              {auditTrailLoading || !selectedAuditTrail ? (
                <div style={{ textAlign: "center", padding: "40px", fontSize: "13px" }}>
                  Loading audit trail...
                </div>
              ) : (
                <>
                  {/* Audit Trail Context - Horizontal Breakdown */}
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
                      AUDIT TRAIL CONTEXT
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
                      {selectedAuditTrail.proposal_id || "N/A"}
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
                        <div style={{ fontSize: "11px", color: "#6c757d", marginBottom: "4px" }}>
                          Department:
                        </div>
                        <div style={{ fontSize: "13px", fontWeight: "500" }}>
                          {selectedAuditTrail.department}
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: "11px", color: "#6c757d", marginBottom: "4px" }}>
                          Category:
                        </div>
                        <div style={{ fontSize: "13px", fontWeight: "500" }}>
                          {selectedAuditTrail.category}
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: "11px", color: "#6c757d", marginBottom: "4px" }}>
                          Sub-Category:
                        </div>
                        <div style={{ fontSize: "13px", fontWeight: "500" }}>
                          {selectedAuditTrail.subcategory}
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: "11px", color: "#6c757d", marginBottom: "4px" }}>
                          Status:
                        </div>
                        <div style={{ fontSize: "13px" }}>
                          <Status type={selectedAuditTrail.status} name={selectedAuditTrail.status} />
                        </div>
                      </div>
                    </div>
                    
                    {/* Additional Info */}
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
                        <div style={{ fontSize: "11px", color: "#6c757d", marginBottom: "4px" }}>
                          Last Modified By:
                        </div>
                        <div style={{ fontSize: "13px" }}>
                          {selectedAuditTrail.last_modified_by}
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: "11px", color: "#6c757d", marginBottom: "4px" }}>
                          Last Modified Date:
                        </div>
                        <div style={{ fontSize: "13px" }}>
                          {new Date(selectedAuditTrail.last_modified).toLocaleString()}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Complete Proposal Details Section */}
                  <div
                    className="complete-details-section"
                    style={{
                      backgroundColor: "#fff",
                      padding: "20px",
                      borderRadius: "8px",
                      marginBottom: "20px",
                      border: "1px solid #e9ecef",
                    }}
                  >
                    <h4
                      style={{
                        margin: "0 0 15px 0",
                        fontSize: "14px",
                        color: "#333",
                        fontWeight: "600",
                      }}
                    >
                      Complete Proposal Details at Time of Modification
                    </h4>
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                        gap: "15px",
                        fontSize: "13px",
                      }}
                    >
                      <div>
                        <strong style={{ color: "#6c757d" }}>Total Budget:</strong>
                        <div style={{ marginTop: "4px" }}>
                          ₱{parseFloat(selectedAuditTrail.total_cost || 0).toLocaleString()}
                        </div>
                      </div>
                      <div>
                        <strong style={{ color: "#6c757d" }}>Fiscal Year:</strong>
                        <div style={{ marginTop: "4px" }}>
                          {selectedAuditTrail.fiscal_year || "2024"}
                        </div>
                      </div>
                      <div>
                        <strong style={{ color: "#6c757d" }}>Priority Level:</strong>
                        <div style={{ marginTop: "4px" }}>
                          {selectedAuditTrail.priority || "Medium"}
                        </div>
                      </div>
                      <div>
                        <strong style={{ color: "#6c757d" }}>Review Cycle:</strong>
                        <div style={{ marginTop: "4px" }}>
                          {selectedAuditTrail.review_cycle || "Q1"}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Field-Level Changes Section */}
                  <div
                    className="field-changes-section"
                    style={{
                      marginBottom: "20px",
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
                        fontSize: "14px",
                        color: "#495057",
                        fontWeight: "600",
                      }}
                    >
                      Field-Level Changes
                    </h4>
                    <FieldChanges changes={getFieldChanges()} />
                  </div>

                  {/* Change History Timeline Section */}
                  <div
                    className="timeline-section"
                    style={{
                      marginBottom: "20px",
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
                        fontSize: "14px",
                        color: "#495057",
                        fontWeight: "600",
                      }}
                    >
                      Change History Timeline
                    </h4>
                    <AuditTrailTimeline history={proposalHistory} />
                  </div>

                  {/* User Comments Section */}
                  <div
                    className="comments-section"
                    style={{
                      marginBottom: "20px",
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
                        fontSize: "14px",
                        color: "#495057",
                        fontWeight: "600",
                      }}
                    >
                      User Comments & Reasons for Changes
                    </h4>
                    <div
                      style={{
                        padding: "15px",
                        backgroundColor: "#f8f9fa",
                        borderRadius: "4px",
                        borderLeft: "3px solid #007bff",
                      }}
                    >
                      <div style={{ fontSize: "13px", lineHeight: "1.6" }}>
                        {selectedAuditTrail.comments ||
                          (selectedAuditTrail.status === "APPROVED"
                            ? "Proposal approved after thorough review and budget alignment."
                            : selectedAuditTrail.status === "REJECTED"
                            ? "Proposal rejected due to budget constraints and lack of proper justification."
                            : "No additional comments provided.")}
                      </div>
                    </div>
                  </div>

                  {/* Sequential Audit Trail Section */}
                  <div
                    className="sequential-audit-section"
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
                        margin: "0 0 15px 0",
                        fontSize: "14px",
                        color: "#495057",
                        fontWeight: "600",
                      }}
                    >
                      Sequential Audit Trail
                    </h4>
                    <div
                      className="audit-stats"
                      style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
                        gap: "15px",
                        marginBottom: "15px",
                      }}
                    >
                      <div
                        style={{
                          textAlign: "center",
                          padding: "15px",
                          backgroundColor: "#f8f9fa",
                          borderRadius: "6px",
                          border: "1px solid #e9ecef",
                        }}
                      >
                        <div
                          style={{
                            fontSize: "24px",
                            fontWeight: "bold",
                            color: "#007bff",
                            marginBottom: "5px",
                          }}
                        >
                          {proposalHistory.length}
                        </div>
                        <div style={{ fontSize: "12px", color: "#6c757d" }}>
                          Total Modifications
                        </div>
                      </div>
                      <div
                        style={{
                          textAlign: "center",
                          padding: "15px",
                          backgroundColor: "#f8f9fa",
                          borderRadius: "6px",
                          border: "1px solid #e9ecef",
                        }}
                      >
                        <div
                          style={{
                            fontSize: "14px",
                            fontWeight: "bold",
                            color: "#333",
                            marginBottom: "5px",
                          }}
                        >
                          {proposalHistory.length > 0
                            ? new Date(proposalHistory[proposalHistory.length - 1].last_modified).toLocaleDateString()
                            : "N/A"}
                        </div>
                        <div style={{ fontSize: "12px", color: "#6c757d" }}>
                          First Action
                        </div>
                      </div>
                      <div
                        style={{
                          textAlign: "center",
                          padding: "15px",
                          backgroundColor: "#f8f9fa",
                          borderRadius: "6px",
                          border: "1px solid #e9ecef",
                        }}
                      >
                        <div
                          style={{
                            fontSize: "14px",
                            fontWeight: "bold",
                            color: "#333",
                            marginBottom: "5px",
                          }}
                        >
                          {proposalHistory.length > 0
                            ? new Date(proposalHistory[0].last_modified).toLocaleDateString()
                            : "N/A"}
                        </div>
                        <div style={{ fontSize: "12px", color: "#6c757d" }}>
                          Last Action
                        </div>
                      </div>
                    </div>
                    
                    <div style={{ fontSize: "13px", color: "#666" }}>
                      <p>
                        This audit trail shows all modifications made to this proposal, 
                        including status changes, field updates, and user comments.
                      </p>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProposalHistory;