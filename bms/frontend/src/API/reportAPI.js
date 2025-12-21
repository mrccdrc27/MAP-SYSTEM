import budgetApi from './budgetAPI';

/**
 * Fetches the budget variance report data.
 * @param {object} params - Query parameters.
 * @param {number} params.fiscal_year_id - The ID of the fiscal year
 * @param {number} [params.month] - Optional month to filter by (1-12
 */
export const getBudgetVarianceReport = (params) => {
  return budgetApi.get('/reports/budget-variance/', { params });
};

/**
 * Exports the budget variance report to an Excel file.
 * @param {object} params - Query parameters.
 */
export const exportBudgetVarianceReport = (params) => {
  return budgetApi.get('/reports/budget-variance/export/', {
    params,
    responseType: 'blob', // Important for handling file downloads
  });
};