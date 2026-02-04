/* 
LOGIC EXPLANATION (verify this if correct):
1. Variance Calculation: ((Actual - Budget) / Budget) * 100.
   - Negative % (Green) = Under Budget (Good).
   - Positive % (Red) = Over Budget (Bad).
2. Visual Indicators:
   - Green Down Arrow: Spending is below limit.
   - Red Up Arrow: Spending exceeds limit.
   - Orange: Zero budget or nearing limit (<5% remaining).
3. "0 Items": Only leaf nodes (sub-categories) show item counts. Parent categories aggregate values.
*/

import React, { useState, useEffect } from "react";
import {
  ChevronDown,
  Download,
  TrendingUp,
  CheckCircle,
  XCircle,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import "./BudgetVarianceReport.css"; // Ensure this still exists with just content styles
import { useAuth } from "../../context/AuthContext";
import {
  getBudgetVarianceReport,
  exportBudgetVarianceReport,
} from "../../API/reportAPI";
import { getFiscalYears } from "../../API/dropdownAPI";
import ManageProfile from "./ManageProfile";
import Navigation from "../../components/Navigation/Navigation";
import { formatCurrency } from "../../utils/varianceReportUtils";
import ReportRow from "../../components/BudgetVariance/ReportRow";

// --- MAIN PAGE COMPONENT ---
const BudgetVarianceReport = () => {
  // Navigation
  const navigate = useNavigate();
  const { user, logout, getBmsRole } = useAuth();

  const [showManageProfile, setShowManageProfile] = useState(false);

  const [reportData, setReportData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fiscalYears, setFiscalYears] = useState([]);

  // Filters
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYearId, setSelectedYearId] = useState("");
  const [currentDate, setCurrentDate] = useState(new Date());

  const [reportSummary, setReportSummary] = useState({
    totalBudget: 0,
    totalActual: 0,
    totalAvailable: 0,
  });

  const months = [
    { value: "", label: "All Year" },
    { value: 1, label: "January" },
    { value: 2, label: "February" },
    { value: 3, label: "March" },
    { value: 4, label: "April" },
    { value: 5, label: "May" },
    { value: 6, label: "June" },
    { value: 7, label: "July" },
    { value: 8, label: "August" },
    { value: 9, label: "September" },
    { value: 10, label: "October" },
    { value: 11, label: "November" },
    { value: 12, label: "December" },
  ];

  const userRole = getBmsRole ? getBmsRole() : user?.role || "User";
  const isFinanceManager = ["ADMIN", "FINANCE_HEAD"].includes(userRole);

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


  // --- API LOGIC ---
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const res = await getFiscalYears();
        setFiscalYears(res.data);
        const activeYear = res.data.find((fy) => fy.is_active);
        if (activeYear) {
          setSelectedYearId(activeYear.id);
        } else if (res.data.length > 0) {
          setSelectedYearId(res.data[0].id);
        }
      } catch (error) {
        console.error("Failed to fetch fiscal years:", error);
      }
    };
    fetchInitialData();
  }, []);

  useEffect(() => {
    if (!selectedYearId) return;

    const fetchReport = async () => {
      setLoading(true);
      try {
        const params = {
          fiscal_year_id: selectedYearId,
          month: selectedMonth || null,
        };
        const res = await getBudgetVarianceReport(params);
        setReportData(res.data);

        const totals = res.data.reduce(
          (acc, curr) => {
            acc.totalBudget += parseFloat(curr.budget);
            acc.totalActual += parseFloat(curr.actual);
            acc.totalAvailable += parseFloat(curr.available);
            return acc;
          },
          { totalBudget: 0, totalActual: 0, totalAvailable: 0 },
        );
        setReportSummary(totals);
      } catch (error) {
        console.error("Failed to fetch report:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchReport();
  }, [selectedYearId, selectedMonth]);

  useEffect(() => {
    const interval = setInterval(() => setCurrentDate(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  // --- HANDLERS ---
  const handleExport = async () => {
    if (!selectedYearId) return;
    try {
      const params = {
        fiscal_year_id: selectedYearId,
        month: selectedMonth || null,
      };
      const response = await exportBudgetVarianceReport(params);
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `Budget_Variance_Report.xlsx`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error("Export failed:", error);
    }
  };

  const handleLogout = async () => await logout();
  const handleManageProfile = () => {
    setShowManageProfile(true);
  };
  const handleCloseManageProfile = () => setShowManageProfile(false);

  // Recursive Render
  const renderReportRows = (nodes, level = 0) => {
    return nodes.flatMap((node) => [
      <ReportRow key={node.code || Math.random()} item={node} level={level} />,
      ...(node.children && node.children.length > 0
        ? renderReportRows(node.children, level + 1)
        : []),
    ]);
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
        paddingTop: "70px", 
        maxWidth: "1400px",
        margin: "0 auto",
        width: "95%",
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
            {/* Header Section */}
            <div
              className="top"
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "10px",
                paddingTop: "2rem",
              }}
            >
              <h2 className="page-title">Budget Variance Report</h2>
              <div
                className="controls-container"
                style={{ display: "flex", gap: "15px", alignItems: "center" }}
              >
                <div
                  className="date-selection"
                  style={{ display: "flex", gap: "10px", alignItems: "center" }}
                >
                  <select
                    className="month-select"
                    value={selectedMonth}
                    onChange={(e) =>
                      setSelectedMonth(
                        e.target.value === "" ? "" : parseInt(e.target.value),
                      )
                    }
                    style={{
                      padding: "8px 12px",
                      border: "1px solid #ccc",
                      borderRadius: "4px",
                    }}
                  >
                    {months.map((month) => (
                      <option key={month.value} value={month.value}>
                        {month.label}
                      </option>
                    ))}
                  </select>
                  <select
                    className="year-select"
                    value={selectedYearId}
                    onChange={(e) =>
                      setSelectedYearId(parseInt(e.target.value))
                    }
                    style={{
                      padding: "8px 12px",
                      border: "1px solid #ccc",
                      borderRadius: "4px",
                    }}
                  >
                    <option value="">Select Year</option>
                    {fiscalYears.map((year) => (
                      <option key={year.id} value={year.id}>
                        {year.name}
                      </option>
                    ))}
                  </select>
                </div>
                <button
                  className="export-button"
                  onClick={handleExport}
                  disabled={loading}
                  style={{
                    padding: "8px 16px",
                    border: "none",
                    borderRadius: "4px",
                    backgroundColor: "#007bff",
                    color: "#ffffff",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    cursor: "pointer",
                    outline: "none",
                  }}
                >
                  <span style={{ color: "#ffffff" }}>Export Report</span>
                  <Download size={16} color="#ffffff" />
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

            {/* Report Table */}
            <div
              style={{
                flex: 1,
                overflow: "auto",
                border: "1px solid #e0e0e0",
                borderRadius: "4px",
              }}
            >
              <table
                className="report-table"
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
                      zIndex: 10,
                    }}
                  >
                    <th
                      style={{
                        width: "40%",
                        padding: "0.75rem",
                        textAlign: "left",
                        borderBottom: "2px solid #dee2e6",
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
                      }}
                    >
                      BUDGET
                    </th>
                    <th
                      style={{
                        width: "20%",
                        padding: "0.75rem",
                        textAlign: "left",
                        borderBottom: "2px solid #dee2e6",
                      }}
                    >
                      ACTUAL (VARIANCE)
                    </th>
                    <th
                      style={{
                        width: "20%",
                        padding: "0.75rem",
                        textAlign: "left",
                        borderBottom: "2px solid #dee2e6",
                      }}
                    >
                      AVAILABLE (STATUS)
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td
                        colSpan="4"
                        style={{ textAlign: "center", padding: "20px" }}
                      >
                        Loading report...
                      </td>
                    </tr>
                  ) : reportData.length > 0 ? (
                    <>
                      {renderReportRows(reportData)}
                      {/* Grand Total Row */}
                      <tr
                        style={{
                          backgroundColor: "#007bff",
                          color: "white",
                          fontWeight: "700",
                        }}
                      >
                        <td style={{ padding: "0.75rem", textAlign: "left" }}>
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "8px",
                            }}
                          >
                            <TrendingUp size={16} color="#ffffff" />
                            OVERALL TOTAL
                          </div>
                        </td>
                        <td style={{ padding: "0.75rem", textAlign: "left" }}>
                          {formatCurrency(reportSummary.totalBudget)}
                        </td>
                        <td style={{ padding: "0.75rem", textAlign: "left" }}>
                          {formatCurrency(reportSummary.totalActual)}
                        </td>
                        <td style={{ padding: "0.75rem", textAlign: "left" }}>
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "8px",
                            }}
                          >
                            {reportSummary.totalAvailable >= 0 ? (
                              <CheckCircle size={16} color="#ffffff" />
                            ) : (
                              <XCircle size={16} color="#ffffff" />
                            )}
                            {formatCurrency(reportSummary.totalAvailable)}
                          </div>
                        </td>
                      </tr>
                    </>
                  ) : (
                    <tr>
                      <td
                        colSpan="4"
                        style={{ textAlign: "center", padding: "20px" }}
                      >
                        No data available.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BudgetVarianceReport;
