import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  ChevronDown,
  ArrowLeft,
  Printer,
  X,
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
import { getProposalHistory, getProposalDetail } from "../../API/proposalAPI";
import { getAllDepartments } from "../../API/departments";
import ManageProfile from "./ManageProfile";
import * as XLSX from "xlsx";

// MODIFICATION START: Import modularized components
import Navigation from "../../components/Navigation/Navigation";
import StatusBadge from "../../components/ProposalHistory/StatusBadge";
import Pagination from "../../components/common/Pagination";
import ProposalDetailModal from "../../components/ProposalHistory/ProposalDetailModal";
import AuditTrailModal from "../../components/ProposalHistory/AuditTrailModal";
// MODIFICATION END

const ProposalHistory = () => {
  // MODIFICATION START: Replaced local navigation state with simplified page state
  const [showManageProfile, setShowManageProfile] = useState(false);
  const [showDepartmentDropdown, setShowDepartmentDropdown] = useState(false);
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);

  const navigate = useNavigate();
  const { user, logout, getBmsRole, isFinanceHead, isAdmin } = useAuth();

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

  // Modal States
  const [showDetailPopup, setShowDetailPopup] = useState(false);
  const [selectedDetail, setSelectedDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [showAuditTrailPopup, setShowAuditTrailPopup] = useState(false);
  const [selectedAuditTrail, setSelectedAuditTrail] = useState(null);
  const [auditTrailLoading, setAuditTrailLoading] = useState(false);
  const [proposalHistory, setProposalHistory] = useState([]);
  const [auditProposalDetails, setAuditProposalDetails] = useState(null);

  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedRowId, setSelectedRowId] = useState(null);

  const statusOptions = [
    { value: "", label: "All Status" },
    { value: "APPROVED", label: "Approved" },
    { value: "REJECTED", label: "Rejected" },
    { value: "SUBMITTED", label: "Submitted" },
  ];
  // MODIFICATION END


  const shortenDepartmentName = (name, maxLength = 30) => {
    if (!name) return "N/A";
    
    // First, handle special cases for long department names
    const specialCases = {
      "Merchandising / Merchandise Planning": "Merchandise Planning",
      "Merchandise Planning": "Merchandise Planning",
      "Store Operations": "Store Operations",
      "Human Resources": "HR",
      "Information Technology": "IT",
      "Marketing": "Marketing",
      "Operations": "Operations",
      "Logistics": "Logistics",
      "Finance": "Finance",
    };
    
    // Check if it's a special case (exact match or contains)
    for (const [key, value] of Object.entries(specialCases)) {
      if (name.includes(key)) {
        return value;
      }
    }
    
    // If no special case, apply abbreviations
    const abbreviations = {
      "Department": "Dept.",
      "Management": "Mgmt.",
      "Operations": "Ops.",
      "Merchandising": "Merch.",
      "Marketing": "Mktg.",
      "Logistics": "Log.",
    };
    
    let shortened = name;
    for (const [full, abbr] of Object.entries(abbreviations)) {
      shortened = shortened.replace(new RegExp(full, "gi"), abbr);
    }
    
    // Final length check
    if (shortened.length <= maxLength) return shortened;
    return shortened.substring(0, maxLength - 3) + "...";
  };

  // --- Effects ---

  useEffect(() => {
    const interval = setInterval(() => setCurrentDate(new Date()), 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const timerId = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
      setCurrentPage(1);
    }, 500);
    return () => clearTimeout(timerId);
  }, [searchTerm]);

  useEffect(() => {
    const fetchDepartments = async () => {
      try {
        const res = await getAllDepartments();
        let opts = res.data.map((d) => ({
          value: d.id,
          label: d.name,
          code: d.code,
        }));

        let currentRole = getBmsRole ? getBmsRole() : user?.role || "User";

        if (currentRole === "GENERAL_USER" && user?.department_id) {
          opts = opts.filter((d) => d.value === user.department_id);
          if (opts.length > 0) setSelectedDepartment(opts[0].value);
          setDepartmentOptions(opts);
        } else {
          setDepartmentOptions([
            { value: "", label: "All Departments" },
            ...opts,
          ]);
        }
      } catch (err) {
        console.error("Failed to fetch departments", err);
      }
    };
    if (user) fetchDepartments();
  }, [user, getBmsRole]);

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
          (key) => !params[key] && delete params[key],
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

  // --- Handlers ---

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

  const handleViewAuditTrail = async (item) => {
    setAuditTrailLoading(true);
    setSelectedAuditTrail(item);
    setShowAuditTrailPopup(true);
    setAuditProposalDetails(null);
    try {
      const historyResponse = await getProposalHistory({
        search: item.proposal_id,
        page_size: 100,
      });
      const specificHistory = historyResponse.data.results.filter(
        (h) => h.proposal_id === item.proposal_id,
      );
      setProposalHistory(specificHistory);
      if (item.proposal_pk) {
        const detailResponse = await getProposalDetail(item.proposal_pk);
        setAuditProposalDetails(detailResponse.data);
      }
    } catch (error) {
      console.error("Failed to fetch audit trail:", error);
      setShowAuditTrailPopup(false);
    } finally {
      setAuditTrailLoading(false);
    }
  };

  const handlePrint = () => {
    const printContent = document.getElementById("printable-area");
    const printWindow = window.open("", "_blank");
    printWindow.document.write(`
      <html><head><title>Print Proposal</title><style>
        body { font-family: Arial, sans-serif; padding: 20px; }
        .header { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #000; }
        table { width: 100%; border-collapse: collapse; margin-top: 10px; }
        th, td { border: 1px solid #ccc; padding: 8px; textAlign: "left"; }
      </style></head><body>${printContent.innerHTML}</body></html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  const exportToExcel = () => {
    if (!selectedAuditTrail) return;
    const now = new Date();
    const filename = `proposal_history_${now.getTime()}.xlsx`;
    const wb = XLSX.utils.book_new();

    const auditData = [
      ["PROPOSAL AUDIT TRAIL REPORT"],
      ["Generated: " + now.toLocaleString()],
      [""],
      ["Proposal ID:", selectedAuditTrail.proposal_id || "N/A"],
      ["Department:", selectedAuditTrail.department],
      ["Status:", selectedAuditTrail.status],
      [""],
      ["CHANGE HISTORY TIMELINE"],
      ["Status", "Last Modified", "Modified By", "Comments"],
      ...proposalHistory.map((entry) => [
        entry.status,
        new Date(entry.last_modified).toLocaleString(),
        entry.last_modified_by,
        entry.comments || "N/A",
      ]),
    ];

    const ws1 = XLSX.utils.aoa_to_sheet(auditData);
    XLSX.utils.book_append_sheet(wb, ws1, "Audit Trail");
    XLSX.writeFile(wb, filename);
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
      style={{ height: "100vh", display: "flex", flexDirection: "column" }}
    >
      <Navigation
        userProfile={userProfile}
        currentDate={currentDate}
        onLogout={logout}
        onManageProfile={() => setShowManageProfile(true)}
        isFinanceManager={isFinanceManager}
      />

      {/* MODIFICATION START: App Container Content */}
      <div
        className="content-container"
        style={{
          padding: "80px 20px 35px 20px",
          maxWidth: "1400px",
          margin: "0 auto",
          width: "95%",
          flex: 1,
          overflowY: "auto",
        }}
      >
        {showManageProfile ? (
          <ManageProfile onClose={() => setShowManageProfile(false)} />
        ) : (
          <div
            className="proposal-history"
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
            {/* Header and Filter Controls */}
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
                    placeholder="Search Ticket ID..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    style={{
                      padding: "8px 12px",
                      border: "1px solid #ccc",
                      borderRadius: "4px",
                      outline: "none",
                      fontSize: "13px",
                      minWidth: "200px",
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
                      minWidth: "200px",
                      justifyContent: "space-between",
                      fontSize: "13px",
                      cursor: "pointer",
                    }}
                  >
                    <span>
                      {selectedDepartment
                        ? shortenDepartmentName(
                            departmentOptions.find(
                              (d) => d.value === selectedDepartment,
                            )?.label,
                          )
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
                        width: "100%",
                        minWidth: "250px",
                        zIndex: 1000,
                        maxHeight: "350px",
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
                            whiteSpace: "normal",
                            wordWrap: "break-word",
                          }}
                        >
                          {dept.label}
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
                    onClick={() => setShowStatusDropdown(!showStatusDropdown)}
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
                      {
                        (
                          statusOptions.find(
                            (s) => s.value === selectedStatus,
                          ) || { label: "All Status" }
                        ).label
                      }
                    </span>
                    <ChevronDown size={14} />
                  </button>
                  {showStatusDropdown && (
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
                      {statusOptions.map((status) => (
                        <div
                          key={status.value}
                          onClick={() => {
                            setSelectedStatus(status.value);
                            setShowStatusDropdown(false);
                            setCurrentPage(1);
                          }}
                          style={{
                            padding: "8px 12px",
                            cursor: "pointer",
                            fontSize: "13px",
                            backgroundColor:
                              selectedStatus === status.value
                                ? "#f0f0f0"
                                : "white",
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

            {/* Table Section */}
            <div
              style={{
                flex: "1 1 auto",
                overflowY: "auto",
                border: "1px solid #e0e0e0",
                borderRadius: "4px",
              }}
            >
              <table
                className="data-table"
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  fontSize: "13px",
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
                      }}
                    >
                      LAST MODIFIED
                    </th>
                    <th
                      style={{
                        padding: "12px",
                        textAlign: "left",
                        borderBottom: "2px solid #dee2e6",
                        fontWeight: "600",
                      }}
                    >
                      MODIFIED BY
                    </th>
                    <th
                      style={{
                        padding: "12px",
                        textAlign: "left",
                        borderBottom: "2px solid #dee2e6",
                        fontWeight: "600",
                      }}
                    >
                      STATUS
                    </th>
                    <th
                      style={{
                        padding: "12px",
                        textAlign: "center",
                        borderBottom: "2px solid #dee2e6",
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
                        style={{ textAlign: "center", padding: "20px" }}
                      >
                        Loading history...
                      </td>
                    </tr>
                  ) : history.length > 0 ? (
                    history.map((item, index) => (
                      <tr
                        key={item.id}
                        style={{
                          backgroundColor:
                            selectedRowId === item.id
                              ? "#f0f8ff"
                              : index % 2 === 1
                                ? "#F8F8F8"
                                : "#FFFFFF",
                          borderBottom: "1px solid #dee2e6",
                          cursor: "pointer",
                        }}
                        onClick={() =>
                          handleRowClick(item.proposal_pk, item.id)
                        }
                      >
                        <td style={{ padding: "12px" }}>
                          {item.proposal_id || "N/A"}
                        </td>
                        <td style={{ padding: "12px" }}>
                          {shortenDepartmentName(item.department)}
                        </td>
                        <td style={{ padding: "12px" }}>{item.category}</td>
                        <td style={{ padding: "12px" }}>{item.subcategory}</td>
                        <td style={{ padding: "12px" }}>
                          {new Date(item.last_modified).toLocaleString()}
                        </td>
                        <td style={{ padding: "12px", fontWeight: "500" }}>
                          {item.last_modified_by}
                        </td>
                        <td style={{ padding: "12px" }}>
                          <StatusBadge type={item.status} name={item.status} />
                        </td>
                        <td style={{ padding: "12px", textAlign: "center" }}>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleViewAuditTrail(item);
                            }}
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
                        No history found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Component */}
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

      {/* Modals */}
      <ProposalDetailModal
        isOpen={showDetailPopup}
        detail={selectedDetail}
        loading={detailLoading}
        onClose={handleCloseDetailPopup}
        onPrint={handlePrint}
      />

      <AuditTrailModal
        isOpen={showAuditTrailPopup}
        loading={auditTrailLoading}
        selectedAuditTrail={selectedAuditTrail}
        proposalHistory={proposalHistory}
        auditProposalDetails={auditProposalDetails}
        onClose={handleCloseAuditTrailPopup}
        onExport={exportToExcel}
        renderNavbar={() => null} // Inside fullscreen modal, Navigation is already rendered by app-container
        shortenDepartmentName={shortenDepartmentName}
      />
      {/* MODIFICATION END */}
    </div>
  );
};

export default ProposalHistory;
