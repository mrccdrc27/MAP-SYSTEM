import budgetApi from './budgetAPI';

/**
 * Fetches a paginated and filtered list of ledger entries.
 * @param {object} params - Query parameters.
 * @param {number} params.page - The page number
 * @param {number} params.page_size - The number of items per page
 * @param {string} [params.search] - search term.
 * @param {string} [params.category] - filter by journal entry category (e.g., 'EXPENSES').
 */
export const getLedgerEntries = (params) => {
  return budgetApi.get('/ledger/', { params });
};

/**
 * Fetches full details for a specific Journal Entry by its Ticket ID (e.g., JE-2026-001)
 * @param {string} entryId - The reference ID
 */
export const getJournalEntryDetails = (entryId) => {
  return budgetApi.get(`/ledger/details/${entryId}/`);
};