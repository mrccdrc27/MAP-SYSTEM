/**
 * Dashboard Utility Functions
 * Reusable helper functions for data formatting and calculations
 */

/**
 * Format number as Philippine Peso
 */
export const formatPeso = (amount) => {
  return `₱${Number(amount).toLocaleString("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

/**
 * Converts Cumulative Forecast Data (from Backend) to Monthly Data (for Charts).
 * Formula: Monthly[i] = Cumulative[i] - Cumulative[i-1]
 */
export const convertCumulativeToMonthly = (cumulativeData) => {
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

/**
 * Calculate progress percentage for fiscal years
 */
export const calculateProgress = (start, end) => {
  const total = new Date(end) - new Date(start);
  const elapsed = new Date() - new Date(start);
  return Math.min(100, Math.max(0, (elapsed / total) * 100)).toFixed(1);
};

/**
 * Get status color based on fiscal year status
 */
export const getStatusColor = (status) => {
  // Note: Adjust based on your actual status values
  return "#6c757d";
};

/**
 * Format date range display
 */
export const formatDateRange = (startDate, endDate) => {
  const start = new Date(startDate).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
  const end = new Date(endDate).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
  return `${start} - ${end}`;
};

/**
 * Get current date formatted parts
 */
export const getFormattedDateParts = (date = new Date()) => {
  return {
    time: date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "numeric",
      hour12: true,
    }),
    day: date.toLocaleDateString("en-US", {
      weekday: "long",
    }),
    date: date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    }),
    month: date.toLocaleDateString("en-US", {
      month: "long",
    }),
    year: date.getFullYear(),
  };
};