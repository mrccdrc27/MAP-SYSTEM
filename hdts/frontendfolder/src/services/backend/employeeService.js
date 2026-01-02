// Backend employee service
import { API_CONFIG } from '../../config/environment.js';
import { backendAuthService } from './authService.js';

const BASE_URL = API_CONFIG.BACKEND.BASE_URL;

// Helper function to get fetch options with proper cookie-based authentication
const getFetchOptions = (method = 'GET', body = null) => {
  const options = {
    method,
    credentials: 'include', // Essential for httpOnly cookie-based auth
    headers: { 'Content-Type': 'application/json' },
  };
  
  if (body) {
    options.body = typeof body === 'string' ? body : JSON.stringify(body);
  }
  
  return options;
};

// Helper to handle 401 errors by logging out immediately
const handleAuthError = (response) => {
  if (response.status === 401) {
    console.log('Session expired. Logging out...');
    window.location.href = '/';
    throw new Error('Session expired. Please log in again.');
  }
};

export const backendEmployeeService = {
  async getAllEmployees() {
    try {
      const response = await fetch(`${BASE_URL}/api/employees/`, getFetchOptions());
      handleAuthError(response);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Failed to fetch employees:', errorData);
        throw new Error(errorData.detail || 'Failed to fetch employees');
      }
      return await response.json();
    } catch (error) {
      console.error('Error fetching employees:', error);
      throw error;
    }
  },

  async getEmployeeById(employeeId) {
    try {
      const response = await fetch(`${BASE_URL}/api/employees/${employeeId}/`, getFetchOptions());
      handleAuthError(response);
      if (!response.ok) {
        throw new Error('Failed to fetch employee');
      }
      return await response.json();
    } catch (error) {
      console.error('Error fetching employee:', error);
      throw error;
    }
  },

  async getCurrentEmployee() {
    try {
      const response = await fetch(`${BASE_URL}/api/employee/profile/`, getFetchOptions());
      handleAuthError(response);
      if (!response.ok) {
        throw new Error('Failed to fetch current employee');
      }
      return await response.json();
    } catch (error) {
      console.error('Error fetching current employee:', error);
      throw error;
    }
  },

  async verifyCurrentPassword(currentPassword) {
    try {
      const response = await fetch(`${BASE_URL}/api/employee/verify-password/`, 
        getFetchOptions('POST', { current_password: currentPassword }));
      handleAuthError(response);
      if (!response.ok) {
        const err = await response.text();
        throw new Error(err || 'Verification failed');
      }
      return await response.json();
    } catch (error) {
      console.error('Error verifying current password:', error);
      throw error;
    }
  },

  async updateEmployee(employeeId, employeeData) {
    try {
      let response = await fetch(`${BASE_URL}/api/employees/${employeeId}/`, 
        getFetchOptions('PATCH', employeeData));

      // If the route doesn't exist (404) some deployments don't expose /api/employees/:id/
      // so fall back to updating the current authenticated user at /api/employee/profile/
      if (response.status === 404) {
        response = await fetch(`${BASE_URL}/api/employee/profile/`, 
          getFetchOptions('PATCH', employeeData));
      }

      handleAuthError(response);
      if (!response.ok) {
        try {
          const errorData = await response.clone().json();
          throw new Error(errorData.message || errorData.detail || 'Failed to update employee');
        } catch (_) {
          const text = await response.clone().text();
          throw new Error(text || response.statusText || 'Failed to update employee');
        }
      }

      // Successful response
      try {
        return await response.json();
      } catch (parseErr) {
        // If server returned no JSON body but succeeded, return an empty object
        return {};
      }
    } catch (error) {
      console.error('Error updating employee:', error);
      throw error;
    }
  },

  async createEmployee(employeeData) {
    try {
      const response = await fetch(`${BASE_URL}/api/employees/`, 
        getFetchOptions('POST', employeeData));
      handleAuthError(response);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create employee');
      }
      return await response.json();
    } catch (error) {
      console.error('Error creating employee:', error);
      throw error;
    }
  },

  async deleteEmployee(employeeId) {
    try {
      const response = await fetch(`${BASE_URL}/api/employees/${employeeId}/`, 
        getFetchOptions('DELETE'));
      handleAuthError(response);
      if (!response.ok) {
        throw new Error('Failed to delete employee');
      }
      return { success: true };
    } catch (error) {
      console.error('Error deleting employee:', error);
      throw error;
    }
  },

  async getActivityLogs(userId) {
    try {
      const response = await fetch(`${BASE_URL}/api/activity-logs/user/${userId}/`, 
        getFetchOptions());
      if (response.status === 401) {
        // session expired
        window.location.href = '/';
        throw new Error('Session expired');
      }
      if (!response.ok) {
        // return empty array on not-found or errors
        try {
          const err = await response.json();
          console.error('Failed to fetch activity logs:', err);
        } catch (_) {}
        return [];
      }
      return await response.json();
    } catch (error) {
      console.error('Error fetching activity logs:', error);
      return [];
    }
  },

  async getEmployeesByDepartment(department) {
    try {
      const response = await fetch(`${BASE_URL}/api/employees/?department=${department}`, 
        getFetchOptions());
      handleAuthError(response);
      if (!response.ok) {
        throw new Error('Failed to fetch employees by department');
      }
      return await response.json();
    } catch (error) {
      console.error('Error fetching employees by department:', error);
      throw error;
    }
  },

  async updateEmployeeStatus(employeeId, status) {
    try {
      const response = await fetch(`${BASE_URL}/api/employees/${employeeId}/`, 
        getFetchOptions('PATCH', { status }));
      handleAuthError(response);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update employee status');
      }
      return await response.json();
    } catch (error) {
      console.error('Error updating employee status:', error);
      throw error;
    }
  },

  async uploadEmployeeImage(employeeId, imageFile) {
    try {
      const formData = new FormData();
      formData.append('image', imageFile);

      const endpoint = `${BASE_URL}/api/employee/upload-image/`;
      
      console.log('🚀 [FRONTEND] uploadEmployeeImage START');
      console.log('🚀 [FRONTEND] Endpoint:', endpoint);
      console.log('🚀 [FRONTEND] Image file:', imageFile.name, imageFile.type, imageFile.size);
      console.log('🚀 [FRONTEND] BASE_URL:', BASE_URL);
      
      // Backend endpoint expects authenticated user and does not require an employeeId in the path
      const response = await fetch(endpoint, {
        method: 'POST',
        credentials: 'include', // Essential for httpOnly cookie-based auth
        body: formData, // Don't set Content-Type for FormData - let browser set it with boundary
      });
      
      console.log('🚀 [FRONTEND] Response received');
      console.log('🚀 [FRONTEND] Response status:', response.status);
      console.log('🚀 [FRONTEND] Response headers:', {
        'content-type': response.headers.get('content-type'),
        'content-length': response.headers.get('content-length')
      });
      
      handleAuthError(response);
      if (!response.ok) {
        // Read the response once and handle both JSON and text
        const contentType = response.headers.get('content-type');
        let errorMessage = 'Failed to upload image';
        
        try {
          if (contentType && contentType.includes('application/json')) {
            const err = await response.json();
            errorMessage = err.message || err.detail || err.error || errorMessage;
          } else {
            const txt = await response.text();
            errorMessage = txt || errorMessage;
          }
        } catch (_) {
          // If reading fails, use default message
        }
        
        console.error('❌ [FRONTEND] Upload failed:', errorMessage);
        throw new Error(errorMessage);
      }

      try {
        const result = await response.json();
        console.log('✅ [FRONTEND] Upload successful:', result);
        return result;
      } catch (_) {
        return { success: true };
      }
    } catch (error) {
      console.error('❌ [FRONTEND] Error uploading employee image:', error);
      throw error;
    }
  },

  async changePassword(currentPassword, newPassword) {
    try {
      const response = await fetch(`${BASE_URL}/api/employee/change-password/`, 
        getFetchOptions('POST', {
          current_password: currentPassword,
          new_password: newPassword,
        }));
      handleAuthError(response);
      if (!response.ok) {
        // Try JSON first, fall back to text for better error visibility
        try {
          const errorData = await response.json();
          const msg = errorData.message || errorData.detail || JSON.stringify(errorData);
          throw new Error(msg || 'Failed to change password');
        } catch (e) {
          const text = await response.text().catch(() => 'Failed to change password');
          throw new Error(text || 'Failed to change password');
        }
      }
      return await response.json();
    } catch (error) {
      console.error('Error changing password:', error);
      throw error;
    }
  }
};