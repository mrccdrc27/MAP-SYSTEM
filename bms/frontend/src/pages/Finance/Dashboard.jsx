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
import { Line, Pie } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ArcElement,
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
  // CHANGED: Updated filename to match dashboard_summary format
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

        // NOTE: Manual stitching logic removed.
        // The export should reflect the raw data comparison shown in the
        // "Detailed Metrics Table" on the UI, where December shows a variance.

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
    // Standard XLSX doesn't support fonts/colors easily, but we can fix widths.
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

  // Data State
  const [timeFilter, setTimeFilter] = useState("monthly");
  const [summaryData, setSummaryData] = useState(null);
  const [moneyFlowData, setMoneyFlowData] = useState(null);
  const [forecastData, setForecastData] = useState([]);
  const [pieChartApiData, setPieChartApiData] = useState(null);
  const [departmentDetailsData, setDepartmentDetailsData] = useState(null);
  const [forecastAccuracyData, setForecastAccuracyData] = useState(null);

  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const getUserRole = () => {
    if (!user) return "User";

    // Check for role in different possible locations
    if (user.roles?.bms) return user.roles.bms;
    if (user.role_display) return user.role_display;
    if (user.role) return user.role;

    // Default role names based on user type
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
  // This is crucial: Backend gives Year-to-Date totals, Charts need Month-by-Month values.
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
      y: { grid: { display: true }, beginAtZero: true },
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

  const toggleNotifications = () => {
    setShowNotifications(!showNotifications);
    if (showBudgetDropdown) setShowBudgetDropdown(false);
    if (showExpenseDropdown) setShowExpenseDropdown(false);
    if (showCategoryDropdown) setShowCategoryDropdown(false);
    if (showProfileDropdown) setShowProfileDropdown(false);
  };

  const toggleProfileDropdown = () => {
    setShowProfileDropdown(!showProfileDropdown);
    if (showBudgetDropdown) setShowBudgetDropdown(false);
    if (showExpenseDropdown) setShowExpenseDropdown(false);
    if (showCategoryDropdown) setShowCategoryDropdown(false);
    if (showNotifications) setShowNotifications(false);
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

      {/* Main Content */}
      <div
        className="content-container"
        style={{ padding: "20px", maxWidth: "1200px", margin: "0 auto" }}
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
                      padding: "3px 8px",
                      backgroundColor: showForecasting ? "#ff6b35" : "#e9ecef",
                      color: showForecasting ? "white" : "#1b1d1fff",
                      border: "none",
                      borderRadius: "4px",
                      cursor: "pointer",
                      transition: "all 0.2s ease",
                      outline: "none",
                      fontSize: "12px",
                      fontWeight: "500",
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
                      padding: "3px 8px",
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
                      }}
                    >
                      <Download size={16} />
                      Export Accuracy Report
                    </button>
                  </div>

                  {(() => {
                    // DERIVE CARD DATA FROM TABLE DATA for consistency
                    // 1. Find the last completed month (index 10 = November)
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
                    ); // month is 1-based
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
                            // Ensure we compare monthly actuals against monthly forecasts
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
                            // Fix: Use an epsilon threshold for "Exact" match to handle float precision
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
            <div className="card">
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
                  }}
                >
                  <Eye size={16} style={{ color: "white" }} />
                  View Details
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
          </>
        )}
      </div>
    </div>
  );
}

export default BudgetDashboard;
