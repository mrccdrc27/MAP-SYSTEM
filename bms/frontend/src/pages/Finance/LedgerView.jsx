import React, { useState, useEffect, useCallback } from "react";
import {
  Search,
  ChevronDown,
  User,
  LogOut,
  Bell,
  Settings,
  Eye,
  FileDown,
  X,
  Calendar,
  User as UserIcon,
  Clock,
  FileText,
  ArrowLeft,
  Download,
  RefreshCw,
  CheckCircle,
  XCircle,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import LOGOMAP from "../../assets/MAP.jpg";
import "./LedgerView.css";
import { useAuth } from "../../context/AuthContext";
import { getLedgerEntries, getJournalEntryDetails } from "../../API/ledgerAPI";
import { getAllDepartments } from "../../API/departments";
import ManageProfile from "./ManageProfile";
import * as XLSX from "xlsx"; // For Excel export
// MODIFICATION START: Modular Imports
import Navigation from "../../components/Navigation/Navigation";
import StatusBadge from "../../components/ProposalHistory/StatusBadge";
import Pagination from "../../components/common/Pagination";
import JournalEntryDetailsModal from "../../components/LedgerView/JournalEntryDetailsModal";
// MODIFICATION END

const LedgerView = () => {
  // MODIFICATION START: Simplified State (Removed Navbar state)
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [showDepartmentDropdown, setShowDepartmentDropdown] = useState(false);
  const [showManageProfile, setShowManageProfile] = useState(false);

  const navigate = useNavigate();
  const { user, logout, getBmsRole, isFinanceHead, isAdmin } = useAuth();

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

  // Modal and Export State
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date());

  const categoryOptions = [
    { value: "", label: "All Categories" },
    { value: "CAPEX", label: "CapEx" },
    { value: "OPEX", label: "OpEx" },
  ];
  // MODIFICATION END

  // --- Helpers ---
  const formatAmount = (val) => {
    return `₱${parseFloat(val).toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  const shortenDepartmentName = (name, maxLength = 20) => {
    if (!name) return "N/A";
    const abbreviations = {
      Department: "Dept.",
      Management: "Mgmt.",
      Operations: "Ops.",
      Merchandising: "Merch.",
      Marketing: "Mktg.",
      Logistics: "Log.",
      "Information Technology": "IT",
      Finance: "Fin.",
    };
    let shortened = name;
    for (const [full, abbr] of Object.entries(abbreviations)) {
      shortened = shortened.replace(new RegExp(full, "gi"), abbr);
    }
    return shortened.length <= maxLength
      ? shortened
      : shortened.substring(0, maxLength) + "...";
  };

  // MODIFICATION START: Click Outside Handler for filters
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest(".filter-dropdown")) {
        setShowCategoryDropdown(false);
        setShowDepartmentDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);
  // MODIFICATION END

  // --- Effects ---
  useEffect(() => {
    const fetchDropdowns = async () => {
      try {
        const deptRes = await getAllDepartments();
        setDepartmentOptions([
          { value: "", label: "All Departments" },
          ...deptRes.data.map((d) => ({ value: d.id, label: d.name })),
        ]);
      } catch (error) {
        console.error("Failed to fetch departments:", error);
      }
    };
    fetchDropdowns();
  }, []);

  useEffect(() => {
    const fetchLedgerData = async () => {
      setLoading(true);
      try {
        const params = {
          page: currentPage,
          page_size: pageSize,
          search: debouncedSearchTerm,
          category: selectedCategory,
          department_id: selectedDepartment,
        };
        if (!params.category) delete params.category;
        if (!params.department_id) delete params.department_id;
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
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  // --- Handlers ---
  const handleJournalEntryClick = async (listEntry) => {
    setDetailsLoading(true);
    setShowDetailsModal(true);
    setSelectedEntry(null);
    try {
      const response = await getJournalEntryDetails(listEntry.reference_id);
      setSelectedEntry(response.data);
    } catch (error) {
      alert("Could not load details.");
      setShowDetailsModal(false);
    } finally {
      setDetailsLoading(false);
    }
  };

  const handleExportLedger = async () => {
    setExporting(true);
    try {
      const token = Math.floor(1000000 + Math.random() * 9000000).toString();
      const dateString = new Date()
        .toISOString()
        .split("T")[0]
        .replace(/-/g, "");
      const filename = `ledger_view_${dateString}_${token}.xlsx`;

      const exportData = ledgerEntries.map((item) => ({
        "TICKET ID": item.reference_id,
        DATE: item.date,
        DEPARTMENT: item.department,
        CATEGORY: item.category,
        "SUB-CATEGORY": item.sub_category || "General",
        ACCOUNT: item.account,
        AMOUNT: formatAmount(item.amount),
      }));

      const worksheet = XLSX.utils.json_to_sheet(exportData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Ledger View");
      XLSX.writeFile(workbook, filename);
    } catch (error) {
      alert("Export failed.");
    } finally {
      setExporting(false);
    }
  };

  const userRole = getBmsRole ? getBmsRole() : user?.role || "User";
  const isFinanceManager = isFinanceHead() || isAdmin();
  const userProfile = {
    name: user
      ? `${user.first_name || ""} ${user.last_name || ""}`.trim() ||
        user.full_name ||
        user.username
      : "User",
    role: userRole,
    avatar:
      user?.profile_picture ||
      "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80",
  };

  return (
    <div
      className="app-container"
      style={{
        minWidth: "1200px",
        display: "flex",
        flexDirection: "column",
        height: "100vh",
      }}
    >
      <Navigation
        userProfile={userProfile}
        currentDate={currentDate}
        onLogout={logout}
        onManageProfile={() => setShowManageProfile(true)}
        isFinanceManager={isFinanceManager}
      />

      {/* MODIFICATION START: app-container Content */}
      <div
        className="content-container"
        style={{
          padding: "80px 40px 35px 40px", // Increased horizontal padding
          maxWidth: "80%", // Allow full width
          margin: "0 auto",
          width: "100%", // Use full width
          flex: 1,
          overflowY: "auto",
        }}
      >
        {showManageProfile ? (
          <ManageProfile onClose={() => setShowManageProfile(false)} />
        ) : (
          <div
            className="ledger-container"
            style={{
              backgroundColor: "white",
              borderRadius: "8px",
              boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
              padding: "20px",
              display: "flex",
              flexDirection: "column",
              minHeight: "calc(100vh - 120px)",
            }}
          >
            {/* Header Section */}
            <div
              className="page-header"
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
                  fontSize: "24px",
                  fontWeight: "bold",
                  color: "#0C0C0C",
                }}
              >
                Ledger View
              </h2>

              <div
                className="controls-container"
                style={{ display: "flex", gap: "10px" }}
              >
                {/* Search */}
                <div style={{ position: "relative" }}>
                  <input
                    type="text"
                    placeholder="Search Ticket or Account..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    style={{
                      padding: "8px 12px",
                      border: "1px solid #ccc",
                      borderRadius: "4px",
                      outline: "none",
                      width: "200px",
                      fontSize: "12px",
                      background: "white",
                    }}
                  />
                </div>

                {/* Department Filter */}
                <div
                  className="filter-dropdown"
                  style={{ position: "relative" }}
                >
                  <button
                    onClick={() =>
                      setShowDepartmentDropdown(!showDepartmentDropdown)
                    }
                    style={{
                      padding: "8px 12px",
                      border: "1px solid #ccc",
                      borderRadius: "4px",
                      backgroundColor: "white",
                      display: "flex",
                      alignItems: "center",
                      gap: "5px",
                      minWidth: "160px",
                      justifyContent: "space-between",
                      fontSize: "13px",
                      cursor: "pointer",
                    }}
                  >
                    <span>
                      {selectedDepartment
                        ? departmentOptions.find(
                            (d) => d.value === selectedDepartment,
                          )?.label
                        : "All Departments"}
                    </span>
                    <ChevronDown size={14} />
                  </button>
                  {showDepartmentDropdown && (
                    <div
                      className="dropdown-menu"
                      style={{
                        position: "absolute",
                        top: "100%",
                        left: 0,
                        backgroundColor: "white",
                        border: "1px solid #ccc",
                        borderRadius: "4px",
                        width: "250px",
                        zIndex: 1000,
                        maxHeight: "300px",
                        overflowY: "auto",
                        boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
                      }}
                    >
                      {departmentOptions.map((dept) => (
                        <div
                          key={dept.value}
                          onClick={() => {
                            setSelectedDepartment(dept.value);
                            setShowDepartmentDropdown(false);
                            setCurrentPage(1);
                          }}
                          style={{
                            padding: "8px 12px",
                            cursor: "pointer",
                            fontSize: "13px",
                            backgroundColor:
                              selectedDepartment === dept.value
                                ? "#f0f0f0"
                                : "white",
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
                    onClick={() =>
                      setShowCategoryDropdown(!showCategoryDropdown)
                    }
                    style={{
                      padding: "8px 12px",
                      border: "1px solid #ccc",
                      borderRadius: "4px",
                      backgroundColor: "white",
                      display: "flex",
                      alignItems: "center",
                      gap: "5px",
                      minWidth: "140px",
                      justifyContent: "space-between",
                      fontSize: "13px",
                      cursor: "pointer",
                    }}
                  >
                    <span>
                      {categoryOptions.find(
                        (opt) => opt.value === selectedCategory,
                      )?.label || "All Categories"}
                    </span>
                    <ChevronDown size={14} />
                  </button>
                  {showCategoryDropdown && (
                    <div
                      className="dropdown-menu"
                      style={{
                        position: "absolute",
                        top: "100%",
                        left: 0,
                        backgroundColor: "white",
                        border: "1px solid #ccc",
                        borderRadius: "4px",
                        width: "100%",
                        zIndex: 1000,
                        boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
                      }}
                    >
                      {categoryOptions.map((opt) => (
                        <div
                          key={opt.value}
                          onClick={() => {
                            setSelectedCategory(opt.value);
                            setShowCategoryDropdown(false);
                            setCurrentPage(1);
                          }}
                          style={{
                            padding: "8px 12px",
                            cursor: "pointer",
                            fontSize: "13px",
                            backgroundColor:
                              selectedCategory === opt.value
                                ? "#f0f0f0"
                                : "white",
                          }}
                        >
                          {opt.label}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Export Button */}
                <button
                  onClick={handleExportLedger}
                  disabled={exporting || ledgerEntries.length === 0}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    padding: "8px 16px",
                    backgroundColor: "#007bff",
                    color: "white",
                    border: "none",
                    borderRadius: "4px",
                    cursor: exporting ? "not-allowed" : "pointer",
                    fontSize: "13px",
                    opacity: exporting ? 0.7 : 1,
                  }}
                >
                  {exporting ? "Exporting..." : "Export"}
                  <Download size={16} />
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

            {/* Table Container */}
            <div
              style={{
                flex: "1 1 auto",
                overflowY: "auto",
                overflowX: "auto", // Add horizontal scrolling for wide tables
                border: "1px solid #e0e0e0",
                borderRadius: "4px",
                maxHeight: "calc(100vh - 300px)", // Adjust based on your layout
                minHeight: "400px", // Ensure minimum height
              }}
            >
              <table
                className="data-table"
                style={{
                  width: "100%",
                  minWidth: "1200px", // Ensure minimum width to prevent squeezing
                  borderCollapse: "collapse",
                  fontSize: "14px", // Slightly larger font
                  tableLayout: "auto", // Allow columns to expand based on content
                }}
              >
                <thead
                  style={{
                    position: "sticky",
                    top: 0,
                    zIndex: 1,
                    backgroundColor: "#f8f9fa",
                  }}
                >
                  <tr>
                    <th
                      style={{
                        padding: "12px",
                        textAlign: "left",
                        borderBottom: "2px solid #dee2e6",
                        fontWeight: "600",
                        minWidth: "120px", // TICKET ID
                      }}
                    >
                      TICKET ID
                    </th>
                    <th
                      style={{
                        padding: "12px",
                        textAlign: "left",
                        borderBottom: "2px solid #dee2e6",
                        fontWeight: "600",
                        minWidth: "100px", // DATE
                      }}
                    >
                      DATE
                    </th>
                    <th
                      style={{
                        padding: "12px",
                        textAlign: "left",
                        borderBottom: "2px solid #dee2e6",
                        fontWeight: "600",
                        minWidth: "180px", // DEPARTMENT - increased for long names
                      }}
                    >
                      DEPARTMENT
                    </th>
                    <th
                      style={{
                        padding: "12px",
                        textAlign: "left",
                        borderBottom: "2px solid #dee2e6",
                        fontWeight: "600",
                        minWidth: "100px", // CATEGORY
                      }}
                    >
                      CATEGORY
                    </th>
                    <th
                      style={{
                        padding: "12px",
                        textAlign: "left",
                        borderBottom: "2px solid #dee2e6",
                        fontWeight: "600",
                        minWidth: "150px", // SUB-CATEGORY
                      }}
                    >
                      SUB-CATEGORY
                    </th>
                    <th
                      style={{
                        padding: "12px",
                        textAlign: "left",
                        borderBottom: "2px solid #dee2e6",
                        fontWeight: "600",
                        minWidth: "200px", // ACCOUNT
                      }}
                    >
                      ACCOUNT
                    </th>
                    <th
                      style={{
                        padding: "12px",
                        textAlign: "left",
                        borderBottom: "2px solid #dee2e6",
                        fontWeight: "600",
                        minWidth: "120px", // AMOUNT
                      }}
                    >
                      AMOUNT
                    </th>
                    <th
                      style={{
                        padding: "12px",
                        textAlign: "center",
                        borderBottom: "2px solid #dee2e6",
                        fontWeight: "600",
                        minWidth: "100px", // ACTIONS
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
                        style={{ textAlign: "center", padding: "20px" }}
                      >
                        Loading ledger entries...
                      </td>
                    </tr>
                  ) : ledgerEntries.length > 0 ? (
                    ledgerEntries.map((entry, index) => (
                      <tr
                        key={index}
                        style={{
                          backgroundColor:
                            index % 2 === 1 ? "#F8F8F8" : "#FFFFFF",
                          borderBottom: "1px solid #dee2e6",
                        }}
                      >
                        <td style={{ padding: "12px", whiteSpace: "nowrap" }}>
                          {entry.reference_id}
                        </td>
                        <td style={{ padding: "12px", whiteSpace: "nowrap" }}>
                          {entry.date}
                        </td>
                        <td
                          style={{
                            padding: "12px",
                            maxWidth: "180px", // Set a max-width for the department cell
                            overflow: "visible", // Allow overflow
                            textOverflow: "clip", // Don't use ellipsis
                            whiteSpace: "normal", // Allow wrapping
                            wordBreak: "break-word", // Break long words
                          }}
                          title={entry.department} // Add tooltip with full name
                        >
                          {entry.department}
                        </td>
                        <td style={{ padding: "12px", whiteSpace: "nowrap" }}>
                          {entry.category}
                        </td>
                        <td style={{ padding: "12px", whiteSpace: "nowrap" }}>
                          {entry.sub_category || "General"}
                        </td>
                        <td
                          style={{
                            padding: "12px",
                            maxWidth: "200px",
                            overflow: "visible",
                            whiteSpace: "normal",
                            wordBreak: "break-word",
                          }}
                          title={entry.account} // Add tooltip
                        >
                          {entry.account}
                        </td>
                        <td style={{ padding: "12px", whiteSpace: "nowrap" }}>
                          {formatAmount(entry.amount)}
                        </td>
                        <td style={{ padding: "12px", textAlign: "center" }}>
                          <button
                            onClick={() => handleJournalEntryClick(entry)}
                            style={{
                              padding: "6px 12px",
                              backgroundColor: "#007bff",
                              color: "white",
                              border: "none",
                              borderRadius: "4px",
                              cursor: "pointer",
                              fontSize: "12px",
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
                        style={{ textAlign: "center", padding: "20px" }}
                      >
                        No transactions found.
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
                onPageSizeChange={(s) => {
                  setPageSize(s);
                  setCurrentPage(1);
                }}
              />
            )}
          </div>
        )}
      </div>

      {/* Modals */}
      <JournalEntryDetailsModal
        isOpen={showDetailsModal}
        entry={selectedEntry}
        loading={detailsLoading}
        onClose={() => setShowDetailsModal(false)}
        userProfile={userProfile}
        currentDate={currentDate}
        onLogout={logout}
        onManageProfile={() => setShowManageProfile(true)}
        isFinanceManager={isFinanceManager}
      />
      {/* MODIFICATION END */}
    </div>
  );
};

export default LedgerView;
