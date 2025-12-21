import budgetApi from './budgetAPI'; // Use the budget_service axios instance

/**
 * Fetches the summary cards for the Expense Tracking page.
 * (Total Expenses, Pending Approval, Budget Total)
 */
export const getExpenseSummary = () => {
    // URL comes from urls.py: name='expense-tracking-summary'
    return budgetApi.get('/expenses/tracking/summary/');
};
/**
 * Fetches the list of expenses for the main tracking table.
 * Supports pagination, search, and filtering.
 * @param {object} params - The query parameters.
 * @param {number} params.page - The page number.
 * @param {string} [params.search] - The search term.
 * @param {string} [params.category__classification] - The main category classification (CAPEX or OPEX).
 * @param {number} [params.department] - The department ID to filter by.
 */
export const getExpenseTrackingList = (params) => {
    // MODIFICATION: The URL is now the root of the ExpenseViewSet
    return budgetApi.get('/expenses/', { params });
};

/**
 * Fetches valid projects that have active budget allocations.
 * Returns project_id, project_title, department_name, etc.
 */
export const getValidProjectAccounts = () => {
    return budgetApi.get('/expenses/valid-project-accounts/');
};

/**
 * Fetches the list of past, approved expenses for the history page
 * @param {object} params - The query parameter
 * @param {number} params.page - The page number
 * @param {string} [params.search] - The search term
 * @param {string} [params.category__code] - The category code to filter by
 */
export const getExpenseHistoryList = (params) => {
    return budgetApi.get('/expenses/history/', { params });
};

/**
 * Fetches the details for a single expense, primarily to find its parent proposal
 * Used for the "View" modal in Expense History.
 * @param {number} expenseId - The ID of the expense
 */
export const getExpenseDetailsForModal = (expenseId) => {
    // MODIFICATION: The URL was updated in urls.py
    return budgetApi.get(`/expenses/${expenseId}/modal-details/`);
};

/**
 * Submits a new expense record using FormData for file uploads.
 * @param {FormData} formData - The FormData object for the new expense.
 */
export const createExpense = (formData) => {
    // MODIFICATION: The URL is the root of the ExpenseViewSet and content-type must be set for files
    return budgetApi.post('/expenses/', formData, {
        headers: {
            'Content-Type': 'multipart/form-data',
        },
    });
};

/**
 * Fetches the list of available expense categories for dropdowns.
 * Supports filtering by project ID.
 */
export const getExpenseCategories = (projectId = null) => {
    const params = {};
    if (projectId) {
        params.project_id = projectId;
    }
    return budgetApi.get('/dropdowns/expense-categories/', { params });
};
/**
 * Fetches the details for a single budget proposal.
 * Used for the "View" modal in Expense History.
 * @param {number} proposalId - The ID of the budget proposal.
 */
export const getProposalDetails = (proposalId) => {
    return budgetApi.get(`/budget-proposals/${proposalId}/`);
};

/**
 * Fetches the list of all projects for dropdowns.
 */
export const getProjects = () => {
    return budgetApi.get('/projects/all/');
};

// MODIFICATION START: New API functions for expense approval workflow
/**
 * Approves or rejects a submitted expense.
 * @param {number} expenseId - The ID of the expense to review.
 * @param {object} reviewData - The review data.
 * @param {string} reviewData.status - 'APPROVED' or 'REJECTED'.
 * @param {string} [reviewData.notes] - Optional comments.
 */
export const reviewExpense = (expenseId, reviewData) => {
    return budgetApi.post(`/expenses/${expenseId}/review/`, reviewData);
};

/**
 * Marks an approved expense as accomplished.
 * @param {number} expenseId - The ID of the expense to mark.
 */
// CORRECTED NAME HERE
export const markExpenseAsAccomplished = (expenseId) => {
    return budgetApi.post(`/expenses/${expenseId}/mark_as_accomplished/`);
};

// Add other necessary functions, like fetching vendors or employees if they become dynamic