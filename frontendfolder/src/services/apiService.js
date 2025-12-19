// Service factory that chooses between local and backend APIs
import { USE_LOCAL_API } from '../config/environment.js';

// Local services
import { localAuthService } from './local/authService.js';
import { localTicketService } from './local/ticketService.js';
import { localEmployeeService } from './local/employeeService.js';

// Backend services
import { backendAuthService } from './backend/authService.js';
import { backendTicketService } from './backend/ticketService.js';
import { backendEmployeeService } from './backend/employeeService.js';

// Service factory function
const createServiceFactory = () => {
  if (USE_LOCAL_API) {
    console.log('🏠 Using LOCAL services for frontend-only development');
    return {
      auth: localAuthService,
      tickets: localTicketService,
      employees: localEmployeeService
    };
  } else {
    console.log('🌐 Using BACKEND services');
    return {
      auth: backendAuthService,
      tickets: backendTicketService,
      employees: backendEmployeeService
    };
  }
};

// Export the service instance
export const apiService = createServiceFactory();

// Export individual services for convenience
export const { auth, tickets, employees } = apiService;

// Utility function to check if using local API
export const isUsingLocalAPI = () => USE_LOCAL_API;
