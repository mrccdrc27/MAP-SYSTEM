import React, { useState, useEffect, useMemo } from "react";
import {
  ChevronDown,
  Bell,
  User,
  Settings,
  LogOut,
  ArrowLeft,
  Search,
  Printer,
  Upload,
  X,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import LOGOMAP from "../../assets/MAP.jpg";
import "./BudgetProposal.css";
import {
  getProposals,
  getProposalSummary,
  getProposalDetail,
  reviewProposal,
} from "../../API/proposalAPI";
// MODIFIED: Import department API
import { getAllDepartments } from "../../API/departments";
// MODIFIED: Import category API if needed, or stick to CapEx/OpEx hardcoded if that's the requirement
import { getAccountTypes } from "../../API/dropdownAPI";
import { useAuth } from "../../context/AuthContext";
import ManageProfile from "./ManageProfile";

const financeOperatorNames = [
  "Finance Operator",
  "Finance Head",
  "Finance Manager",
];

// Status Component
const Status = ({ type, name, personName = null, location = null }) => {
  return (
    <div className={`status-${type.split(" ").join("-")}`}>
      <div className="circle"></div>
      {name}
      {(personName != null || location != null) && (
        <span className="status-details">
          <span className="status-to">to</span>
          <div className="icon">
            <div className="icon-placeholder"></div>
          </div>
          <span className="status-target">
            {personName != null ? personName : location}
          </span>
        </span>
      )}
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

// Signature Upload Component
const SignatureUpload = ({ value, onChange }) => {
  const [preview, setPreview] = useState(value || "");
  const [file, setFile] = useState(null);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const validTypes = [
        "image/png",
        "image/jpeg",
        "image/jpg",
        "image/svg+xml",
      ];
      if (!validTypes.includes(file.type)) {
        alert("Please upload a valid image file (PNG, JPG, JPEG, SVG)");
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        alert("File size should be less than 5MB");
        return;
      }
      setFile(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        const dataURL = e.target.result;
        setPreview(dataURL);
        if (onChange) onChange(dataURL);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeFile = () => {
    setFile(null);
    setPreview("");
    if (onChange) onChange("");
  };

  return (
    <div style={{ position: "relative" }}>
      {preview ? (
        <div style={{ position: "relative" }}>
          <img
            src={preview}
            alt="Signature Preview"
            style={{
              maxWidth: "300px",
              maxHeight: "100px",
              border: "1px solid #ccc",
              borderRadius: "4px",
              padding: "5px",
              backgroundColor: "#f8f9fa",
            }}
          />
          <button
            type="button"
            onClick={removeFile}
            style={{
              marginTop: "8px",
              padding: "4px 12px",
              backgroundColor: "#adb5bd",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
              fontSize: "12px",
              display: "flex",
              alignItems: "center",
              gap: "4px",
              transition: "background-color 0.2s",
            }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.backgroundColor = "#6c757d")
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.backgroundColor = "#adb5bd")
            }
          >
            <X size={12} />
            Remove
          </button>
        </div>
      ) : (
        <div
          style={{
            border: "2px dashed #ccc",
            borderRadius: "4px",
            padding: "20px",
            textAlign: "center",
            cursor: "pointer",
            backgroundColor: "#f8f9fa",
            minHeight: "100px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
          }}
          onClick={() => document.getElementById("signature-upload").click()}
        >
          <Upload size={24} style={{ marginBottom: "8px", color: "#666" }} />
          <div style={{ color: "#666", marginBottom: "4px" }}>
            Click to upload signature file
          </div>
          <div style={{ fontSize: "12px", color: "#999" }}>
            PNG, JPG, SVG up to 5MB
          </div>
        </div>
      )}
      <input
        id="signature-upload"
        type="file"
        accept=".png,.jpg,.jpeg,.svg"
        onChange={handleFileChange}
        style={{ display: "none" }}
      />
      {file && (
        <div style={{ marginTop: "8px", fontSize: "12px", color: "#666" }}>
          File: {file.name}
        </div>
      )}
    </div>
  );
};

const categoriesData = [
  { id: "CAPEX", name: "CapEx" },
  { id: "OPEX", name: "Opex" },
];

const BudgetProposal = () => {
  const [showBudgetDropdown, setShowBudgetDropdown] = useState(false);
  const [showExpenseDropdown, setShowExpenseDropdown] = useState(false);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [selectedProposal, setSelectedProposal] = useState(null);
  const [showReviewPopup, setShowReviewPopup] = useState({
    visible: false,
    readOnly: false,
  });

  const [showCommentPopup, setShowCommentPopup] = useState(false);
  const [showConfirmationPopup, setShowConfirmationPopup] = useState(false);
  const [reviewComment, setReviewComment] = useState("");
  const [reviewStatus, setReviewStatus] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [showDepartmentDropdown, setShowDepartmentDropdown] = useState(false);
  const [showManageProfile, setShowManageProfile] = useState(false);
  const [departmentOptions, setDepartmentOptions] = useState([]);
  const [financeOperatorName, setFinanceOperatorName] = useState("");
  const [financeOperatorSignature, setFinanceOperatorSignature] = useState("");

  const shortenDepartmentName = (name, maxLength = 20) => {
    if (!name || name.length <= maxLength) return name;
    const abbreviations = {
      Department: "Dept.",
      Management: "Mgmt.",
      Operations: "Operations.",
      Merchandise: "Merchandising.",
      Marketing: "Marketing.",
      Logistics: "Logistics",
      "Human Resources": "Human Resources",
      "Information Technology": "IT",
      Finance: "Finance Department",
    };
    let shortened = name;
    for (const [full, abbr] of Object.entries(abbreviations)) {
      shortened = shortened.replace(new RegExp(full, "gi"), abbr);
    }
    if (shortened.length <= maxLength) return shortened;
    return shortened.substring(0, maxLength - 3) + "...";
  };

  const handleManageProfile = () => {
    setShowManageProfile(true);
    setShowProfileDropdown(false);
  };
  const handleCloseManageProfile = () => {
    setShowManageProfile(false);
  };

  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [loading, setLoading] = useState(true);
  const [proposals, setProposals] = useState([]);
  const [summaryData, setSummaryData] = useState({
    total_proposals: 0,
    pending_approvals: 0,
    total_budget: "0.00",
  });
  const [categories, setCategories] = useState([]);
  const [pagination, setPagination] = useState({ count: 0 });
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedDepartment, setSelectedDepartment] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);
  const [currentDate, setCurrentDate] = useState(new Date());

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

  const isFinanceManager =
    userRole === "FINANCE_HEAD" || userRole === "ADMIN" || user?.is_staff;

  const fetchSummary = async () => {
    try {
      const summaryRes = await getProposalSummary();
      setSummaryData(summaryRes.data);
    } catch (error) {
      console.error("Failed to fetch summary:", error);
    }
  };

  useEffect(() => {
    const timerId = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
      setCurrentPage(1);
    }, 500);
    return () => clearTimeout(timerId);
  }, [searchTerm]);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentDate(new Date());
    }, 1000);
    return () => {
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    const fetchDropdowns = async () => {
      try {
        const deptRes = await getAllDepartments();
        setDepartmentOptions([
          { value: "", label: "All Departments" },
          ...deptRes.data.map((d) => ({ value: d.code, label: d.code })),
        ]);
        const summaryRes = await getProposalSummary();
        setSummaryData(summaryRes.data);
        fetchSummary();
        setCategories([{ id: "", name: "All Categories" }, ...categoriesData]);
      } catch (error) {
        console.error("Failed to fetch initial data:", error);
      }
    };
    fetchDropdowns();
  }, []);

  useEffect(() => {
    const fetchProposals = async () => {
      setLoading(true);
      try {
        const params = {
          page: currentPage,
          page_size: pageSize,
          search: debouncedSearchTerm,
          department: selectedDepartment,
          category: selectedCategory,
        };
        Object.keys(params).forEach((key) => {
          if (params[key] === "" || params[key] === null) {
            delete params[key];
          }
        });
        const res = await getProposals(params);
        setProposals(res.data.results);
        setPagination(res.data);
      } catch (error) {
        console.error("Failed to fetch proposals:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchProposals();
  }, [
    currentPage,
    pageSize,
    debouncedSearchTerm,
    selectedCategory,
    selectedDepartment,
  ]);

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
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const rejectionReasons = [
    "Budget Constraints",
    "Insufficient Justification",
    "Does Not Align with Strategy",
    "Incomplete Information",
    "Other (Please specify in comments)",
  ];

  const toggleBudgetDropdown = () => {
    setShowBudgetDropdown(!showBudgetDropdown);
    if (showExpenseDropdown) setShowExpenseDropdown(false);
    if (showProfileDropdown) setShowProfileDropdown(false);
    if (showNotifications) setShowNotifications(false);
    if (showCategoryDropdown) setShowCategoryDropdown(false);
    if (showDepartmentDropdown) setShowDepartmentDropdown(false);
  };

  const toggleExpenseDropdown = () => {
    setShowExpenseDropdown(!showExpenseDropdown);
    if (showBudgetDropdown) setShowBudgetDropdown(false);
    if (showProfileDropdown) setShowProfileDropdown(false);
    if (showNotifications) setShowNotifications(false);
    if (showCategoryDropdown) setShowCategoryDropdown(false);
    if (showDepartmentDropdown) setShowDepartmentDropdown(false);
  };

  const toggleProfileDropdown = () => {
    setShowProfileDropdown(!showProfileDropdown);
    if (showBudgetDropdown) setShowBudgetDropdown(false);
    if (showExpenseDropdown) setShowExpenseDropdown(false);
    if (showNotifications) setShowNotifications(false);
    if (showCategoryDropdown) setShowCategoryDropdown(false);
    if (showDepartmentDropdown) setShowDepartmentDropdown(false);
  };

  const toggleNotifications = () => {
    setShowNotifications(!showNotifications);
    if (showBudgetDropdown) setShowBudgetDropdown(false);
    if (showExpenseDropdown) setShowExpenseDropdown(false);
    if (showProfileDropdown) setShowProfileDropdown(false);
    if (showCategoryDropdown) setShowCategoryDropdown(false);
    if (showDepartmentDropdown) setShowDepartmentDropdown(false);
  };

  const toggleDepartmentDropdown = () => {
    setShowDepartmentDropdown(!showDepartmentDropdown);
    if (showCategoryDropdown) setShowCategoryDropdown(false);
    if (showBudgetDropdown) setShowBudgetDropdown(false);
    if (showExpenseDropdown) setShowExpenseDropdown(false);
    if (showProfileDropdown) setShowProfileDropdown(false);
    if (showNotifications) setShowNotifications(false);
  };

  const toggleCategoryDropdown = () => {
    setShowCategoryDropdown(!showCategoryDropdown);
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

  const handleCategorySelect = (categoryId) => {
    setSelectedCategory(categoryId);
    setShowCategoryDropdown(false);
    setCurrentPage(1);
  };

  const handleNavigate = (path) => {
    navigate(path);
    setShowBudgetDropdown(false);
    setShowExpenseDropdown(false);
    setShowProfileDropdown(false);
    setShowNotifications(false);
    setShowCategoryDropdown(false);
    setShowDepartmentDropdown(false);
  };

  const handleLogout = async () => {
    await logout();
  };

  const handleReviewClick = async (proposal) => {
    try {
      const res = await getProposalDetail(proposal.id);
      const data = res.data;
      const enhancedProposal = {
        ...data,
        reference: data.external_system_id || proposal.reference || "N/A",
        department: data.department_name || data.department || "N/A",
        status: data.status || proposal.status || "PENDING",
        category: data.category || "N/A",
        sub_category:
          data.sub_category ||
          (data.items && data.items.length > 0
            ? data.items[0].cost_element
            : "N/A"),
        submitted_by: data.submitted_by_name || data.submitted_by || "N/A",
        amount: data.total_cost || data.amount || 0,
      };
      setSelectedProposal(enhancedProposal);
      const isReadOnly =
        data.status === "APPROVED" || data.status === "REJECTED";
      if (isReadOnly) {
        setFinanceOperatorName(data.finance_operator_name || "");
        setFinanceOperatorSignature(data.signature || "");
      } else {
        setFinanceOperatorName("");
        setFinanceOperatorSignature("");
      }
      setShowReviewPopup({ visible: true, readOnly: isReadOnly });
    } catch (error) {
      console.error("Failed to fetch proposal details:", error);
    }
  };

  const closeReviewPopup = () => {
    setShowReviewPopup({ visible: false, readOnly: false });
    setSelectedProposal(null);
    setReviewComment("");
    setRejectionReason("");
  };

  const handleStatusChange = (status) => {
    setReviewStatus(status);
    setShowConfirmationPopup(true);
  };

  const closeCommentPopup = () => {
    setShowCommentPopup(false);
  };

  const closeConfirmationPopup = () => {
    setShowConfirmationPopup(false);
  };

  const handleSubmitComment = () => {
    console.log("Comment submitted:", reviewComment);
    closeCommentPopup();
  };

  const handleSubmitReview = async () => {
    if (!selectedProposal) return;
    let finalComment = reviewComment;
    if (reviewStatus === "REJECTED" && rejectionReason) {
      finalComment = `Reason: ${rejectionReason}. \n${reviewComment}`;
    }
    try {
      const formData = new FormData();
      formData.append("status", reviewStatus);
      formData.append("comment", finalComment);
      formData.append("finance_operator_name", financeOperatorName);
      if (
        financeOperatorSignature &&
        financeOperatorSignature.startsWith("data:")
      ) {
        const fetchRes = await fetch(financeOperatorSignature);
        const blob = await fetchRes.blob();
        formData.append("signature", blob, "signature.png");
      }
      await reviewProposal(selectedProposal.id, formData);
      closeConfirmationPopup();
      closeReviewPopup();
      setCurrentPage(1);
      setDebouncedSearchTerm((prev) => prev + " ");
      fetchSummary();
    } catch (error) {
      console.error("Failed to submit review:", error);
      const msg =
        error.response?.data?.detail ||
        error.response?.data?.non_field_errors ||
        "Failed to submit review.";
      alert(msg);
    }
  };

  const handlePrint = () => {
    const printWindow = window.open("", "_blank");
    printWindow.document.write(`
      <html>
        <head>
          <title>Ticket Review - ${
            selectedProposal?.reference || "Proposal"
          }</title>
          <style>
            @page { margin: 20mm; size: A4; }
            body { font-family: Arial, sans-serif; margin: 0; padding: 20px; color: #333; }
            .print-header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #000; padding-bottom: 20px; }
            .print-header h1 { margin: 0; font-size: 24px; text-transform: uppercase; }
            .print-header .date { color: #666; margin-top: 5px; font-size: 12px; }
            .section { margin-bottom: 25px; page-break-inside: avoid; }
            .section h2 { border-bottom: 1px solid #ccc; padding-bottom: 8px; margin-bottom: 15px; font-size: 16px; color: #000; text-transform: uppercase; }
            .details-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; font-size: 14px; }
            .detail-item { margin-bottom: 8px; }
            .detail-item strong { display: inline-block; width: 140px; color: #555; }
            
            table { width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 13px; }
            th, td { border: 1px solid #ddd; padding: 10px; text-align: left; }
            th { background-color: #f8f9fa; font-weight: bold; text-transform: uppercase; font-size: 12px; }
            .total-row td { font-weight: bold; background-color: #f8f9fa; font-size: 14px; }
            
            .signature-section { margin-top: 40px; border: 1px solid #ddd; padding: 20px; border-radius: 4px; page-break-inside: avoid; }
            .signature-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; }
            .signature-box { margin-top: 40px; border-top: 1px solid #000; padding-top: 10px; text-align: center; }
            
            @media print {
              body { -webkit-print-color-adjust: exact; }
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="print-header">
            <h1>Budget Proposal Review</h1>
            <div class="date">Generated on: ${new Date().toLocaleString()}</div>
          </div>
          
          <div class="section">
            <h2>Ticket Information</h2>
            <div class="details-grid">
              <div class="detail-item"><strong>Ticket ID:</strong> ${
                selectedProposal?.reference || "N/A"
              }</div>
              <div class="detail-item"><strong>Status:</strong> ${
                selectedProposal?.status || "PENDING"
              }</div>
              <div class="detail-item"><strong>Date Submitted:</strong> ${
                selectedProposal?.submitted_at
                  ? new Date(selectedProposal.submitted_at).toLocaleDateString()
                  : "N/A"
              }</div>
              <div class="detail-item"><strong>Department:</strong> ${
                selectedProposal?.department || "N/A"
              }</div>
              <div class="detail-item"><strong>Category:</strong> ${
                selectedProposal?.category || "N/A"
              }</div>
              <div class="detail-item"><strong>Sub-Category:</strong> ${
                selectedProposal?.sub_category || "N/A"
              }</div>
              <div class="detail-item"><strong>Submitted By:</strong> ${
                selectedProposal?.submitted_by || "N/A"
              }</div>
              <div class="detail-item"><strong>Total Amount:</strong> ₱${parseFloat(
                selectedProposal?.amount || 0
              ).toLocaleString("en-US", { minimumFractionDigits: 2 })}</div>
            </div>
          </div>
          
          <div class="section">
            <h2>Project Details</h2>
            <div style="margin-bottom: 15px;">
              <strong>Title:</strong> <br/>
              ${selectedProposal?.title || "N/A"}
            </div>
            <div style="margin-bottom: 15px;">
              <strong>Summary:</strong> <br/>
              ${selectedProposal?.project_summary || "N/A"}
            </div>
            <div>
              <strong>Description:</strong> <br/>
              ${selectedProposal?.project_description || "N/A"}
            </div>
          </div>

          ${
            selectedProposal?.items && selectedProposal.items.length > 0
              ? `
          <div class="section">
            <h2>Cost Breakdown</h2>
            <table>
              <thead>
                <tr>
                  <th style="width: 30%">Cost Element</th>
                  <th style="width: 45%">Description</th>
                  <th style="width: 25%; text-align: right">Estimated Cost</th>
                </tr>
              </thead>
              <tbody>
                ${selectedProposal.items
                  .map(
                    (item) => `
                  <tr>
                    <td>${item.cost_element || "N/A"}</td>
                    <td>${item.description || "N/A"}</td>
                    <td style="text-align: right">₱${parseFloat(
                      item.estimated_cost || 0
                    ).toLocaleString("en-US", {
                      minimumFractionDigits: 2,
                    })}</td>
                  </tr>
                `
                  )
                  .join("")}
              </tbody>
              <tfoot>
                <tr class="total-row">
                  <td colspan="2" style="text-align: right"><strong>TOTAL:</strong></td>
                  <td style="text-align: right"><strong>₱${parseFloat(
                    selectedProposal?.amount || 0
                  ).toLocaleString("en-US", {
                    minimumFractionDigits: 2,
                  })}</strong></td>
                </tr>
              </tfoot>
            </table>
          </div>
          `
              : ""
          }
          
          <div class="section signature-section">
            <h2>Finance Approval</h2>
            <div class="details-grid">
              <div class="detail-item"><strong>Approved By:</strong> ${
                financeOperatorName || "Finance Officer"
              }</div>
              <div class="detail-item"><strong>Date:</strong> ${new Date().toLocaleDateString()}</div>
            </div>
            
            <div style="margin-top: 20px;">
              <strong>Signature:</strong>
              <div style="margin-top: 10px; height: 80px;">
                ${
                  financeOperatorSignature
                    ? `<img src="${financeOperatorSignature}" alt="Signature" style="max-height: 80px; max-width: 200px;" />`
                    : ""
                }
              </div>
              <div style="border-bottom: 1px solid #000; width: 250px;"></div>
            </div>
          </div>
          
          <script>
            window.onload = function() {
              window.print();
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
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
                  </div>
                </div>
              )}
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

      {/* UPDATED: Reduced margin size to match Dashboard */}
      <div
        className="content-container"
        style={{ padding: "10px 20px", maxWidth: "1400px", margin: "0 auto", width: "95%" }}
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
                  maxWidth: "300px",
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
                    Total Proposals
                  </p>
                </div>
                <div
                  className="budget-card-amount"
                  style={{ fontSize: "24px", fontWeight: "bold" }}
                >
                  {summaryData.total_proposals}
                </div>
              </div>

              <div
                className="budget-card"
                style={{
                  flex: "1",
                  minWidth: "200px",
                  maxWidth: "300px",
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
                    Pending Approval
                  </p>
                </div>
                <div
                  className="budget-card-amount"
                  style={{ fontSize: "24px", fontWeight: "bold" }}
                >
                  {summaryData.pending_approvals}
                </div>
              </div>

              <div
                className="budget-card"
                style={{
                  flex: "1",
                  minWidth: "200px",
                  maxWidth: "300px",
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
                    Budget Total
                  </p>
                </div>
                <div
                  className="budget-card-amount"
                  style={{ fontSize: "24px", fontWeight: "bold" }}
                >{`₱${parseFloat(summaryData.total_budget).toLocaleString(
                  "en-US",
                  {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  }
                )}`}</div>
              </div>
            </div>

            {/* Main Content */}
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
                minHeight: "calc(100vh - 240px)",
              }}
            >
              {/* Header Section with Title and Controls */}
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
                  Budget Proposal
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
                      }}
                    />
                  </div>

                  {/* Department Filter - MODIFIED to use API data */}
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
                              fontSize: "14px",
                            }}
                          >
                            {dept.label}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Category Filter */}
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
                        justifyContent: "space-between",
                      }}
                    >
                      <span>
                        {
                          (
                            categories.find(
                              (c) => c.id === selectedCategory
                            ) || {
                              name: "All Categories",
                            }
                          ).name
                        }
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
                        {categories.map((category) => (
                          <div
                            key={category.id}
                            className={`category-dropdown-item ${
                              selectedCategory === category.id ? "active" : ""
                            }`}
                            onClick={() => handleCategorySelect(category.id)}
                            onMouseDown={(e) => e.preventDefault()}
                            style={{
                              padding: "8px 12px",
                              cursor: "pointer",
                              backgroundColor:
                                selectedCategory === category.id
                                  ? "#f0f0f0"
                                  : "white",
                              outline: "none",
                            }}
                          >
                            {category.name}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Separator line between title and table */}
              <div
                style={{
                  height: "1px",
                  backgroundColor: "#e0e0e0",
                  marginBottom: "20px",
                }}
              ></div>

              {/* Proposals Table */}
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
                    <tr style={{ backgroundColor: "#f8f9fa" }}>
                      <th
                        style={{
                          position: "sticky",
                          top: 0,
                          width: "18%",
                          padding: "0.75rem",
                          textAlign: "left",
                          borderBottom: "2px solid #dee2e6",
                          height: "50px",
                          verticalAlign: "middle",
                          wordWrap: "break-word",
                          overflowWrap: "break-word",
                          zIndex: 1,
                        }}
                      >
                        TICKET ID
                      </th>
                      <th
                        style={{
                          width: "18%",
                          padding: "0.75rem",
                          textAlign: "left",
                          borderBottom: "2px solid #dee2e6",
                          height: "50px",
                          verticalAlign: "middle",
                          wordWrap: "break-word",
                          overflowWrap: "break-word",
                        }}
                      >
                        DEPARTMENT
                      </th>
                      <th
                        style={{
                          width: "13%",
                          padding: "0.75rem",
                          textAlign: "left",
                          borderBottom: "2px solid #dee2e6",
                          height: "50px",
                          verticalAlign: "middle",
                          wordWrap: "break-word",
                          overflowWrap: "break-word",
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
                          height: "50px",
                          verticalAlign: "middle",
                          wordWrap: "break-word",
                          overflowWrap: "break-word",
                        }}
                      >
                        SUB-CATEGORY
                      </th>
                      <th
                        style={{
                          width: "15%",
                          padding: "0.75rem",
                          textAlign: "left",
                          borderBottom: "2px solid #dee2e6",
                          height: "50px",
                          verticalAlign: "middle",
                          wordWrap: "break-word",
                          overflowWrap: "break-word",
                        }}
                      >
                        SUBMITTED BY
                      </th>
                      <th
                        style={{
                          width: "11%",
                          padding: "0.75rem",
                          textAlign: "left",
                          borderBottom: "2px solid #dee2e6",
                          height: "50px",
                          verticalAlign: "middle",
                          wordWrap: "break-word",
                          overflowWrap: "break-word",
                        }}
                      >
                        AMOUNT
                      </th>
                      <th
                        style={{
                          width: "13%",
                          padding: "0.75rem",
                          textAlign: "center",
                          borderBottom: "2px solid #dee2e6",
                          height: "50px",
                          verticalAlign: "middle",
                          wordWrap: "break-word",
                          overflowWrap: "break-word",
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
                          style={{ textAlign: "center", padding: "20px" }}
                        >
                          Loading...
                        </td>
                      </tr>
                    ) : proposals.length > 0 ? (
                      proposals.map((proposal, index) => (
                        <tr
                          key={proposal.id}
                          className={
                            (index % 2 === 1 ? "alternate-row " : "") +
                            (proposal.status === "SUBMITTED"
                              ? "pending-row"
                              : "")
                          }
                          style={{
                            backgroundColor:
                              proposal.status === "SUBMITTED"
                                ? "#fffbe6"
                                : index % 2 === 1
                                ? "#F8F8F8"
                                : "#FFFFFF",
                            color: "#0C0C0C",
                            height: "50px",
                            transition: "background-color 0.2s ease",
                            cursor: "pointer",
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = "#fcfcfc";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor =
                              proposal.status === "SUBMITTED"
                                ? "#fffbe6"
                                : index % 2 === 1
                                ? "#F8F8F8"
                                : "#FFFFFF";
                          }}
                          onClick={() => handleReviewClick(proposal)}
                        >
                          <td
                            style={{
                              padding: "0.75rem",
                              borderBottom: "1px solid #dee2e6",
                            }}
                          >
                            {proposal.reference}
                          </td>
                          <td
                            style={{
                              padding: "0.75rem",
                              borderBottom: "1px solid #dee2e6",
                            }}
                          >
                            {/* MODIFIED: Use API field department_name */}
                            {proposal.department_name || "N/A"}
                          </td>
                          <td
                            style={{
                              padding: "0.75rem",
                              borderBottom: "1px solid #dee2e6",
                            }}
                          >
                            {/* MODIFIED: Use API field category (CapEx/OpEx) */}
                            {proposal.category || "N/A"}
                          </td>
                          <td
                            style={{
                              padding: "0.75rem",
                              borderBottom: "1px solid #dee2e6",
                            }}
                          >
                            {/* MODIFIED: Use API field sub_category */}
                            {proposal.sub_category || "N/A"}
                          </td>
                          <td
                            style={{
                              padding: "0.75rem",
                              borderBottom: "1px solid #dee2e6",
                            }}
                          >
                            {proposal.submitted_by || "N/A"}
                          </td>
                          <td
                            style={{
                              padding: "0.75rem",
                              borderBottom: "1px solid #dee2e6",
                            }}
                          >
                            {`₱${parseFloat(proposal.amount).toLocaleString(
                              "en-US",
                              {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              }
                            )}`}
                          </td>
                          <td
                            style={{
                              padding: "0.75rem",
                              borderBottom: "1px solid #dee2e6",
                              textAlign: "center",
                            }}
                          >
                            {/* UPDATED: Removed outline focus ring from View/Review buttons */}
                            <button
                              className="blue-button action-btn"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleReviewClick(proposal);
                              }}
                              style={{
                                padding: "4px 8px",
                                backgroundColor:
                                  proposal.status === "SUBMITTED" &&
                                  isFinanceManager
                                    ? "#007bff"
                                    : "#6c757d",
                                color: "white",
                                border: "none",
                                borderRadius: "4px",
                                cursor: "pointer",
                                fontSize: "12px",
                                minWidth: "60px",
                                outline: "none",
                              }}
                              onFocus={(e) => e.currentTarget.style.outline = "none"}
                              onMouseDown={(e) => e.preventDefault()}
                            >
                              {proposal.status === "SUBMITTED" &&
                              isFinanceManager
                                ? "REVIEW"
                                : "VIEW"}
                            </button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td
                          colSpan="7"
                          className="no-results"
                          style={{
                            padding: "20px",
                            textAlign: "center",
                            height: "50px",
                            verticalAlign: "middle",
                          }}
                        >
                          No proposals match your search criteria.
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
          </>
        )}
      </div>

      {/* Review Popup - UPDATED with input field for Finance Operator name */}
      {showReviewPopup.visible && selectedProposal && (
        <div
          className="popup-overlay"
          style={{ backgroundColor: "rgba(0, 0, 0, 0.5)" }}
        >
          <div
            className="review-popup"
            style={{
              maxHeight: "90vh",
              overflowY: "auto",
              backgroundColor: "white",
              borderRadius: "8px",
              padding: "20px",
              boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
              width: "800px",
              maxWidth: "90vw",
            }}
          >
            {/* Header */}
            <div
              className="popup-header"
              style={{
                display: "flex",
                alignItems: "center",
                marginBottom: "15px",
                paddingBottom: "5px",
                height: "60px",
                minHeight: "60px",
              }}
            >
              <button
                className="back-button"
                onClick={closeReviewPopup}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "#007bff",
                  fontSize: "16px",
                  padding: "0",
                  margin: "0",
                  height: "100%",
                  alignSelf: "flex-start",
                  outline: "none",
                }}
              >
                <ArrowLeft size={20} style={{ marginTop: "2px" }} />
              </button>
              <h2
                className="proposal-title"
                style={{
                  margin: "0 auto",
                  textAlign: "center",
                  fontSize: "22px",
                  fontWeight: "bold",
                  lineHeight: "1.2",
                }}
              >
                Ticket Review
              </h2>
              <button
                onClick={handlePrint}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "#007bff",
                  fontSize: "14px",
                  padding: "8px",
                  outline: "none",
                }}
              >
                <Printer size={16} />
                Print File
              </button>
            </div>

            {/* Content */}
            <div className="popup-content">
              {/* Title and Date */}
              <div className="proposal-header">
                <h3 className="proposal-project-title">
                  {selectedProposal.title || selectedProposal.subject}
                </h3>
                <span className="proposal-date">
                  {selectedProposal.submitted_at
                    ? new Date(
                        selectedProposal.submitted_at
                      ).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })
                    : "Date not available"}
                </span>
              </div>

              {/* Project Details */}
              <div className="proposal-details-grid">
                <div className="detail-item">
                  <strong>Category:</strong>{" "}
                  {selectedProposal.category || "N/A"}
                </div>
                <div className="detail-item">
                  <strong>Sub-Category:</strong>{" "}
                  {selectedProposal.sub_category ||
                    selectedProposal.items?.[0]?.cost_element ||
                    "N/A"}
                </div>
                <div className="detail-item">
                  <strong>Department:</strong>{" "}
                  {/* FIX Issue 1: Use the normalized field */}
                  {selectedProposal.department || "N/A"}
                </div>
                <div className="detail-item">
                  <strong>Budget Amount:</strong>
                  {` ₱${parseFloat(
                    selectedProposal.total_cost || selectedProposal.amount
                  ).toLocaleString("en-US", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}`}
                </div>
                <div className="detail-item">
                  <strong>Submitted by:</strong>{" "}
                  {selectedProposal.submitted_by_person ||
                    selectedProposal.submitted_by_name ||
                    selectedProposal.submitted_by}
                  {selectedProposal.department &&
                    ` (${selectedProposal.department})`}
                </div>
              </div>

              {/* Project Summary */}
              <div className="proposal-section">
                <h4 className="section-label">PROJECT SUMMARY:</h4>
                <p className="section-content">
                  {selectedProposal.project_summary || "No summary provided."}
                </p>
              </div>

              {/* Project Description */}
              <div className="proposal-section">
                <h4 className="section-label">PROJECT DESCRIPTION:</h4>
                <p className="section-content">
                  {selectedProposal.project_description ||
                    "No description provided."}
                </p>
              </div>

              {/* Period of Performance */}
              {selectedProposal.performance_start_date &&
                selectedProposal.performance_end_date && (
                  <div className="proposal-section">
                    <h4 className="section-label">PERIOD OF PERFORMANCE:</h4>
                    <p className="section-content">
                      {`${new Date(
                        selectedProposal.performance_start_date
                      ).toLocaleDateString()} to ${new Date(
                        selectedProposal.performance_end_date
                      ).toLocaleDateString()}`}
                    </p>
                  </div>
                )}

              {/* Cost Elements Table */}
              {selectedProposal.items && selectedProposal.items.length > 0 && (
                <div className="proposal-section">
                  <div
                    className="cost-table"
                    style={{
                      display: "table",
                      width: "100%",
                      borderCollapse: "collapse",
                    }}
                  >
                    <div
                      className="cost-table-header"
                      style={{
                        display: "table-row",
                        backgroundColor: "#f8f9fa",
                        fontWeight: "bold",
                      }}
                    >
                      <div
                        className="cost-header-cell"
                        style={{
                          display: "table-cell",
                          padding: "10px",
                          borderBottom: "2px solid #dee2e6",
                        }}
                      >
                        COST ELEMENTS
                      </div>
                      <div
                        className="cost-header-cell"
                        style={{
                          display: "table-cell",
                          padding: "10px",
                          borderBottom: "2px solid #dee2e6",
                        }}
                      >
                        DESCRIPTION
                      </div>
                      <div
                        className="cost-header-cell"
                        style={{
                          display: "table-cell",
                          padding: "10px",
                          borderBottom: "2px solid #dee2e6",
                          textAlign: "right",
                        }}
                      >
                        ESTIMATED COST
                      </div>
                    </div>

                    {selectedProposal.items.map((item, index) => (
                      <div
                        className="cost-table-row"
                        key={index}
                        style={{ display: "table-row" }}
                      >
                        <div
                          className="cost-cell"
                          style={{
                            display: "table-cell",
                            padding: "10px",
                            borderBottom: "1px solid #eee",
                          }}
                        >
                          <span
                            className="cost-bullet green"
                            style={{
                              display: "inline-block",
                              width: "8px",
                              height: "8px",
                              borderRadius: "50%",
                              backgroundColor: "#28a745",
                              marginRight: "8px",
                            }}
                          ></span>
                          {item.cost_element || "N/A"}
                        </div>
                        <div
                          className="cost-cell"
                          style={{
                            display: "table-cell",
                            padding: "10px",
                            borderBottom: "1px solid #eee",
                          }}
                        >
                          {item.description || "N/A"}
                        </div>
                        <div
                          className="cost-cell"
                          style={{
                            display: "table-cell",
                            padding: "10px",
                            borderBottom: "1px solid #eee",
                            textAlign: "right",
                          }}
                        >
                          {`₱${parseFloat(
                            item.estimated_cost || 0
                          ).toLocaleString("en-US", {
                            minimumFractionDigits: 2,
                          })}`}
                        </div>
                      </div>
                    ))}

                    {/* Total Row */}
                    <div
                      className="cost-table-total"
                      style={{
                        display: "table-row",
                        fontWeight: "bold",
                        backgroundColor: "#f8f9fa",
                      }}
                    >
                      <div
                        className="cost-cell"
                        style={{ display: "table-cell", padding: "10px" }}
                      ></div>
                      <div
                        className="cost-cell"
                        style={{
                          display: "table-cell",
                          padding: "10px",
                          textAlign: "right",
                        }}
                      >
                        TOTAL:
                      </div>
                      <div
                        className="cost-cell total-amount"
                        style={{
                          display: "table-cell",
                          padding: "10px",
                          textAlign: "right",
                          color: "#007bff",
                        }}
                      >
                        {`₱${parseFloat(
                          selectedProposal.amount || 0
                        ).toLocaleString("en-US", {
                          minimumFractionDigits: 2,
                        })}`}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Finance Department Approval Section - UPDATED with binding */}
              <div className="proposal-section">
                <h4 className="section-label">FINANCE DEPARTMENT APPROVAL:</h4>
                <div
                  className="finance-operator-section"
                  style={{
                    padding: "15px",
                    backgroundColor: "white",
                    borderRadius: "4px",
                    marginTop: "10px",
                    border: "1px solid #e0e0e0",
                  }}
                >
                  {/* Finance Manager Name */}
                  <div className="detail-item" style={{ marginBottom: "15px" }}>
                    <strong>Finance Manager Name:</strong>
                    <div style={{ marginTop: "5px" }}>
                      <input
                        type="text"
                        value={financeOperatorName}
                        onChange={(e) => setFinanceOperatorName(e.target.value)}
                        // FIX: Disabled if read-only OR if user is NOT Finance Manager
                        disabled={showReviewPopup.readOnly || !isFinanceManager}
                        placeholder={
                          isFinanceManager
                            ? "Enter Finance Manager Name"
                            : "Pending Finance Review"
                        }
                        style={{
                          width: "100%",
                          padding: "8px",
                          border: "1px solid #ccc",
                          borderRadius: "4px",
                          outline: "none",
                          backgroundColor:
                            showReviewPopup.readOnly || !isFinanceManager
                              ? "#f8f9fa"
                              : "white",
                          color:
                            showReviewPopup.readOnly || !isFinanceManager
                              ? "#666"
                              : "#000",
                        }}
                      />
                    </div>
                  </div>

                  {/* Signature */}
                  <div className="detail-item" style={{ marginBottom: "15px" }}>
                    <strong>Signature (Attachment):</strong>
                    <div style={{ marginTop: "5px" }}>
                      {/* LOGIC: Show upload ONLY if it's editable AND user is Finance Manager */}
                      {!showReviewPopup.readOnly && isFinanceManager ? (
                        <SignatureUpload
                          value={financeOperatorSignature}
                          onChange={setFinanceOperatorSignature}
                        />
                      ) : selectedProposal.signature ||
                        financeOperatorSignature ? (
                        /* Show existing signature if present (Read Only view) */
                        <img
                          src={
                            selectedProposal.signature ||
                            financeOperatorSignature
                          }
                          alt="Signature"
                          style={{
                            maxWidth: "300px",
                            maxHeight: "100px",
                            border: "1px solid #ccc",
                            padding: "5px",
                            backgroundColor: "#f8f9fa",
                          }}
                        />
                      ) : (
                        /* Show placeholder if no signature and user cannot edit */
                        <div
                          style={{
                            padding: "15px",
                            backgroundColor: "#f8f9fa",
                            border: "1px dashed #ccc",
                            borderRadius: "4px",
                            color: "#999",
                            fontStyle: "italic",
                            fontSize: "13px",
                          }}
                        >
                          No signature attached.
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Date submitted */}
                  <div className="detail-item">
                    <strong>Date submitted:</strong>
                    <div
                      style={{
                        marginTop: "5px",
                        padding: "8px",
                        border: "1px solid #e0e0e0",
                        borderRadius: "4px",
                        backgroundColor: "#f8f9fa",
                      }}
                    >
                      {/* Use current date or saved date if available */}
                      {showReviewPopup.readOnly &&
                      selectedProposal.approval_date
                        ? new Date(
                            selectedProposal.approval_date
                          ).toLocaleDateString()
                        : new Date().toLocaleDateString("en-US", {
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                          })}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer with Action Buttons - Only show if NOT read-only AND user is Finance Head/Admin */}
            {!showReviewPopup.readOnly &&
              (userRole === "FINANCE_HEAD" ||
                userRole === "ADMIN" ||
                user?.is_staff) && (
                <div
                  className="popup-footer"
                  style={{
                    marginTop: "20px",
                    paddingTop: "15px",
                    borderTop: "1px solid #e0e0e0",
                  }}
                >
                  <div
                    className="action-buttons"
                    style={{
                      display: "flex",
                      gap: "10px",
                      justifyContent: "center",
                    }}
                  >
                    <button
                      className="action-btn approve-btn"
                      onClick={() => handleStatusChange("APPROVED")}
                      style={{
                        padding: "8px 24px",
                        backgroundColor: "#28a745",
                        color: "white",
                        border: "none",
                        borderRadius: "4px",
                        cursor: "pointer",
                        fontSize: "14px",
                        minWidth: "100px",
                        outline: "none",
                        fontWeight: "bold",
                      }}
                    >
                      Approve
                    </button>
                    <button
                      className="action-btn reject-btn"
                      onClick={() => handleStatusChange("REJECTED")}
                      style={{
                        padding: "8px 24px",
                        backgroundColor: "#dc3545",
                        color: "white",
                        border: "none",
                        borderRadius: "4px",
                        cursor: "pointer",
                        fontSize: "14px",
                        minWidth: "100px",
                        outline: "none",
                        fontWeight: "bold",
                      }}
                    >
                      Reject
                    </button>
                  </div>
                </div>
              )}
          </div>
        </div>
      )}

      {/* Approval/Rejection Status Popup - UPDATED to have Approve/Reject buttons */}
      {showConfirmationPopup && selectedProposal && (
        <div
          className="popup-overlay"
          style={{ backgroundColor: "rgba(0, 0, 0, 0.5)" }}
        >
          <div
            className="approval-status-popup"
            style={{
              maxHeight: "90vh",
              overflowY: "auto",
              backgroundColor: "white",
              borderRadius: "8px",
              padding: "20px",
              boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
              width: "600px",
              maxWidth: "90vw",
            }}
          >
            {/* Header */}
            <div
              className="approval-status-header"
              style={{
                display: "flex",
                alignItems: "center",
                marginBottom: "15px",
                paddingBottom: "10px",
                height: "60px",
                minHeight: "60px",
              }}
            >
              <button
                className="back-button"
                onClick={closeConfirmationPopup}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "#007bff",
                  fontSize: "16px",
                  padding: "0",
                  margin: "0",
                  height: "100%",
                  alignSelf: "flex-start",
                  outline: "none",
                }}
              >
                <ArrowLeft size={20} style={{ marginTop: "2px" }} />
              </button>
              <h2
                className="approval-status-title"
                style={{
                  margin: "0 auto",
                  textAlign: "center",
                  fontSize: "22px",
                  fontWeight: "bold",
                  lineHeight: "1.2",
                }}
              >
                {reviewStatus === "APPROVED"
                  ? "Approval Status"
                  : "Rejected Status"}
              </h2>
              <div style={{ width: "100px" }}></div>
            </div>

            <div className="approval-status-content">
              {/* Status Indicator */}
              <div className="status-section">
                <div className="status-indicator">
                  <div
                    className={`status-dot ${reviewStatus.toLowerCase()}`}
                  ></div>
                  <span className="status-text">
                    {reviewStatus === "APPROVED"
                      ? "Approved by Finance Department"
                      : "Rejected by Finance Department"}
                  </span>
                </div>
                <div className="status-timestamp">
                  {selectedProposal.approval_date
                    ? new Date(
                        selectedProposal.approval_date
                      ).toLocaleDateString()
                    : "Date N/A"}{" "}
                  - {selectedProposal.approved_by_name || "Finance Officer"}
                </div>
              </div>

              {/* Project Title */}
              <h3 className="project-title-section">
                {selectedProposal.subject || selectedProposal.description}
              </h3>

              {/* Project Details */}
              <div className="project-info-section">
                <div className="project-detail-inline">
                  <strong>Budget Amount:</strong>{" "}
                  {`₱${parseFloat(
                    selectedProposal.amount || selectedProposal.total_cost
                  ).toLocaleString("en-US", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}`}
                </div>
                <div className="project-detail-inline">
                  <strong>Category:</strong>{" "}
                  {selectedProposal.category || "N/A"}
                </div>
                <div className="project-detail-inline">
                  <strong>Sub-Category:</strong>{" "}
                  {selectedProposal.sub_category || "N/A"}
                </div>
                <div className="project-detail-inline">
                  <strong>Department:</strong>{" "}
                  {selectedProposal.department || "N/A"}
                </div>
                <div className="project-detail-inline">
                  <strong>Submitted by:</strong>{" "}
                  {selectedProposal.submitted_by_person ||
                    selectedProposal.submitted_by_name ||
                    "N/A"}
                </div>
              </div>

              {reviewStatus === "REJECTED" && (
                <div className="rejection-reason-section">
                  <label className="comment-input-label">
                    Rejection Reason:
                  </label>
                  <select
                    className="rejection-reason-select"
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "8px",
                      border: "1px solid #ccc",
                      borderRadius: "4px",
                      outline: "none",
                    }}
                  >
                    <option value="">Select a reason</option>
                    {rejectionReasons.map((reason) => (
                      <option key={reason} value={reason}>
                        {reason}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {reviewStatus === "REJECTED" && (
                <div className="comment-input-section">
                  <label className="comment-input-label">Comment:</label>
                  <textarea
                    className="comment-textarea-input"
                    value={reviewComment}
                    onChange={(e) => setReviewComment(e.target.value)}
                    placeholder="Add your comments here"
                    rows="4"
                    style={{
                      width: "100%",
                      padding: "8px",
                      border: "1px solid #ccc",
                      borderRadius: "4px",
                      outline: "none",
                      resize: "vertical",
                    }}
                  ></textarea>
                </div>
              )}

              <div
                className="approval-metadata"
                style={{
                  backgroundColor:
                    reviewStatus === "APPROVED" ? "#d4edda" : "#f8d7da",
                  padding: "15px",
                  borderRadius: "8px",
                  marginTop: "20px",
                }}
              >
                <div className="metadata-item">
                  <strong>
                    {reviewStatus === "APPROVED"
                      ? "Approved By:"
                      : "Rejected By:"}
                  </strong>{" "}
                  {financeOperatorName || "Finance Officer"} (Finance
                  Department)
                </div>
                <div className="metadata-item">
                  <strong>Timestamp:</strong>
                  {new Date().toLocaleString("en-PH", {
                    year: "numeric",
                    month: "2-digit",
                    day: "2-digit",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </div>
                {reviewComment && (
                  <div className="metadata-item">
                    <strong>Comment:</strong> {reviewComment}
                  </div>
                )}
                {reviewStatus === "REJECTED" && rejectionReason && (
                  <div className="metadata-item">
                    <strong>Rejection Reason:</strong> {rejectionReason}
                  </div>
                )}
              </div>
            </div>

            <div
              className="approval-status-footer"
              style={{
                marginTop: "20px",
                paddingTop: "15px",
                borderTop: "1px solid #e0e0e0",
              }}
            >
              <div
                className="action-buttons"
                style={{
                  display: "flex",
                  gap: "10px",
                  justifyContent: "center",
                }}
              >
                <button
                  className="submit-comment-button"
                  onClick={handleSubmitReview}
                  style={{
                    padding: "8px 24px",
                    backgroundColor: "#007bff",
                    color: "white",
                    border: "none",
                    borderRadius: "4px",
                    cursor: "pointer",
                    fontSize: "14px",
                    minWidth: "100px",
                    outline: "none",
                  }}
                >
                  Submit
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Comment Popup - UPDATED to have Approve/Reject buttons */}
      {showCommentPopup && selectedProposal && (
        <div
          className="popup-overlay"
          style={{ backgroundColor: "rgba(0, 0, 0, 0.5)" }}
        >
          <div
            className="approval-status-popup"
            style={{
              backgroundColor: "white",
              borderRadius: "8px",
              padding: "20px",
              boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
              width: "600px",
              maxWidth: "90vw",
            }}
          >
            {/* Header */}
            <div
              className="approval-status-header"
              style={{
                display: "flex",
                alignItems: "center",
                marginBottom: "15px",
                paddingBottom: "10px",
                height: "40px",
                minHeight: "40px",
              }}
            >
              <button
                className="back-button"
                onClick={closeCommentPopup}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "#007bff",
                  fontSize: "16px",
                  padding: "0",
                  margin: "0",
                  height: "100%",
                  alignSelf: "flex-start",
                  outline: "none",
                }}
              >
                <ArrowLeft size={20} style={{ marginTop: "2px" }} />
                Back
              </button>
              <h2
                className="approval-status-title"
                style={{
                  margin: "0 auto",
                  textAlign: "center",
                  fontSize: "22px",
                  fontWeight: "bold",
                  lineHeight: "1.2",
                }}
              >
                Approval Status
              </h2>
              <div style={{ width: "100px" }}></div>
            </div>

            <div className="approval-status-content">
              <div className="status-section">
                <div className="status-indicator">
                  <div className="status-dot approved"></div>
                  <span className="status-text">
                    Approved by Finance Department
                  </span>
                </div>
                <div className="status-timestamp">
                  Apr 01, 2025 at 16:00 - {financeOperatorNames[0]}
                </div>
              </div>

              <h3 className="project-title-section">
                {selectedProposal.description}
              </h3>

              <div className="project-info-section">
                <div className="project-detail-inline">
                  <strong>Budget Amount:</strong>{" "}
                  {selectedProposal.budgetAmount}
                </div>
                <div className="project-detail-inline">
                  <strong>Category:</strong> {selectedProposal.category}
                </div>
                <div className="project-detail-inline">
                  <strong>Sub-Category:</strong> {selectedProposal.subCategory}
                </div>
                <div className="project-detail-inline">
                  <strong>Vendor:</strong> {selectedProposal.vendor}
                </div>
                <div className="project-detail-inline">
                  <strong>Requested by:</strong> {selectedProposal.requestedBy}
                </div>
              </div>
            </div>

            <div
              className="approval-status-footer"
              style={{
                marginTop: "20px",
                paddingTop: "15px",
                borderTop: "1px solid #e0e0e0",
              }}
            >
              <div
                className="action-buttons"
                style={{
                  display: "flex",
                  gap: "10px",
                  justifyContent: "center",
                }}
              >
                <button
                  className="action-btn approve-btn"
                  onClick={() => handleStatusChange("APPROVED")}
                  style={{
                    padding: "8px 24px",
                    backgroundColor: "#28a745",
                    color: "white",
                    border: "none",
                    borderRadius: "4px",
                    cursor: "pointer",
                    fontSize: "14px",
                    minWidth: "100px",
                    outline: "none",
                    fontWeight: "bold",
                  }}
                >
                  Approve
                </button>
                <button
                  className="action-btn reject-btn"
                  onClick={() => handleStatusChange("REJECTED")}
                  style={{
                    padding: "8px 24px",
                    backgroundColor: "#dc3545",
                    color: "white",
                    border: "none",
                    borderRadius: "4px",
                    cursor: "pointer",
                    fontSize: "14px",
                    minWidth: "100px",
                    outline: "none",
                    fontWeight: "bold",
                  }}
                >
                  Reject
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BudgetProposal;