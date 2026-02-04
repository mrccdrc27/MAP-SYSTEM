import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronDown } from "lucide-react";
import * as XLSX from "xlsx";
import { useAuth } from "../../context/AuthContext";
import {
  getExpenseHistoryList,
  getExpenseCategories,
  getExpenseDetailsForModal,
  getProposalDetails,
} from "../../API/expenseAPI";

// Components
import ManageProfile from "./ManageProfile";
import { getUserDisplayInfo } from "../../utils/profileUtils";

import Navigation from "../../components/Navigation/Navigation";
import Pagination from "../../components/common/Pagination";
import ExpenseTable from "../../components/ExpenseHistory/ExpenseTable";
import ExpenseDetails from "../../components/ExpenseHistory/ExpenseDetails";
import "./ExpenseHistory.css";

const ExpenseHistory = () => {
  const { user, logout, getBmsRole } = useAuth();
  // const navigate = useNavigate();

  // State
  const [showManageProfile, setShowManageProfile] = useState(false);

  // API Data State
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ count: 0 });

  // Filter State
  const [selectedCategory, setSelectedCategory] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);

  // View Modal State
  const [selectedExpense, setSelectedExpense] = useState(null);
  const [selectedProposalDetails, setSelectedProposalDetails] = useState(null);
  const [viewModalLoading, setViewModalLoading] = useState(false);

  // Current Date State
  const [currentDate, setCurrentDate] = useState(new Date());

  const userRole = getBmsRole ? getBmsRole() : (user?.role || "User");
  const isFinanceManager = ["ADMIN", "FINANCE_HEAD"].includes(userRole);
  const userDisplayInfo = getUserDisplayInfo(user);
  const userProfile = {
    name: userDisplayInfo.name,
    role: userRole,
    avatar: userDisplayInfo.avatar,
    department: user?.department,
    department_name: user?.department_name,
  };

  // Helper function to get category display name
  const getCategoryDisplay = () => {
    if (!selectedCategory) return "All Categories";
    return selectedCategory === "CAPEX" ? "CapEx" : "OpEx";
  };

  // Export Report Handler for Excel (.xlsx)
  const handleExportReport = () => {
    if (!selectedExpense) return;

    try {
      const formatCurrency = (amount) =>
        `₱${parseFloat(amount).toLocaleString("en-US", { minimumFractionDigits: 2 })}`;

      const data = [
        ["EXPENSE REPORT"],
        ["Generated On", new Date().toLocaleString()],
        [],
        ["TRANSACTION DETAILS"],
        ["Date", selectedExpense.date],
        ["Description", selectedExpense.description],
        ["Amount", formatCurrency(selectedExpense.amount)],
        ["Vendor", selectedExpense.vendor || "N/A"],
        ["Department", selectedExpense.department_name || "N/A"],
        ["Category", selectedExpense.category_name || "N/A"],
        ["Sub-Category", selectedExpense.sub_category_name || "N/A"],
        [],
      ];

      if (selectedProposalDetails) {
        data.push(["PROJECT DETAILS"]);
        data.push(["Project Title", selectedProposalDetails.title]);
        data.push(["End Date", selectedProposalDetails.performance_end_date]);
        data.push(["Summary", selectedProposalDetails.project_summary || ""]);
        data.push(["Description", selectedProposalDetails.project_description || ""]);
        data.push([]);

        data.push(["COST ELEMENTS"]);
        data.push(["Type", "Description", "Estimated Cost"]);

        if (selectedProposalDetails.items && selectedProposalDetails.items.length > 0) {
          selectedProposalDetails.items.forEach((item) => {
            data.push([
              item.cost_element,
              item.description || "",
              formatCurrency(item.estimated_cost),
            ]);
          });
        }

        const total = selectedProposalDetails.total_cost || selectedProposalDetails.amount;
        data.push(["TOTAL", "", formatCurrency(total)]);
      } else {
        data.push(["PROJECT LINK"]);
        data.push(["Status", "Not linked to a project proposal"]);
      }

      const worksheet = XLSX.utils.aoa_to_sheet(data);
      const wscols = [{ wch: 20 }, { wch: 60 }, { wch: 20 }];
      worksheet["!cols"] = wscols;

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Expense Details");

      const safeId = selectedExpense.transaction_id || selectedExpense.id || "Report";
      const filename = `Expense_Report_${safeId}.xlsx`;

      XLSX.writeFile(workbook, filename);
    } catch (error) {
      console.error("Error exporting report:", error);
      alert("Failed to export report. Please try again.");
    }
  };

  // Debounce Search
  useEffect(() => {
    const timerId = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
      setCurrentPage(1);
    }, 500);
    return () => clearTimeout(timerId);
  }, [searchTerm]);

  // Clock
  useEffect(() => {
    const interval = setInterval(() => setCurrentDate(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  // Fetch Categories on Mount
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        await getExpenseCategories();
      } catch (error) {
        console.error("Failed to fetch categories", error);
      }
    };
    fetchCategories();
  }, []);

  // Fetch Expenses
  useEffect(() => {
    const fetchExpenses = async () => {
      setLoading(true);
      try {
        const params = {
          page: currentPage,
          page_size: pageSize,
          search: debouncedSearchTerm,
          category__classification: selectedCategory !== "" ? selectedCategory : undefined,
        };

        Object.keys(params).forEach(
          (key) => params[key] === undefined && delete params[key],
        );

        const res = await getExpenseHistoryList(params);
        setExpenses(res.data.results);
        setPagination(res.data);
      } catch (error) {
        console.error("Failed to fetch expenses:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchExpenses();
  }, [currentPage, pageSize, debouncedSearchTerm, selectedCategory]);

  // Dropdown Close Handler
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest(".filter-dropdown")) {
        setShowCategoryDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Handlers
  const handleCategorySelect = (code) => {
    setSelectedCategory(code);
    setCurrentPage(1);
    setShowCategoryDropdown(false);
  };

  const handleLogout = async () => {
    await logout();
  };

  const handleManageProfile = () => {
    setShowManageProfile(true);
  };

  const handleCloseManageProfile = () => {
    setShowManageProfile(false);
  };

  const handleViewExpense = async (expense) => {
    setViewModalLoading(true);
    setSelectedExpense(expense);
    setSelectedProposalDetails(null);

    try {
      const detailsRes = await getExpenseDetailsForModal(expense.id);
      const modalData = detailsRes.data;

      const fullExpenseData = {
        ...expense,
        ...modalData,
      };

      setSelectedExpense(fullExpenseData);
      const proposalId = modalData.proposal_id;

      if (proposalId) {
        const proposalRes = await getProposalDetails(proposalId);
        setSelectedProposalDetails(proposalRes.data);
      } else {
        setSelectedProposalDetails(null);
      }
    } catch (error) {
      console.error("Failed to fetch details", error);
    } finally {
      setViewModalLoading(false);
    }
  };

  const handleBackToList = () => {
    setSelectedExpense(null);
    setSelectedProposalDetails(null);
  };

  return (
    <div
      className="app-container"
      style={{ minWidth: "1200px", overflowY: "auto", height: "100vh" }}
    >
      <Navigation
        userProfile={userProfile}
        currentDate={currentDate}
        onLogout={handleLogout}
        onManageProfile={handleManageProfile}
        isFinanceManager={isFinanceManager}
        activeView="expense-history"
      />

      <div
        className="content-container"
        style={{
          padding: "10px 20px",
          maxWidth: "1600px",
          margin: "0 auto",
          width: "98%",
          paddingTop: "80px",
        }}
      >
        {showManageProfile ? (
          <ManageProfile onClose={handleCloseManageProfile} />
        ) : (
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
            }}
          >
            {!selectedExpense ? (
              <>
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
                  <h2 className="page-title">Expense History</h2>

                  <div
                    className="controls-container"
                    style={{ display: "flex", gap: "10px" }}
                  >
                    {/* Search Input */}
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
                          width: "300px",
                        }}
                      />
                    </div>

                    {/* Category Filter Dropdown */}
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
                          justifyContent: "space-between",
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
                          {[
                            { code: "", name: "All Categories" },
                            { code: "CAPEX", name: "CapEx" },
                            { code: "OPEX", name: "OpEx" },
                          ].map((cat) => (
                            <div
                              key={cat.code}
                              className={`category-dropdown-item ${
                                selectedCategory === cat.code ? "active" : ""
                              }`}
                              onClick={() => handleCategorySelect(cat.code)}
                              onMouseDown={(e) => e.preventDefault()}
                              style={{
                                padding: "8px 12px",
                                cursor: "pointer",
                                backgroundColor:
                                  selectedCategory === cat.code
                                    ? "#f0f0f0"
                                    : "white",
                                outline: "none",
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

                {/* Expense Table */}
                <ExpenseTable
                  expenses={expenses}
                  loading={loading}
                  onView={handleViewExpense}
                />

                {/* Pagination */}
                {pagination.count > 0 && (
                  <Pagination
                    currentPage={currentPage}
                    pageSize={pageSize}
                    totalItems={pagination.count}
                    onPageChange={setCurrentPage}
                    onPageSizeChange={(newSize) => {
                      setPageSize(newSize);
                      setCurrentPage(1);
                    }}
                  />
                )}
              </>
            ) : (
              /* Expense Details View */
              <ExpenseDetails
                expense={selectedExpense}
                proposalDetails={selectedProposalDetails}
                loading={viewModalLoading}
                onBack={handleBackToList}
                onExport={handleExportReport}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ExpenseHistory;