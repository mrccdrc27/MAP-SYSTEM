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
  // Kept only icons used in Dashboard view or Nav (if passed)
  Calendar,
  ChevronDown,
} from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
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
import ManageProfile from "../../pages/Finance/ManageProfile";
import * as XLSX from "xlsx";

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

// Components
import TimeFilter from "../../components/Dashboard/TimeFilter";
import DashboardStats from "../../components/Dashboard/DashboardStats";
import MoneyFlowChart from "../../components/Dashboard/MoneyFlowChart";
import DepartmentBudgetAnalysis from "../../components/Dashboard/DepartmentBudgetAnalysis";
import ForecastAccuracyAnalysis from "../../components/Dashboard/ForecastAccuracyAnalysis";
import SpendingAnalytics from "../../components/Dashboard/SpendingAnalytics";
import FiscalYearManagement from "../../components/FiscalYear/FiscalYearManagement";

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
// Export functions kept in Dashboard as they rely on multiple data sources gathered here
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
    const monthlyForecasts = convertCumulativeToMonthly(forecastData);
    const reportRows = [];
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
        let forecastPoint = monthlyForecasts.find(
          (f) => f.month_name === month.month_name,
        );
        let forecastValue = forecastPoint ? Number(forecastPoint.forecast) : 0;
        const variance = actualValue - forecastValue;
        const isExact = Math.abs(variance) < 0.01;

        let accuracyPct = 0;
        if (actualValue > 0) {
          accuracyPct = 100 * (1 - Math.abs(variance) / actualValue);
        } else if (forecastValue === 0) {
          accuracyPct = 100;
        }

        const displayAccuracy =
          Math.max(0, Math.min(100, accuracyPct)).toFixed(1) + "%";

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

    const combinedData = [
      ["FORECAST ACCURACY REPORT"],
      ["Generated on:", now.toLocaleString()],
      [""],
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
      [""],
      [""],
      ["DETAILED MONTHLY BREAKDOWN"],
      tableHeader,
      ...reportRows,
    ];

    const ws1 = XLSX.utils.aoa_to_sheet(combinedData);
    const wscols = [
      { wch: 15 },
      { wch: 20 },
      { wch: 20 },
      { wch: 20 },
      { wch: 20 },
      { wch: 15 },
    ];
    ws1["!cols"] = wscols;

    XLSX.utils.book_append_sheet(wb, ws1, "Forecast Report");
    XLSX.writeFile(wb, fileName);
  } catch (error) {
    console.error("Error exporting accuracy report:", error);
    alert("Failed to export accuracy report.");
  }
};

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
        ...(data.labels?.map((label, index) => [
          label,
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

function BudgetDashboard() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [loading, setLoading] = useState(true);

  // UI State
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

  // --- FISCAL YEAR STATE (Only what is needed for Navigation or Routing) ---
  const [activeView, setActiveView] = useState("dashboard"); // "dashboard" or "fiscal-year"

  // Note: Detailed FY state (modals, list, active year object) moved to <FiscalYearManagement />

  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout, getBmsRole } = useAuth();

  const getUserRole = () => {
    if (!user) return "User";
    if (getBmsRole) {
      const bmsRole = getBmsRole();
      if (bmsRole) return bmsRole;
    }
    if (user.role && typeof user.role === "string") return user.role;
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
      } catch (error) {
        console.error("Failed to fetch data:", error);
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
        const [summaryRes, deptRes] = await Promise.all([
          getBudgetSummary(timeFilter),
          getDepartmentBudgetData(timeFilter),
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
            getForecastData(null),
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

  // Handle incoming navigation state from other pages
  useEffect(() => {
    if (location.state?.view) {
      setActiveView(location.state.view);
      // Clear the state so browser back button works correctly
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state, navigate]);

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

  const handleLogout = async () => await logout();

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

  // Nav Handlers
  const handleManageProfile = () => {
    setShowManageProfile(true);
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
                    data={
                      showForecastComparison
                        ? forecastComparisonData
                        : monthlyData
                    }
                    options={lineChartOptions}
                    showForecasting={showForecasting}
                    toggleForecasting={toggleForecasting}
                    showForecastComparison={showForecastComparison}
                    toggleForecastComparison={toggleForecastComparison}
                    onExport={() =>
                      exportAccuracyReport(
                        forecastAccuracyData,
                        moneyFlowData,
                        forecastData,
                      )
                    }
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
                          forecastData,
                        )
                      }
                    />
                  )}

                {/* Budget per Department (Complex View) */}
                {/* Budget per Department (Complex View) */}
                <DepartmentBudgetAnalysis
                  pieChartData={pieChartData}
                  pieChartOptions={pieChartOptions}
                  departmentDetailsData={departmentDetailsData}
                  onExport={() =>
                    exportToExcel(
                      summaryData,
                      moneyFlowData,
                      pieChartApiData, // Ensure this exists in state (it does in your Dashboard.jsx)
                      departmentDetailsData,
                      timeFilter,
                    )
                  }
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
                    setDateRange: (field, val) =>
                      handleDateRangeChange(setDateRange, field, val),
                    setGranularity: setTimeGranularity,
                    onExport: () =>
                      handleExportSpendingReport("Department Spending Trends"),
                  }}
                  // Categories Config
                  categoriesFilters={{
                    department: selectedCategoryDepartment,
                    dateRange: categoryDateRange,
                  }}
                  categoriesHandlers={{
                    setDepartment: setSelectedCategoryDepartment,
                    setDateRange: (field, val) =>
                      handleDateRangeChange(setCategoryDateRange, field, val),
                    onExport: () =>
                      handleExportSpendingReport("Highest Spending Categories"),
                  }}
                  // Heatmap Config
                  heatmapFilters={{
                    department: selectedHeatmapDepartment,
                    dateRange: categoryDateRange, // Reusing category date range based on original code logic
                    aggregation: timeAggregation,
                  }}
                  heatmapHandlers={{
                    setDepartment: setSelectedHeatmapDepartment,
                    setDateRange: (field, val) =>
                      handleDateRangeChange(setCategoryDateRange, field, val),
                    setAggregation: setTimeAggregation,
                    onExport: () =>
                      handleExportSpendingReport("Spending Heatmap"),
                  }}
                />
              </>
            ) : (
              // FISCAL YEAR MANAGEMENT VIEW (Refactored)
              <FiscalYearManagement summaryData={summaryData} />
            )}
          </>
        )}
      </div>

      {/* REMOVED: Inline Modals from bottom of file */}
    </div>
  );
}

export default BudgetDashboard;
