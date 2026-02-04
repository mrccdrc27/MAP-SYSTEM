import React, { useState, useEffect, useRef } from "react";
import { ChevronDown, Bell } from "lucide-react";
import { useNavigate } from "react-router-dom";
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
import budgetApi from "../../API/budgetAPI"; // Needed for deep fetch
import { getAllDepartments } from "../../API/departments";
import ManageProfile from "./ManageProfile";

// Modular Imports
import Navigation from "../../components/Navigation/Navigation";
import Pagination from "../../components/common/Pagination";
import AlertModal from "../../components/common/AlertModal";
import StatusBadge from "../../components/ProposalHistory/StatusBadge"; // Reuse generic badge logic
import ExpenseStatsCards from "../../components/ExpenseTracking/ExpenseStatsCards";
import SoftCapModal from "../../components/ExpenseTracking/SoftCapModal";
import ReviewExpenseModal from "../../components/ExpenseTracking/ReviewExpenseModal";
import AddExpenseModal from "../../components/ExpenseTracking/AddExpenseModal";

const ExpenseTracking = () => {
  const { user, logout, getBmsRole, isFinanceHead, isAdmin } = useAuth();

  // --- Global State ---
  const [showManageProfile, setShowManageProfile] = useState(false);
  const [alertState, setAlertState] = useState({
    isOpen: false,
    message: "",
    type: "info",
  });
  const [currentDate, setCurrentDate] = useState(new Date());

  // --- Data & Filter State ---
  const [expenses, setExpenses] = useState([]);
  const [summaryData, setSummaryData] = useState({
    budget_remaining: "0.00",
    total_expenses_this_month: "0.00",
  });
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ count: 0 });
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [selectedDepartment, setSelectedDepartment] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);

  // --- Dropdown Data ---
  const [departments, setDepartments] = useState([]);
  const [projects, setProjects] = useState([]);
  const [modalCategories, setModalCategories] = useState([]);

  // --- UI Toggles ---
  const [showDepartmentDropdown, setShowDepartmentDropdown] = useState(false);
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);

  // --- Modal State ---
  const [showAddModal, setShowAddModal] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [showSoftCapModal, setShowSoftCapModal] = useState(false);

  const [selectedExpense, setSelectedExpense] = useState(null);
  const [reviewAction, setReviewAction] = useState("");
  const [reviewNotes, setReviewNotes] = useState("");
  const [softCapInfo, setSoftCapInfo] = useState(null);

  const initialFormState = {
    project_id: "",
    category_code: "",
    vendor: "",
    amount: "",
    date: new Date().toISOString().split("T")[0],
    description: "",
    attachments: [],
  };
  const [formData, setFormData] = useState(initialFormState);

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

  const getDepartmentDisplay = () => {
    if (!selectedDepartment) return "All Departments";
    const dept = departments.find((d) => String(d.id) === selectedDepartment);
    return dept ? dept.name : "All Departments";
  };

  const projectOptions = projects.map((p) => ({
    value: p.project_id,
    label: p.project_title,
  }));
  const selectedProject = projects.find(
    (p) => p.project_id === parseInt(formData.project_id),
  );

  // --- Auth Logic ---
  const userRole = getBmsRole ? getBmsRole() : user?.role || "User";
  const isFinanceManager = isFinanceHead() || isAdmin();
  const userProfile = {
    name: user
      ? `${user.first_name || ""} ${user.last_name || ""}`.trim() ||
        user.full_name ||
        user.username ||
        "User"
      : "User",
    role: userRole,
    avatar:
      user?.profile_picture ||
      "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80",
    
    department: user?.department,
    department_name: user?.department_name,
  };

  // --- Effects ---
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [sumRes, depRes, projRes] = await Promise.all([
          getExpenseSummary(),
          getAllDepartments(),
          getValidProjectAccounts(),
        ]);
        setSummaryData(sumRes.data);
        setDepartments(depRes.data);
        setProjects(projRes.data);
      } catch (e) {
        console.error(e);
      }
    };
    fetchData();
    const interval = setInterval(() => setCurrentDate(new Date()), 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
      setCurrentPage(1);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Main Data Fetch
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
        setPagination({ count: res.data.count });
      } catch (e) {
        console.error(e);
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

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (!e.target.closest(".filter-dropdown")) {
        setShowDepartmentDropdown(false);
        setShowCategoryDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // --- Handlers ---
  const refreshData = async () => {
    // Helper to refresh table after mutation
    setLoading(true);
    try {
      const params = {
        page: currentPage,
        page_size: pageSize,
        search: debouncedSearchTerm,
      };
      if (selectedDepartment) params.department = selectedDepartment;
      if (selectedCategory) params.category__classification = selectedCategory;
      const res = await getExpenseTrackingList(params);
      setExpenses(res.data.results);
      setPagination({ count: res.data.count });
      const sumRes = await getExpenseSummary();
      setSummaryData(sumRes.data);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenReview = async (expense, action) => {
    setSelectedExpense({ ...expense, isLoadingDetails: true });
    setReviewAction(action);
    setReviewNotes("");
    setShowReviewModal(true);

    try {
      // DEEP FETCH: Get attachments
      const res = await budgetApi.get(`/expenses/${expense.id}/`);
      setSelectedExpense(res.data);
    } catch (e) {
      console.error("Detail fetch failed", e);
      setSelectedExpense(expense);
    }
  };

  const handleSubmitReview = async () => {
    if (!selectedExpense) return;
    try {
      await reviewExpense(selectedExpense.id, {
        status: reviewAction,
        notes: reviewNotes,
      });
      setShowReviewModal(false);
      showAlert("Review submitted successfully", "success");
      refreshData();
    } catch (e) {
      showAlert("Review failed: " + e.message, "error");
    }
  };

  const handleMarkAccomplished = async (expense) => {
    if (!window.confirm("Mark this expense as accomplished?")) return;
    try {
      await markExpenseAsAccomplished(expense.id);
      refreshData();
    } catch (e) {
      showAlert("Failed to mark accomplished", "error");
    }
  };

  const handleProjectSelect = async (pid) => {
    setFormData((prev) => ({ ...prev, project_id: pid, category_code: "" }));
    if (pid) {
      try {
        const res = await getExpenseCategories(pid);
        setModalCategories(res.data);
      } catch (e) {
        setModalCategories([]);
      }
    } else setModalCategories([]);
  };

  const handleSubmitExpense = async (e) => {
    e.preventDefault();
    if (parseFloat(formData.amount) < 0)
      return showAlert("Amount cannot be negative");

    const data = new FormData();
    Object.keys(formData).forEach((k) => {
      if (k !== "attachments") data.append(k, formData[k]);
    });
    formData.attachments.forEach((f) => data.append("attachments", f));

    try {
      await createExpense(data);
      setShowAddModal(false);
      setFormData(initialFormState);
      showAlert("Expense created successfully", "success");
      refreshData();
    } catch (err) {
      if (err.response?.data?.error === "BUDGET_SOFT_CAP_EXCEEDED") {
        setSoftCapInfo(err.response.data);
        setShowSoftCapModal(true);
      } else {
        showAlert(err.response?.data?.detail || "Creation failed", "error");
      }
    }
  };

  const handleSoftCapSubmit = async (justification) => {
    const data = new FormData();
    Object.keys(formData).forEach((k) => {
      if (k !== "attachments") data.append(k, formData[k]);
    });
    formData.attachments.forEach((f) => data.append("attachments", f));
    data.append("notes", justification);

    try {
      await createExpense(data);
      setShowSoftCapModal(false);
      setShowAddModal(false);
      setFormData(initialFormState);
      showAlert("Expense created with exception", "success");
      refreshData();
    } catch (e) {
      showAlert("Exception failed", "error");
    }
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
          <>
            <ExpenseStatsCards summaryData={summaryData} />

            <div
              className="expense-tracking"
              style={{
                backgroundColor: "white",
                borderRadius: "8px",
                boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
                padding: "20px",
                display: "flex",
                flexDirection: "column",
                minHeight: "calc(80vh - 100px)",
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
                  Expense Tracking
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
                      width: "200px",
                      backgroundColor: "white",
                    }}
                  />

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
                        <div
                          onClick={() => {
                            setSelectedDepartment("");
                            setShowDepartmentDropdown(false);
                            setCurrentPage(1);
                          }}
                          className="dropdown-item"
                          style={{
                            padding: "8px 12px",
                            cursor: "pointer",
                            fontSize: "13px",
                          }}
                        >
                          All Departments
                        </div>
                        {departments.map((d) => (
                          <div
                            key={d.id}
                            onClick={() => {
                              setSelectedDepartment(String(d.id));
                              setShowDepartmentDropdown(false);
                              setCurrentPage(1);
                            }}
                            className="dropdown-item"
                            style={{
                              padding: "8px 12px",
                              cursor: "pointer",
                              fontSize: "13px",
                            }}
                          >
                            {d.name}
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
                      }}
                    >
                      <span>
                        {
                          categoryOptions.find(
                            (c) => c.value === selectedCategory,
                          )?.label
                        }
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
                        }}
                      >
                        {categoryOptions.map((c) => (
                          <div
                            key={c.value}
                            onClick={() => {
                              setSelectedCategory(c.value);
                              setShowCategoryDropdown(false);
                              setCurrentPage(1);
                            }}
                            className="dropdown-item"
                            style={{
                              padding: "8px 12px",
                              cursor: "pointer",
                              fontSize: "13px",
                            }}
                          >
                            {c.label}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <button
                    onClick={() => setShowAddModal(true)}
                    style={{
                      padding: "8px 16px",
                      backgroundColor: "#007bff",
                      color: "white",
                      border: "none",
                      borderRadius: "4px",
                      cursor: "pointer",
                      fontSize: "13px",
                      fontWeight: "500",
                    }}
                  >
                    Add Expense
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
                      {[
                        "TICKET ID",
                        "DATE",
                        "DEPARTMENT",
                        "CATEGORY",
                        "SUB-CATEGORY",
                        "AMOUNT",
                        "STATUS",
                        "ACCOMPLISHED",
                        isFinanceManager ? "ACTIONS" : null,
                      ]
                        .filter(Boolean)
                        .map((h) => (
                          <th
                            key={h}
                            style={{
                              padding: "12px",
                              textAlign: "left",
                              borderBottom: "2px solid #dee2e6",
                            }}
                          >
                            {h}
                          </th>
                        ))}
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr>
                        <td
                          colSpan="9"
                          style={{ padding: "20px", textAlign: "center" }}
                        >
                          Loading...
                        </td>
                      </tr>
                    ) : (
                      expenses.map((expense, index) => (
                        <tr
                          key={expense.id}
                          style={{
                            backgroundColor: index % 2 ? "#F8F8F8" : "white",
                            borderBottom: "1px solid #dee2e6",
                          }}
                        >
                          <td style={{ padding: "12px" }}>
                            {expense.reference_no}
                          </td>
                          <td style={{ padding: "12px" }}>{expense.date}</td>
                          <td style={{ padding: "12px" }}>
                            {expense.department_name}
                          </td>
                          <td style={{ padding: "12px" }}>
                            {expense.category_name || "-"}
                          </td>
                          <td style={{ padding: "12px" }}>
                            {expense.sub_category_name}
                          </td>
                          <td style={{ padding: "12px" }}>
                            ₱{parseFloat(expense.amount).toLocaleString()}
                          </td>
                          <td style={{ padding: "12px" }}>
                            <StatusBadge
                              type={expense.status}
                              name={expense.status}
                            />
                          </td>
                          <td
                            style={{
                              padding: "12px",
                              textAlign: "center",
                              color:
                                expense.accomplished === "Yes"
                                  ? "green"
                                  : "red",
                              fontWeight: "500",
                            }}
                          >
                            {expense.accomplished}
                          </td>
                          {isFinanceManager && (
                            <td style={{ padding: "12px" }}>
                              {expense.status === "SUBMITTED" && (
                                <button
                                  onClick={() =>
                                    handleOpenReview(expense, "APPROVED")
                                  }
                                  style={{
                                    padding: "4px 8px",
                                    backgroundColor: "#007bff",
                                    color: "white",
                                    border: "none",
                                    borderRadius: "4px",
                                    fontSize: "11px",
                                    cursor: "pointer",
                                  }}
                                >
                                  Review
                                </button>
                              )}
                              {expense.status === "APPROVED" &&
                                expense.accomplished === "No" && (
                                  <button
                                    onClick={() =>
                                      handleMarkAccomplished(expense)
                                    }
                                    style={{
                                      padding: "4px 8px",
                                      backgroundColor: "#17a2b8",
                                      color: "white",
                                      border: "none",
                                      borderRadius: "4px",
                                      fontSize: "11px",
                                      cursor: "pointer",
                                    }}
                                  >
                                    Mark Done
                                  </button>
                                )}
                            </td>
                          )}
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

      <AddExpenseModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSubmit={handleSubmitExpense}
        data={formData}
        onChange={(e) =>
          setFormData({ ...formData, [e.target.name]: e.target.value })
        }
        onProjectChange={handleProjectSelect}
        onFileChange={(e) =>
          setFormData((p) => ({
            ...p,
            attachments: [...Array.from(e.target.files)],
          }))
        }
        onClearFiles={() => setFormData((p) => ({ ...p, attachments: [] }))}
        projectOptions={projectOptions}
        categories={modalCategories}
        selectedProject={selectedProject}
      />

      <ReviewExpenseModal
        isOpen={showReviewModal}
        expense={selectedExpense}
        onClose={() => setShowReviewModal(false)}
        action={reviewAction}
        setAction={setReviewAction}
        notes={reviewNotes}
        setNotes={setReviewNotes}
        onSubmit={handleSubmitReview}
      />

      <SoftCapModal
        isOpen={showSoftCapModal}
        onClose={() => setShowSoftCapModal(false)}
        onSubmit={handleSoftCapSubmit}
        capInfo={softCapInfo}
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

export default ExpenseTracking;
