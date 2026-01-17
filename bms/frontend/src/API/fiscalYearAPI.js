import budgetApi from './budgetAPI';

/**
 * Get all fiscal years for the management list.
 */
export const getFiscalYears = () => {
    return budgetApi.get('/fiscal-years/');
};

/**
 * Create a new fiscal year.
 * @param {object} data - { name, start_date, end_date }
 */
export const createFiscalYear = (data) => {
    return budgetApi.post('/fiscal-years/', data);
};

/**
 * Update fiscal year status (Lock/Open/Close).
 * @param {number} id 
 * @param {string} status - 'Open', 'Locked', 'Closed'
 */
export const updateFiscalYearStatus = (id, status) => {
    return budgetApi.post(`/fiscal-years/${id}/set_status/`, { status });
};

/**
 * Preview data for year-end closing.
 * @param {number} closingYearId 
 */
export const getClosingPreview = (closingYearId) => {
    return budgetApi.get('/finance/closing-preview/', {
        params: { closing_year_id: closingYearId }
    });
};

/**
 * Process the carryover and close the year.
 * @param {object} data - { closing_year_id, opening_year_id, allocation_ids: [] }
 */
export const processYearEnd = (data) => {
    return budgetApi.post('/finance/process-carryover/', data);
};