// Backend employee service
import { API_CONFIG } from '../../config/environment.js';
import { backendAuthService } from './authService.js';

const BASE_URL = API_CONFIG.BACKEND.BASE_URL;

// Helper function to get headers for cookie-based auth.
// Development convenience: if a token is available in localStorage or
// readable cookies, attach it as an Authorization header. This helps
// when cookies are not sent or the backend expects a Bearer token.
// NOTE: This is a dev-time convenience; do not rely on it for production
// unless you're intentionally using localStorage-based tokens.
const getAuthHeaders = () => {
  const headers = { 'Content-Type': 'application/json' };
  let token = null;
  try {
    token = localStorage.getItem('access_token') || null;
  } catch (e) {
    // localStorage may be unavailable in some environments
    token = null;
  }

  // If no token in localStorage, try to read a non-httpOnly cookie named access_token
  if (!token && typeof document !== 'undefined' && document.cookie) {
    try {
      const match = document.cookie.match(/(?:^|; )access_token=([^;]+)/);
      if (match && match[1]) token = decodeURIComponent(match[1]);
    } catch (e) {
      // ignore cookie parsing errors
    }
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
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
      const response = await fetch(`${BASE_URL}/api/employees/`, {
        method: 'GET',
        headers: getAuthHeaders(),
        credentials: 'include', // Send cookies
      });
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
      const response = await fetch(`${BASE_URL}/api/employees/${employeeId}/`, {
        method: 'GET',
        headers: getAuthHeaders(),
        credentials: 'include',
      });
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
      const response = await fetch(`${BASE_URL}/api/employee/profile/`, {
        method: 'GET',
        headers: getAuthHeaders(),
        credentials: 'include',
      });
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
      const response = await fetch(`${BASE_URL}/api/employee/verify-password/`, {
        method: 'POST',
        headers: getAuthHeaders(),
        credentials: 'include',
        body: JSON.stringify({ current_password: currentPassword }),
      });
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
      let response = await fetch(`${BASE_URL}/api/employees/${employeeId}/`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        credentials: 'include',
        body: JSON.stringify(employeeData),
      });

      // If the route doesn't exist (404) some deployments don't expose /api/employees/:id/
      // so fall back to updating the current authenticated user at /api/employee/profile/
      if (response.status === 404) {
        response = await fetch(`${BASE_URL}/api/employee/profile/`, {
          method: 'PATCH',
          headers: getAuthHeaders(),
          credentials: 'include',
          body: JSON.stringify(employeeData),
        });
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
      const response = await fetch(`${BASE_URL}/api/employees/`, {
        method: 'POST',
        headers: getAuthHeaders(),
        credentials: 'include',
        body: JSON.stringify(employeeData),
      });
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
      const response = await fetch(`${BASE_URL}/api/employees/${employeeId}/`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
        credentials: 'include',
      });
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
      const response = await fetch(`${BASE_URL}/api/activity-logs/user/${userId}/`, {
        method: 'GET',
        headers: getAuthHeaders(),
        credentials: 'include',
      });
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
      const response = await fetch(`${BASE_URL}/api/employees/?department=${department}`, {
        method: 'GET',
        headers: getAuthHeaders(),
        credentials: 'include',
      });
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
      const response = await fetch(`${BASE_URL}/api/employees/${employeeId}/`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        credentials: 'include',
        body: JSON.stringify({ status }),
      });
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

      console.log('Uploading image for employee:', employeeId);
      console.log('Image file:', imageFile.name, imageFile.type, imageFile.size);
      
      // Backend endpoint expects authenticated user and does not require an employeeId in the path
      const response = await fetch(`${BASE_URL}/api/employee/upload-image/`, {
        method: 'POST',
        credentials: 'include',
        body: formData,
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
        
        console.error('Upload failed:', errorMessage);
        throw new Error(errorMessage);
      }

      try {
        const result = await response.json();
        console.log('Upload successful:', result);
        return result;
      } catch (_) {
        return { success: true };
      }
    } catch (error) {
      console.error('Error uploading employee image:', error);
      throw error;
    }
  },

  async changePassword(currentPassword, newPassword) {
    try {
      const response = await fetch(`${BASE_URL}/api/employee/change-password/`, {
        method: 'POST',
        headers: getAuthHeaders(),
        credentials: 'include',
        body: JSON.stringify({
          current_password: currentPassword,
          new_password: newPassword,
        }),
      });
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