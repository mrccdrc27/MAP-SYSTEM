// Double check if Monthly Spent is Correct; seeder likely generated expenses randomly, but maybe didn't hit December for the current active budget, or the "Expenses This Month" query in the backend is filtering strictly by date__month=12 and date__year=2025 and finding nothing approved yet.\
/*
Forecast Spike (November 3k -> December 248k)
Observation: November projection matches actual (correct stitching). December jumps to 248k.
Cause: This is the Seasonal Baseline kicking in.
generate_forecasts.py calculates the average December spend from history (2023, 2024).
Since its set SEASONAL_MULTIPLIERS[12] = 1.3 (130% activity) in the seeder, historical Decembers are huge.
The Forecast generator sees this "Year End Rush" pattern and predicts you will spend a lot in December.
Verdict: Feature, not a bug. This accurately simulates a company that spends its remaining budget at year-end.

Note on Forecasting: get_budget_forecast view currently does not have data isolation. Department head will see their specific atual/budget lines compared against the Global Forecast Line (high numbers) on the money flow chart.
Address later when we refine the forecasting logic.

Calculations: Math is done consistently using Decimal on the backend.
Consistency: The Pie Chart and Department List will now scale down when you select "Monthly" or "Quarterly", matching the Summary Cards.
Accuracy: Division happens before subtraction, reducing rounding drift.

TODO: Filter out fiscal years in Old Dropdown to only show years where end_date is in the past or today.
TODO: Make Export on spendingTrendsData better and not just the two cards
*/
import React, { useState, useEffect } from "react";
import { Line, Pie, Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ArcElement,
  BarElement,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";
import {
  ChevronDown, // Note: Some icons might be unused now if they were only in Nav, but keeping to avoid breaking hidden usages
  Bell,
  Settings,
  Eye,
  TrendingUp,
  BarChart3,
  Target,
  Download,
  User,
  LogOut,
  TrendingDown,
  Flame,
  PieChart,
  Calendar,
  ChevronRight,
  CheckCircle,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
// REMOVED: import LOGOMAP from "../../assets/MAP.jpg";
import "./Dashboard.css";
import {
  getBudgetSummary,
  getMoneyFlowData,
  getForecastData,
  getForecastAccuracy,
  getTopCategoryAllocations,
  getDepartmentBudgetData,
  getSpendingTrends,
  getTopSpendingCategories,
  getSpendingHeatmap,
} from "../../API/dashboardAPI";
import { useAuth } from "../../context/AuthContext";
import ManageProfile from "./ManageProfile";
import * as XLSX from "xlsx";
import {
  getFiscalYears,
  createFiscalYear,
  updateFiscalYearStatus,
  getClosingPreview,
  processYearEnd as apiProcessYearEnd,
} from "../../API/fiscalYearAPI";
import {
  Lock,
  Unlock,
  XCircle,
  Calendar as CalendarIcon,
  Plus,
} from "lucide-react";

// --- NEW IMPORTS (Refactoring) ---
import Navigation from "../../components/Navigation/Navigation";
import {
  formatPeso,
  convertCumulativeToMonthly,
  getFormattedDateParts,
} from "../../utils/dashboardUtils";
import { DEPARTMENTS_MAPPING } from "../../utils/dashboardConstants";
import {
  createLineChartOptions,
  createPieChartOptions,
  createSpendingTrendsOptions,
  buildMoneyFlowChartData,
  buildForecastComparisonData,
  buildDepartmentPieData,
} from "../../utils/chartConfigs";
import TimeFilter from "../../components/Dashboard/TimeFilter";
import DashboardStats from "../../components/Dashboard/DashboardStats";
// --- NEW IMPORTS PHASE 3 ---
import MoneyFlowChart from "../../components/Dashboard/MoneyFlowChart";
// REMOVED: import DepartmentChart ... 
import ForecastAccuracyAnalysis from "../../components/Dashboard/ForecastAccuracyAnalysis";
// --- NEW IMPORT ---
import DepartmentBudgetAnalysis from "../../components/Dashboard/DepartmentBudgetAnalysis";
import ForecastAccuracyAnalysis from "../../components/Dashboard/ForecastAccuracyAnalysis";
// --- NEW IMPORT PHASE 5 (Spending Analytics) ---
import SpendingAnalytics from "../../components/Dashboard/SpendingAnalytics";

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ArcElement,
  BarElement,
  Tooltip,
  Legend,
  Filler,
);

// --- HELPER FUNCTIONS ---

// NOTE: formatPeso, convertCumulativeToMonthly, DEPARTMENTS, and DEPARTMENTS_MAPPING definitions removed.
// They are now imported from utils/constants.

const exportToExcel = (
  summaryData,
  moneyFlowData,
  pieChartData,
  departmentData,
  timeFilter,
) => {
  const now = new Date();
  const dateStr = now.toISOString().split("T")[0].replace(/-/g, "");
  const timeStr = now.toTimeString().split(" ")[0].replace(/:/g, "");
  const fileName = `dashboard_summary_${dateStr}_${timeStr}.xlsx`;

  try {
    const wb = XLSX.utils.book_new();

    // 1. Summary Sheet
    const summarySheetData = [
      ["BudgetPro Dashboard Summary", "", "", ""],
      ["Generated on:", now.toLocaleString(), "", ""],
      [
        "Time Filter:",
        timeFilter.charAt(0).toUpperCase() + timeFilter.slice(1),
        "",
        "",
      ],
      [],
      ["Summary Statistics"],
      ["Metric", "Value", "Percentage", "Status"],
      [
        "Total Budget",
        formatPeso(summaryData?.total_budget || 0),
        "100%",
        "Total",
      ],
      [
        "Budget Used",
        formatPeso(summaryData?.budget_used || 0),
        `${summaryData?.percentage_used || 0}%`,
        "Used",
      ],
      [
        "Remaining Budget",
        formatPeso(summaryData?.remaining_budget || 0),
        `${(100 - (summaryData?.percentage_used || 0)).toFixed(1)}%`,
        "Available",
      ],
    ];

    // 2. Money Flow Sheet
    const moneyFlowSheetData = [
      ["Monthly Money Flow Analysis", "", "", "", ""],
      [
        "Report Period:",
        timeFilter.charAt(0).toUpperCase() + timeFilter.slice(1),
        "",
        "",
        "",
      ],
      [],
      ["Month", "Budget Amount", "Actual Expense", "Variance", "Status"],
    ];

    if (moneyFlowData && Array.isArray(moneyFlowData)) {
      moneyFlowData.forEach((item) => {
        const budget = Number(item.budget) || 0;
        const actual = Number(item.actual) || 0;
        const variance = budget - actual;
        const variancePercentage =
          budget > 0 ? ((variance / budget) * 100).toFixed(1) : 0;

        let status =
          variance > 0
            ? `Under Budget by ${variancePercentage}%`
            : variance < 0
              ? `Over Budget by ${Math.abs(variancePercentage)}%`
              : "On Budget";

        moneyFlowSheetData.push([
          item.month_name,
          formatPeso(budget),
          formatPeso(actual),
          formatPeso(Math.abs(variance)),
          status,
        ]);
      });
    }

    // 3. Department Sheet
    const departmentSheetData = [
      ["Department Budget Allocation", "", "", "", "", ""],
      [],
      [
        "Department",
        "Budget",
        "Spent",
        "Remaining",
        "Percentage Used",
        "Status",
      ],
    ];

    if (departmentData && Array.isArray(departmentData)) {
      departmentData.forEach((dept) => {
        const budget = Number(dept.budget) || 0;
        const spent = Number(dept.spent) || 0;
        const remaining = budget - spent;
        const percentageUsed =
          budget > 0 ? ((spent / budget) * 100).toFixed(1) : 0;

        let status =
          percentageUsed >= 90
            ? "Critical"
            : percentageUsed >= 75
              ? "High Usage"
              : percentageUsed >= 50
                ? "Moderate Usage"
                : "Low Usage";

        departmentSheetData.push([
          dept.department_name,
          formatPeso(budget),
          formatPeso(spent),
          formatPeso(remaining),
          `${percentageUsed}%`,
          status,
        ]);
      });
    }

    const ws1 = XLSX.utils.aoa_to_sheet(summarySheetData);
    const ws2 = XLSX.utils.aoa_to_sheet(moneyFlowSheetData);
    const ws3 = XLSX.utils.aoa_to_sheet(departmentSheetData);

    XLSX.utils.book_append_sheet(wb, ws1, "Summary");
    XLSX.utils.book_append_sheet(wb, ws2, "Money Flow");
    XLSX.utils.book_append_sheet(wb, ws3, "Departments");

    const colWidths = [
      { wch: 25 },
      { wch: 20 },
      { wch: 20 },
      { wch: 20 },
      { wch: 25 },
      { wch: 15 },
    ];
    ws1["!cols"] = colWidths;
    ws2["!cols"] = colWidths;
    ws3["!cols"] = colWidths;

    XLSX.writeFile(wb, fileName);
  } catch (error) {
    console.error("Error exporting to Excel:", error);
    alert("Failed to export Excel file. Please try again.");
  }
};

// Export Forecast Accuracy Report
const exportAccuracyReport = (
  forecastAccuracyData,
  moneyFlowData,
  forecastData,
) => {
  const now = new Date();
  const dateStr = now.toISOString().split("T")[0].replace(/-/g, "");
  const timeStr = now.toTimeString().split(" ")[0].replace(/:/g, "");
  const fileName = `dashboard_summary_${dateStr}_${timeStr}.xlsx`;

  if (!forecastAccuracyData || !moneyFlowData || !forecastData) {
    alert("Accuracy data is not available to export.");
    return;
  }

  try {
    const wb = XLSX.utils.book_new();

    // --- 1. PREPARE DATA ---
    const monthlyForecasts = convertCumulativeToMonthly(forecastData);

    const reportRows = [];

    // Header for Detail Section
    const tableHeader = [
      "Month",
      "Actual",
      "Forecast",
      "Variance Amount",
      "Variance Status",
      "Accuracy",
    ];

    if (moneyFlowData && Array.isArray(moneyFlowData) && monthlyForecasts) {
      moneyFlowData.forEach((month, index) => {
        const actualValue = Number(month.actual) || 0;

        // Logic: Find raw forecast
        let forecastPoint = monthlyForecasts.find(
          (f) => f.month_name === month.month_name,
        );
        let forecastValue = forecastPoint ? Number(forecastPoint.forecast) : 0;

        const variance = actualValue - forecastValue;

        // Floating point precision check (Epsilon)
        const isExact = Math.abs(variance) < 0.01;

        // Calculate Accuracy
        let accuracyPct = 0;
        if (actualValue > 0) {
          accuracyPct = 100 * (1 - Math.abs(variance) / actualValue);
        } else if (forecastValue === 0) {
          accuracyPct = 100;
        }

        // Clamp accuracy between 0 and 100 to avoid negative percentages or > 100%
        const displayAccuracy =
          Math.max(0, Math.min(100, accuracyPct)).toFixed(1) + "%";

        // Status Text
        let statusText = "Exact Match";
        if (!isExact) {
          statusText = variance > 0 ? "Actual > Forecast" : "Actual < Forecast";
        }

        reportRows.push([
          month.month_name,
          formatPeso(actualValue),
          formatPeso(forecastValue),
          formatPeso(Math.abs(variance)),
          statusText,
          displayAccuracy,
        ]);
      });
    }

    // --- 2. BUILD SHEETS ---

    // Sheet 1: Executive Summary & Details Combined (Professional Look)
    const combinedData = [
      ["FORECAST ACCURACY REPORT"],
      ["Generated on:", now.toLocaleString()],
      [""], // Spacer
      ["EXECUTIVE SUMMARY"],
      [
        "Analyzed Month",
        `${forecastAccuracyData.month_name} ${forecastAccuracyData.year}`,
      ],
      ["Status", "Last completed month"],
      ["Accuracy Score", `${forecastAccuracyData.accuracy_percentage}%`],
      [
        "Variance",
        `${formatPeso(Math.abs(Number(forecastAccuracyData.variance)))} (${
          Number(forecastAccuracyData.variance) >= 0 ? "Over" : "Under"
        } Forecast)`,
      ],
      [""], // Spacer
      [""], // Spacer
      ["DETAILED MONTHLY BREAKDOWN"],
      tableHeader,
      ...reportRows,
    ];

    const ws1 = XLSX.utils.aoa_to_sheet(combinedData);

    // --- 3. BEAUTIFICATION (Column Widths) ---
    const wscols = [
      { wch: 15 }, // Month
      { wch: 20 }, // Actual
      { wch: 20 }, // Forecast
      { wch: 20 }, // Variance
      { wch: 20 }, // Status
      { wch: 15 }, // Accuracy
    ];
    ws1["!cols"] = wscols;

    XLSX.utils.book_append_sheet(wb, ws1, "Forecast Report");
    XLSX.writeFile(wb, fileName);
  } catch (error) {
    console.error("Error exporting accuracy report:", error);
    alert("Failed to export accuracy report.");
  }
};

// Export Spending Behavior Report
const exportSpendingReport = (type, data, filters) => {
  const now = new Date();
  const dateStr = now.toISOString().split("T")[0].replace(/-/g, "");
  const timeStr = now.toTimeString().split(" ")[0].replace(/:/g, "");
  const fileName = `${type.replace(
    /\s+/g,
    "_",
  )}_report_${dateStr}_${timeStr}.xlsx`;

  try {
    const wb = XLSX.utils.book_new();
    let wsData = [];

    if (type === "Department Spending Trends") {
      wsData = [
        ["DEPARTMENT SPENDING TRENDS REPORT"],
        ["Generated on:", now.toLocaleString()],
        ["Department:", filters.department || "All Departments"],
        ["Date Range:", `${filters.startDate} to ${filters.endDate}`],
        ["Time Granularity:", filters.granularity],
        [""],
        ["Period", "Total Spent", "Percentage Change", "Status"],
        // FIX: Access data.labels directly, not data.chartData.labels
        ...(data.labels?.map((label, index) => [
          label,
          // FIX: Access data.datasets[0] directly
          formatPeso(data.datasets[0].data[index] || 0),
          data.datasets[0].percentageChange?.[index]
            ? `${data.datasets[0].percentageChange[index]}%`
            : "N/A",
          data.datasets[0].percentageChange?.[index] >= 0
            ? "Increase"
            : "Decrease",
        ]) || []),
      ];
    } else if (type === "Highest Spending Categories") {
      wsData = [
        ["HIGHEST SPENDING CATEGORIES REPORT"],
        ["Generated on:", now.toLocaleString()],
        ["Department:", filters.department],
        ["Date Range:", `${filters.startDate} to ${filters.endDate}`],
        [""],
        ["Rank", "Category", "Total Spent", "Percentage of Total"],
        ...(data.categories?.map((cat, index) => [
          index + 1,
          cat.category,
          formatPeso(cat.amount),
          `${cat.percentage}%`,
        ]) || []),
      ];
    } else if (type === "Spending Heatmap") {
      wsData = [
        ["SPENDING HEATMAP ANALYTICS REPORT"],
        ["Generated on:", now.toLocaleString()],
        ["Department:", filters.department],
        ["Time Aggregation:", filters.aggregation],
        [""],
        ["Period", "Total Spent", "Intensity Level"],
        ...(data.heatmapData?.map((item) => [
          item.period,
          formatPeso(item.value),
          item.intensity,
        ]) || []),
      ];
    }

    const ws = XLSX.utils.aoa_to_sheet(wsData);
    const wscols = [{ wch: 20 }, { wch: 25 }, { wch: 20 }, { wch: 20 }];
    ws["!cols"] = wscols;

    XLSX.utils.book_append_sheet(wb, ws, "Report");
    XLSX.writeFile(wb, fileName);
  } catch (error) {
    console.error("Error exporting spending report:", error);
    alert("Failed to export report. Please try again.");
  }
};

// Mock data for demonstration (replace with actual API calls)
const getMockDepartmentSpendingTrends = (
  department,
  startDate,
  endDate,
  granularity,
) => {
  const periods =
    granularity === "Monthly"
      ? [
          "Jan",
          "Feb",
          "Mar",
          "Apr",
          "May",
          "Jun",
          "Jul",
          "Aug",
          "Sep",
          "Oct",
          "Nov",
          "Dec",
        ]
      : ["Q1", "Q2", "Q3", "Q4"];

  const data = periods.map(() => Math.random() * 50000 + 10000);
  const percentageChange = periods.map((_, i) =>
    i > 0 ? (((data[i] - data[i - 1]) / data[i - 1]) * 100).toFixed(1) : 0,
  );

  return {
    labels: periods,
    datasets: [
      {
        label: `Spending - ${department || "All Departments"}`,
        data,
        percentageChange,
        borderColor: "#007bff",
        backgroundColor: "rgba(0, 123, 255, 0.1)",
        tension: 0.4,
        fill: true,
      },
    ],
    totalAmount: data.reduce((a, b) => a + b, 0),
    avgPercentageChange: (
      ((data[data.length - 1] - data[0]) / data[0]) *
      100
    ).toFixed(1),
  };
};

const getMockHighestSpendingCategories = (department, startDate, endDate) => {
  const categories = [
    "Office Supplies",
    "Travel & Entertainment",
    "Software Licenses",
    "Hardware Equipment",
    "Marketing Campaigns",
    "Training & Development",
    "Maintenance",
    "Utilities",
    "Consulting Fees",
    "Contract Services",
  ];

  const randomCategories = categories
    .sort(() => Math.random() - 0.5)
    .slice(0, 6)
    .map((category) => ({
      category,
      amount: Math.random() * 100000 + 50000,
      percentage: (Math.random() * 30 + 10).toFixed(1),
    }))
    .sort((a, b) => b.amount - a.amount);

  const total = randomCategories.reduce((sum, cat) => sum + cat.amount, 0);

  return randomCategories.map((cat) => ({
    ...cat,
    percentage: ((cat.amount / total) * 100).toFixed(1),
  }));
};

const getMockHeatmapData = (department, aggregation) => {
  const periods =
    aggregation === "Monthly"
      ? [
          "Jan",
          "Feb",
          "Mar",
          "Apr",
          "May",
          "Jun",
          "Jul",
          "Aug",
          "Sep",
          "Oct",
          "Nov",
          "Dec",
        ]
      : ["Q1", "Q2", "Q3", "Q4"];

  return periods.map((period) => {
    const value = Math.random() * 100000 + 20000;
    let intensity;
    if (value > 80000) intensity = "High";
    else if (value > 50000) intensity = "Medium";
    else intensity = "Low";

    return { period, value, intensity };
  });
};

function BudgetDashboard() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [loading, setLoading] = useState(true);

  // UI State
  // REMOVED: showBudgetDropdown, showExpenseDropdown, showNotifications, showProfileDropdown

  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [showForecasting, setShowForecasting] = useState(false);
  const [showForecastComparison, setShowForecastComparison] = useState(false);
  const [showManageProfile, setShowManageProfile] = useState(false);

  // Spending Analytics State
  const [activeSpendingTab, setActiveSpendingTab] = useState("trends");

  // Department Spending Trends State
  const [selectedDepartment, setSelectedDepartment] =
    useState("All Departments");
  const [dateRange, setDateRange] = useState({
    startDate: new Date(new Date().getFullYear(), 0, 1)
      .toISOString()
      .split("T")[0],
    endDate: new Date().toISOString().split("T")[0],
  });
  const [timeGranularity, setTimeGranularity] = useState("Monthly");
  const [spendingTrendsData, setSpendingTrendsData] = useState(null);

  // Highest Spending Categories State
  const [selectedCategoryDepartment, setSelectedCategoryDepartment] =
    useState("All Departments");
  const [categoryDateRange, setCategoryDateRange] = useState({
    startDate: new Date(new Date().getFullYear(), 0, 1)
      .toISOString()
      .split("T")[0],
    endDate: new Date().toISOString().split("T")[0],
  });
  const [highestSpendingCategories, setHighestSpendingCategories] = useState(
    [],
  );

  // Heatmap State
  const [selectedHeatmapDepartment, setSelectedHeatmapDepartment] =
    useState("All Departments");
  const [timeAggregation, setTimeAggregation] = useState("Monthly");
  const [heatmapData, setHeatmapData] = useState([]);

  // Data State
  const [timeFilter, setTimeFilter] = useState("monthly");
  const [summaryData, setSummaryData] = useState(null);
  const [moneyFlowData, setMoneyFlowData] = useState(null);
  const [forecastData, setForecastData] = useState([]);
  const [pieChartApiData, setPieChartApiData] = useState(null);
  const [departmentDetailsData, setDepartmentDetailsData] = useState(null);
  const [forecastAccuracyData, setForecastAccuracyData] = useState(null);

  // --- ADD FISCAL YEAR STATE ---
  const [activeView, setActiveView] = useState("dashboard"); // "dashboard" or "fiscal-year"
  const [fiscalYears, setFiscalYears] = useState([]);
  const [selectedFiscalYear, setSelectedFiscalYear] = useState(null); // For actions like lock/close
  const [showCreateFiscalYear, setShowCreateFiscalYear] = useState(false);
  const [showYearEndProcessing, setShowYearEndProcessing] = useState(false);

  const [newFiscalYear, setNewFiscalYear] = useState({
    name: "",
    start_date: "",
    end_date: "",
  });

  const calculateProgress = (start, end) => {
    const total = new Date(end) - new Date(start);
    const elapsed = new Date() - new Date(start);
    return Math.min(100, Math.max(0, (elapsed / total) * 100)).toFixed(1);
  };
  const currentActiveYear = fiscalYears.find((fy) => fy.is_active);

  // Fiscal Year Management State
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [confirmAction, setConfirmAction] = useState("");
  const [yearEndData, setYearEndData] = useState({
    remainingBudgets: [],
    carryoverDecisions: {},
    processingStatus: "pending",
  });

  // Year End Logic State
  const [closingYearId, setClosingYearId] = useState("");
  const [openingYearId, setOpeningYearId] = useState("");
  const [previewAllocations, setPreviewAllocations] = useState([]); // List from backend
  const [selectedCarryoverIds, setSelectedCarryoverIds] = useState([]); // IDs selected for carryover
  const [yearEndStep, setYearEndStep] = useState(1); // 1=Select Years, 2=Review Allocations

  const navigate = useNavigate();
  const { user, logout, getBmsRole } = useAuth();

  // MODIFIED: Updated getUserRole logic to correctly handle the role array from Central Auth
  const getUserRole = () => {
    if (user) {
      console.groupCollapsed("BMS Auth Debugger");
      console.log("Full User Object:", user);
      console.log("User Roles Array:", user.roles);
      console.log(
        "Detected BMS Role:",
        getBmsRole ? getBmsRole() : "getBmsRole function missing",
      );
      console.groupEnd();
    }

    if (!user) return "User";

    // 1. Try to get the BMS specific role using the Context helper
    if (getBmsRole) {
      const bmsRole = getBmsRole();
      if (bmsRole) return bmsRole;
    }

    // 2. Fallback: Check direct role property (Legacy)
    if (user.role && typeof user.role === "string") return user.role;

    // 3. Fallback: Check boolean flags
    if (user.is_superuser) return "ADMIN";
    if (user.is_staff) return "STAFF";

    return "User";
  };

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
  };

  // --- API CALLS ---

  // 1. Initial Data Load
  useEffect(() => {
    const fetchStaticData = async () => {
      try {
        setLoading(true);
        // Dashboard Data
        const [moneyFlowRes, pieChartRes] = await Promise.all([
          getMoneyFlowData(null),
          getTopCategoryAllocations(),
        ]);
        setMoneyFlowData(moneyFlowRes.data);
        setPieChartApiData(pieChartRes.data);

        // Fiscal Year Data (Pre-fetch)
        if (isFinanceManager) {
          const fyRes = await getFiscalYears();
          setFiscalYears(fyRes.data);
        }
      } catch (error) {
        console.error("Failed to fetch data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchStaticData();
    const interval = setInterval(() => setCurrentDate(new Date()), 1000);
    return () => clearInterval(interval);
  }, [isFinanceManager]);

  // 2. Summary & Department Data (Refreshes on Filter Change)
  useEffect(() => {
    const fetchDataBasedOnPeriod = async () => {
      try {
        // Fetch both Summary and Department data with the time filter
        const [summaryRes, deptRes] = await Promise.all([
          getBudgetSummary(timeFilter),
          getDepartmentBudgetData(timeFilter), // Update API function to accept arg
        ]);

        setSummaryData(summaryRes.data);
        setDepartmentDetailsData(deptRes.data);
      } catch (error) {
        console.error("Failed to fetch period data:", error);
      }
    };
    fetchDataBasedOnPeriod();
  }, [timeFilter]);

  // 3. Forecast Data (Refreshes on Toggle)
  useEffect(() => {
    const fetchAnalysisData = async () => {
      if (
        (showForecastComparison || showForecasting) &&
        forecastData.length === 0
      ) {
        try {
          const [forecastRes, accuracyRes] = await Promise.all([
            getForecastData(null), // Changed from 2 to null to auto-detect active year
            getForecastAccuracy(),
          ]);

          if (Array.isArray(forecastRes.data)) {
            setForecastData(forecastRes.data);
          }
          setForecastAccuracyData(accuracyRes.data);
        } catch (error) {
          console.error("Failed to fetch forecast analysis data:", error);
        }
      }
    };
    fetchAnalysisData();
  }, [showForecastComparison, showForecasting]);

  // 4. Spending Analytics Data (Refreshes on Tab/Filter Change)
  useEffect(() => {
    fetchSpendingAnalyticsData();
  }, [
    activeSpendingTab,
    selectedDepartment,
    dateRange,
    timeGranularity,
    selectedCategoryDepartment,
    categoryDateRange,
    selectedHeatmapDepartment,
    timeAggregation,
  ]);

  const fetchSpendingAnalyticsData = async () => {
    try {
      if (activeSpendingTab === "trends") {
        const params = {
          department: selectedDepartment,
          start_date: dateRange.startDate,
          end_date: dateRange.endDate,
          granularity: timeGranularity,
        };
        const res = await getSpendingTrends(params);

        const chartData = {
          labels: res.data.labels,
          datasets: [
            {
              label: `Spending - ${selectedDepartment}`,
              data: res.data.data,
              percentageChange: res.data.percentage_changes,
              borderColor: "#007bff",
              backgroundColor: "rgba(0, 123, 255, 0.1)",
              tension: 0.4,
              fill: true,
            },
          ],
          totalAmount: res.data.total_amount,
          avgPercentageChange: res.data.avg_percentage_change,
        };
        setSpendingTrendsData(chartData);
      } else if (activeSpendingTab === "categories") {
        const params = {
          department: selectedCategoryDepartment,
          start_date: categoryDateRange.startDate,
          end_date: categoryDateRange.endDate,
        };
        const res = await getTopSpendingCategories(params);
        setHighestSpendingCategories(res.data);
      } else if (activeSpendingTab === "heatmap") {
        const params = {
          department: selectedHeatmapDepartment,
          start_date: categoryDateRange.startDate,
          end_date: categoryDateRange.endDate,
          aggregation: timeAggregation,
        };
        const res = await getSpendingHeatmap(params);
        setHeatmapData(res.data);
      }
    } catch (error) {
      console.error("Failed to fetch analytics:", error);
    }
  };

  useEffect(() => {
    if (activeView === "fiscal-year" && isFinanceManager) {
      fetchFiscalYearsList();
    }
  }, [activeView, isFinanceManager]);

  const fetchFiscalYearsList = async () => {
    try {
      const res = await getFiscalYears();
      setFiscalYears(res.data);
    } catch (error) {
      console.error("Failed to fetch fiscal years", error);
    }
  };

  // Add to useEffect that runs on mount
  useEffect(() => {
    if (!isFinanceManager && user?.department) {
      // Auto-set department for General Users
      const mappedDept = Object.keys(DEPARTMENTS_MAPPING).find((key) =>
        DEPARTMENTS_MAPPING[key].some((keyword) =>
          user.department.includes(keyword),
        ),
      );

      if (mappedDept) {
        setSelectedDepartment(mappedDept);
        setSelectedCategoryDepartment(mappedDept);
        setSelectedHeatmapDepartment(mappedDept);
      }
    }
  }, [isFinanceManager, user]);

  // --- EVENT HANDLERS ---

  const handleNavigate = (path) => {
    navigate(path);
    // REMOVED: closeAllDropdowns(); (Handled inside Navigation component now)
  };

  // REMOVED: closeAllDropdowns, toggleDropdown

  const handleLogout = async () => await logout();

  // --- FISCAL YEAR HANDLERS ---

  const handleCreateFiscalYear = async () => {
    try {
      await createFiscalYear(newFiscalYear);
      alert("Fiscal Year Created!");
      setShowCreateFiscalYear(false);
      fetchFiscalYearsList();
    } catch (error) {
      alert(
        "Error creating fiscal year: " +
          (error.response?.data?.detail || error.message),
      );
    }
  };

  const handleUpdateFiscalYearStatus = async (id, status) => {
    if (!window.confirm(`Set status to ${status}?`)) return;
    try {
      await updateFiscalYearStatus(id, status);
      fetchFiscalYearsList();
    } catch (error) {
      alert("Error updating status");
    }
  };

  const handleGeneratePreview = async () => {
    if (!closingYearId) {
      alert("Select a year to close.");
      return;
    }
    try {
      const res = await getClosingPreview(closingYearId);
      setPreviewAllocations(res.data.allocations || []);

      // Auto-select "CARRYOVER" recommendations
      const recommended = res.data.allocations
        .filter((a) => a.recommended_action === "CARRYOVER")
        .map((a) => a.allocation_id);

      setSelectedCarryoverIds(recommended);
      setYearEndStep(2);
    } catch (error) {
      alert("Error: " + (error.response?.data?.error || error.message));
    }
  };

  const handleProcessYearEnd = async () => {
    if (!openingYearId) {
      alert("Select a target New Year.");
      return;
    }
    if (
      !window.confirm(
        "This action is irreversible. The old year will be locked.",
      )
    )
      return;

    try {
      await apiProcessYearEnd({
        closing_year_id: closingYearId,
        opening_year_id: openingYearId,
        allocation_ids: selectedCarryoverIds,
      });
      alert("Year-End Processing Successful!");
      setShowYearEndProcessing(false);
      setYearEndStep(1);
      fetchFiscalYearsList();
    } catch (error) {
      alert("Error: " + (error.response?.data?.error || error.message));
    }
  };

  const toggleCarryover = (id) => {
    setSelectedCarryoverIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const getStatusColor = (status) => {
    return "#6c757d";
  };

  // --- CHART DATA PREPARATION ---

  const lastActualExpenseIndex = moneyFlowData
    ? moneyFlowData.map((d) => Number(d.actual)).findLastIndex((d) => d > 0)
    : -1;

  // Convert Cumulative Forecast (Backend) to Monthly Forecast (Chart)
  const monthlyForecastData = convertCumulativeToMonthly(forecastData);

  // 1. DEFAULT VIEW: Budget vs Actual (+ Projection Stitching)
  const monthlyData = buildMoneyFlowChartData(
    moneyFlowData,
    showForecasting,
    monthlyForecastData,
    lastActualExpenseIndex,
  );

  // 2. COMPARE VIEW: Actual vs Forecast (Baseline)
  const forecastComparisonData = buildForecastComparisonData(
    moneyFlowData,
    monthlyForecastData,
  );

  // Department Pie Chart Logic
  const pieChartData = buildDepartmentPieData(
    departmentDetailsData,
    DEPARTMENTS_MAPPING,
  );

  const totalPieValue = pieChartData.datasets[0].data.reduce(
    (sum, value) => sum + value,
    0,
  );

  const pieChartOptions = createPieChartOptions(totalPieValue);
  const lineChartOptions = createLineChartOptions();
  const spendingTrendsOptions = createSpendingTrendsOptions(spendingTrendsData);

  // Nav Handlers
  // REMOVED: toggleBudgetDropdown, toggleExpenseDropdown, etc.

  const toggleCategoryDropdown = () => {
    setShowCategoryDropdown(!showCategoryDropdown);
  };

  // REMOVED: toggleNotifications, toggleProfileDropdown

  const handleManageProfile = () => {
    setShowManageProfile(true);
    // REMOVED: setShowProfileDropdown(false);
  };

  const handleCloseManageProfile = () => {
    setShowManageProfile(false);
  };

  const toggleForecasting = () => {
    setShowForecasting(!showForecasting);
  };

  const toggleForecastComparison = () => {
    setShowForecastComparison(!showForecastComparison);
  };

  // Spending Analytics Handlers
  const handleExportSpendingReport = (type) => {
    let data, filters;

    if (type === "Department Spending Trends") {
      data = spendingTrendsData;
      filters = {
        department: selectedDepartment,
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
        granularity: timeGranularity,
      };
    } else if (type === "Highest Spending Categories") {
      data = { categories: highestSpendingCategories };
      filters = {
        department: selectedCategoryDepartment,
        startDate: categoryDateRange.startDate,
        endDate: categoryDateRange.endDate,
      };
    } else if (type === "Spending Heatmap") {
      data = { heatmapData };
      filters = {
        department: selectedHeatmapDepartment,
        aggregation: timeAggregation,
      };
    }

    exportSpendingReport(type, data, filters);
  };

  // Heatmap rendering function
  const renderHeatmap = () => {
    if (!heatmapData.length) return null;

    const maxValue = Math.max(...heatmapData.map((item) => item.value));
    const minValue = Math.min(...heatmapData.map((item) => item.value));

    return (
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: "10px",
        }}
      >
        {heatmapData.map((item, index) => {
          // Calculate intensity based on value
          const intensity = (item.value - minValue) / (maxValue - minValue);
          const colorIntensity = Math.floor(intensity * 255);
          const color = `rgba(255, ${255 - colorIntensity}, ${
            255 - colorIntensity
          }, ${0.3 + intensity * 0.7})`;

          return (
            <div
              key={index}
              style={{
                backgroundColor: color,
                padding: "20px",
                borderRadius: "8px",
                textAlign: "center",
                position: "relative",
                cursor: "pointer",
                transition: "transform 0.2s",
                minHeight: "80px",
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                alignItems: "center",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "scale(1.05)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "scale(1)";
              }}
              title={`${item.period}: ${formatPeso(item.value)}`}
            >
              <div style={{ fontWeight: "bold", fontSize: "14px" }}>
                {item.period}
              </div>
              <div style={{ fontSize: "12px", marginTop: "5px" }}>
                {formatPeso(item.value)}
              </div>
              <div
                style={{
                  fontSize: "10px",
                  marginTop: "5px",
                  padding: "2px 6px",
                  backgroundColor:
                    item.intensity === "High"
                      ? "#dc3545"
                      : item.intensity === "Medium"
                        ? "#ffc107"
                        : "#28a745",
                  color: "white",
                  borderRadius: "10px",
                }}
              >
                {item.intensity}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  // --- DATE FORMATTING HELPERS ---
  const {
    day: formattedDay,
    date: formattedDate,
    time: formattedTime,
  } = getFormattedDateParts(currentDate);
  const currentMonth = currentDate.toLocaleDateString("en-US", {
    month: "long",
  });
  const currentYear = currentDate.getFullYear();

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p className="loading-text">Loading dashboard data...</p>
      </div>
    );
  }

  const handleDateRangeChange = (setter, field, value) => {
    setter((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <div
      className="app-container"
      style={{ minWidth: "1200px", overflowY: "auto", height: "100vh" }}
    >
      {/* Navigation Bar */}
      <Navigation
        userProfile={userProfile}
        currentDate={currentDate}
        onLogout={handleLogout}
        onManageProfile={handleManageProfile}
        activeView={activeView}
        onViewChange={setActiveView}
        isFinanceManager={isFinanceManager}
      />

      {/* Main Content - Reduced side margins */}
      <div
        className="content-container"
        style={{
          padding: "10px 20px",
          maxWidth: "1400px",
          margin: "0 auto",
          width: "95%",
        }}
      >
        {showManageProfile ? (
          <ManageProfile onClose={handleCloseManageProfile} />
        ) : (
          <>
            {activeView === "dashboard" ? (
              <>
                {/* Time period filter */}
                <TimeFilter
                  activeFilter={timeFilter}
                  onFilterChange={setTimeFilter}
                />

                {/* Stats Grid */}
                <DashboardStats
                  summaryData={summaryData}
                  currentMonth={currentMonth}
                  currentYear={currentYear}
                />

                {/* 
                   REFACTORED SECTION:
                   1. MoneyFlowChart is now standalone (full width).
                   2. DepartmentChart (simple) is removed.
                   3. ForecastAccuracyAnalysis remains conditional.
                   4. DepartmentBudgetAnalysis (complex) is added below.
                */}

                <div style={{ marginBottom: "30px" }}>
                  <MoneyFlowChart 
                    data={showForecastComparison ? forecastComparisonData : monthlyData}
                    options={lineChartOptions}
                    showForecasting={showForecasting}
                    toggleForecasting={toggleForecasting}
                    showForecastComparison={showForecastComparison}
                    toggleForecastComparison={toggleForecastComparison}
                    onExport={() => exportAccuracyReport(forecastAccuracyData, moneyFlowData, forecastData)}
                  />
                </div>

                {/* Forecast Accuracy Analysis */}
                {/* TODO: Refactor hardcoded month logic in component */}
                {showForecastComparison &&
                  moneyFlowData &&
                  forecastData.length > 0 && (
                    <ForecastAccuracyAnalysis
                      moneyFlowData={moneyFlowData}
                      forecastData={forecastData}
                      forecastAccuracyData={forecastAccuracyData}
                      onExport={() =>
                        exportAccuracyReport(
                          forecastAccuracyData,
                          moneyFlowData,
                          forecastData
                        )
                      }
                    />
                )}

                {/* Budget per Department (Complex View) */}
                <DepartmentBudgetAnalysis 
                  pieChartData={pieChartData}
                  pieChartOptions={pieChartOptions}
                  departmentDetailsData={departmentDetailsData}
                />

               {/* --- REFACTORED SPENDING ANALYTICS --- */}
                <SpendingAnalytics
                  activeTab={activeSpendingTab}
                  onTabChange={setActiveSpendingTab}
                  
                  // Data
                  trendsData={spendingTrendsData}
                  categoriesData={highestSpendingCategories}
                  heatmapData={heatmapData}

                  // Context
                  isFinanceManager={isFinanceManager}
                  userDepartment={user?.department}

                  // Trends Config
                  trendsFilters={{
                    department: selectedDepartment,
                    dateRange: dateRange,
                    granularity: timeGranularity,
                  }}
                  trendsHandlers={{
                    setDepartment: setSelectedDepartment,
                    setDateRange: (field, val) => handleDateRangeChange(setDateRange, field, val),
                    setGranularity: setTimeGranularity,
                    onExport: () => handleExportSpendingReport("Department Spending Trends"),
                  }}

                  // Categories Config
                  categoriesFilters={{
                    department: selectedCategoryDepartment,
                    dateRange: categoryDateRange,
                  }}
                  categoriesHandlers={{
                    setDepartment: setSelectedCategoryDepartment,
                    setDateRange: (field, val) => handleDateRangeChange(setCategoryDateRange, field, val),
                    onExport: () => handleExportSpendingReport("Highest Spending Categories"),
                  }}

                  // Heatmap Config
                  heatmapFilters={{
                    department: selectedHeatmapDepartment,
                    dateRange: categoryDateRange, // Reusing category date range based on original code logic
                    aggregation: timeAggregation,
                  }}
                  heatmapHandlers={{
                    setDepartment: setSelectedHeatmapDepartment,
                    setDateRange: (field, val) => handleDateRangeChange(setCategoryDateRange, field, val),
                    setAggregation: setTimeAggregation,
                    onExport: () => handleExportSpendingReport("Spending Heatmap"),
                  }}
                />

              </>
            ) : (
              // FISCAL YEAR MANAGEMENT VIEW
              <div className="fiscal-year-management-view">
                {/* Header */}
                <div style={{ marginBottom: "25px" }}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: "8px",
                    }}
                  >
                    <h1
                      style={{ color: "#007bff", fontSize: "24px", margin: 0 }}
                    >
                      Fiscal Year Management
                    </h1>
                    <div style={{ display: "flex", gap: "10px" }}>
                      <button
                        onClick={() => setShowYearEndProcessing(true)}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "8px",
                          padding: "10px 20px",
                          backgroundColor: "#6f42c1",
                          color: "white",
                          border: "none",
                          borderRadius: "4px",
                          cursor: "pointer",
                          fontSize: "14px",
                          fontWeight: "500",
                          boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
                        }}
                      >
                        <CalendarIcon size={18} /> Year-End Processing
                      </button>
                      <button
                        onClick={() => setShowCreateFiscalYear(true)}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "8px",
                          padding: "10px 20px",
                          backgroundColor: "#28a745",
                          color: "white",
                          border: "none",
                          borderRadius: "4px",
                          cursor: "pointer",
                          fontSize: "14px",
                          fontWeight: "500",
                          boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
                        }}
                      >
                        <Plus size={18} /> Create Fiscal Year
                      </button>
                    </div>
                  </div>
                  <p style={{ color: "#6c757d", fontSize: "14px", margin: 0 }}>
                    Manage fiscal years, view status overview, and perform
                    year-end processing.
                  </p>
                </div>

                {/* Current Active Year Section */}
                {/* Debug: Check if currentActiveYear exists */}
                {/* {console.log("Current Active Year:", currentActiveYear)} */}

                {currentActiveYear ? (
                  <div style={{ marginBottom: "30px" }}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "10px",
                        marginBottom: "15px",
                      }}
                    >
                      <CheckCircle size={20} color="#007bff" />
                      <h3
                        style={{ fontSize: "18px", color: "#333", margin: 0 }}
                      >
                        Current Active Year
                      </h3>
                    </div>

                    <div
                      className="stats-grid"
                      style={{ display: "flex", gap: "20px" }}
                    >
                      {/* 1. Status Card */}
                      <div
                        className="card"
                        style={{
                          flex: 1,
                          padding: "20px",
                          background: "white",
                          borderRadius: "8px",
                          boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
                          display: "flex",
                          flexDirection: "column",
                          justifyContent: "space-between",
                        }}
                      >
                        <div>
                          <h4
                            style={{
                              margin: "0 0 10px",
                              color: "#6c757d",
                              fontSize: "13px",
                              textTransform: "uppercase",
                              letterSpacing: "0.5px",
                            }}
                          >
                            Fiscal Year
                          </h4>
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "10px",
                            }}
                          >
                            <span
                              style={{
                                fontSize: "24px",
                                fontWeight: "bold",
                                color: "#333",
                              }}
                            >
                              {currentActiveYear.name}
                            </span>
                            <span
                              style={{
                                backgroundColor: "#e6f4ea",
                                color: "#28a745",
                                padding: "4px 10px",
                                borderRadius: "20px",
                                fontSize: "12px",
                                fontWeight: "600",
                              }}
                            >
                              Active
                            </span>
                          </div>
                        </div>
                        <div
                          style={{
                            fontSize: "13px",
                            color: "#6c757d",
                            marginTop: "15px",
                            display: "flex",
                            alignItems: "center",
                            gap: "5px",
                          }}
                        >
                          <CalendarIcon size={14} />
                          {currentActiveYear.start_date} —{" "}
                          {currentActiveYear.end_date}
                        </div>
                      </div>

                      {/* 2. Total Budget Card */}
                      <div
                        className="card"
                        style={{
                          flex: 1,
                          padding: "20px",
                          background: "white",
                          borderRadius: "8px",
                          boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
                          display: "flex",
                          flexDirection: "column",
                          justifyContent: "space-between",
                        }}
                      >
                        <div>
                          <h4
                            style={{
                              margin: "0 0 10px",
                              color: "#6c757d",
                              fontSize: "13px",
                              textTransform: "uppercase",
                              letterSpacing: "0.5px",
                            }}
                          >
                            Total Budget Allocated
                          </h4>
                          <span
                            style={{
                              fontSize: "28px",
                              fontWeight: "bold",
                              color: "#007bff",
                            }}
                          >
                            {formatPeso(summaryData?.total_budget || 0)}
                          </span>
                        </div>
                        <div
                          style={{
                            fontSize: "13px",
                            color: "#6c757d",
                            marginTop: "15px",
                          }}
                        >
                          For {currentActiveYear.name}
                        </div>
                      </div>

                      {/* 3. Progress Card */}
                      <div
                        className="card"
                        style={{
                          flex: 1,
                          padding: "20px",
                          background: "white",
                          borderRadius: "8px",
                          boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
                          display: "flex",
                          flexDirection: "column",
                          justifyContent: "space-between",
                        }}
                      >
                        <div>
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                              marginBottom: "10px",
                            }}
                          >
                            <h4
                              style={{
                                margin: 0,
                                color: "#6c757d",
                                fontSize: "13px",
                                textTransform: "uppercase",
                                letterSpacing: "0.5px",
                              }}
                            >
                              Year Progress
                            </h4>
                            <span
                              style={{
                                fontSize: "14px",
                                fontWeight: "600",
                                color: "#333",
                              }}
                            >
                              {calculateProgress(
                                currentActiveYear.start_date,
                                currentActiveYear.end_date,
                              )}
                              %
                            </span>
                          </div>
                          <div
                            style={{
                              width: "100%",
                              height: "8px",
                              backgroundColor: "#e9ecef",
                              borderRadius: "4px",
                              overflow: "hidden",
                            }}
                          >
                            <div
                              style={{
                                width: `${calculateProgress(
                                  currentActiveYear.start_date,
                                  currentActiveYear.end_date,
                                )}%`,
                                height: "100%",
                                backgroundColor: "#007bff",
                                borderRadius: "4px",
                              }}
                            ></div>
                          </div>
                        </div>
                        <div
                          style={{
                            fontSize: "13px",
                            color: "#6c757d",
                            marginTop: "15px",
                          }}
                        >
                          Based on current date vs end date
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div
                    style={{
                      padding: "20px",
                      background: "#fff3cd",
                      color: "#856404",
                      borderRadius: "8px",
                      marginBottom: "30px",
                    }}
                  >
                    <strong>Notice:</strong> No fiscal year is currently active.
                    Please set a year to "Open".
                  </div>
                )}

                {/* Fiscal Year List Table */}
                <div
                  className="card"
                  style={{
                    background: "white",
                    borderRadius: "8px",
                    boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
                    padding: "0",
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      padding: "15px 20px",
                      borderBottom: "1px solid #e9ecef",
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                    }}
                  >
                    <h3 style={{ margin: 0, fontSize: "18px", color: "#333" }}>
                      Fiscal Year List
                    </h3>
                  </div>
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                      <tr style={{ backgroundColor: "#f8f9fa" }}>
                        <th
                          style={{
                            padding: "15px 20px",
                            textAlign: "left",
                            fontSize: "13px",
                            color: "#495057",
                            fontWeight: "600",
                            width: "20%",
                          }}
                        >
                          Name
                        </th>
                        <th
                          style={{
                            padding: "15px 20px",
                            textAlign: "left",
                            fontSize: "13px",
                            color: "#495057",
                            fontWeight: "600",
                            width: "20%",
                          }}
                        >
                          Start Date
                        </th>
                        <th
                          style={{
                            padding: "15px 20px",
                            textAlign: "left",
                            fontSize: "13px",
                            color: "#495057",
                            fontWeight: "600",
                            width: "20%",
                          }}
                        >
                          End Date
                        </th>
                        <th
                          style={{
                            padding: "15px 20px",
                            textAlign: "center",
                            fontSize: "13px",
                            color: "#495057",
                            fontWeight: "600",
                            width: "15%",
                          }}
                        >
                          Status
                        </th>
                        <th
                          style={{
                            padding: "15px 20px",
                            textAlign: "center",
                            fontSize: "13px",
                            color: "#495057",
                            fontWeight: "600",
                            width: "25%",
                          }}
                        >
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {fiscalYears.map((fy) => (
                        <tr
                          key={fy.id}
                          style={{
                            borderBottom: "1px solid #e9ecef",
                            backgroundColor: fy.is_current
                              ? "rgba(0, 123, 255, 0.03)"
                              : "white",
                          }}
                        >
                          <td
                            style={{
                              padding: "15px 20px",
                              color: "#333",
                              fontWeight: "500",
                            }}
                          >
                            {fy.name}
                          </td>
                          <td style={{ padding: "15px 20px", color: "#555" }}>
                            {fy.start_date}
                          </td>
                          <td style={{ padding: "15px 20px", color: "#555" }}>
                            {fy.end_date}
                          </td>
                          <td
                            style={{
                              padding: "15px 20px",
                              textAlign: "center",
                            }}
                          >
                            {fy.is_active && !fy.is_locked && (
                              <span
                                style={{
                                  backgroundColor: "#d4edda",
                                  color: "#155724",
                                  padding: "4px 10px",
                                  borderRadius: "12px",
                                  fontSize: "12px",
                                  fontWeight: "600",
                                }}
                              >
                                Open
                              </span>
                            )}
                            {fy.is_locked && fy.is_active && (
                              <span
                                style={{
                                  backgroundColor: "#fff3cd",
                                  color: "#856404",
                                  padding: "4px 10px",
                                  borderRadius: "12px",
                                  fontSize: "12px",
                                  fontWeight: "600",
                                }}
                              >
                                Locked
                              </span>
                            )}
                            {fy.is_locked && !fy.is_active && (
                              <span
                                style={{
                                  backgroundColor: "#f8d7da",
                                  color: "#721c24",
                                  padding: "4px 10px",
                                  borderRadius: "12px",
                                  fontSize: "12px",
                                  fontWeight: "600",
                                }}
                              >
                                Closed
                              </span>
                            )}
                            {/* Fallback if status is weird */}
                            {!fy.is_active && !fy.is_locked && (
                              <span
                                style={{
                                  backgroundColor: "#e9ecef",
                                  color: "#6c757d",
                                  padding: "4px 10px",
                                  borderRadius: "12px",
                                  fontSize: "12px",
                                  fontWeight: "600",
                                }}
                              >
                                Inactive
                              </span>
                            )}
                          </td>
                          <td
                            style={{
                              padding: "15px 20px",
                              textAlign: "center",
                            }}
                          >
                            <div
                              style={{
                                display: "flex",
                                gap: "8px",
                                justifyContent: "center",
                              }}
                            >
                              {!fy.is_locked ? (
                                <button
                                  onClick={() =>
                                    handleUpdateFiscalYearStatus(
                                      fy.id,
                                      "Locked",
                                    )
                                  }
                                  style={{
                                    padding: "6px 12px",
                                    backgroundColor: "#ffc107",
                                    color: "#212529",
                                    border: "none",
                                    borderRadius: "4px",
                                    cursor: "pointer",
                                    fontSize: "12px",
                                    fontWeight: "500",
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "4px",
                                  }}
                                >
                                  <Lock size={12} /> Lock
                                </button>
                              ) : (
                                <>
                                  <button
                                    onClick={() =>
                                      handleUpdateFiscalYearStatus(
                                        fy.id,
                                        "Open",
                                      )
                                    }
                                    style={{
                                      padding: "6px 12px",
                                      backgroundColor: "#28a745",
                                      color: "white",
                                      border: "none",
                                      borderRadius: "4px",
                                      cursor: "pointer",
                                      fontSize: "12px",
                                      fontWeight: "500",
                                      display: "flex",
                                      alignItems: "center",
                                      gap: "4px",
                                    }}
                                  >
                                    <Unlock size={12} /> Re-Open
                                  </button>

                                  {fy.is_active && (
                                    <button
                                      onClick={() =>
                                        handleUpdateFiscalYearStatus(
                                          fy.id,
                                          "Closed",
                                        )
                                      }
                                      style={{
                                        padding: "6px 12px",
                                        backgroundColor: "#dc3545",
                                        color: "white",
                                        border: "none",
                                        borderRadius: "4px",
                                        cursor: "pointer",
                                        fontSize: "12px",
                                        fontWeight: "500",
                                        display: "flex",
                                        alignItems: "center",
                                        gap: "4px",
                                      }}
                                    >
                                      <XCircle size={12} /> Close
                                    </button>
                                  )}
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Create Fiscal Year Modal */}
      {showCreateFiscalYear && (
        <div
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
            style={{
              backgroundColor: "white",
              padding: "30px",
              borderRadius: "8px",
              width: "500px",
              maxWidth: "90%",
            }}
          >
            <h3
              style={{
                marginBottom: "20px",
                color: "#007bff",
                fontSize: "20px",
              }}
            >
              Create Fiscal Year
            </h3>

            <div style={{ marginBottom: "20px" }}>
              <label
                style={{
                  display: "block",
                  marginBottom: "8px",
                  fontWeight: "500",
                  color: "#495057",
                }}
              >
                Fiscal Year Name
              </label>
              <input
                type="text"
                value={newFiscalYear.name}
                onChange={(e) =>
                  setNewFiscalYear((prev) => ({
                    ...prev,
                    name: e.target.value,
                  }))
                }
                placeholder="e.g., FY-2027"
                style={{
                  width: "100%",
                  padding: "10px",
                  borderRadius: "4px",
                  border: "1px solid #ced4da",
                  backgroundColor: "white",
                  color: "black",
                  fontSize: "14px",
                  outline: "none",
                }}
              />
            </div>

            <div style={{ marginBottom: "20px" }}>
              <label
                style={{
                  display: "block",
                  marginBottom: "8px",
                  fontWeight: "500",
                  color: "#495057",
                }}
              >
                Start Date
              </label>
              <input
                type="date"
                value={newFiscalYear.start_date}
                onChange={(e) =>
                  setNewFiscalYear((prev) => ({
                    ...prev,
                    start_date: e.target.value,
                  }))
                }
                style={{
                  width: "100%",
                  padding: "10px",
                  borderRadius: "4px",
                  border: "1px solid #ced4da",
                  backgroundColor: "white",
                  color: "black",
                  fontSize: "14px",
                  outline: "none",
                }}
              />
            </div>

            <div style={{ marginBottom: "30px" }}>
              <label
                style={{
                  display: "block",
                  marginBottom: "8px",
                  fontWeight: "500",
                  color: "#495057",
                }}
              >
                End Date
              </label>
              <input
                type="date"
                value={newFiscalYear.end_date}
                onChange={(e) =>
                  setNewFiscalYear((prev) => ({
                    ...prev,
                    end_date: e.target.value,
                  }))
                }
                style={{
                  width: "100%",
                  padding: "10px",
                  borderRadius: "4px",
                  border: "1px solid #ced4da",
                  backgroundColor: "white",
                  color: "black",
                  fontSize: "14px",
                  outline: "none",
                }}
              />
            </div>

            <div
              style={{
                display: "flex",
                gap: "10px",
                justifyContent: "flex-end",
              }}
            >
              <button
                onClick={() => setShowCreateFiscalYear(false)}
                style={{
                  padding: "10px 20px",
                  backgroundColor: "#6c757d",
                  color: "white",
                  border: "none",
                  borderRadius: "4px",
                  cursor: "pointer",
                  outline: "none",
                  fontSize: "14px",
                  fontWeight: "500",
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleCreateFiscalYear}
                style={{
                  padding: "10px 20px",
                  backgroundColor: "#28a745",
                  color: "white",
                  border: "none",
                  borderRadius: "4px",
                  cursor: "pointer",
                  outline: "none",
                  fontSize: "14px",
                  fontWeight: "500",
                }}
              >
                Create Fiscal Year
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Dialog */}
      {showConfirmDialog && selectedFiscalYear && (
        <div
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
            style={{
              backgroundColor: "white",
              padding: "30px",
              borderRadius: "8px",
              width: "400px",
              maxWidth: "90%",
            }}
          >
            <h3
              style={{
                marginBottom: "15px",
                color: "#007bff",
                fontSize: "18px",
              }}
            >
              Confirm Action
            </h3>
            <p style={{ marginBottom: "25px", color: "#495057" }}>
              Are you sure you want to {confirmAction} fiscal year "
              {selectedFiscalYear.name}"?
            </p>
            <div
              style={{
                display: "flex",
                gap: "10px",
                justifyContent: "flex-end",
              }}
            >
              <button
                onClick={() => setShowConfirmDialog(false)}
                style={{
                  padding: "8px 16px",
                  backgroundColor: "#6c757d",
                  color: "white",
                  border: "none",
                  borderRadius: "4px",
                  cursor: "pointer",
                  outline: "none",
                  fontSize: "14px",
                  fontWeight: "500",
                }}
              >
                Cancel
              </button>
              <button
                onClick={confirmFiscalYearAction}
                style={{
                  padding: "8px 16px",
                  backgroundColor:
                    confirmAction === "close" ? "#dc3545" : "#007bff",
                  color: "white",
                  border: "none",
                  borderRadius: "4px",
                  cursor: "pointer",
                  outline: "none",
                  fontSize: "14px",
                  fontWeight: "500",
                }}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Year-End Processing Modal (API Connected) */}
      {showYearEndProcessing && (
        <div
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
              padding: "30px",
              borderRadius: "8px",
              width: "900px",
              maxHeight: "85vh",
              overflowY: "auto",
              boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "25px",
              }}
            >
              <h3 style={{ margin: 0, fontSize: "20px", color: "#333" }}>
                Year-End Processing
              </h3>
              <button
                onClick={() => setShowYearEndProcessing(false)}
                style={{
                  background: "none",
                  border: "none",
                  fontSize: "24px",
                  cursor: "pointer",
                  color: "#6c757d",
                }}
              >
                ×
              </button>
            </div>

            {/* STEP 1: Select Old Year */}
            {yearEndStep === 1 && (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "20px",
                }}
              >
                <p style={{ color: "#666", fontSize: "14px", margin: 0 }}>
                  Select the fiscal year you want to close. The system will
                  calculate remaining budgets for all active allocations.
                </p>
                <div>
                  <label
                    style={{
                      display: "block",
                      marginBottom: "8px",
                      fontWeight: "500",
                      fontSize: "14px",
                      color: "#333",
                    }}
                  >
                    Select Year to Close (Old)
                  </label>
                  <select
                    style={{
                      width: "100%",
                      padding: "10px",
                      border: "1px solid #ced4da",
                      borderRadius: "4px",
                      fontSize: "14px",
                      outline: "none",
                      color: "#333",
                      backgroundColor: "white",
                    }}
                    onChange={(e) => setClosingYearId(e.target.value)}
                    value={closingYearId}
                  >
                    <option value="">-- Select --</option>
                    {fiscalYears
                      .filter((fy) => !fy.is_locked)
                      .map((fy) => (
                        <option key={fy.id} value={fy.id}>
                          {fy.name}
                        </option>
                      ))}
                  </select>
                </div>

                <div
                  style={{
                    display: "flex",
                    justifyContent: "flex-end",
                    marginTop: "10px",
                  }}
                >
                  <button
                    onClick={() => setShowYearEndProcessing(false)}
                    style={{
                      padding: "10px 20px",
                      marginRight: "10px",
                      border: "1px solid #ced4da",
                      borderRadius: "4px",
                      background: "white",
                      color: "#333",
                      cursor: "pointer",
                      fontWeight: "500",
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleGeneratePreview}
                    disabled={!closingYearId}
                    style={{
                      padding: "10px 20px",
                      border: "none",
                      borderRadius: "4px",
                      background: closingYearId ? "#007bff" : "#ccc",
                      color: "white",
                      cursor: closingYearId ? "pointer" : "not-allowed",
                      fontWeight: "500",
                    }}
                  >
                    Calculate & Preview
                  </button>
                </div>
              </div>
            )}

            {/* STEP 2: Review & Carryover */}
            {yearEndStep === 2 && (
              <div>
                <div
                  style={{
                    marginBottom: "20px",
                    display: "flex",
                    gap: "20px",
                    alignItems: "flex-end",
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <label
                      style={{
                        display: "block",
                        marginBottom: "8px",
                        fontWeight: "500",
                        fontSize: "14px",
                        color: "#333",
                      }}
                    >
                      Target New Year (Opening)
                    </label>
                    <select
                      style={{
                        width: "100%",
                        padding: "10px",
                        border: "1px solid #ced4da",
                        borderRadius: "4px",
                        fontSize: "14px",
                        outline: "none",
                        color: "#333",
                        backgroundColor: "white",
                      }}
                      onChange={(e) => setOpeningYearId(e.target.value)}
                      value={openingYearId}
                    >
                      <option value="">-- Select --</option>
                      {fiscalYears
                        .filter(
                          (fy) =>
                            fy.is_active &&
                            !fy.is_locked &&
                            fy.id !== parseInt(closingYearId),
                        ) // <--- ADD THIS CHECK
                        .map((fy) => (
                          <option key={fy.id} value={fy.id}>
                            {fy.name}
                          </option>
                        ))}
                    </select>
                  </div>
                  <div
                    style={{
                      paddingBottom: "10px",
                      fontSize: "14px",
                      color: "#666",
                    }}
                  >
                    <strong>{previewAllocations.length}</strong> allocations
                    found with remaining balance.
                  </div>
                </div>

                <div
                  style={{
                    border: "1px solid #e9ecef",
                    borderRadius: "4px",
                    overflow: "hidden",
                    marginBottom: "20px",
                    maxHeight: "400px",
                    overflowY: "auto",
                  }}
                >
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead
                      style={{
                        background: "#f8f9fa",
                        borderBottom: "1px solid #e9ecef",
                        position: "sticky",
                        top: 0,
                      }}
                    >
                      <tr>
                        <th
                          style={{
                            padding: "12px",
                            textAlign: "left",
                            fontSize: "13px",
                            color: "#495057",
                          }}
                        >
                          Department
                        </th>
                        <th
                          style={{
                            padding: "12px",
                            textAlign: "left",
                            fontSize: "13px",
                            color: "#495057",
                          }}
                        >
                          Category
                        </th>
                        <th
                          style={{
                            padding: "12px",
                            textAlign: "right",
                            fontSize: "13px",
                            color: "#495057",
                          }}
                        >
                          Remaining
                        </th>
                        <th
                          style={{
                            padding: "12px",
                            textAlign: "center",
                            fontSize: "13px",
                            color: "#495057",
                          }}
                        >
                          Action
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {previewAllocations.length > 0 ? (
                        previewAllocations.map((alloc) => (
                          <tr
                            key={alloc.allocation_id}
                            style={{ borderBottom: "1px solid #f1f1f1" }}
                          >
                            <td
                              style={{
                                padding: "12px",
                                fontSize: "13px",
                                color: "#333",
                              }}
                            >
                              {alloc.department}
                            </td>
                            <td
                              style={{
                                padding: "12px",
                                fontSize: "13px",
                                color: "#555",
                              }}
                            >
                              {alloc.category}
                            </td>
                            <td
                              style={{
                                padding: "12px",
                                textAlign: "right",
                                fontSize: "13px",
                                fontWeight: "500",
                                color: "#28a745",
                              }}
                            >
                              {formatPeso(alloc.remaining_balance)}
                            </td>
                            <td
                              style={{ padding: "12px", textAlign: "center" }}
                            >
                              <label
                                style={{
                                  display: "inline-flex",
                                  alignItems: "center",
                                  cursor: "pointer",
                                  fontSize: "13px",
                                  gap: "8px",
                                }}
                              >
                                <input
                                  type="checkbox"
                                  checked={selectedCarryoverIds.includes(
                                    alloc.allocation_id,
                                  )}
                                  onChange={() =>
                                    toggleCarryover(alloc.allocation_id)
                                  }
                                  style={{ cursor: "pointer" }}
                                />
                                {selectedCarryoverIds.includes(
                                  alloc.allocation_id,
                                ) ? (
                                  <span
                                    style={{
                                      color: "#28a745",
                                      fontWeight: "500",
                                    }}
                                  >
                                    Carryover
                                  </span>
                                ) : (
                                  <span
                                    style={{
                                      color: "#dc3545",
                                      fontWeight: "500",
                                    }}
                                  >
                                    Expire
                                  </span>
                                )}
                              </label>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td
                            colSpan="4"
                            style={{
                              padding: "20px",
                              textAlign: "center",
                              color: "#666",
                            }}
                          >
                            No remaining balances found for this fiscal year.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                <div
                  style={{
                    display: "flex",
                    justifyContent: "flex-end",
                    gap: "10px",
                  }}
                >
                  <button
                    onClick={() => setYearEndStep(1)}
                    style={{
                      padding: "10px 20px",
                      border: "1px solid #ced4da",
                      borderRadius: "4px",
                      background: "white",
                      color: "#333",
                      cursor: "pointer",
                      fontWeight: "500",
                    }}
                  >
                    Back
                  </button>
                  <button
                    onClick={handleProcessYearEnd}
                    disabled={!openingYearId}
                    style={{
                      padding: "10px 20px",
                      border: "none",
                      borderRadius: "4px",
                      background: openingYearId ? "#28a745" : "#ccc",
                      color: "white",
                      cursor: openingYearId ? "pointer" : "not-allowed",
                      fontWeight: "500",
                    }}
                  >
                    Process & Close Year
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default BudgetDashboard;
