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