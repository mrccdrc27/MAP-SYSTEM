import budgetApi from './budgetAPI';

/**
 * Fetches the list of proposal history entries.
 * @param {object} params - Query parameters for pagination and filtering.
...
 */
export const getProposalHistory = (params) => {
    return budgetApi.get('/budget-proposals/history/', { params });
};

// MODIFICATION START
/**
 * Fetches the budget proposal summary cards data.
 */
export const getProposalSummary = () => {
  return budgetApi.get('/budget-proposals/summary/');
};

/**
 * Fetches a paginated and filtered list of budget proposals.
 * @param {object} params - Query parameters.
 * @param {number} params.page - The page number.
 * @param {number} params.page_size - The number of items per page.
 * @param {string} [params.search] - Search term for title or external ID.
 * @param {string} [params.status] - Filter by proposal status (e.g., 'SUBMITTED').
 * @param {number} [params.items__account__account_type__id] - Filter by account type ID.
 */
export const getProposals = (params) => {
  return budgetApi.get('/budget-proposals/', { params });
};

/**
 * Fetches the detailed information for a single budget proposal.
 * @param {number} id - The ID of the budget proposal.
 */
export const getProposalDetail = (id) => {
  return budgetApi.get(`/budget-proposals/${id}/`);
};

/**
 * Submits a review (approve/reject) for a budget proposal.
 * @param {number} id - The ID of the budget proposal.
 * @param {object} data - The review data.
 * @param {string} data.status - The new status ('APPROVED' or 'REJECTED').
 * @param {string} [data.comment] - An optional comment for the review.
 */
export const reviewProposal = (id, data) => {
  return budgetApi.post(`/budget-proposals/${id}/review/`, data);
};
// MODIFICATION END

// MODIFICATION START
/**
 * Exports a single budget proposal to Excel.
 * @param {number} id - The ID of the proposal.
 */
export const exportProposal = (id) => {
  return budgetApi.get(`/budget-proposals/${id}/export/`, {
    responseType: 'blob', // Important: response is a file (blob)
  });
};
// MODIFICATION END