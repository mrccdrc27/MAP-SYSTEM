// File: frontendside/src/API/departments.js

// --- FIX ---
// Change the import from './axios' to './budgetAPI'
import budgetApi from './budgetAPI';

// The endpoint for departments is part of the budget service
export const getAllDepartments = () => budgetApi.get('/dropdowns/departments/'); // Assuming a URL like this exists