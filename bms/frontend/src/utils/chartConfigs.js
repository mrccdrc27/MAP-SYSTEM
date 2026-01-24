/**
 * Chart Configuration Builders
 * Functions to create chart data and options
 */

import { formatPeso } from "./dashboardUtils";
import { DEPARTMENT_COLORS } from "./dashboardConstants";

/**
 * Create line chart options with peso formatting
 */
export const createLineChartOptions = (customOptions = {}) => {
  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { 
      legend: { position: "top" },
      tooltip: {
        callbacks: {
          label: function (context) {
            let label = context.dataset.label || "";
            if (label) {
              label += ": ";
            }
            label += formatPeso(context.parsed.y);
            return label;
          },
        },
      },
    },
    scales: {
      x: { grid: { display: false } },
      y: {
        grid: { display: true },
        beginAtZero: true,
        ticks: {
          callback: function (value) {
            return formatPeso(value);
          },
        },
      },
    },
    ...customOptions,
  };
};

/**
 * Create pie chart options with peso formatting and custom center text
 */
export const createPieChartOptions = (totalValue) => {
  return {
    responsive: true,
    maintainAspectRatio: false,
    cutout: "0%",
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (context) => {
            const percentage =
              totalValue > 0
                ? ((context.raw / totalValue) * 100).toFixed(1)
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
        const text = formatPeso(totalValue);
        ctx.fillStyle = "#007bff";
        ctx.fillText(text, width / 2, height / 2);
        ctx.save();
      },
    },
  };
};

/**
 * Create spending trends chart options with percentage change in tooltip
 */
export const createSpendingTrendsOptions = (spendingTrendsData) => {
  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: "top" },
      tooltip: {
        callbacks: {
          label: function (context) {
            let label = context.dataset.label || "";
            if (label) {
              label += ": ";
            }
            label += formatPeso(context.parsed.y);

            // Add percentage change to tooltip
            if (
              spendingTrendsData?.datasets[0]?.percentageChange?.[
                context.dataIndex
              ] !== undefined
            ) {
              const change =
                spendingTrendsData.datasets[0].percentageChange[
                  context.dataIndex
                ];
              if (context.dataIndex > 0) {
                label += ` (${change >= 0 ? "+" : ""}${change}% vs previous)`;
              }
            }
            return label;
          },
        },
      },
    },
    scales: {
      x: { grid: { display: false } },
      y: {
        grid: { display: true },
        beginAtZero: true,
        ticks: {
          callback: function (value) {
            return formatPeso(value);
          },
        },
      },
    },
  };
};

/**
 * Build money flow chart data (Budget vs Actual + optional Forecast)
 */
export const buildMoneyFlowChartData = (
  moneyFlowData,
  showForecasting,
  monthlyForecastData,
  lastActualExpenseIndex
) => {
  const datasets = [
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
  ];

  // Add forecast line if enabled
  if (showForecasting && moneyFlowData && monthlyForecastData.length > 0) {
    datasets.push({
      label: "Forecast (Projection)",
      data: moneyFlowData.map((d, index) => {
        const forecastPoint = monthlyForecastData.find(
          (f) => f.month_name === d.month_name
        );
        const val = forecastPoint ? forecastPoint.forecast : null;

        // Hide forecast before last actual. Stitch at last actual.
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
    });
  }

  return {
    labels: moneyFlowData?.map((d) => d.month_name) || [],
    datasets,
  };
};

/**
 * Build forecast comparison chart data (Actual vs Forecast baseline)
 */
export const buildForecastComparisonData = (
  moneyFlowData,
  monthlyForecastData
) => {
  return {
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
};

/**
 * Build department pie chart data
 */
export const buildDepartmentPieData = (
  departmentDetailsData,
  departmentMapping
) => {
  if (departmentDetailsData && departmentDetailsData.length > 0) {
    // Use mapping to find departments
    const mappedData = Object.keys(departmentMapping).map((label) => {
      const keywords = departmentMapping[label];
      const foundDept = departmentDetailsData.find((d) =>
        keywords.some((k) => d.department_name.includes(k))
      );
      return {
        label: label,
        budget: foundDept ? Number(foundDept.budget) : 0,
      };
    });

    const validData = mappedData.filter((d) => d.budget > 0);

    if (validData.length > 0) {
      return {
        labels: validData.map((d) => d.label),
        datasets: [
          {
            data: validData.map((d) => d.budget),
            backgroundColor: DEPARTMENT_COLORS.slice(0, validData.length),
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
    labels: Object.keys(departmentMapping),
    datasets: [
      {
        data: Object.keys(departmentMapping).map(() => 1),
        backgroundColor: ["#e9ecef"],
      },
    ],
  };
};