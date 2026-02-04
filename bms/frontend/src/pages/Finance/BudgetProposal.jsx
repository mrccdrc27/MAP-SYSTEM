import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronDown } from "lucide-react";
import "./BudgetProposal.css";
import {
  getProposals,
  getProposalSummary,
  getProposalDetail,
  reviewProposal,
} from "../../API/proposalAPI";
import { getAllDepartments } from "../../API/departments";
import { useAuth } from "../../context/AuthContext";
import ManageProfile from "./ManageProfile";
import { getUserDisplayInfo } from "../../utils/profileUtils";

// Modular Imports
import Navigation from "../../components/Navigation/Navigation";
import Pagination from "../../components/common/Pagination";
import AlertModal from "../../components/common/AlertModal";
import ProposalSummaryCards from "../../components/BudgetProposal/ProposalSummaryCards";
import ProposalReviewModal from "../../components/BudgetProposal/ProposalReviewModal";
import ProposalConfirmationModal from "../../components/BudgetProposal/ProposalConfirmationModal";

const BudgetProposal = () => {
  // --- UI & Modal State ---
  const [showManageProfile, setShowManageProfile] = useState(false);
  const [showReviewPopup, setShowReviewPopup] = useState({
    visible: false,
    readOnly: false,
  });
  const [showConfirmationPopup, setShowConfirmationPopup] = useState(false);
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [showDepartmentDropdown, setShowDepartmentDropdown] = useState(false);

  // --- Form & Review State ---
  const [selectedProposal, setSelectedProposal] = useState(null);
  const [reviewComment, setReviewComment] = useState("");
  const [reviewStatus, setReviewStatus] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");
  const [financeOperatorName, setFinanceOperatorName] = useState("");
  const [financeOperatorSignature, setFinanceOperatorSignature] = useState("");
  const [alertState, setAlertState] = useState({
    isOpen: false,
    message: "",
    type: "info",
  });

  // --- Auth & Navigation ---
  const { user, logout, getBmsRole, isFinanceHead, isAdmin } = useAuth();

  // --- Data State ---
  const [loading, setLoading] = useState(true);
  const [proposals, setProposals] = useState([]);
  const [summaryData, setSummaryData] = useState({
    total_proposals: 0,
    pending_approvals: 0,
    total_budget: "0.00",
  });
  const [pagination, setPagination] = useState({ count: 0 }); // FIXED: Added missing pagination state
  const [departmentOptions, setDepartmentOptions] = useState([]);

  // --- Filter & Pagination State ---
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedDepartment, setSelectedDepartment] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);
  const [currentDate, setCurrentDate] = useState(new Date());

  // --- Constants ---
  const rejectionReasons = [
    "Budget Constraints",
    "Insufficient Justification",
    "Does Not Align with Strategy",
    "Incomplete Information",
    "Other (Please specify in comments)",
  ];

  const categoryOptions = [
    { id: "", name: "All Categories" },
    { id: "CAPEX", name: "CapEx" },
    { id: "OPEX", name: "Opex" },
  ];

  // --- Helpers ---
  const showAlert = (message, type = "error") =>
    setAlertState({ isOpen: true, message, type });
  const closeAlert = () =>
    setAlertState((prev) => ({ ...prev, isOpen: false }));

  const shortenDepartmentName = (name, maxLength = 20) => {
    if (!name || name.length <= maxLength) return name;
    const abbreviations = {
      Department: "Dept.",
      Management: "Mgmt.",
      Operations: "Ops.",
      Merchandise: "Merch.",
      Marketing: "Mktg.",
      Logistics: "Log.",
      "Human Resources": "HR",
      "Information Technology": "IT",
      Finance: "Finance",
    };
    let shortened = name;
    for (const [full, abbr] of Object.entries(abbreviations)) {
      shortened = shortened.replace(new RegExp(full, "gi"), abbr);
    }
    return shortened.length <= maxLength
      ? shortened
      : shortened.substring(0, maxLength - 3) + "...";
  };

  // --- Effects ---
  useEffect(() => {
    const fetchDropdowns = async () => {
      try {
        const deptRes = await getAllDepartments();
        setDepartmentOptions([
          { value: "", label: "All Departments" },
          // MODIFICATION START: Use name for label, code for value
          ...deptRes.data.map((d) => ({ value: d.code, label: d.name })),
          // MODIFICATION END
        ]);
        const summaryRes = await getProposalSummary();
        setSummaryData(summaryRes.data);
      } catch (err) {
        console.error("Failed to fetch dropdowns", err);
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
        Object.keys(params).forEach((k) => !params[k] && delete params[k]);
        const res = await getProposals(params);
        setProposals(res.data.results);
        setPagination(res.data); // FIXED: Correctly setting pagination state
      } catch (err) {
        console.error("Failed to fetch proposals", err);
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

  useEffect(() => {
    const timerId = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
      setCurrentPage(1);
    }, 500);
    return () => clearTimeout(timerId);
  }, [searchTerm]);

  useEffect(() => {
    const interval = setInterval(() => setCurrentDate(new Date()), 60000);
    return () => clearInterval(interval);
  }, []);

  // MODIFICATION START: Added Click Outside Handler for filter dropdowns
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest(".filter-dropdown")) {
        setShowDepartmentDropdown(false);
        setShowCategoryDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // --- Handlers ---
  const handleDepartmentSelect = (deptCode) => {
    setSelectedDepartment(deptCode);
    setShowDepartmentDropdown(false);
    setCurrentPage(1);
  };

  const handleCategorySelect = (categoryId) => {
    setSelectedCategory(categoryId);
    setShowCategoryDropdown(false);
    setCurrentPage(1);
  };

  const handleReviewClick = async (proposal) => {
    try {
      const res = await getProposalDetail(proposal.id);
      setSelectedProposal(res.data);
      const isReadOnly =
        res.data.status === "APPROVED" || res.data.status === "REJECTED";
      setFinanceOperatorName(
        isReadOnly ? res.data.finance_manager_name || "" : "",
      );
      setFinanceOperatorSignature(isReadOnly ? res.data.signature || "" : "");
      setShowReviewPopup({ visible: true, readOnly: isReadOnly });
    } catch (err) {
      console.error("Failed to fetch details", err);
    }
  };

  const handleStatusChange = (status) => {

    if (status === "APPROVED") {
      if (!financeOperatorName || !financeOperatorName.trim()) {
        showAlert("Finance Manager Name is required for approval.", "error");
        return;
      }
      if (!financeOperatorSignature) {
        showAlert("Signature is required for approval.", "error");
        return;
      }
    }

    setReviewStatus(status);
    setShowConfirmationPopup(true);
  };

  const handleSubmitReview = async () => {
    if (!selectedProposal) return;

    // ✅ FINAL VALIDATION
    if (
      reviewStatus === "APPROVED" &&
      (!financeOperatorName?.trim() || !financeOperatorSignature)
    ) {
      showAlert(
        "Finance Manager Name and Signature are required for approval.",
        "error",
      );
      return;
    }

    if (
      reviewStatus === "REJECTED" &&
      !reviewComment?.trim() &&
      !rejectionReason
    ) {
      showAlert("Please provide a rejection reason or comment.", "error");
      return;
    }

    let finalComment = reviewComment;
    if (reviewStatus === "REJECTED" && rejectionReason)
      finalComment = `Reason: ${rejectionReason}. \n${reviewComment}`;

    try {
      const formData = new FormData();
      formData.append("status", reviewStatus);
      formData.append("comment", finalComment);
      formData.append("finance_manager_name", financeOperatorName);

      // ✅ FIXED: Properly convert base64 to blob
      if (financeOperatorSignature?.startsWith("data:")) {
        const fetchRes = await fetch(financeOperatorSignature);
        const blob = await fetchRes.blob();
        formData.append("signature", blob, "signature.png");
      } else if (financeOperatorSignature) {
        // If it's already a file object
        formData.append("signature", financeOperatorSignature);
      }

      console.log("📤 Submitting review:", {
        status: reviewStatus,
        proposalId: selectedProposal.id,
        hasSignature: !!financeOperatorSignature,
        financeName: financeOperatorName,
      });

      await reviewProposal(selectedProposal.id, formData);

      setShowConfirmationPopup(false);
      setShowReviewPopup({ visible: false, readOnly: false });
      setCurrentPage(1);

      const summaryRes = await getProposalSummary();
      setSummaryData(summaryRes.data);

      showAlert(
        `Proposal ${reviewStatus.toLowerCase()} successfully.`,
        "success",
      );
    } catch (err) {
      console.error("❌ Review submission error:", err);
      const errorMsg =
        err.response?.data?.detail ||
        err.response?.data?.message ||
        err.response?.data?.finance_manager_name?.[0] ||
        err.response?.data?.signature?.[0] ||
        "Failed to submit review.";
      showAlert(errorMsg, "error");
    }
  };

  const handlePrint = () => {
    // FIXED: Added handlePrint function
    if (!selectedProposal) return;
    const printWindow = window.open("", "_blank");
    printWindow.document.write(`
      <html>
        <head><title>Print Proposal - ${selectedProposal.external_system_id}</title>
        <style>body { font-family: Arial; padding: 20px; } table { width: 100%; border-collapse: collapse; } th, td { border: 1px solid #ccc; padding: 10px; }</style></head>
        <body>
          <h2>Budget Proposal: ${selectedProposal.title}</h2>
          <p><strong>Department:</strong> ${selectedProposal.department_name}</p>
          <p><strong>Status:</strong> ${selectedProposal.status}</p>
          <table><thead><tr><th>Element</th><th>Cost</th></tr></thead>
          <tbody>${selectedProposal.items.map((i) => `<tr><td>${i.cost_element}</td><td>₱${parseFloat(i.estimated_cost).toLocaleString()}</td></tr>`).join("")}</tbody>
          </table>
          <p><strong>Total:</strong> ₱${parseFloat(selectedProposal.total_cost).toLocaleString()}</p>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  const closeReviewPopup = () => {
    setShowReviewPopup({ visible: false, readOnly: false });
    setSelectedProposal(null);
    setReviewComment("");
    setRejectionReason("");
  };

  const closeConfirmationPopup = () => setShowConfirmationPopup(false);

  const userRole = getBmsRole ? getBmsRole() : user?.role || "User";
  const isFinanceManager = isFinanceHead() || isAdmin();
  const userDisplayInfo = getUserDisplayInfo(user);
  const userProfile = {
    name: userDisplayInfo.name,
    role: userRole,
    avatar: userDisplayInfo.avatar,
    department: user?.department,
    department_name: user?.department_name,
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
          <ManageProfile onClose={handleCloseManageProfile} />
        ) : (
          <>
            <ProposalSummaryCards summaryData={summaryData} />

            <div
              className="proposal-history"
              style={{
                backgroundColor: "white",
                borderRadius: "8px",
                boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
                padding: "20px",
                display: "flex",
                flexDirection: "column",
                minHeight: "calc(100vh - 240px)",
              }}
            >
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
                  style={{ margin: 0, fontSize: "24px", fontWeight: "bold" }}
                >
                  Budget Proposal
                </h2>

                <div
                  className="controls-container"
                  style={{ display: "flex", gap: "10px" }}
                >
                  <input
                    type="text"
                    placeholder="Search..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    style={{
                      padding: "8px 12px",
                      border: "1px solid #ccc",
                      borderRadius: "4px",
                      fontSize: "13px",
                      minWidth: "200px",
                      background: "white",
                    }}
                  />

                  {/* Department Filter (Dropdown logic preserved) */}
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
                        gap: "8px",
                        fontSize: "13px",
                        minWidth: "160px",
                        // MODIFICATION START: Added styling for consistency
                        maxWidth: "200px",
                        justifyContent: "space-between",
                        cursor: "pointer",
                        // MODIFICATION END
                      }}
                    >
                      {/* MODIFICATION START: Shorten the button display label */}
                      <span
                        style={{
                          flex: 1,
                          textAlign: "left",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {selectedDepartment
                          ? shortenDepartmentName(
                              departmentOptions.find(
                                (d) => d.value === selectedDepartment,
                              )?.label,
                            )
                          : "All Departments"}
                      </span>
                      {/* MODIFICATION END */}
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
                          zIndex: 10,
                          maxHeight: "none",
                          overflowY: "visible",
                        }}
                      >
                        {departmentOptions.map((dept) => (
                          <div
                            key={dept.value}
                            onClick={() => handleDepartmentSelect(dept.value)}
                            className="dropdown-item"
                            style={{
                              padding: "8px 12px",
                              cursor: "pointer",
                              fontSize: "13px",
                              // MODIFICATION START: Handle long names in list
                              backgroundColor:
                                selectedDepartment === dept.value
                                  ? "#f0f0f0"
                                  : "white",
                              whiteSpace: "normal",
                              wordWrap: "break-word",
                              // MODIFICATION END
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
                        gap: "8px",
                        fontSize: "13px",
                        minWidth: "140px",
                      }}
                    >
                      <span>
                        {categoryOptions.find((c) => c.id === selectedCategory)
                          ?.name || "All Categories"}
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
                          zIndex: 10,
                        }}
                      >
                        {categoryOptions.map((cat) => (
                          <div
                            key={cat.id}
                            onClick={() => handleCategorySelect(cat.id)}
                            className="dropdown-item"
                            style={{
                              padding: "8px 12px",
                              cursor: "pointer",
                              fontSize: "13px",
                            }}
                          >
                            {cat.name}
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
                    tableLayout: "fixed",
                  }}
                >
                  <colgroup>
                    <col style={{ width: "12%" }} />
                    <col style={{ width: "18%" }} />
                    <col style={{ width: "12%" }} />
                    <col style={{ width: "16%" }} />
                    <col style={{ width: "16%" }} />
                    <col style={{ width: "14%" }} />
                    <col style={{ width: "12%" }} />
                  </colgroup>
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
                        }}
                      >
                        TICKET ID
                      </th>
                      <th
                        style={{
                          padding: "12px",
                          textAlign: "left",
                          borderBottom: "2px solid #dee2e6",
                        }}
                      >
                        DEPARTMENT
                      </th>
                      <th
                        style={{
                          padding: "12px",
                          textAlign: "left",
                          borderBottom: "2px solid #dee2e6",
                        }}
                      >
                        CATEGORY
                      </th>
                      <th
                        style={{
                          padding: "12px",
                          textAlign: "left",
                          borderBottom: "2px solid #dee2e6",
                        }}
                      >
                        SUB-CATEGORY
                      </th>
                      <th
                        style={{
                          padding: "12px",
                          textAlign: "left",
                          borderBottom: "2px solid #dee2e6",
                        }}
                      >
                        SUBMITTED BY
                      </th>
                      <th
                        style={{
                          padding: "12px",
                          textAlign: "left",
                          borderBottom: "2px solid #dee2e6",
                        }}
                      >
                        AMOUNT
                      </th>
                      <th
                        style={{
                          padding: "12px",
                          textAlign: "center",
                          borderBottom: "2px solid #dee2e6",
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
                    ) : (
                      proposals.map((proposal) => (
                        <tr
                          key={proposal.id}
                          onClick={() => handleReviewClick(proposal)}
                          style={{
                            borderBottom: "1px solid #dee2e6",
                            cursor: "pointer",
                            backgroundColor:
                              proposal.status === "SUBMITTED"
                                ? "#fffbe6"
                                : "white",
                          }}
                        >
                          <td style={{ padding: "12px" }}>
                            {proposal.reference}
                          </td>
                          <td style={{ padding: "12px" }}>
                            {shortenDepartmentName(proposal.department_name)}
                          </td>
                          <td style={{ padding: "12px" }}>
                            {proposal.category}
                          </td>
                          <td style={{ padding: "12px" }}>
                            {proposal.sub_category}
                          </td>
                          <td style={{ padding: "12px" }}>
                            {proposal.submitted_by}
                          </td>
                          <td
                            style={{ padding: "12px" }}
                          >{`₱${parseFloat(proposal.amount).toLocaleString()}`}</td>
                          <td style={{ padding: "12px", textAlign: "center" }}>
                            <div
                              style={{
                                display: "flex",
                                justifyContent: "center",
                              }}
                            >
                              <button
                                className="action-btn"
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
                                  fontSize: "11px",
                                }}
                              >
                                {proposal.status === "SUBMITTED" &&
                                isFinanceManager
                                  ? "REVIEW"
                                  : "VIEW"}
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

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
          </>
        )}
      </div>

      <ProposalReviewModal
        isOpen={showReviewPopup.visible}
        proposal={selectedProposal}
        readOnly={showReviewPopup.readOnly}
        isFinanceManager={isFinanceManager}
        onClose={closeReviewPopup}
        onPrint={handlePrint}
        financeName={financeOperatorName}
        setFinanceName={setFinanceOperatorName}
        financeSignature={financeOperatorSignature}
        setFinanceSignature={setFinanceOperatorSignature}
        onStatusChange={handleStatusChange}
      />

      <ProposalConfirmationModal
        isOpen={showConfirmationPopup}
        proposal={selectedProposal}
        status={reviewStatus}
        onClose={closeConfirmationPopup}
        onBack={() => setShowConfirmationPopup(false)}
        rejectionReason={rejectionReason}
        setRejectionReason={setRejectionReason}
        rejectionReasons={rejectionReasons}
        comment={reviewComment}
        setComment={setReviewComment}
        financeName={financeOperatorName}
        onSubmit={handleSubmitReview}
      />

      <AlertModal
        isOpen={alertState.isOpen}
        message={alertState.message}
        type={alertState.type}
        onClose={closeAlert}
      />
    </div>
  );
};

export default BudgetProposal;
