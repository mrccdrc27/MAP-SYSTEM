/**
 * Dashboard Constants and Configurations
 */

export const DEPARTMENTS = [
  "Merchandise Planning",
  "Store Operations",
  "Marketing",
  "Operations",
  "IT",
  "Logistics",
  "Human Resources",
  "Finance",
];

export const DEPARTMENTS_MAPPING = {
  "Merchandise Planning": ["Merchandising", "Merchandise"],
  "Store Operations": ["Sales", "Store"],
  Marketing: ["Marketing"],
  Operations: ["Operations Department"],
  IT: ["IT", "Data", "IT Application"],
  Logistics: ["Logistics"],
  "Human Resources": ["HR", "Human Resources"],
  Finance: ["Finance"],
};

// Department colors for charts (8 colors for 8 departments in order)
export const DEPARTMENT_COLORS = [
  "#007bff", // Merchandise Planning
  "#28a745", // Store Operations
  "#ffc107", // Marketing
  "#dc3545", // Operations
  "#6f42c1", // IT
  "#fd7e14", // Logistics
  "#20c997", // Human Resources
  "#343a40", // Finance (dark gray)
];

// Chart.js default options
export const DEFAULT_LINE_CHART_OPTIONS = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: { 
    legend: { position: "top" } 
  },
  scales: {
    x: { grid: { display: false } },
    y: {
      grid: { display: true },
      beginAtZero: true,
    },
  },
};

export const DEFAULT_PIE_CHART_OPTIONS = {
  responsive: true,
  maintainAspectRatio: false,
  cutout: "0%",
  plugins: {
    legend: { display: false },
  },
};

// Time filter options
export const TIME_FILTERS = {
  MONTHLY: "monthly",
  QUARTERLY: "quarterly",
  YEARLY: "yearly",
};

// Spending analytics tabs
export const SPENDING_TABS = {
  TRENDS: "trends",
  CATEGORIES: "categories",
  HEATMAP: "heatmap",
};

// Time granularity options
export const TIME_GRANULARITY = {
  MONTHLY: "Monthly",
  QUARTERLY: "Quarterly",
};

// Fiscal year status
export const FISCAL_YEAR_STATUS = {
  OPEN: "Open",
  LOCKED: "Locked",
  CLOSED: "Closed",
};

// Default avatar URL
export const DEFAULT_AVATAR_URL =
  "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80";