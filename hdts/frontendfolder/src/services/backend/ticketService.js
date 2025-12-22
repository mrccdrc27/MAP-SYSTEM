// Backend ticket service
import { API_CONFIG } from '../../config/environment.js';
import { backendAuthService } from './authService.js';

const BASE_URL = API_CONFIG.BACKEND.BASE_URL;

// Helper function to get headers for cookie-based auth
const getAuthHeaders = () => {
  // Try to get the access token from cookies (set by auth service)
  const cookies = document.cookie.split(';');
  const accessTokenCookie = cookies.find(c => c.trim().startsWith('access_token='));
  const accessToken = accessTokenCookie ? accessTokenCookie.split('=')[1] : null;
  
  const headers = {
    'Content-Type': 'application/json',
  };
  
  // If we have an access token, send it as Authorization header
  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
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

export const backendTicketService = {
  async getAllTickets() {
    try {
      const token = localStorage.getItem('access_token');
      if (!token) {
        // Do not fail here — some authentication flows set the access token as a cookie
        // (AuthContext uses cookie-based auth). Rely on getAuthHeaders() which reads
        // cookies so admin users authenticated via cookies can still fetch tickets.
        console.debug('No access token in localStorage — proceeding and relying on cookie-based auth if present');
      }

      // Fetch first page
      const initialUrl = `${BASE_URL}/api/tickets/?page_size=50`;
      let url = initialUrl;
      let allResults = [];

      while (url) {
        const response = await fetch(url, { method: 'GET', headers: getAuthHeaders() });

        handleAuthError(response);

        if (!response.ok) {
          throw new Error(`Failed to fetch tickets: ${response.status}`);
        }

        const data = await response.json();

        // If API returns paginated shape { results: [...], next: <url> }
        if (Array.isArray(data)) {
          // Not paginated - return the array directly
          return data;
        }

        if (data && Array.isArray(data.results)) {
          allResults = allResults.concat(data.results);
          // next can be absolute or relative; if relative, prefix BASE_URL
          url = data.next || null;
          if (url && url.startsWith('/')) url = `${BASE_URL}${url}`;
        } else {
          // Unknown shape - return as-is (fallback)
          return data;
        }
      }

      return allResults;
    } catch (error) {
      console.error('Error fetching tickets:', error);
      return [];
    }
  },

  async getTicketById(ticketId) {
    try {
      const response = await fetch(`${BASE_URL}/api/tickets/${ticketId}/`, {
        method: 'GET',
        headers: getAuthHeaders(),
        credentials: 'include',
      });
      handleAuthError(response);
      if (!response.ok) {
        throw new Error('Failed to fetch ticket');
      }
      return await response.json();
    } catch (error) {
      console.error('Error fetching ticket:', error);
      throw error;
    }
  },

  async getTicketByNumber(ticketNumber) {
    try {
      const response = await fetch(`${BASE_URL}/api/tickets/number/${encodeURIComponent(ticketNumber)}/`, {
        method: 'GET',
        headers: getAuthHeaders(),
        credentials: 'include',
      });
      if (!response.ok) {
        throw new Error('Failed to fetch ticket by number');
      }
      // return the API payload
      return await response.json();
    } catch (error) {
      console.error('Error fetching ticket by number:', error);
      throw error;
    }
  },

  async createTicket(ticketData) {
    try {
      let options;
      if (ticketData instanceof FormData) {
        options = {
          method: 'POST',
          credentials: 'include',
          body: ticketData
        };
      } else {
        options = {
          method: 'POST',
          headers: getAuthHeaders(),
          credentials: 'include',
          body: JSON.stringify(ticketData),
        };
      }
      let response = await fetch(`${BASE_URL}/api/tickets/`, options);
      if (!response.ok) {
        const respClone = response.clone();
        let errorText = '';
        try {
          const errorData = await respClone.json();
          errorText = errorData.message || JSON.stringify(errorData);
        } catch (e) {
          try {
            errorText = await response.clone().text();
          } catch (e2) {
            errorText = '<unreadable response body>';
          }
        }
        throw new Error(`Failed to create ticket: ${response.status} ${errorText}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Error creating ticket:', error);
      throw error;
    }
  },

  async updateTicket(ticketId, ticketData) {
    try {
      const response = await fetch(`${BASE_URL}/api/tickets/${ticketId}/`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        credentials: 'include',
        body: JSON.stringify(ticketData),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update ticket');
      }
      return await response.json();
    } catch (error) {
      console.error('Error updating ticket:', error);
      throw error;
    }
  },

  async approveTicket(ticketId, { priority = 'Low', department = '', approval_notes = '' } = {}) {
    try {
      const response = await fetch(`${BASE_URL}/api/tickets/${ticketId}/approve/`, {
        method: 'POST',
        headers: getAuthHeaders(),
        credentials: 'include',
        body: JSON.stringify({ priority, department, approval_notes }),
      });
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || err.detail || 'Failed to approve ticket');
      }
      return await response.json();
    } catch (error) {
      console.error('Error approving ticket:', error);
      throw error;
    }
  },

  async deleteTicket(ticketId) {
    try {
      const response = await fetch(`${BASE_URL}/api/tickets/${ticketId}/`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
        credentials: 'include',
      });
      if (!response.ok) {
        throw new Error('Failed to delete ticket');
      }
      return { success: true };
    } catch (error) {
      console.error('Error deleting ticket:', error);
      throw error;
    }
  },

  async getTicketsByEmployee(employeeId) {
    // employeeId should be passed from AuthContext
    try {
      const response = await fetch(`${BASE_URL}/api/tickets/?employee=${employeeId}`, {
        method: 'GET',
        headers: getAuthHeaders(),
        credentials: 'include',
      });
      if (!response.ok) {
        throw new Error('Failed to fetch employee tickets');
      }
      return await response.json();
    } catch (error) {
      console.error('Error fetching employee tickets:', error);
      throw error;
    }
  },

  async getTicketsByDepartment(department) {
    try {
      const response = await fetch(`${BASE_URL}/api/tickets/?department=${department}`, {
        method: 'GET',
        headers: getAuthHeaders(),
        credentials: 'include',
      });
      if (!response.ok) {
        throw new Error('Failed to fetch department tickets');
      }
      return await response.json();
    } catch (error) {
      console.error('Error fetching department tickets:', error);
      throw error;
    }
  },

  async updateTicketStatus(ticketId, status, comment = '') {
    try {
      const response = await fetch(`${BASE_URL}/api/tickets/${ticketId}/update-status/`, {
        method: 'POST',
        headers: getAuthHeaders(),
        credentials: 'include',
        body: JSON.stringify({ status, comment }),
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || errorData.detail || 'Failed to update ticket status');
      }
      return await response.json();
    } catch (error) {
      console.error('Error updating ticket status:', error);
      throw error;
    }
  },

  async rejectTicket(ticketId, rejection_reason = '') {
    try {
      const response = await fetch(`${BASE_URL}/api/tickets/${ticketId}/reject/`, {
        method: 'POST',
        headers: getAuthHeaders(),
        credentials: 'include',
        body: JSON.stringify({ rejection_reason }),
      });
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || err.detail || 'Failed to reject ticket');
      }
      return await response.json();
    } catch (error) {
      console.error('Error rejecting ticket:', error);
      throw error;
    }
  },

  async assignTicket(ticketId, assigneeId) {
    try {
      const response = await fetch(`${BASE_URL}/api/tickets/${ticketId}/`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        credentials: 'include',
        body: JSON.stringify({ assigned_to: assigneeId }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to assign ticket');
      }
      return await response.json();
    } catch (error) {
      console.error('Error assigning ticket:', error);
      throw error;
    }
  },

  async createComment(ticketId, commentText, isInternal = false) {
    try {
      const response = await fetch(`${BASE_URL}/api/tickets/${ticketId}/comments/`, {
        method: 'POST',
        headers: getAuthHeaders(),
        credentials: 'include',
        body: JSON.stringify({ comment: commentText, is_internal: isInternal })
      });
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || err.detail || 'Failed to create comment');
      }
      return await response.json();
    } catch (error) {
      console.error('Error creating comment:', error);
      throw error;
    }
  },

  async withdrawTicket(ticketId, reason) {
    try {
      const response = await fetch(`${BASE_URL}/api/tickets/${ticketId}/withdraw/`, {
        method: 'POST',
        headers: getAuthHeaders(),
        credentials: 'include',
        body: JSON.stringify({ reason })
      });
      handleAuthError(response);
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || err.detail || 'Failed to withdraw ticket');
      }
      return await response.json();
    } catch (error) {
      console.error('Error withdrawing ticket:', error);
      throw error;
    }
  },

  async submitCSATRating(ticketId, rating, feedback = '') {
    try {
      const response = await fetch(`${BASE_URL}/api/tickets/${ticketId}/csat/`, {
        method: 'POST',
        headers: getAuthHeaders(),
        credentials: 'include',
        body: JSON.stringify({ rating, feedback }),
      });
      handleAuthError(response);
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || err.detail || 'Failed to submit CSAT rating');
      }
      return await response.json();
    } catch (error) {
      console.error('Error submitting CSAT rating:', error);
      throw error;
    }
  },

  async getCSATFeedback() {
    try {
      const response = await fetch(`${BASE_URL}/api/csat/feedback/`, {
        method: 'GET',
        headers: getAuthHeaders(),
        credentials: 'include',
      });
      handleAuthError(response);
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || err.detail || 'Failed to fetch CSAT feedback');
      }
      return await response.json();
    } catch (error) {
      console.error('Error fetching CSAT feedback:', error);
      throw error;
    }
  }
};