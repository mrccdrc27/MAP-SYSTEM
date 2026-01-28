import budgetApi from './budgetAPI';

/**
 * Fetches the list of proposal history entries.
 */
export const getProposalHistory = (params) => {
    return budgetApi.get('/budget-proposals/history/', { params });
};

/**
 * Fetches the budget proposal summary cards data.
 */
export const getProposalSummary = () => {
  return budgetApi.get('/budget-proposals/summary/');
};

/**
 * Fetches a paginated and filtered list of budget proposals.
 */
export const getProposals = (params) => {
  return budgetApi.get('/budget-proposals/', { params });
};

/**
 * Fetches the detailed information for a single budget proposal.
 */
export const getProposalDetail = (id) => {
  return budgetApi.get(`/budget-proposals/${id}/`);
};

/**
 * ✅ FIXED: Submits a review (approve/reject) for a budget proposal.
 * @param {number} id - The ID of the budget proposal.
 * @param {FormData} formData - The review data (multipart/form-data for file upload).
 */
export const reviewProposal = (id, formData) => {
  console.log('📤 Sending review request for proposal', id);
  
  return budgetApi.post(`/budget-proposals/${id}/review/`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  }).catch(error => {
    console.error('❌ Review API Error:', {
      status: error.response?.status,
      data: error.response?.data,
      url: error.config?.url
    });
    throw error;
  });
};

/**
 * Exports a single budget proposal to Excel.
 */
export const exportProposal = (id) => {
  return budgetApi.get(`/budget-proposals/${id}/export/`, {
    responseType: 'blob',
  });
};