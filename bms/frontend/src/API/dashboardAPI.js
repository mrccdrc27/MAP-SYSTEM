// 1. Import the correctly named budgetApi instance
import budgetApi from './budgetAPI'; 

/**
 * Fetches the main budget summary cards data.
 * @param {string} period - The time filter ('monthly', 'quarterly', 'yearly').
 */
// MODIFICATION START
export const getBudgetSummary = (period = 'yearly') => {
    return budgetApi.get('/dashboard/budget-summary/', {
        params: { period }
    });
};
// MODIFICATION END

/**
 * Fetches the data for the Money Flow chart (Budget vs Actual).
 * @param {number} fiscalYearId - The ID of the fiscal year.
 */
export const getMoneyFlowData = (fiscalYearId) => {
    // Use 'budgetApi'
    return budgetApi.get('/dashboard/overall-monthly-flow/', {
        params: { fiscal_year_id: fiscalYearId }
    });
};

export const getTopCategoryAllocations = (limit = 6) => {
    return budgetApi.get('/dashboard/top-category-allocations/', {
        params: { limit }
    });
};

/**
 * Fetches the budget forecast data.
 * @param {number} fiscalYearId - The ID of the fiscal year.
 */
export const getForecastData = (fiscalYearId) => {
    // Use 'budgetApi'
    return budgetApi.get('/dashboard/forecast/', {
        params: { fiscal_year_id: fiscalYearId }
    });
};

// MODIFICATION START
/**
 * Fetches the forecast accuracy metrics for the last completed month.
 */
export const getForecastAccuracy = () => {
    return budgetApi.get('/dashboard/forecast-accuracy/');
};

/**
 * Fetches data for the Budget per Category pie chart.
 */
export const getCategoryBudgetData = () => {
    // Use 'budgetApi'
    return budgetApi.get('/dashboard/category-budget-status/');
};

/**
 * Fetches data for the "View Details" section of the budget per category module.
 */
// MODIFICATION: Accept period param
export const getDepartmentBudgetData = (period = 'yearly') => {
    // Use 'budgetApi'
    return budgetApi.get('/dashboard/department-status/', {
        params: { period }
    });
};

/**
 * Fetches the list of projects for the dashboard table.
 * @param {number} page - The page number for pagination.
 */
export const getProjectStatusList = (page = 1) => {
    // Use 'budgetApi'
    return budgetApi.get('/dashboard/project-status/', {
        params: { page }
    });
};

/**
 * Fetches detailed information for a single project.
 * @param {number} projectId - The ID of the project.
 */
export const getProjectDetails = (projectId) => {
    // Use 'budgetApi'
    return budgetApi.get(`/dashboard/projects/${projectId}/`);
};

/**
 * Get Spending Trends Data
 * @param {Object} params { start_date, end_date, department, granularity }
 */
export const getSpendingTrends = (params) => {
    return budgetApi.get('/dashboard/analytics/spending-trends/', { params });
};

/**
 * Get Top Spending Categories
 * @param {Object} params { start_date, end_date, department }
 */
export const getTopSpendingCategories = (params) => {
    return budgetApi.get('/dashboard/analytics/top-categories/', { params });
};

/**
 * Get Heatmap Data
 * @param {Object} params { start_date, end_date, department, aggregation }
 */
export const getSpendingHeatmap = (params) => {
    return budgetApi.get('/dashboard/analytics/heatmap/', { params });
};