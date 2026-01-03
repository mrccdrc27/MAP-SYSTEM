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
  ChevronDown,
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
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import LOGOMAP from "../../assets/MAP.jpg";
import "./Dashboard.css";
import {
  getBudgetSummary,
  getMoneyFlowData,
  getForecastData,
  getForecastAccuracy,
  getTopCategoryAllocations,
  getDepartmentBudgetData,
} from "../../API/dashboardAPI";
import { useAuth } from "../../context/AuthContext";
import ManageProfile from "./ManageProfile";
import * as XLSX from "xlsx";

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
  Filler
);

// --- HELPER FUNCTIONS ---

const formatPeso = (amount) => {
  return `₱${Number(amount).toLocaleString("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

/**
 * Converts Cumulative Forecast Data (from Backend) to Monthly Data (for Charts).
 * Formula: Monthly[i] = Cumulative[i] - Cumulative[i-1]
 */
const convertCumulativeToMonthly = (cumulativeData) => {
  if (
    !cumulativeData ||
    !Array.isArray(cumulativeData) ||
    cumulativeData.length === 0
  ) {
    return [];
  }

  const monthlyData = [];
  let lastCumulative = 0;

  // Sort by month to ensure correct subtraction order
  const sortedData = [...cumulativeData].sort((a, b) => a.month - b.month);

  sortedData.forEach((point) => {
    const monthlyValue = Number(point.forecast) - lastCumulative;
    // Prevent negative forecast if cumulative dips (unlikely but safe)
    const safeValue = monthlyValue < 0 ? 0 : monthlyValue;

    monthlyData.push({ ...point, forecast: safeValue });
    lastCumulative = Number(point.forecast);
  });

  return monthlyData;
};

const DEPARTMENTS = [
  "Merchandise Planning",
  "Store Operations",
  "Marketing",
  "Operations",
  "IT",
  "Logistics",
  "Human Resources",
  "Finance",
];

const DEPARTMENTS_MAPPING = {
  "Merchandise Planning": ["Merchandising", "Merchandise"],
  "Store Operations": ["Sales", "Store"],
  Marketing: ["Marketing"],
  Operations: ["Operations Department"],
  IT: ["IT", "Data", "IT Application"],
  Logistics: ["Logistics"],
  "Human Resources": ["HR", "Human Resources"],
  Finance: ["Finance"],
};

const exportToExcel = (
  summaryData,
  moneyFlowData,
  pieChartData,
  departmentData,
  timeFilter
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
  forecastData
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
          (f) => f.month_name === month.month_name
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
  const fileName = `${type.replace(/\s+/g, '_')}_report_${dateStr}_${timeStr}.xlsx`;

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
        ...(data.chartData?.labels?.map((label, index) => [
          label,
          formatPeso(data.chartData.datasets[0].data[index] || 0),
          data.chartData.datasets[0].percentageChange?.[index]
            ? `${data.chartData.datasets[0].percentageChange[index]}%`
            : "N/A",
          data.chartData.datasets[0].percentageChange?.[index] >= 0
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
const getMockDepartmentSpendingTrends = (department, startDate, endDate, granularity) => {
  const periods = granularity === "Monthly" 
    ? ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
    : ["Q1", "Q2", "Q3", "Q4"];
  
  const data = periods.map(() => Math.random() * 50000 + 10000);
  const percentageChange = periods.map((_, i) => 
    i > 0 ? ((data[i] - data[i-1]) / data[i-1] * 100).toFixed(1) : 0
  );

  return {
    labels: periods,
    datasets: [{
      label: `Spending - ${department || "All Departments"}`,
      data,
      percentageChange,
      borderColor: '#007bff',
      backgroundColor: 'rgba(0, 123, 255, 0.1)',
      tension: 0.4,
      fill: true,
    }],
    totalAmount: data.reduce((a, b) => a + b, 0),
    avgPercentageChange: ((data[data.length - 1] - data[0]) / data[0] * 100).toFixed(1)
  };
};

const getMockHighestSpendingCategories = (department, startDate, endDate) => {
  const categories = [
    "Office Supplies", "Travel & Entertainment", "Software Licenses", 
    "Hardware Equipment", "Marketing Campaigns", "Training & Development",
    "Maintenance", "Utilities", "Consulting Fees", "Contract Services"
  ];
  
  const randomCategories = categories
    .sort(() => Math.random() - 0.5)
    .slice(0, 6)
    .map(category => ({
      category,
      amount: Math.random() * 100000 + 50000,
      percentage: (Math.random() * 30 + 10).toFixed(1)
    }))
    .sort((a, b) => b.amount - a.amount);

  const total = randomCategories.reduce((sum, cat) => sum + cat.amount, 0);
  
  return randomCategories.map(cat => ({
    ...cat,
    percentage: ((cat.amount / total) * 100).toFixed(1)
  }));
};

const getMockHeatmapData = (department, aggregation) => {
  const periods = aggregation === "Monthly" 
    ? ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
    : ["Q1", "Q2", "Q3", "Q4"];
  
  return periods.map(period => {
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
  const [showBudgetDropdown, setShowBudgetDropdown] = useState(false);
  const [showExpenseDropdown, setShowExpenseDropdown] = useState(false);
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [showBudgetDetails, setShowBudgetDetails] = useState(false);
  const [showForecasting, setShowForecasting] = useState(false);
  const [showForecastComparison, setShowForecastComparison] = useState(false);
  const [showManageProfile, setShowManageProfile] = useState(false);
  
  // Spending Analytics State
  const [activeSpendingTab, setActiveSpendingTab] = useState("trends");
  
  // Department Spending Trends State
  const [selectedDepartment, setSelectedDepartment] = useState("All Departments");
  const [dateRange, setDateRange] = useState({
    startDate: new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  });
  const [timeGranularity, setTimeGranularity] = useState("Monthly");
  const [spendingTrendsData, setSpendingTrendsData] = useState(null);
  
  // Highest Spending Categories State
  const [selectedCategoryDepartment, setSelectedCategoryDepartment] = useState("All Departments");
  const [categoryDateRange, setCategoryDateRange] = useState({
    startDate: new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  });
  const [highestSpendingCategories, setHighestSpendingCategories] = useState([]);
  
  // Heatmap State
  const [selectedHeatmapDepartment, setSelectedHeatmapDepartment] = useState("All Departments");
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

  const navigate = useNavigate();
  const { user, logout, getBmsRole } = useAuth();

  // MODIFIED: Updated getUserRole logic to correctly handle the role array from Central Auth
  const getUserRole = () => {
    if (user) {
      console.groupCollapsed("BMS Auth Debugger");
      console.log("Full User Object:", user);
      console.log("User Roles Array:", user.roles);
      console.log("Detected BMS Role:", getBmsRole ? getBmsRole() : "getBmsRole function missing");
      console.groupEnd();
    }

    if (!user) return "User";

    // 1. Try to get the BMS specific role using the Context helper
    // This handles the array structure: [{ system: 'bms', role: 'FINANCE_HEAD' }]
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
  // --- API CALLS ---

  // 1. Initial Data Load
  useEffect(() => {
    const fetchStaticData = async () => {
      try {
        setLoading(true);
        const fiscalYearId = null;

        // Removed getDepartmentBudgetData from here
        const [moneyFlowRes, pieChartRes] =
          await Promise.all([
            getMoneyFlowData(fiscalYearId),
            getTopCategoryAllocations(),
          ]);

        setMoneyFlowData(moneyFlowRes.data);
        setPieChartApiData(pieChartRes.data);
      } catch (error) {
        console.error("Failed to fetch static dashboard data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchStaticData();
    const interval = setInterval(() => setCurrentDate(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  // 2. Summary & Department Data (Refreshes on Filter Change)
  useEffect(() => {
    const fetchDataBasedOnPeriod = async () => {
      try {
        // Fetch both Summary and Department data with the time filter
        const [summaryRes, deptRes] = await Promise.all([
             getBudgetSummary(timeFilter),
             getDepartmentBudgetData(timeFilter) // Update API function to accept arg
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
  }, [activeSpendingTab, selectedDepartment, dateRange, timeGranularity, selectedCategoryDepartment, categoryDateRange, selectedHeatmapDepartment, timeAggregation]);

  const fetchSpendingAnalyticsData = () => {
    // Mock API calls - replace with actual API calls
    if (activeSpendingTab === "trends") {
      const data = getMockDepartmentSpendingTrends(
        selectedDepartment,
        dateRange.startDate,
        dateRange.endDate,
        timeGranularity
      );
      setSpendingTrendsData(data);
    } else if (activeSpendingTab === "categories") {
      const data = getMockHighestSpendingCategories(
        selectedCategoryDepartment,
        categoryDateRange.startDate,
        categoryDateRange.endDate
      );
      setHighestSpendingCategories(data);
    } else if (activeSpendingTab === "heatmap") {
      const data = getMockHeatmapData(selectedHeatmapDepartment, timeAggregation);
      setHeatmapData(data);
    }
  };

  // --- EVENT HANDLERS ---

  const handleNavigate = (path) => {
    navigate(path);
    closeAllDropdowns();
  };

  const closeAllDropdowns = () => {
    setShowBudgetDropdown(false);
    setShowExpenseDropdown(false);
    setShowCategoryDropdown(false);
    setShowNotifications(false);
    setShowProfileDropdown(false);
  };

  const toggleDropdown = (setter, currentState) => {
    closeAllDropdowns();
    setter(!currentState);
  };

  const handleLogout = async () => await logout();

  // --- CHART DATA PREPARATION ---

  const lastActualExpenseIndex = moneyFlowData
    ? moneyFlowData.map((d) => Number(d.actual)).findLastIndex((d) => d > 0)
    : -1;

  // Convert Cumulative Forecast (Backend) to Monthly Forecast (Chart)
  const monthlyForecastData = convertCumulativeToMonthly(forecastData);

  // 1. DEFAULT VIEW: Budget vs Actual (+ Projection Stitching)
  const monthlyData = {
    labels: moneyFlowData?.map((d) => d.month_name) || [],
    datasets: [
      {
        label: "Budget",
        data: moneyFlowData?.map((d) => d.budget) || [],
        borderColor: "#007bff",
        backgroundColor: "rgba(0, 123, 255, 0.1)",
        tension: 0.4,
        fill: true,
        pointBackgroundColor: "#007bff",
        pointBorderColor: "#fff",
        pointBorderWidth: 2,
        pointRadius: 5,
        order: 2,
      },
      {
        label: "Expense",
        data: moneyFlowData?.map((d) => d.actual) || [],
        borderColor: "#28a745",
        backgroundColor: "rgba(40, 167, 69, 0.1)",
        tension: 0.4,
        fill: true,
        pointBackgroundColor: "#28a745",
        pointBorderColor: "#fff",
        pointBorderWidth: 2,
        pointRadius: 5,
        order: 1,
      },
      // FORECAST LINE (Stitched)
      ...(showForecasting && moneyFlowData && monthlyForecastData.length > 0
        ? [
            {
              label: "Forecast (Projection)",
              data: moneyFlowData.map((d, index) => {
                const forecastPoint = monthlyForecastData.find(
                  (f) => f.month_name === d.month_name
                );
                const val = forecastPoint ? forecastPoint.forecast : null;

                // PM Logic: Hide forecast before last actual. Stitch at last actual.
                if (index < lastActualExpenseIndex) return null;
                if (index === lastActualExpenseIndex)
                  return moneyFlowData[index].actual;
                return val;
              }),
              borderColor: "#ff6b35",
              backgroundColor: "rgba(255, 107, 53, 0.1)",
              borderDash: [5, 5],
              tension: 0.4,
              fill: true,
              pointBackgroundColor: "#ff6b35",
              pointBorderColor: "#fff",
              pointBorderWidth: 2,
              pointRadius: 5,
              order: 0,
            },
          ]
        : []),
    ],
  };

  // 2. COMPARE VIEW: Actual vs Forecast (Baseline)
  const forecastComparisonData = {
    labels: moneyFlowData?.map((d) => d.month_name) || [],
    datasets: [
      {
        label: "Actual",
        data: moneyFlowData?.map((d) => d.actual) || [],
        borderColor: "#28a745",
        backgroundColor: "rgba(40, 167, 69, 0.1)",
        tension: 0.4,
        fill: false,
        pointBackgroundColor: "#28a745",
        pointBorderColor: "#fff",
        pointBorderWidth: 2,
        pointRadius: 4,
      },
      {
        label: "Forecast (Baseline)",
        // PM Logic: Show full Jan-Dec baseline
        data:
          moneyFlowData?.map((d) => {
            const forecastPoint = monthlyForecastData.find(
              (f) => f.month_name === d.month_name
            );
            return forecastPoint ? forecastPoint.forecast : null;
          }) || [],
        borderColor: "#ff6b35",
        backgroundColor: "rgba(255, 107, 53, 0.1)",
        borderDash: [5, 5],
        tension: 0.4,
        fill: false,
        pointBackgroundColor: "#ff6b35",
        pointBorderColor: "#fff",
        pointBorderWidth: 2,
        pointRadius: 4,
      },
    ],
  };

  // Department Pie Chart Logic
  const getDepartmentPieData = () => {
    if (departmentDetailsData && departmentDetailsData.length > 0) {
      // Use mapping to find departments
      const mappedData = Object.keys(DEPARTMENTS_MAPPING).map((label) => {
        const keywords = DEPARTMENTS_MAPPING[label];
        const foundDept = departmentDetailsData.find((d) =>
          keywords.some((k) => d.department_name.includes(k))
        );
        return {
          label: label,
          budget: foundDept ? Number(foundDept.budget) : 0,
        };
      });

      const validData = mappedData.filter((d) => d.budget > 0);

      // Make sure you have 8 colors for 8 departments, in the same order as your mapping
      const departmentColors = [
        "#007bff", // Merchandise Planning
        "#28a745", // Store Operations
        "#ffc107", // Marketing
        "#dc3545", // Operations
        "#6f42c1", // IT
        "#fd7e14", // Logistics
        "#20c997", // Human Resources
        "#343a40", // Finance (dark gray)
      ];

      if (validData.length > 0) {
        return {
          labels: validData.map((d) => d.label),
          datasets: [
            {
              data: validData.map((d) => d.budget),
              backgroundColor: departmentColors.slice(0, validData.length),
              borderColor: "#ffffff",
              borderWidth: 2,
              hoverOffset: 15,
            },
          ],
        };
      }
    }
    // Fallback if empty to avoid crash
    return {
      labels: Object.keys(DEPARTMENTS_MAPPING),
      datasets: [
        {
          data: Object.keys(DEPARTMENTS_MAPPING).map(() => 1),
          backgroundColor: ["#e9ecef"],
        },
      ],
    };
  };

  const pieChartData = getDepartmentPieData();
  const totalPieValue = pieChartData.datasets[0].data.reduce(
    (sum, value) => sum + value,
    0
  );

  const pieChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: "0%",
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (context) => {
            const percentage =
              totalPieValue > 0
                ? ((context.raw / totalPieValue) * 100).toFixed(1)
                : 0;
            return `${context.label}: ${formatPeso(
              context.raw
            )} (${percentage}%)`;
          },
        },
      },
      beforeDraw: (chart) => {
        const { width, height, ctx } = chart;
        ctx.restore();
        const fontSize = (height / 100).toFixed(2);
        ctx.font = `bold ${fontSize}em sans-serif`;
        ctx.textBaseline = "middle";
        ctx.textAlign = "center";
        const text = formatPeso(totalPieValue);
        ctx.fillStyle = "#007bff";
        ctx.fillText(text, width / 2, height / 2);
        ctx.save();
      },
    },
  };

  const lineChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { position: "top" } },
    scales: {
      x: { grid: { display: false } },
      y: { 
        grid: { display: true }, 
        beginAtZero: true,
        ticks: {
          callback: function(value) {
            return formatPeso(value);
          }
        }
      },
    },
    plugins: {
      tooltip: {
        callbacks: {
          label: function(context) {
            let label = context.dataset.label || '';
            if (label) {
              label += ': ';
            }
            label += formatPeso(context.parsed.y);
            return label;
          }
        }
      }
    }
  };

  // Spending Trends Chart Options
  const spendingTrendsOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { 
      legend: { position: "top" },
      tooltip: {
        callbacks: {
          label: function(context) {
            let label = context.dataset.label || '';
            if (label) {
              label += ': ';
            }
            label += formatPeso(context.parsed.y);
            
            // Add percentage change to tooltip
            if (spendingTrendsData?.datasets[0]?.percentageChange?.[context.dataIndex] !== undefined) {
              const change = spendingTrendsData.datasets[0].percentageChange[context.dataIndex];
              if (context.dataIndex > 0) {
                label += ` (${change >= 0 ? '+' : ''}${change}% vs previous)`;
              }
            }
            return label;
          }
        }
      }
    },
    scales: {
      x: { grid: { display: false } },
      y: { 
        grid: { display: true }, 
        beginAtZero: true,
        ticks: {
          callback: function(value) {
            return formatPeso(value);
          }
        }
      },
    },
  };

  // Nav Handlers
  const toggleBudgetDropdown = () => {
    setShowBudgetDropdown(!showBudgetDropdown);
    if (showExpenseDropdown) setShowExpenseDropdown(false);
    if (showCategoryDropdown) setShowCategoryDropdown(false);
    if (showNotifications) setShowNotifications(false);
    if (showProfileDropdown) setShowProfileDropdown(false);
  };

  const toggleExpenseDropdown = () => {
    setShowExpenseDropdown(!showExpenseDropdown);
    if (showBudgetDropdown) setShowBudgetDropdown(false);
    if (showCategoryDropdown) setShowCategoryDropdown(false);
    if (showNotifications) setShowNotifications(false);
    if (showProfileDropdown) setShowProfileDropdown(false);
  };

  const toggleCategoryDropdown = () => {
    toggleDropdown(setShowCategoryDropdown, showCategoryDropdown);
  };

  const toggleNotifications = () => {
    toggleDropdown(setShowNotifications, showNotifications);
  };

  const toggleProfileDropdown = () => {
    toggleDropdown(setShowProfileDropdown, showProfileDropdown);
  };

  const handleManageProfile = () => {
    setShowManageProfile(true);
    setShowProfileDropdown(false);
  };

  const handleCloseManageProfile = () => {
    setShowManageProfile(false);
  };

  const toggleBudgetDetails = () => {
    setShowBudgetDetails(!showBudgetDetails);
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
        granularity: timeGranularity
      };
    } else if (type === "Highest Spending Categories") {
      data = { categories: highestSpendingCategories };
      filters = {
        department: selectedCategoryDepartment,
        startDate: categoryDateRange.startDate,
        endDate: categoryDateRange.endDate
      };
    } else if (type === "Spending Heatmap") {
      data = { heatmapData };
      filters = {
        department: selectedHeatmapDepartment,
        aggregation: timeAggregation
      };
    }
    
    exportSpendingReport(type, data, filters);
  };

  // Heatmap rendering function
  const renderHeatmap = () => {
    if (!heatmapData.length) return null;

    const maxValue = Math.max(...heatmapData.map(item => item.value));
    const minValue = Math.min(...heatmapData.map(item => item.value));

    return (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
        {heatmapData.map((item, index) => {
          // Calculate intensity based on value
          const intensity = (item.value - minValue) / (maxValue - minValue);
          const colorIntensity = Math.floor(intensity * 255);
          const color = `rgba(255, ${255 - colorIntensity}, ${255 - colorIntensity}, ${0.3 + intensity * 0.7})`;

          return (
            <div
              key={index}
              style={{
                backgroundColor: color,
                padding: '20px',
                borderRadius: '8px',
                textAlign: 'center',
                position: 'relative',
                cursor: 'pointer',
                transition: 'transform 0.2s',
                minHeight: '80px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'scale(1.05)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'scale(1)';
              }}
              title={`${item.period}: ${formatPeso(item.value)}`}
            >
              <div style={{ fontWeight: 'bold', fontSize: '14px' }}>{item.period}</div>
              <div style={{ fontSize: '12px', marginTop: '5px' }}>{formatPeso(item.value)}</div>
              <div style={{ 
                fontSize: '10px', 
                marginTop: '5px',
                padding: '2px 6px',
                backgroundColor: item.intensity === 'High' ? '#dc3545' : 
                                item.intensity === 'Medium' ? '#ffc107' : '#28a745',
                color: 'white',
                borderRadius: '10px'
              }}>
                {item.intensity}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  // --- DATE FORMATTING HELPERS ---
  const formattedTime = currentDate.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "numeric",
    hour12: true,
  });

  const formattedDay = currentDate.toLocaleDateString("en-US", {
    weekday: "long",
  });

  const formattedDate = currentDate.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

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
          {/* Logo and System Name */}
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

          {/* Main Navigation Links */}
          <div
            className="navbar-links"
            style={{ display: "flex", gap: "20px" }}
          >
            <Link to="/dashboard" className="nav-link">
              Dashboard
            </Link>

            {/* Budget Dropdown */}
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

            {/* Expense Dropdown */}
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

          {/* User Controls */}
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

      {/* Main Content - Reduced side margins */}
      <div
        className="content-container"
        style={{ padding: "10px 20px", maxWidth: "1400px", margin: "0 auto", width: "95%" }}
      >
        {showManageProfile ? (
          <ManageProfile onClose={handleCloseManageProfile} />
        ) : (
          <>
            {/* Time period filter */}
            <div className="time-filter" style={{ marginBottom: "25px" }}>
              <button
                className={`filter-button ${
                  timeFilter === "monthly" ? "active" : ""
                }`}
                onClick={() => setTimeFilter("monthly")}
                style={{
                  backgroundColor:
                    timeFilter === "monthly" ? "#007bff" : "white",
                  color: timeFilter === "monthly" ? "white" : "#007bff",
                  border: "1px solid #007bff",
                  outline: "none",
                  padding: "8px 20px",
                  borderRadius: "4px",
                  cursor: "pointer",
                  fontSize: "14px",
                  fontWeight: "500",
                }}
                onFocus={(e) =>
                  (e.target.style.boxShadow =
                    "0 0 0 2px rgba(0, 123, 255, 0.25)")
                }
                onBlur={(e) => (e.target.style.boxShadow = "none")}
              >
                Monthly
              </button>
              <button
                className={`filter-button ${
                  timeFilter === "quarterly" ? "active" : ""
                }`}
                onClick={() => setTimeFilter("quarterly")}
                style={{
                  backgroundColor:
                    timeFilter === "quarterly" ? "#007bff" : "white",
                  color: timeFilter === "quarterly" ? "white" : "#007bff",
                  border: "1px solid #007bff",
                  outline: "none",
                  padding: "8px 20px",
                  borderRadius: "4px",
                  cursor: "pointer",
                  fontSize: "14px",
                  fontWeight: "500",
                }}
                onFocus={(e) =>
                  (e.target.style.boxShadow =
                    "0 0 0 2px rgba(0, 123, 255, 0.25)")
                }
                onBlur={(e) => (e.target.style.boxShadow = "none")}
              >
                Quarterly
              </button>
              <button
                className={`filter-button ${
                  timeFilter === "yearly" ? "active" : ""
                }`}
                onClick={() => setTimeFilter("yearly")}
                style={{
                  backgroundColor:
                    timeFilter === "yearly" ? "#007bff" : "white",
                  color: timeFilter === "yearly" ? "white" : "#007bff",
                  border: "1px solid #007bff",
                  outline: "none",
                  padding: "8px 20px",
                  borderRadius: "4px",
                  cursor: "pointer",
                  fontSize: "14px",
                  fontWeight: "500",
                }}
                onFocus={(e) =>
                  (e.target.style.boxShadow =
                    "0 0 0 2px rgba(0, 123, 255, 0.25)")
                }
                onBlur={(e) => (e.target.style.boxShadow = "none")}
              >
                Yearly
              </button>
            </div>

            {/* Stats Grid */}
            <div className="stats-grid" style={{ marginBottom: "30px" }}>
              {/* Budget Completion */}
              <div
                className="card compact-budget-card"
                style={{
                  flex: "1 1 33%",
                  transition: "all 0.2s ease",
                  cursor: "pointer",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.boxShadow =
                    "0 4px 8px rgba(0, 123, 255, 0.3)";
                  e.currentTarget.style.border = "1px solid #007bff";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.boxShadow = "";
                  e.currentTarget.style.border = "1px solid #e0e0e0";
                }}
              >
                <h3 className="compact-card-title">Budget Completion</h3>
                <p className="compact-stat-value">
                  {summaryData?.percentage_used?.toFixed(1) || 0}%
                </p>
                <p className="compact-card-subtext">
                  Overall Status of Budget Plan
                </p>
                <div className="compact-progress-container">
                  <div
                    className="compact-progress-bar"
                    style={{
                      width: `${summaryData?.percentage_used || 0}%`,
                      backgroundColor: "#007bff",
                    }}
                  />
                </div>
              </div>

              {/* Total Budget */}
              <div
                className="card compact-budget-card"
                style={{
                  flex: "1 1 33%",
                  transition: "all 0.2s ease",
                  cursor: "pointer",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.boxShadow =
                    "0 4px 8px rgba(0, 123, 255, 0.3)";
                  e.currentTarget.style.border = "1px solid #007bff";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.boxShadow = "";
                  e.currentTarget.style.border = "1px solid #e0e0e0";
                }}
              >
                <h3 className="compact-card-title">Total Budget</h3>
                <div
                  style={{
                    fontSize: "12px",
                    color: "#007bff",
                    marginBottom: "8px",
                    fontFamily: "Poppins, sans-serif",
                  }}
                >
                  As of {currentMonth} {currentYear}
                </div>
                <p className="compact-stat-value">
                  {formatPeso(summaryData?.total_budget || 0)}
                </p>
                <p className="compact-card-subtext">
                  {summaryData?.percentage_used?.toFixed(1) || 0}% allocated
                </p>
                <div className="compact-progress-container">
                  <div
                    className="compact-progress-bar"
                    style={{
                      width: `${summaryData?.percentage_used || 0}%`,
                      backgroundColor: "#007bff",
                    }}
                  />
                </div>
              </div>

              {/* Remaining Budget */}
              <div
                className="card compact-budget-card"
                style={{
                  flex: "1 1 33%",
                  transition: "all 0.2s ease",
                  cursor: "pointer",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.boxShadow =
                    "0 4px 8px rgba(0, 123, 255, 0.3)";
                  e.currentTarget.style.border = "1px solid #007bff";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.boxShadow = "";
                  e.currentTarget.style.border = "1px solid #e0e0e0";
                }}
              >
                <h3 className="compact-card-title">Remaining Budget</h3>
                <p className="compact-stat-value">
                  {formatPeso(summaryData?.remaining_budget || 0)}
                </p>
                <p className="compact-card-subtext">
                  {summaryData?.remaining_percentage?.toFixed(1) || 100}% of
                  Total Budget
                </p>
                <span className="compact-badge">Available for Allocation</span>
              </div>
            </div>

            {/* Money Flow Chart */}
            <div
              className="card chart-card"
              style={{
                width: "100%",
                marginBottom: "35px",
                height: "500px",
                display: "flex",
                flexDirection: "column",
              }}
            >
              <div
                className="chart-header"
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "20px",
                }}
              >
                <h3 className="card-title">Money Flow</h3>
                <div
                  style={{ display: "flex", gap: "10px", alignItems: "center" }}
                >
                  <div style={{ display: "flex", gap: "4px" }}>
                    <button
                      style={{
                        padding: "4px 8px",
                        backgroundColor: "#007bff",
                        color: "white",
                        border: "none",
                        borderRadius: "4px",
                        fontSize: "12px",
                      }}
                    >
                      Budget
                    </button>
                    <button
                      style={{
                        padding: "4px 8px",
                        backgroundColor: "#28a745",
                        color: "white",
                        border: "none",
                        borderRadius: "4px",
                        fontSize: "12px",
                      }}
                    >
                      Expense
                    </button>
                    {showForecasting && (
                      <button
                        style={{
                          padding: "4px 8px",
                          backgroundColor: "#ff6b35",
                          color: "white",
                          border: "none",
                          borderRadius: "4px",
                          fontSize: "12px",
                        }}
                      >
                        Forecast
                      </button>
                    )}
                  </div>
                  <button
                    onClick={toggleForecasting}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      padding: "6px 12px",
                      backgroundColor: showForecasting ? "#ff6b35" : "#e9ecef",
                      color: showForecasting ? "white" : "#1b1d1fff",
                      border: "none",
                      borderRadius: "4px",
                      cursor: "pointer",
                      transition: "all 0.2s ease",
                      outline: "none",
                      fontSize: "12px",
                      fontWeight: "500",
                      height: "32px",
                    }}
                    title={showForecasting ? "Hide Forecast" : "Show Forecast"}
                  >
                    <TrendingUp size={16} />
                    Forecasting
                  </button>
                  <button
                    onClick={toggleForecastComparison}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      padding: "6px 12px",
                      backgroundColor: showForecastComparison
                        ? "#6f42c1"
                        : "#e9ecef",
                      color: showForecastComparison ? "white" : "#1b1d1fff",
                      border: "none",
                      borderRadius: "4px",
                      cursor: "pointer",
                      transition: "all 0.2s ease",
                      outline: "none",
                      fontSize: "12px",
                      fontWeight: "500",
                      height: "32px",
                    }}
                    title={
                      showForecastComparison
                        ? "Hide Comparison"
                        : "Show Forecast vs Actual"
                    }
                  >
                    <BarChart3 size={16} />
                    Compare
                  </button>
                </div>
              </div>
              <div
                className="chart-container-large"
                style={{
                  height: "420px",
                  paddingBottom: "20px",
                }}
              >
                {showForecastComparison ? (
                  <Line
                    data={forecastComparisonData}
                    options={lineChartOptions}
                  />
                ) : (
                  <Line data={monthlyData} options={lineChartOptions} />
                )}
              </div>
            </div>

            {/* Forecast Accuracy Analysis */}
            {showForecastComparison &&
              moneyFlowData &&
              forecastData.length > 0 && (
                <div className="card" style={{ marginBottom: "30px" }}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: "20px",
                    }}
                  >
                    <h3 className="card-title">Forecast Accuracy Analysis</h3>
                    <button
                      onClick={() =>
                        exportAccuracyReport(
                          forecastAccuracyData,
                          moneyFlowData,
                          forecastData
                        )
                      }
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                        padding: "6px 12px",
                        backgroundColor: "#28a745",
                        color: "white",
                        border: "none",
                        borderRadius: "4px",
                        cursor: "pointer",
                        outline: "none",
                        fontSize: "14px",
                        fontWeight: "500",
                        height: "32px",
                      }}
                    >
                      Export Accuracy Report
                      <Download size={16} style={{ marginLeft: "6px" }} />
                    </button>
                  </div>

                  {(() => {
                    // DERIVE CARD DATA FROM TABLE DATA for consistency
                    const lastMonthIndex = 10; // 0-based index for November
                    const lastMonthName = "November";

                    const monthlyForecasts =
                      convertCumulativeToMonthly(forecastData);

                    // Get values
                    const actualVal = Number(
                      moneyFlowData[lastMonthIndex]?.actual || 0
                    );

                    const forecastPoint = monthlyForecasts.find(
                      (f) => f.month === lastMonthIndex + 1
                    );
                    const forecastVal = Number(forecastPoint?.forecast || 0);

                    const varianceVal = actualVal - forecastVal;

                    // Calculate Accuracy
                    let accuracy = 0;
                    if (actualVal > 0) {
                      accuracy = 100 * (1 - Math.abs(varianceVal) / actualVal);
                    } else if (forecastVal === 0) {
                      accuracy = 100;
                    }
                    const displayAcc = Math.max(0, accuracy).toFixed(1);

                    return (
                      <>
                        <div
                          className="stats-grid"
                          style={{ marginBottom: "20px" }}
                        >
                          {/* Accuracy Score Card */}
                          <div
                            className="card compact-budget-card"
                            style={{ flex: "1 1 25%", textAlign: "center" }}
                          >
                            <Target
                              size={24}
                              style={{
                                margin: "0 auto 10px",
                                color: "#007bff",
                              }}
                            />
                            <h3 className="compact-card-title">
                              Accuracy Score
                            </h3>
                            <p
                              className="compact-stat-value"
                              style={{
                                color: displayAcc >= 90 ? "#28a745" : "#dc3545",
                              }}
                            >
                              {displayAcc}%
                            </p>
                            <span
                              className="compact-badge"
                              style={{
                                backgroundColor:
                                  displayAcc >= 90 ? "#28a745" : "#dc3545",
                                color: "white",
                              }}
                            >
                              {displayAcc >= 90
                                ? "Excellent"
                                : displayAcc >= 75
                                ? "Good"
                                : "Poor"}
                            </span>
                          </div>

                          {/* Variance Card */}
                          <div
                            className="card compact-budget-card"
                            style={{ flex: "1 1 25%" }}
                          >
                            <h3 className="compact-card-title">Variance</h3>
                            <p
                              className="compact-stat-value"
                              style={{
                                color: varianceVal >= 0 ? "#dc3545" : "#28a745",
                              }}
                            >
                              {formatPeso(Math.abs(varianceVal))}
                            </p>
                            <p className="compact-card-subtext">
                              {Math.abs(varianceVal) < 0.01
                                ? "Exact Match"
                                : varianceVal >= 0
                                ? "Over Forecast"
                                : "Under Forecast"}
                            </p>
                          </div>

                          {/* Actual Spend Card */}
                          <div
                            className="card compact-budget-card"
                            style={{ flex: "1 1 25%" }}
                          >
                            <h3 className="compact-card-title">
                              Actual Spend ({lastMonthName})
                            </h3>
                            <p
                              className="compact-stat-value"
                              style={{ color: "#28a745" }}
                            >
                              {formatPeso(actualVal)}
                            </p>
                            <p className="compact-card-subtext">
                              Last Completed Month
                            </p>
                          </div>

                          {/* Forecasted Spend Card */}
                          <div
                            className="card compact-budget-card"
                            style={{ flex: "1 1 25%" }}
                          >
                            <h3 className="compact-card-title">
                              Forecasted Spend ({lastMonthName})
                            </h3>
                            <p
                              className="compact-stat-value"
                              style={{ color: "#ff6b35" }}
                            >
                              {formatPeso(forecastVal)}
                            </p>
                            <p className="compact-card-subtext">
                              Last Completed Month
                            </p>
                          </div>
                        </div>
                      </>
                    );
                  })()}

                  {/* Detailed Metrics Table */}
                  <div style={{ marginTop: "20px" }}>
                    <h4 style={{ marginBottom: "15px", color: "#374151" }}>
                      Monthly Forecast vs Actual
                    </h4>
                    <div style={{ overflowX: "auto" }}>
                      <table
                        style={{ width: "100%", borderCollapse: "collapse" }}
                      >
                        <thead>
                          <tr style={{ backgroundColor: "#f8f9fa" }}>
                            <th
                              style={{
                                padding: "12px",
                                textAlign: "left",
                                borderBottom: "2px solid #e9ecef",
                              }}
                            >
                              Month
                            </th>
                            <th
                              style={{
                                padding: "12px",
                                textAlign: "right",
                                borderBottom: "2px solid #e9ecef",
                              }}
                            >
                              Actual
                            </th>
                            <th
                              style={{
                                padding: "12px",
                                textAlign: "right",
                                borderBottom: "2px solid #e9ecef",
                              }}
                            >
                              Forecast
                            </th>
                            <th
                              style={{
                                padding: "12px",
                                textAlign: "right",
                                borderBottom: "2px solid #e9ecef",
                              }}
                            >
                              Variance
                            </th>
                            <th
                              style={{
                                padding: "12px",
                                textAlign: "right",
                                borderBottom: "2px solid #e9ecef",
                              }}
                            >
                              Accuracy
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {moneyFlowData?.map((month, index) => {
                            const monthlyForecasts =
                              convertCumulativeToMonthly(forecastData);
                            const forecastPoint = monthlyForecasts.find(
                              (f) => f.month_name === month.month_name
                            );
                            const forecastValue = forecastPoint
                              ? Number(forecastPoint.forecast)
                              : 0;
                            const actualValue = Number(month.actual);
                            const variance = actualValue - forecastValue;
                            const isExact = Math.abs(variance) < 0.01;

                            // Calculate raw accuracy
                            let rawAccuracy =
                              actualValue > 0
                                ? 100 * (1 - Math.abs(variance) / actualValue)
                                : forecastValue === 0
                                ? 100
                                : 0;

                            // Clamp the value between 0 and 100 for display
                            const displayAccuracy = Math.max(
                              0,
                              Math.min(100, rawAccuracy)
                            ).toFixed(1);

                            return (
                              <tr
                                key={index}
                                style={{ borderBottom: "1px solid #e9ecef" }}
                              >
                                <td style={{ padding: "12px" }}>
                                  {month.month_name}
                                </td>
                                <td
                                  style={{
                                    padding: "12px",
                                    textAlign: "right",
                                  }}
                                >
                                  {formatPeso(actualValue)}
                                </td>
                                <td
                                  style={{
                                    padding: "12px",
                                    textAlign: "right",
                                  }}
                                >
                                  {forecastPoint
                                    ? formatPeso(forecastValue)
                                    : "N/A"}
                                </td>
                                <td
                                  style={{
                                    padding: "12px",
                                    textAlign: "right",
                                    color: variance > 0 ? "#28a745" : "#dc3545",
                                  }}
                                >
                                  {isExact
                                    ? "Exact"
                                    : `${formatPeso(Math.abs(variance))} ${
                                        variance > 0
                                          ? "Actual > Forecast"
                                          : "Actual < Forecast"
                                      }`}
                                </td>
                                <td
                                  style={{
                                    padding: "12px",
                                    textAlign: "right",
                                    color:
                                      displayAccuracy >= 90
                                        ? "#28a745"
                                        : displayAccuracy >= 80
                                        ? "#007bff"
                                        : displayAccuracy >= 70
                                        ? "#ffc107"
                                        : "#dc3545",
                                  }}
                                >
                                  {`${displayAccuracy}%`}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

            {/* Budget per Department Pie Chart */}
            <div className="card" style={{ marginBottom: "30px" }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "16px",
                }}
              >
                <h3 className="card-title">Budget per Department</h3>
                <button
                  className="view-button"
                  onClick={toggleBudgetDetails}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    padding: "6px 12px",
                    backgroundColor: "#007bff",
                    color: "white",
                    border: "none",
                    borderRadius: "4px",
                    cursor: "pointer",
                    outline: "none",
                    fontSize: "14px",
                    fontWeight: "500",
                    height: "32px",
                  }}
                >
                  View Details
                  <Eye size={16} style={{ color: "white", marginLeft: "6px" }} />
                </button>
              </div>

              <div
                style={{
                  display: "flex",
                  gap: "20px",
                  marginBottom: "20px",
                  height: "300px",
                }}
              >
                <div
                  style={{ width: "50%", height: "100%", position: "relative" }}
                >
                  <Pie data={pieChartData} options={pieChartOptions} />
                </div>
                <div
                  style={{
                    width: "50%",
                    paddingLeft: "10px",
                    height: "100%",
                    overflowY: "auto",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "flex-start",
                  }}
                >
                  {pieChartData.labels.map((label, index) => {
                    const amount = pieChartData.datasets[0].data[index];
                    const percentage =
                      totalPieValue > 0
                        ? ((amount / totalPieValue) * 100).toFixed(1)
                        : 0;
                    return (
                      <div
                        key={index}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          marginBottom: "12px",
                          fontSize: "14px",
                          padding: "6px 0",
                          gap: "8px",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            flex: 1,
                          }}
                        >
                          <div
                            style={{
                              width: "14px",
                              height: "14px",
                              backgroundColor:
                                pieChartData.datasets[0].backgroundColor[index],
                              borderRadius: "4px",
                              marginRight: "10px",
                              flexShrink: 0,
                            }}
                          ></div>
                          <span
                            style={{
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              marginRight: "8px",
                              fontWeight: "500",
                            }}
                          >
                            {label}
                          </span>
                        </div>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                          }}
                        >
                          <span
                            style={{
                              fontWeight: "bold",
                              flexShrink: 0,
                              minWidth: "120px",
                              textAlign: "right",
                            }}
                          >
                            {formatPeso(amount)}
                          </span>
                          <span
                            style={{
                              color: "#6c757d",
                              fontSize: "12px",
                              minWidth: "45px",
                              textAlign: "right",
                            }}
                          >
                            {percentage}%
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {showBudgetDetails && (
                <div className="dept-budget-list">
                  {departmentDetailsData ? (
                    departmentDetailsData.map((dept, index) => (
                      <div
                        key={dept.department_id}
                        className={`dept-budget-item ${
                          index < departmentDetailsData.length - 1
                            ? "with-border"
                            : ""
                        }`}
                      >
                        <div className="dept-budget-header">
                          <h4 className="dept-budget-title">
                            {dept.department_name}
                          </h4>
                          <p className="dept-budget-percentage">
                            {dept.percentage_used?.toFixed(1)}% of budget used
                          </p>
                        </div>
                        <div className="progress-container">
                          <div
                            className="progress-bar"
                            style={{
                              width: `${dept.percentage_used}%`,
                              backgroundColor: "#007bff",
                            }}
                          ></div>
                        </div>
                        <div className="dept-budget-details">
                          <p>Budget: {formatPeso(dept.budget)}</p>
                          <p>Spent: {formatPeso(dept.spent)}</p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p>Loading department details...</p>
                  )}
                </div>
              )}
            </div>

            {/* SPENDING ANALYTICS SECTION */}
            <div className="card" style={{ marginBottom: "30px" }}>
              {/* Spending Analytics Header */}
              <div style={{ marginBottom: "25px" }}>
                <h2 style={{ color: "#007bff", marginBottom: "8px", fontSize: "22px" }}>
                  Spending Behavior Analytics
                </h2>
                <p style={{ color: "#6c757d", fontSize: "14px" }}>
                  Analyze spending patterns, trends, and category-wise expenditures
                </p>
              </div>

              {/* Analytics Tabs */}
              <div style={{ marginBottom: "25px", display: "flex", gap: "15px", flexWrap: "wrap" }}>
                <button
                  className={`filter-button ${activeSpendingTab === "trends" ? "active" : ""}`}
                  onClick={() => setActiveSpendingTab("trends")}
                  style={{
                    padding: "10px 20px",
                    backgroundColor: activeSpendingTab === "trends" ? "#007bff" : "white",
                    color: activeSpendingTab === "trends" ? "white" : "#007bff",
                    border: "1px solid #007bff",
                    borderRadius: "4px",
                    cursor: "pointer",
                    outline: "none",
                    display: "flex",
                    alignItems: "center",
                    fontSize: "14px",
                    fontWeight: "500",
                    height: "40px",
                    minWidth: "220px",
                    justifyContent: "center",
                    transition: "all 0.2s ease",
                  }}
                  onMouseEnter={(e) => {
                    if (activeSpendingTab !== "trends") {
                      e.currentTarget.style.backgroundColor = "#f0f8ff";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (activeSpendingTab !== "trends") {
                      e.currentTarget.style.backgroundColor = "white";
                    }
                  }}
                >
                  <TrendingUp size={18} style={{ marginRight: "8px" }} />
                  Department Spending Trends
                </button>
                <button
                  className={`filter-button ${activeSpendingTab === "categories" ? "active" : ""}`}
                  onClick={() => setActiveSpendingTab("categories")}
                  style={{
                    padding: "10px 20px",
                    backgroundColor: activeSpendingTab === "categories" ? "#007bff" : "white",
                    color: activeSpendingTab === "categories" ? "white" : "#007bff",
                    border: "1px solid #007bff",
                    borderRadius: "4px",
                    cursor: "pointer",
                    outline: "none",
                    display: "flex",
                    alignItems: "center",
                    fontSize: "14px",
                    fontWeight: "500",
                    height: "40px",
                    minWidth: "220px",
                    justifyContent: "center",
                    transition: "all 0.2s ease",
                  }}
                  onMouseEnter={(e) => {
                    if (activeSpendingTab !== "categories") {
                      e.currentTarget.style.backgroundColor = "#f0f8ff";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (activeSpendingTab !== "categories") {
                      e.currentTarget.style.backgroundColor = "white";
                    }
                  }}
                >
                  <PieChart size={18} style={{ marginRight: "8px" }} />
                  Highest Spending Categories
                </button>
                <button
                  className={`filter-button ${activeSpendingTab === "heatmap" ? "active" : ""}`}
                  onClick={() => setActiveSpendingTab("heatmap")}
                  style={{
                    padding: "10px 20px",
                    backgroundColor: activeSpendingTab === "heatmap" ? "#007bff" : "white",
                    color: activeSpendingTab === "heatmap" ? "white" : "#007bff",
                    border: "1px solid #007bff",
                    borderRadius: "4px",
                    cursor: "pointer",
                    outline: "none",
                    display: "flex",
                    alignItems: "center",
                    fontSize: "14px",
                    fontWeight: "500",
                    height: "40px",
                    minWidth: "220px",
                    justifyContent: "center",
                    transition: "all 0.2s ease",
                  }}
                  onMouseEnter={(e) => {
                    if (activeSpendingTab !== "heatmap") {
                      e.currentTarget.style.backgroundColor = "#f0f8ff";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (activeSpendingTab !== "heatmap") {
                      e.currentTarget.style.backgroundColor = "white";
                    }
                  }}
                >
                  <Flame size={18} style={{ marginRight: "8px" }} />
                  Spending Heatmaps
                </button>
              </div>

              {/* Department Spending Trends */}
              {activeSpendingTab === "trends" && (
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "18px" }}>
                    <h3 className="card-title" style={{ fontSize: "18px" }}>Department Spending Trends</h3>
                    <button
                      onClick={() => handleExportSpendingReport("Department Spending Trends")}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                        padding: "6px 12px",
                        backgroundColor: "#28a745",
                        color: "white",
                        border: "none",
                        borderRadius: "4px",
                        cursor: "pointer",
                        outline: "none",
                        fontSize: "14px",
                        fontWeight: "500",
                        height: "32px",
                      }}
                    >
                      Export Report
                      <Download size={16} style={{ marginLeft: "6px" }} />
                    </button>
                  </div>

                  {/* Filters */}
                  <div style={{ 
                    display: "grid", 
                    gridTemplateColumns: "repeat(4, 1fr)", 
                    gap: "15px", 
                    marginBottom: "25px",
                    backgroundColor: "#f8f9fa",
                    padding: "20px",
                    borderRadius: "8px",
                    alignItems: "end"
                  }}>
                    <div>
                      <label style={{ display: "block", marginBottom: "8px", fontWeight: "500", color: "#495057", fontSize: "13px" }}>
                        Department
                      </label>
                      <div style={{ position: "relative" }}>
                        <select
                          value={selectedDepartment}
                          onChange={(e) => setSelectedDepartment(e.target.value)}
                          style={{
                            width: "100%",
                            padding: "10px 12px",
                            paddingRight: "35px",
                            borderRadius: "6px",
                            border: "1px solid #ced4da",
                            backgroundColor: "white",
                            fontSize: "14px",
                            appearance: "none",
                            outline: "none",
                            height: "40px",
                          }}
                        >
                          <option value="All Departments">All Departments</option>
                          {DEPARTMENTS.map(dept => (
                            <option key={dept} value={dept}>{dept}</option>
                          ))}
                        </select>
                        <ChevronDown 
                          size={14} 
                          style={{
                            position: "absolute",
                            right: "12px",
                            top: "50%",
                            transform: "translateY(-50%)",
                            color: "#6c757d",
                            pointerEvents: "none"
                          }}
                        />
                      </div>
                    </div>

                    <div>
                      <label style={{ display: "block", marginBottom: "8px", fontWeight: "500", color: "#495057", fontSize: "13px" }}>
                        Date Range
                      </label>
                      <div style={{ 
                        display: "grid", 
                        gridTemplateColumns: "1fr auto 1fr", 
                        gap: "8px", 
                        alignItems: "center" 
                      }}>
                        <div style={{ position: "relative" }}>
                          <input
                            type="date"
                            value={dateRange.startDate}
                            onChange={(e) => setDateRange(prev => ({ ...prev, startDate: e.target.value }))}
                            style={{
                              width: "100%",
                              padding: "10px 12px",
                              paddingRight: "35px",
                              borderRadius: "6px",
                              border: "1px solid #ced4da",
                              backgroundColor: "white",
                              fontSize: "14px",
                              outline: "none",
                              height: "40px",
                            }}
                          />
                          <Calendar 
                            size={14} 
                            style={{
                              position: "absolute",
                              right: "12px",
                              top: "50%",
                              transform: "translateY(-50%)",
                              color: "#6c757d",
                              pointerEvents: "none"
                            }}
                          />
                        </div>
                        <span style={{ color: "#6c757d", textAlign: "center", fontSize: "12px" }}>to</span>
                        <div style={{ position: "relative" }}>
                          <input
                            type="date"
                            value={dateRange.endDate}
                            onChange={(e) => setDateRange(prev => ({ ...prev, endDate: e.target.value }))}
                            style={{
                              width: "100%",
                              padding: "10px 12px",
                              paddingRight: "35px",
                              borderRadius: "6px",
                              border: "1px solid #ced4da",
                              backgroundColor: "white",
                              fontSize: "14px",
                              outline: "none",
                              height: "40px",
                            }}
                          />
                          <Calendar 
                            size={14} 
                            style={{
                              position: "absolute",
                              right: "12px",
                              top: "50%",
                              transform: "translateY(-50%)",
                              color: "#6c757d",
                              pointerEvents: "none"
                            }}
                          />
                        </div>
                      </div>
                    </div>

                    <div>
                      <label style={{ display: "block", marginBottom: "8px", fontWeight: "500", color: "#495057", fontSize: "13px" }}>
                        Time Granularity
                      </label>
                      <div style={{ position: "relative" }}>
                        <select
                          value={timeGranularity}
                          onChange={(e) => setTimeGranularity(e.target.value)}
                          style={{
                            width: "100%",
                            padding: "10px 12px",
                            paddingRight: "35px",
                            borderRadius: "6px",
                            border: "1px solid #ced4da",
                            backgroundColor: "white",
                            fontSize: "14px",
                            appearance: "none",
                            outline: "none",
                            height: "40px",
                          }}
                        >
                          <option value="Monthly">Monthly</option>
                          <option value="Quarterly">Quarterly</option>
                        </select>
                        <ChevronDown 
                          size={14} 
                          style={{
                            position: "absolute",
                            right: "12px",
                            top: "50%",
                            transform: "translateY(-50%)",
                            color: "#6c757d",
                            pointerEvents: "none"
                          }}
                        />
                      </div>
                    </div>

                    <div>
                      <button
                        onClick={fetchSpendingAnalyticsData}
                        style={{
                          width: "100%",
                          padding: "10px 12px",
                          backgroundColor: "#007bff",
                          color: "white",
                          border: "none",
                          borderRadius: "6px",
                          cursor: "pointer",
                          outline: "none",
                          fontSize: "14px",
                          fontWeight: "500",
                          transition: "background-color 0.2s",
                          height: "40px",
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "#0056b3"}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "#007bff"}
                      >
                        Generate Report
                      </button>
                    </div>
                  </div>

                  {/* Chart and Summary */}
                  {spendingTrendsData ? (
                    <>
                      <div style={{ height: "350px", marginBottom: "25px" }}>
                        <Line data={spendingTrendsData} options={spendingTrendsOptions} />
                      </div>
                      
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "15px", marginBottom: "20px" }}>
                        <div className="card" style={{ padding: "16px", textAlign: "center", backgroundColor: "#f8f9fa" }}>
                          <h4 style={{ marginBottom: "8px", color: "#495057", fontSize: "13px" }}>Total Amount Spent</h4>
                          <p style={{ fontSize: "20px", fontWeight: "bold", color: "#007bff", margin: 0 }}>
                            {formatPeso(spendingTrendsData.totalAmount)}
                          </p>
                        </div>
                        <div className="card" style={{ padding: "16px", textAlign: "center", backgroundColor: "#f8f9fa" }}>
                          <h4 style={{ marginBottom: "8px", color: "#495057", fontSize: "13px" }}>Percentage Change</h4>
                          <p style={{ 
                            fontSize: "20px", 
                            fontWeight: "bold", 
                            color: spendingTrendsData.avgPercentageChange >= 0 ? "#28a745" : "#dc3545",
                            margin: 0 
                          }}>
                            {spendingTrendsData.avgPercentageChange >= 0 ? '+' : ''}{spendingTrendsData.avgPercentageChange}%
                          </p>
                          <span style={{ 
                            fontSize: "11px", 
                            color: spendingTrendsData.avgPercentageChange >= 0 ? "#28a745" : "#dc3545",
                            display: "block",
                            marginTop: "4px"
                          }}>
                            vs first period
                          </span>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div style={{ textAlign: "center", padding: "30px", color: "#6c757d", backgroundColor: "#f8f9fa", borderRadius: "8px", fontSize: "14px" }}>
                      Select filters and click "Generate Report" to view spending trends
                    </div>
                  )}
                </div>
              )}

              {/* Highest Spending Categories */}
              {activeSpendingTab === "categories" && (
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "18px" }}>
                    <h3 className="card-title" style={{ fontSize: "18px" }}>Highest Spending Categories</h3>
                    <button
                      onClick={() => handleExportSpendingReport("Highest Spending Categories")}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                        padding: "6px 12px",
                        backgroundColor: "#28a745",
                        color: "white",
                        border: "none",
                        borderRadius: "4px",
                        cursor: "pointer",
                        outline: "none",
                        fontSize: "14px",
                        fontWeight: "500",
                        height: "32px",
                      }}
                    >
                      Export Report
                      <Download size={16} style={{ marginLeft: "6px" }} />
                    </button>
                  </div>

                  {/* Filters */}
                  <div style={{ 
                    display: "grid", 
                    gridTemplateColumns: "repeat(3, 1fr)", 
                    gap: "15px", 
                    marginBottom: "25px",
                    backgroundColor: "#f8f9fa",
                    padding: "20px",
                    borderRadius: "8px",
                    alignItems: "end"
                  }}>
                    <div>
                      <label style={{ display: "block", marginBottom: "8px", fontWeight: "500", color: "#495057", fontSize: "13px" }}>
                        Department
                      </label>
                      <div style={{ position: "relative" }}>
                        <select
                          value={selectedCategoryDepartment}
                          onChange={(e) => setSelectedCategoryDepartment(e.target.value)}
                          style={{
                            width: "100%",
                            padding: "10px 12px",
                            paddingRight: "35px",
                            borderRadius: "6px",
                            border: "1px solid #ced4da",
                            backgroundColor: "white",
                            fontSize: "14px",
                            appearance: "none",
                            outline: "none",
                            height: "40px",
                          }}
                        >
                          <option value="All Departments">All Departments</option>
                          {DEPARTMENTS.map(dept => (
                            <option key={dept} value={dept}>{dept}</option>
                          ))}
                        </select>
                        <ChevronDown 
                          size={14} 
                          style={{
                            position: "absolute",
                            right: "12px",
                            top: "50%",
                            transform: "translateY(-50%)",
                            color: "#6c757d",
                            pointerEvents: "none"
                          }}
                        />
                      </div>
                    </div>

                    <div>
                      <label style={{ display: "block", marginBottom: "8px", fontWeight: "500", color: "#495057", fontSize: "13px" }}>
                        Date Range
                      </label>
                      <div style={{ 
                        display: "grid", 
                        gridTemplateColumns: "1fr auto 1fr", 
                        gap: "8px", 
                        alignItems: "center" 
                      }}>
                        <div style={{ position: "relative" }}>
                          <input
                            type="date"
                            value={categoryDateRange.startDate}
                            onChange={(e) => setCategoryDateRange(prev => ({ ...prev, startDate: e.target.value }))}
                            style={{
                              width: "100%",
                              padding: "10px 12px",
                              paddingRight: "35px",
                              borderRadius: "6px",
                              border: "1px solid #ced4da",
                              backgroundColor: "white",
                              fontSize: "14px",
                              outline: "none",
                              height: "40px",
                            }}
                          />
                          <Calendar 
                            size={14} 
                            style={{
                              position: "absolute",
                              right: "12px",
                              top: "50%",
                              transform: "translateY(-50%)",
                              color: "#6c757d",
                              pointerEvents: "none"
                            }}
                          />
                        </div>
                        <span style={{ color: "#6c757d", textAlign: "center", fontSize: "12px" }}>to</span>
                        <div style={{ position: "relative" }}>
                          <input
                            type="date"
                            value={categoryDateRange.endDate}
                            onChange={(e) => setCategoryDateRange(prev => ({ ...prev, endDate: e.target.value }))}
                            style={{
                              width: "100%",
                              padding: "10px 12px",
                              paddingRight: "35px",
                              borderRadius: "6px",
                              border: "1px solid #ced4da",
                              backgroundColor: "white",
                              fontSize: "14px",
                              outline: "none",
                              height: "40px",
                            }}
                          />
                          <Calendar 
                            size={14} 
                            style={{
                              position: "absolute",
                              right: "12px",
                              top: "50%",
                              transform: "translateY(-50%)",
                              color: "#6c757d",
                              pointerEvents: "none"
                            }}
                          />
                        </div>
                      </div>
                    </div>

                    <div>
                      <button
                        onClick={fetchSpendingAnalyticsData}
                        style={{
                          width: "100%",
                          padding: "10px 12px",
                          backgroundColor: "#007bff",
                          color: "white",
                          border: "none",
                          borderRadius: "6px",
                          cursor: "pointer",
                          outline: "none",
                          fontSize: "14px",
                          fontWeight: "500",
                          transition: "background-color 0.2s",
                          height: "40px",
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "#0056b3"}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "#007bff"}
                      >
                        Generate Report
                      </button>
                    </div>
                  </div>

                  {/* Categories List */}
                  {highestSpendingCategories.length > 0 ? (
                    <>
                      <div style={{ height: "280px", marginBottom: "25px" }}>
                        <Bar
                          data={{
                            labels: highestSpendingCategories.map(cat => cat.category),
                            datasets: [{
                              label: 'Spending Amount',
                              data: highestSpendingCategories.map(cat => cat.amount),
                              backgroundColor: '#007bff',
                              borderColor: '#0056b3',
                              borderWidth: 1
                            }]
                          }}
                          options={{
                            responsive: true,
                            maintainAspectRatio: false,
                            plugins: {
                              legend: { display: false },
                              tooltip: {
                                callbacks: {
                                  label: function(context) {
                                    return `${context.label}: ${formatPeso(context.parsed.y)} (${highestSpendingCategories[context.dataIndex].percentage}%)`;
                                  }
                                }
                              }
                            },
                            scales: {
                              x: { 
                                grid: { display: false },
                                ticks: {
                                  maxRotation: 45,
                                  font: {
                                    size: 12
                                  }
                                }
                              },
                              y: { 
                                grid: { display: true }, 
                                beginAtZero: true,
                                ticks: {
                                  callback: function(value) {
                                    return formatPeso(value);
                                  },
                                  font: {
                                    size: 12
                                  }
                                }
                              }
                            }
                          }}
                        />
                      </div>
                      
                      <div style={{ overflowX: "auto", backgroundColor: "#f8f9fa", borderRadius: "8px", padding: "12px" }}>
                        <table style={{ width: "100%", borderCollapse: "collapse" }}>
                          <thead>
                            <tr>
                              <th style={{ 
                                padding: "10px 12px", 
                                textAlign: "left", 
                                borderBottom: "2px solid #dee2e6",
                                backgroundColor: "white",
                                color: "#495057",
                                fontWeight: "600",
                                fontSize: "13px"
                              }}>
                                Rank
                              </th>
                              <th style={{ 
                                padding: "10px 12px", 
                                textAlign: "left", 
                                borderBottom: "2px solid #dee2e6",
                                backgroundColor: "white",
                                color: "#495057",
                                fontWeight: "600",
                                fontSize: "13px"
                              }}>
                                Category
                              </th>
                              <th style={{ 
                                padding: "10px 12px", 
                                textAlign: "right", 
                                borderBottom: "2px solid #dee2e6",
                                backgroundColor: "white",
                                color: "#495057",
                                fontWeight: "600",
                                fontSize: "13px"
                              }}>
                                Total Spent
                              </th>
                              <th style={{ 
                                padding: "10px 12px", 
                                textAlign: "right", 
                                borderBottom: "2px solid #dee2e6",
                                backgroundColor: "white",
                                color: "#495057",
                                fontWeight: "600",
                                fontSize: "13px"
                              }}>
                                Percentage of Total
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {highestSpendingCategories.map((category, index) => (
                              <tr key={index} style={{ 
                                borderBottom: "1px solid #e9ecef",
                                backgroundColor: index % 2 === 0 ? "white" : "#f8f9fa"
                              }}>
                                <td style={{ padding: "10px 12px", fontWeight: "bold", color: "#007bff", fontSize: "13px" }}>
                                  {index + 1}
                                </td>
                                <td style={{ padding: "10px 12px", color: "#495057", fontSize: "13px" }}>
                                  {category.category}
                                </td>
                                <td style={{ padding: "10px 12px", textAlign: "right", fontWeight: "bold", color: "#212529", fontSize: "13px" }}>
                                  {formatPeso(category.amount)}
                                </td>
                                <td style={{ padding: "10px 12px", textAlign: "right", color: "#6c757d", fontSize: "13px" }}>
                                  {category.percentage}%
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </>
                  ) : (
                    <div style={{ textAlign: "center", padding: "30px", color: "#6c757d", backgroundColor: "#f8f9fa", borderRadius: "8px", fontSize: "14px" }}>
                      No spending categories found for the selected filters
                    </div>
                  )}
                </div>
              )}

              {/* Spending Heatmaps */}
              {activeSpendingTab === "heatmap" && (
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "18px" }}>
                    <h3 className="card-title" style={{ fontSize: "18px" }}>Spending Intensity Heatmap</h3>
                    <button
                      onClick={() => handleExportSpendingReport("Spending Heatmap")}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                        padding: "6px 12px",
                        backgroundColor: "#28a745",
                        color: "white",
                        border: "none",
                        borderRadius: "4px",
                        cursor: "pointer",
                        outline: "none",
                        fontSize: "14px",
                        fontWeight: "500",
                        height: "32px",
                      }}
                    >
                      Export Report
                      <Download size={16} style={{ marginLeft: "6px" }} />
                    </button>
                  </div>

                  {/* Filters */}
                  <div style={{ 
                    display: "grid", 
                    gridTemplateColumns: "repeat(3, 1fr)", 
                    gap: "15px", 
                    marginBottom: "25px",
                    backgroundColor: "#f8f9fa",
                    padding: "20px",
                    borderRadius: "8px",
                    alignItems: "end"
                  }}>
                    <div>
                      <label style={{ display: "block", marginBottom: "8px", fontWeight: "500", color: "#495057", fontSize: "13px" }}>
                        Department
                      </label>
                      <div style={{ position: "relative" }}>
                        <select
                          value={selectedHeatmapDepartment}
                          onChange={(e) => setSelectedHeatmapDepartment(e.target.value)}
                          style={{
                            width: "100%",
                            padding: "10px 12px",
                            paddingRight: "35px",
                            borderRadius: "6px",
                            border: "1px solid #ced4da",
                            backgroundColor: "white",
                            fontSize: "14px",
                            appearance: "none",
                            outline: "none",
                            height: "40px",
                          }}
                        >
                          <option value="All Departments">All Departments</option>
                          {DEPARTMENTS.map(dept => (
                            <option key={dept} value={dept}>{dept}</option>
                          ))}
                        </select>
                        <ChevronDown 
                          size={14} 
                          style={{
                            position: "absolute",
                            right: "12px",
                            top: "50%",
                            transform: "translateY(-50%)",
                            color: "#6c757d",
                            pointerEvents: "none"
                          }}
                        />
                      </div>
                    </div>

                    <div>
                      <label style={{ display: "block", marginBottom: "8px", fontWeight: "500", color: "#495057", fontSize: "13px" }}>
                        Time Aggregation
                      </label>
                      <div style={{ position: "relative" }}>
                        <select
                          value={timeAggregation}
                          onChange={(e) => setTimeAggregation(e.target.value)}
                          style={{
                            width: "100%",
                            padding: "10px 12px",
                            paddingRight: "35px",
                            borderRadius: "6px",
                            border: "1px solid #ced4da",
                            backgroundColor: "white",
                            fontSize: "14px",
                            appearance: "none",
                            outline: "none",
                            height: "40px",
                          }}
                        >
                          <option value="Monthly">Monthly</option>
                          <option value="Quarterly">Quarterly</option>
                        </select>
                        <ChevronDown 
                          size={14} 
                          style={{
                            position: "absolute",
                            right: "12px",
                            top: "50%",
                            transform: "translateY(-50%)",
                            color: "#6c757d",
                            pointerEvents: "none"
                          }}
                        />
                      </div>
                    </div>

                    <div>
                      <button
                        onClick={fetchSpendingAnalyticsData}
                        style={{
                          width: "100%",
                          padding: "10px 12px",
                          backgroundColor: "#007bff",
                          color: "white",
                          border: "none",
                          borderRadius: "6px",
                          cursor: "pointer",
                          outline: "none",
                          fontSize: "14px",
                          fontWeight: "500",
                          transition: "background-color 0.2s",
                          height: "40px",
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "#0056b3"}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "#007bff"}
                      >
                        Generate Heatmap
                      </button>
                    </div>
                  </div>

                  {/* Heatmap */}
                  {heatmapData.length > 0 ? (
                    <>
                      <div style={{ marginBottom: "25px", backgroundColor: "#f8f9fa", padding: "16px", borderRadius: "8px" }}>
                        {renderHeatmap()}
                      </div>
                      
                      <div style={{ backgroundColor: "#f8f9fa", padding: "12px", borderRadius: "8px" }}>
                        <h4 style={{ marginBottom: "8px", color: "#495057", fontSize: "14px" }}>Intensity Legend</h4>
                        <div style={{ display: "flex", gap: "15px", alignItems: "center" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                            <div style={{ width: "16px", height: "16px", backgroundColor: "#28a745", borderRadius: "4px" }}></div>
                            <span style={{ color: "#495057", fontSize: "13px" }}>Low Spending</span>
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                            <div style={{ width: "16px", height: "16px", backgroundColor: "#ffc107", borderRadius: "4px" }}></div>
                            <span style={{ color: "#495057", fontSize: "13px" }}>Medium Spending</span>
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                            <div style={{ width: "16px", height: "16px", backgroundColor: "#dc3545", borderRadius: "4px" }}></div>
                            <span style={{ color: "#495057", fontSize: "13px" }}>High Spending</span>
                          </div>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div style={{ textAlign: "center", padding: "30px", color: "#6c757d", backgroundColor: "#f8f9fa", borderRadius: "8px", fontSize: "14px" }}>
                      Select filters and click "Generate Heatmap" to view spending intensity
                    </div>
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default BudgetDashboard;