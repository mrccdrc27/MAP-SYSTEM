import budgetApi from './budgetAPI';

/**
 * Fetches a paginated and filtered list of budget adjustments (journal entries).
 * @param {object} params - Query parameters.
 */
export const getBudgetAdjustments = (params) => {
  // Point to the Journal Entry List view which is used for the table
  return budgetApi.get('/journal-entries/', { params });
};

/**
 * Creates a new journal entry for a budget adjustment
 * @param {object} data - The data for the new journal entry from the modal
 */
export const createJournalEntry = (data) => {
  // This points to the existing view for creating journal entries
  return budgetApi.post('/journal-entries/create/', data);
};

/**
 * Creates a new Budget Adjustment (Transfer or Modification).
 * @param {object} data - The payload matching BudgetAdjustmentSerializer.
 */
export const createBudgetAdjustment = (data) => {
  // This points to the BudgetAdjustmentView (CreateAPIView)
  return budgetApi.post('/budget-adjustments/', data);
};

// --- MODIFICATION START: New Methods for Supplemental Budget ---

/**
 * Requests a supplemental budget (Operator action).
 * @param {object} data - { department_input, category_id, amount, reason, fiscal_year_id? }
 */
export const requestSupplementalBudget = (data) => {
  return budgetApi.post('/budget/supplemental/request/', data);
};

/**
 * Fetches pending supplemental budget requests (Finance Manager view).
 * @param {object} params - { page, page_size, search, status, etc. }
 */
export const getSupplementalBudgetRequests = (params) => {
  // Maps to BudgetTransferViewSet in backend
  return budgetApi.get('/budget-transfers/', { params });
};

/**
 * Approves a supplemental budget request.
 * @param {number} requestId - ID of the BudgetTransfer
 */
export const approveSupplementalRequest = (requestId) => {
  return budgetApi.post(`/budget-transfers/${requestId}/approve/`);
};

/**
 * Rejects a supplemental budget request.
 * @param {number} requestId - ID of the BudgetTransfer
 */
export const rejectSupplementalRequest = (requestId) => {
  return budgetApi.post(`/budget-transfers/${requestId}/reject/`);
};
// --- MODIFICATION END ---