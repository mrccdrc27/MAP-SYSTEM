// Local storage utilities for frontend-only development

// Keys for localStorage
export const STORAGE_KEYS = {
  EMPLOYEES: 'hdts_employees',
  ADMINS: 'hdts_admins',
  TICKETS: 'hdts_tickets',
  REJECTED_EMPLOYEES: 'hdts_rejected_employees',
  CURRENT_USER: 'hdts_current_user',
  AUTH_TOKEN: 'hdts_auth_token'
};

// Initialize localStorage with mock data if empty
export const initializeLocalStorage = () => {
  // Import mock data
  import('./employees.js').then(({ mockEmployees, mockAdmins, mockRejectedEmployees }) => {
    if (!localStorage.getItem(STORAGE_KEYS.EMPLOYEES)) {
      localStorage.setItem(STORAGE_KEYS.EMPLOYEES, JSON.stringify(mockEmployees));
    }
    if (!localStorage.getItem(STORAGE_KEYS.ADMINS)) {
      localStorage.setItem(STORAGE_KEYS.ADMINS, JSON.stringify(mockAdmins));
    }
    if (!localStorage.getItem(STORAGE_KEYS.REJECTED_EMPLOYEES)) {
      localStorage.setItem(STORAGE_KEYS.REJECTED_EMPLOYEES, JSON.stringify(mockRejectedEmployees));
    }
  });

  import('./tickets.js').then(({ mockTickets }) => {
    if (!localStorage.getItem(STORAGE_KEYS.TICKETS)) {
      localStorage.setItem(STORAGE_KEYS.TICKETS, JSON.stringify(mockTickets));
    }
  });
};

// Generic storage functions
export const getFromStorage = (key) => {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : null;
  } catch (error) {
    console.error(`Error getting ${key} from localStorage:`, error);
    return null;
  }
};

export const setToStorage = (key, data) => {
  try {
    localStorage.setItem(key, JSON.stringify(data));
    return true;
  } catch (error) {
    console.error(`Error setting ${key} to localStorage:`, error);
    return false;
  }
};

export const removeFromStorage = (key) => {
  try {
    localStorage.removeItem(key);
    return true;
  } catch (error) {
    console.error(`Error removing ${key} from localStorage:`, error);
    return false;
  }
};

// Generate unique IDs
export const generateId = () => {
  return Math.max(0, ...getAllItems().map(item => item.id || 0)) + 1;
};

// Get all items from storage
const getAllItems = () => {
  const employees = getFromStorage(STORAGE_KEYS.EMPLOYEES) || [];
  const admins = getFromStorage(STORAGE_KEYS.ADMINS) || [];
  const tickets = getFromStorage(STORAGE_KEYS.TICKETS) || [];
  return [...employees, ...admins, ...tickets];
};
