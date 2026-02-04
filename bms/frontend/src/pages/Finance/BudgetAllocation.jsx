import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
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
import { getUserDisplayInfo } from "../../utils/profileUtils";

// Modular Imports
import Navigation from "../../components/Navigation/Navigation";
import AlertModal from "../../components/common/AlertModal";
import DateFilter from "../../components/BudgetAllocation/DateFilter";
import BudgetAdjustmentTab from "../../components/BudgetAllocation/BudgetAdjustmentTab";
import SupplementalBudgetTab from "../../components/BudgetAllocation/SupplementalBudgetTab";
import AllocationFormModal from "../../components/BudgetAllocation/AllocationFormModal";
import SupplementalRequestModal from "../../components/BudgetAllocation/SupplementalRequestModal";
import SupplementalDetailsModal from "../../components/BudgetAllocation/SupplementalDetailsModal";
import SupplementalAuditModal from "../../components/BudgetAllocation/SupplementalAuditModal";

const BudgetAllocation = () => {
  const { user, logout, getBmsRole, isFinanceHead, isAdmin } = useAuth();
  const userRole = getBmsRole ? getBmsRole() : user?.role || "User";
  const isFinanceManager = isFinanceHead() || isAdmin();
  // --- Global UI State ---
  const [activeTab, setActiveTab] = useState("budgetAdjustment");
  const [showManageProfile, setShowManageProfile] = useState(false);
  const [alertState, setAlertState] = useState({
    isOpen: false,
    message: "",
    type: "info",
  });
  const [currentDate, setCurrentDate] = useState(new Date());

  // --- Data State ---
  const [adjustments, setAdjustments] = useState([]);
  const [supplementalRequests, setSupplementalRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({ count: 0 });
  const [auditLogs, setAuditLogs] = useState([]);

  // --- Dropdown Options ---
  const [departmentOptions, setDepartmentOptions] = useState([]);
  const [accountOptions, setAccountOptions] = useState([]);
  const [projects, setProjects] = useState([]);
  const [projectCategories, setProjectCategories] = useState([]);
  const [modalDropdowns, setModalDropdowns] = useState({
    departments: [],
    debitAccounts: [],
    creditAccounts: [],
  });

  // --- Filter State ---
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [selectedDepartment, setSelectedDepartment] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [supplementalDateFilter, setSupplementalDateFilter] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);

  // --- UI Toggles ---
  const [showDepartmentDropdown, setShowDepartmentDropdown] = useState(false);
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [showActionDropdown, setShowActionDropdown] = useState(false);

  // --- Modal State ---
  const [showModifyModal, setShowModifyModal] = useState(false);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showAuditModal, setShowAuditModal] = useState(false);

  const [selectedRowId, setSelectedRowId] = useState(null);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [modalType, setModalType] = useState("modify");

  // --- Forms Data ---
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
  const [requestData, setRequestData] = useState({
    department_input: "",
    department_display: "",
    project_id: "",
    category_id: "",
    amount: "",
    reason: "",
  });
  const [formErrors, setFormErrors] = useState({});

  // --- Constants ---
  const categoryOptions = [
    { value: "", label: "All Categories" },
    { value: "CAPEX", label: "CapEx" },
    { value: "OPEX", label: "OpEx" },
  ];

  // --- Helpers ---
  const showAlert = (msg, type = "error") =>
    setAlertState({ isOpen: true, message: msg, type });
  const closeAlert = () =>
    setAlertState((prev) => ({ ...prev, isOpen: false }));

  const shortenDepartmentName = (name) => {
    if (!name) return "";
    const map = {
      "Merchandising / Merchandise Planning": "Merchandising",
      "Sales / Store Operations": "Sales",
      "Marketing / Marketing Communications": "Marketing",
      "Operations Department": "Operations",
      "IT Application & Data": "IT",
      "Logistics Management": "Logistics",
      "Human Resources": "HR",
      "Finance Department": "Finance",
    };
    return (
      map[name] || (name.length > 15 ? name.substring(0, 15) + "..." : name)
    );
  };

  const getDepartmentDisplay = () =>
    departmentOptions.find((o) => o.value === selectedDepartment)?.label ||
    "All Departments";
  const getCategoryDisplay = () =>
    categoryOptions.find((o) => o.value === selectedCategory)?.label ||
    "All Categories";
  const getActionDisplay = () =>
    modalType === "modify" ? "Modify Budget" : "Add Budget";
  const formatTableAmount = (val) =>
    val
      ? `₱${parseFloat(val).toLocaleString("en-US", { minimumFractionDigits: 2 })}`
      : "₱0.00";

  // --- Effects ---
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [deptRes, accRes, projRes] = await Promise.all([
          getAllDepartments(),
          getAccounts(),
          getProjects(),
        ]);

        const depts = deptRes.data.map((d) => ({
          value: d.code,
          label: d.name,
          id: d.id,
        }));

        setDepartmentOptions([
          { value: "", label: "All Departments" },
          ...depts,
        ]);

        const allAccounts = accRes.data.map((acc) => ({
          id: acc.id,
          value: acc.name, // Select value
          name: `${acc.code} - ${acc.name}`, // Display label
          type_name: acc.account_type_name, // New field from backend
          raw_name: acc.name,
        }));

        setAccountOptions(allAccounts);

        // 1. Funding Sources (Debit Side)
        // Should include:
        // - Assets (Cash/Bank) -> For Injections
        // - Equity (Retained Earnings) -> For Injections
        // - Expenses -> For Internal Transfers (taking budget FROM here)
        const validSources = allAccounts.filter((acc) => {
          const type = acc.type_name || "";
          const n = acc.raw_name.toLowerCase();

          // Always allow Cash/Bank/Equity/Liabilities
          if (type === "Equity" || type === "Liability") return true;
          if (type === "Asset" && (n.includes("cash") || n.includes("bank")))
            return true;

          // Allow Expenses (for re-allocation scenarios)
          if (type === "Expense") return true;

          // Allow general Assets (like PPE) if you transfer Capital Budget
          if (type === "Asset") return true;

          return false;
        });

        // 2. Allocation Targets (Credit Side)
        // Should include:
        // - Expenses (Operating Budget)
        // - Assets (Capital Budget)
        // - Exclude: Cash/Bank/Equity (You don't "allocate budget" INTO the bank, you take it OUT)
        const validTargets = allAccounts.filter((acc) => {
          const type = acc.type_name || "";
          const n = acc.raw_name.toLowerCase();

          // Exclude Sources
          if (
            n.includes("cash") ||
            n.includes("bank") ||
            n.includes("retained")
          )
            return false;
          if (type === "Equity") return false;

          return type === "Expense" || type === "Asset";
        });

        setModalDropdowns({
          departments: depts,
          debitAccounts: validSources, // "Funding Source"
          creditAccounts: validTargets, // "Target Allocation"
        });
        // MODIFICATION END

        setProjects(
          projRes.data.map((p) => ({
            value: p.id,
            label: p.name,
            department_id: p.department_id,
          })),
        );
      } catch (err) {
        console.error("Initial fetch error", err);
      }
    };

    fetchData();
    const interval = setInterval(() => setCurrentDate(new Date()), 60000);
    return () => clearInterval(interval);
  }, []);

  // Auto-fill logic for Operator Request
  useEffect(() => {
    if (!user || isFinanceManager || departmentOptions.length === 0) return;
    let target =
      departmentOptions.find(
        (d) => String(d.id) === String(user.department_id),
      ) || departmentOptions.find((d) => d.label === user.department);
    if (target)
      setRequestData((prev) => ({
        ...prev,
        department_input: String(target.id),
        department_display: target.label,
      }));
  }, [user, isFinanceManager, departmentOptions]);

  const fetchTabContent = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        page: currentPage,
        page_size: pageSize,
        search: debouncedSearchTerm,
      };
      if (activeTab === "budgetAdjustment") {
        if (selectedCategory) params.category = selectedCategory;
        if (selectedDepartment) params.department = selectedDepartment;
        const res = await getBudgetAdjustments(params);
        setAdjustments(res.data.results);
        setPagination({ count: res.data.count });
      } else {
        if (selectedDepartment) params.search = selectedDepartment; // Department filter reuse
        if (supplementalDateFilter) params.date = supplementalDateFilter;
        const res = await getSupplementalBudgetRequests(params);
        setSupplementalRequests(res.data.results);
        setPagination({ count: res.data.count });
      }
    } catch (err) {
      console.error("Fetch error", err);
    } finally {
      setLoading(false);
    }
  }, [
    activeTab,
    currentPage,
    pageSize,
    debouncedSearchTerm,
    selectedCategory,
    selectedDepartment,
    supplementalDateFilter,
  ]);

  useEffect(() => {
    fetchTabContent();
  }, [fetchTabContent]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
      setCurrentPage(1);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (!e.target.closest(".filter-dropdown")) {
        setShowDepartmentDropdown(false);
        setShowCategoryDropdown(false);
        setShowActionDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // --- Handlers ---
  const handleDepartmentSelect = (val) => {
    setSelectedDepartment(val);
    setShowDepartmentDropdown(false);
    setCurrentPage(1);
  };
  const handleCategorySelect = (val) => {
    setSelectedCategory(val);
    setShowCategoryDropdown(false);
    setCurrentPage(1);
  };

  const handleActionSelect = (action) => {
    setModalType(action);
    setShowActionDropdown(false);

    if (action === "add") {
      if (!isFinanceManager) {
        setShowRequestModal(true);
      } else {
        setModalData({
          id: null,
          ticket_id: "AUTO-GENERATED",
          date: new Date().toISOString().split("T")[0],
          department: "",
          category: "",
          debit_account: "",
          credit_account: "",
          amount: "",
        });
        setShowModifyModal(true);
      }
    } else if (action === "modify") {
      if (selectedRowId) {
        const entryToEdit = adjustments.find((a) => a.id === selectedRowId);
        if (entryToEdit) {
          // MODIFICATION START: Auto-select Department & Map Accounts correctly
          // 1. Map Department Name -> Department Code (for the select value)
          const matchedDept = departmentOptions.find(
            (opt) => opt.label === entryToEdit.department_name,
          );

          // 2. Map Account Names -> Ensuring they exist in options
          // The table shows 'Category' sometimes in the account column due to serializer logic,
          // but 'entryToEdit' from backend should have raw account names (debit_account, credit_account)
          // We use the raw values which match the 'value' key in our options.

          setModalData({
            id: entryToEdit.id,
            ticket_id: entryToEdit.ticket_id,
            date: entryToEdit.date,
            department: matchedDept ? matchedDept.value : "",
            category: entryToEdit.category,
            // FIX START: Swap mappings to align with Frontend Variable Names vs Accounting Reality
            // modalData.debit_account (Source Input) <--- needs entry.credit_account (Source API)
            debit_account: entryToEdit.credit_account,

            // modalData.credit_account (Target Input) <--- needs entry.debit_account (Target API)
            credit_account: entryToEdit.debit_account,
            // FIX END
            amount: "", // User inputs new amount for adjustment
          });
          setShowModifyModal(true);
          // MODIFICATION END
        }
      } else {
        showAlert("Please select a row to modify.", "warning");
      }
    }
  };

  const handleModalSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        date: modalData.date,
        description: "Budget Adjustment",
        amount: parseFloat(modalData.amount.replace(/[₱,]/g, "")),
        department_name: modalData.department,
        category_name: modalData.category,
        source_account_name: modalData.debit_account,
        destination_account_name: modalData.credit_account,
      };
      await createBudgetAdjustment(payload);
      setShowModifyModal(false);
      showAlert("Budget Updated Successfully", "success");
      fetchTabContent();
    } catch (err) {
      showAlert(
        `Failed: ${err.response?.data?.non_field_errors || err.message}`,
      );
    }
  };

  const handleRequestSubmit = async (e) => {
    e.preventDefault();
    try {
      await requestSupplementalBudget({
        department_input: requestData.department_input,
        project_id: parseInt(requestData.project_id),
        category_id: parseInt(requestData.category_id),
        amount: parseFloat(requestData.amount),
        reason: requestData.reason,
      });
      setShowRequestModal(false);
      showAlert("Request Submitted", "success");
      fetchTabContent();
    } catch (err) {
      showAlert("Failed to submit request.");
    }
  };

  const handleApprove = async (id) => {
    try {
      await approveSupplementalRequest(id);
      showAlert("Request Approved", "success");
      fetchTabContent();
    } catch {
      showAlert("Approval Failed");
    }
  };
  const handleReject = async (id) => {
    try {
      await rejectSupplementalRequest(id);
      showAlert("Request Rejected", "success");
      fetchTabContent();
    } catch {
      showAlert("Rejection Failed");
    }
  };

  const handleProjectChange = async (pid) => {
    setRequestData((p) => ({ ...p, project_id: pid, category_id: "" }));
    if (pid) {
      try {
        const res = await getExpenseCategories(pid);
        setProjectCategories(res.data);
      } catch (e) {
        console.error(e);
      }
    }
  };

  const handleViewAuditLogs = async () => {
    try {
      const res = await getSupplementalBudgetRequests({ page_size: 100 });
      const logs = res.data.results.map((req) => ({
        timestamp:
          req.status === "APPROVED" ? req.approval_date : req.date_submitted,
        request_id: req.request_id,
        action: req.status === "APPROVED" ? "Approved" : "Submitted",
        actor:
          req.status === "APPROVED" ? req.approver_name : req.requester_name,
        original: { department_name: req.department_name, amount: req.amount },
      }));
      setAuditLogs(logs);
      setShowAuditModal(true);
    } catch (e) {
      console.error(e);
    }
  };

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
              minHeight: "calc(90vh - 140px)",
            }}
          >
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
                  onClick={() => {
                    setActiveTab("budgetAdjustment");
                    setCurrentPage(1);
                  }}
                  className={`tab-button ${activeTab === "budgetAdjustment" ? "active" : ""}`}
                  style={{
                    padding: "10px 20px",
                    border: "none",
                    background: "none",
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
                  }}
                >
                  Budget Adjustment
                </button>
                <button
                  onClick={() => {
                    setActiveTab("supplementalBudget");
                    setCurrentPage(1);
                  }}
                  className={`tab-button ${activeTab === "supplementalBudget" ? "active" : ""}`}
                  style={{
                    padding: "10px 20px",
                    border: "none",
                    background: "none",
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
                  }}
                >
                  Supplemental Budget Approval
                </button>
              </div>
              {/* <div style={{ marginLeft: "20px" }}><DateFilter value={supplementalDateFilter} onChange={setSupplementalDateFilter} /></div> */}
            </div>

            {activeTab === "budgetAdjustment" ? (
              <BudgetAdjustmentTab
                adjustments={adjustments}
                loading={loading}
                pagination={pagination}
                searchTerm={searchTerm}
                setSearchTerm={setSearchTerm}
                selectedDepartment={selectedDepartment}
                departmentOptions={departmentOptions}
                handleDepartmentSelect={handleDepartmentSelect}
                selectedCategory={selectedCategory}
                categoryOptions={categoryOptions}
                handleCategorySelect={handleCategorySelect}
                selectedAction={modalType}
                showActionDropdown={showActionDropdown}
                toggleActionDropdown={() =>
                  setShowActionDropdown(!showActionDropdown)
                }
                handleActionSelect={handleActionSelect}
                selectedRowId={selectedRowId}
                handleRowSelect={(entry) =>
                  setSelectedRowId(selectedRowId === entry.id ? null : entry.id)
                }
                isFinanceManager={isFinanceManager}
                currentPage={currentPage}
                pageSize={pageSize}
                setCurrentPage={setCurrentPage}
                setPageSize={setPageSize}
                showDepartmentDropdown={showDepartmentDropdown}
                toggleDepartmentDropdown={() =>
                  setShowDepartmentDropdown(!showDepartmentDropdown)
                }
                showCategoryDropdown={showCategoryDropdown}
                toggleCategoryDropdown={() =>
                  setShowCategoryDropdown(!showCategoryDropdown)
                }
                getDepartmentDisplay={getDepartmentDisplay}
                getCategoryDisplay={getCategoryDisplay}
                getActionDisplay={getActionDisplay}
                formatTableAmount={formatTableAmount}
                getCompactDepartmentName={shortenDepartmentName}
              />
            ) : (
              <SupplementalBudgetTab
                requests={supplementalRequests}
                loading={loading}
                pagination={pagination}
                searchTerm={searchTerm}
                setSearchTerm={setSearchTerm}
                selectedDepartment={selectedDepartment}
                departmentOptions={departmentOptions}
                handleDepartmentSelect={handleDepartmentSelect}
                isFinanceManager={isFinanceManager}
                handleApprove={handleApprove}
                handleReject={handleReject}
                handleViewDetails={(req) => {
                  setSelectedRequest(req);
                  setShowDetailsModal(true);
                }}
                currentPage={currentPage}
                pageSize={pageSize}
                setCurrentPage={setCurrentPage}
                setPageSize={setPageSize}
                showDepartmentDropdown={showDepartmentDropdown}
                toggleDepartmentDropdown={() =>
                  setShowDepartmentDropdown(!showDepartmentDropdown)
                }
                getDepartmentDisplay={getDepartmentDisplay}
                getCompactDepartmentName={shortenDepartmentName}
                handleRequestOpen={() => setShowRequestModal(true)}
                handleAuditOpen={handleViewAuditLogs}
              />
            )}
          </div>
        )}
      </div>

      <AllocationFormModal
        isOpen={showModifyModal}
        type={modalType}
        data={modalData}
        onChange={(e) =>
          setModalData({ ...modalData, [e.target.name]: e.target.value })
        }
        onAmountChange={(e) =>
          setModalData({ ...modalData, amount: e.target.value })
        }
        onClose={() => setShowModifyModal(false)}
        onSubmit={handleModalSubmit}
        dropdowns={modalDropdowns}
        errors={formErrors}
      />
      <SupplementalRequestModal
        isOpen={showRequestModal}
        onClose={() => setShowRequestModal(false)}
        onSubmit={handleRequestSubmit}
        requestData={requestData}
        setRequestData={setRequestData}
        projects={filteredProjects(projects, requestData.department_input)}
        categories={projectCategories}
        isFinanceManager={isFinanceManager}
      />
      <SupplementalDetailsModal
        request={selectedRequest}
        onClose={() => setShowDetailsModal(false)}
        onApprove={handleApprove}
        onReject={handleReject}
        isFinanceManager={isFinanceManager}
      />
      {showAuditModal && (
        <SupplementalAuditModal
          logs={auditLogs}
          onClose={() => setShowAuditModal(false)}
        />
      )}
      <AlertModal
        isOpen={alertState.isOpen}
        message={alertState.message}
        type={alertState.type}
        onClose={closeAlert}
      />
    </div>
  );
};

// Filter helper needed for the modal
const filteredProjects = (projects, deptId) =>
  projects
    .filter((p) => !deptId || String(p.department_id) === String(deptId))
    .map((p) => ({ value: p.value, label: p.label }));

export default BudgetAllocation;
