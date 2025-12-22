// Local employee service that replaces backend API calls
import { 
  STORAGE_KEYS, 
  getFromStorage, 
  setToStorage 
} from '../../mock-data/localStorage.js';

// Simulate API delay
const delay = (ms = 500) => new Promise(resolve => setTimeout(resolve, ms));

export const localEmployeeService = {
  // Get all employees
  getAllEmployees: async () => {
    await delay();
    const employees = getFromStorage(STORAGE_KEYS.EMPLOYEES) || [];
    return {
      success: true,
      data: employees
    };
  },

  // Get employees by status
  getEmployeesByStatus: async (status) => {
    await delay();
    const employees = getFromStorage(STORAGE_KEYS.EMPLOYEES) || [];
    const filteredEmployees = employees.filter(emp => emp.status === status);
    return {
      success: true,
      data: filteredEmployees
    };
  },

  // Approve employee
  approveEmployee: async (employeeId) => {
    await delay();
    const employees = getFromStorage(STORAGE_KEYS.EMPLOYEES) || [];
    const employeeIndex = employees.findIndex(emp => emp.id === parseInt(employeeId));
    
    if (employeeIndex === -1) {
      return {
        success: false,
        error: 'Employee not found'
      };
    }
    
    employees[employeeIndex].status = 'approved';
    setToStorage(STORAGE_KEYS.EMPLOYEES, employees);
    
    return {
      success: true,
      data: employees[employeeIndex]
    };
  },

  // Reject employee
  rejectEmployee: async (employeeId, reason) => {
    await delay();
    const employees = getFromStorage(STORAGE_KEYS.EMPLOYEES) || [];
    const employeeIndex = employees.findIndex(emp => emp.id === parseInt(employeeId));
    
    if (employeeIndex === -1) {
      return {
        success: false,
        error: 'Employee not found'
      };
    }
    
    const employee = employees[employeeIndex];
    
    // Move to rejected employees audit
    const rejectedEmployees = getFromStorage(STORAGE_KEYS.REJECTED_EMPLOYEES) || [];
    const rejectedEmployee = {
      id: rejectedEmployees.length + 1,
      original_email: employee.email,
      original_company_id: employee.company_id,
      first_name: employee.first_name,
      last_name: employee.last_name,
      department: employee.department,
      role: employee.role,
      reason: reason,
      rejected_date: new Date().toISOString()
    };
    
    rejectedEmployees.push(rejectedEmployee);
    setToStorage(STORAGE_KEYS.REJECTED_EMPLOYEES, rejectedEmployees);
    
    // Update employee status
    employees[employeeIndex].status = 'rejected';
    setToStorage(STORAGE_KEYS.EMPLOYEES, employees);
    
    return {
      success: true,
      data: rejectedEmployee
    };
  },

  // Get rejected employees audit
  getRejectedEmployees: async () => {
    await delay();
    const rejectedEmployees = getFromStorage(STORAGE_KEYS.REJECTED_EMPLOYEES) || [];
    return {
      success: true,
      data: rejectedEmployees
    };
  },

  // Update employee profile
  updateEmployeeProfile: async (employeeId, updateData) => {
    await delay();
    const employees = getFromStorage(STORAGE_KEYS.EMPLOYEES) || [];
    const employeeIndex = employees.findIndex(emp => emp.id === parseInt(employeeId));
    
    if (employeeIndex === -1) {
      return {
        success: false,
        error: 'Employee not found'
      };
    }
    
    // Update employee data
    employees[employeeIndex] = { ...employees[employeeIndex], ...updateData };
    setToStorage(STORAGE_KEYS.EMPLOYEES, employees);
    
    // Update current user if it's the same employee
    const currentUser = getFromStorage(STORAGE_KEYS.CURRENT_USER);
    if (currentUser && currentUser.id === parseInt(employeeId)) {
      setToStorage(STORAGE_KEYS.CURRENT_USER, employees[employeeIndex]);
    }
    
    return {
      success: true,
      data: employees[employeeIndex]
    };
  },

  // Get employee stats
  getEmployeeStats: async () => {
    await delay();
    const employees = getFromStorage(STORAGE_KEYS.EMPLOYEES) || [];
    const rejectedEmployees = getFromStorage(STORAGE_KEYS.REJECTED_EMPLOYEES) || [];
    
    const stats = {
      total: employees.length + rejectedEmployees.length,
      approved: employees.filter(emp => emp.status === 'approved').length,
      pending: employees.filter(emp => emp.status === 'pending').length,
      rejected: rejectedEmployees.length
    };
    
    return {
      success: true,
      data: stats
    };
  }
};
