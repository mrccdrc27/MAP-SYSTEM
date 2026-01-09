// Backend ticket service
import { API_CONFIG } from '../../config/environment.js';
import { backendAuthService } from './authService.js';

const BASE_URL = API_CONFIG.BACKEND.BASE_URL;
const WORKFLOW_URL = API_CONFIG.WORKFLOW.BASE_URL;

// Helper function to get headers for cookie-based auth
const getAuthHeaders = () => {
  return {
    'Content-Type': 'application/json',
  };
};

// Helper to get fetch options with credentials
const getFetchOptions = (method = 'GET', body = null) => {
  const options = {
    method,
    credentials: 'include', // Essential for httpOnly cookie-based auth
  };
  
  if (body) {
    if (body instanceof FormData) {
      // For FormData, don't set Content-Type header (browser will set it with boundary)
      options.body = body;
    } else {
      // For JSON data, set headers and stringify
      options.headers = getAuthHeaders();
      options.body = typeof body === 'string' ? body : JSON.stringify(body);
    }
  } else {
    // For requests without body, set JSON headers
    options.headers = getAuthHeaders();
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
        const response = await fetch(url, getFetchOptions('GET'));

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
      const response = await fetch(`${BASE_URL}/api/tickets/${ticketId}/`, getFetchOptions('GET'));
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
      const response = await fetch(`${BASE_URL}/api/tickets/number/${encodeURIComponent(ticketNumber)}/`, getFetchOptions('GET'));
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
      const options = getFetchOptions('POST', ticketData);
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
      const response = await fetch(`${BASE_URL}/api/tickets/${ticketId}/`, getFetchOptions('PATCH', ticketData));
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
      const response = await fetch(`${BASE_URL}/api/tickets/${ticketId}/approve/`, getFetchOptions('POST', { priority, department, approval_notes }));
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
      const response = await fetch(`${BASE_URL}/api/tickets/${ticketId}/`, getFetchOptions('DELETE'));
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
      const response = await fetch(`${BASE_URL}/api/tickets/?employee=${employeeId}`, getFetchOptions('GET'));
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
      const response = await fetch(`${BASE_URL}/api/tickets/?department=${department}`, getFetchOptions('GET'));
      if (!response.ok) {
        throw new Error('Failed to fetch department tickets');
      }
      return await response.json();
    } catch (error) {
      console.error('Error fetching department tickets:', error);
      throw error;
    }
  },

  /**
   * Get tickets owned by the current coordinator.
   * Uses the ticket_owner_id field for external auth users.
   */
  async getMyTickets() {
    try {
      const response = await fetch(`${BASE_URL}/api/tickets/my-tickets/`, getFetchOptions('GET'));
      handleAuthError(response);
      if (!response.ok) {
        throw new Error('Failed to fetch my tickets');
      }
      return await response.json();
    } catch (error) {
      console.error('Error fetching my tickets:', error);
      return [];
    }
  },

  async updateTicketStatus(ticketId, status, comment = '') {
    try {
      const response = await fetch(`${BASE_URL}/api/tickets/${ticketId}/update-status/`, getFetchOptions('POST', { status, comment }));
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
      const response = await fetch(`${BASE_URL}/api/tickets/${ticketId}/reject/`, getFetchOptions('POST', { rejection_reason }));
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
      const response = await fetch(`${BASE_URL}/api/tickets/${ticketId}/`, getFetchOptions('PATCH', { assigned_to: assigneeId }));
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
      const response = await fetch(`${BASE_URL}/api/tickets/${ticketId}/comments/`, getFetchOptions('POST', { comment: commentText, is_internal: isInternal }));
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

  // Create an auto-response comment (system-generated, marked as from Support Team)
  async createAutoResponse(ticketId, responseText) {
    try {
      const response = await fetch(`${BASE_URL}/api/tickets/${ticketId}/auto-response/`, getFetchOptions('POST', { message: responseText }));
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || err.detail || 'Failed to create auto-response');
      }
      return await response.json();
    } catch (error) {
      console.error('Error creating auto-response:', error);
      throw error;
    }
  },

  // Set typing status for a ticket (HTTP-based typing indicator)
  async setTypingStatus(ticketNumber, isTyping, userId, userName) {
    try {
      const response = await fetch(`${BASE_URL}/api/tickets/${encodeURIComponent(ticketNumber)}/typing/`, getFetchOptions('POST', {
        is_typing: isTyping,
        user_id: userId,
        user_name: userName
      }));
      if (!response.ok) {
        console.warn('Failed to set typing status');
      }
      return await response.json().catch(() => ({}));
    } catch (error) {
      // Silently fail - typing is non-critical
      console.debug('Typing status error:', error);
    }
  },

  // Get typing status for a ticket (who is typing)
  async getTypingStatus(ticketNumber, excludeUserId = '') {
    try {
      const url = `${BASE_URL}/api/tickets/${encodeURIComponent(ticketNumber)}/typing/status/?exclude_user_id=${encodeURIComponent(excludeUserId)}`;
      const response = await fetch(url, getFetchOptions('GET'));
      if (!response.ok) {
        return { is_typing: false };
      }
      return await response.json();
    } catch (error) {
      // Silently fail - typing is non-critical
      return { is_typing: false };
    }
  },

  async createCommentWithAttachment(ticketId, commentText, attachment, isInternal = false) {
    try {
      const formData = new FormData();
      if (commentText) {
        formData.append('comment', commentText);
      }
      if (attachment) {
        formData.append('attachment', attachment);
      }
      formData.append('is_internal', isInternal);
      
      const response = await fetch(`${BASE_URL}/api/tickets/${ticketId}/comments/`, {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || err.detail || 'Failed to create comment with attachment');
      }
      return await response.json();
    } catch (error) {
      console.error('Error creating comment with attachment:', error);
      throw error;
    }
  },

  async withdrawTicket(ticketId, reason) {
    try {
      const response = await fetch(`${BASE_URL}/api/tickets/${ticketId}/withdraw/`, getFetchOptions('POST', { reason }));
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
      const response = await fetch(`${BASE_URL}/api/tickets/${ticketId}/csat/`, getFetchOptions('POST', { rating, feedback }));
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
      const response = await fetch(`${BASE_URL}/api/csat/feedback/`, getFetchOptions('GET'));
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
  },

  /**
   * Get tickets owned by the current user (Ticket Coordinator).
   * Calls the workflow_api at port 8002.
   * @param {Object} options - Query options
   * @param {string} options.tab - 'active' or 'inactive' filter
   * @param {string} options.search - Search term
   * @param {number} options.page - Page number
   * @param {number} options.pageSize - Items per page
   * @returns {Promise<{results: Array, count: number}>}
   */
  async getOwnedTickets({ tab = '', search = '', page = 1, pageSize = 10 } = {}) {
    try {
      // Use the helpdesk backend's my-tickets endpoint which filters by ticket_owner_id
      const url = `${BASE_URL}/api/tickets/my-tickets/`;
      console.log('Fetching owned tickets from:', url);
      
      const response = await fetch(url, getFetchOptions('GET'));
      
      handleAuthError(response);
      
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || err.detail || `Failed to fetch owned tickets: ${response.status}`);
      }
      
      let data = await response.json();
      
      // The my-tickets endpoint returns an array, not paginated
      let results = Array.isArray(data) ? data : (data.results || []);
      
      // Apply client-side filtering if tab is specified
      if (tab === 'active') {
        results = results.filter(t => !['Closed', 'Withdrawn', 'Rejected'].includes(t.status));
      } else if (tab === 'inactive') {
        results = results.filter(t => ['Closed', 'Withdrawn', 'Rejected'].includes(t.status));
      }
      
      // Apply search filter client-side
      if (search) {
        const searchLower = search.toLowerCase();
        results = results.filter(t => 
          (t.ticket_number && t.ticket_number.toLowerCase().includes(searchLower)) ||
          (t.subject && t.subject.toLowerCase().includes(searchLower)) ||
          (t.category && t.category.toLowerCase().includes(searchLower))
        );
      }
      
      // Client-side pagination
      const totalCount = results.length;
      const startIndex = (page - 1) * pageSize;
      const paginatedResults = results.slice(startIndex, startIndex + pageSize);
      
      return {
        results: paginatedResults,
        count: totalCount,
        next: startIndex + pageSize < totalCount ? page + 1 : null,
        previous: page > 1 ? page - 1 : null
      };
    } catch (error) {
      console.error('Error fetching owned tickets:', error);
      throw error;
    }
  },

  /**
   * Get ALL assigned tickets for admin management (Admin only).
   * Calls the workflow_api at port 8002.
   * @param {Object} options - Query options
   * @param {string} options.tab - 'active' or 'inactive' filter
   * @param {string} options.search - Search term
   * @param {string} options.ownerId - Filter by specific owner's user_id
   * @param {number} options.page - Page number
   * @param {number} options.pageSize - Items per page
   * @returns {Promise<{results: Array, count: number}>}
   */
  async getAllAssignedTickets({ tab = '', search = '', ownerId = '', page = 1, pageSize = 10 } = {}) {
    try {
      const params = new URLSearchParams();
      if (tab) params.append('tab', tab);
      if (search) params.append('search', search);
      if (ownerId) params.append('owner_id', ownerId);
      params.append('page', page.toString());
      params.append('page_size', pageSize.toString());
      
      const url = `${WORKFLOW_URL}/tasks/all-assigned-tickets/?${params.toString()}`;
      console.log('Fetching all assigned tickets from:', url);
      
      const response = await fetch(url, getFetchOptions('GET'));
      
      handleAuthError(response);
      
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || err.detail || `Failed to fetch assigned tickets: ${response.status}`);
      }
      
      const data = await response.json();
      
      // API returns paginated response: { count, next, previous, results }
      return {
        results: data.results || [],
        count: data.count || 0,
        next: data.next,
        previous: data.previous
      };
    } catch (error) {
      console.error('Error fetching all assigned tickets:', error);
      throw error;
    }
  },

  /**
   * Get a specific owned ticket by ticket number from workflow_api.
   * This endpoint validates that the user is the actual owner (or admin).
   * @param {string} ticketNumber - The ticket number (e.g., TX20251222801173)
   * @returns {Promise<Object>} Task/ticket data with is_owner and is_admin flags
   */
  async getOwnedTicketByNumber(ticketNumber) {
    try {
      // Use the dedicated owned-tickets endpoint that validates ownership
      const url = `${WORKFLOW_URL}/tasks/owned-tickets/${encodeURIComponent(ticketNumber)}/`;
      console.log('Fetching owned ticket by number from:', url);
      
      const response = await fetch(url, getFetchOptions('GET'));
      
      handleAuthError(response);
      
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || err.detail || `Failed to fetch ticket: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error fetching owned ticket by number:', error);
      throw error;
    }
  },

  /**
   * Get full ticket details from helpdesk backend by ticket number.
   * @param {string} ticketNumber - The ticket number
   * @returns {Promise<Object>} Full helpdesk ticket data
   */
  async getHelpdeskTicketByNumber(ticketNumber) {
    try {
      const response = await fetch(`${BASE_URL}/api/tickets/number/${encodeURIComponent(ticketNumber)}/`, getFetchOptions('GET'));
      
      handleAuthError(response);
      
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || err.detail || `Failed to fetch helpdesk ticket: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error fetching helpdesk ticket by number:', error);
      throw error;
    }
  },

  // ========== TICKET OWNER MANAGEMENT ==========

  /**
   * Escalate ticket ownership to another Ticket Coordinator.
   * Only the current ticket owner (Ticket Coordinator) can escalate.
   * @param {string} ticketNumber - The ticket number to escalate
   * @param {string} reason - Reason for escalation
   * @returns {Promise<Object>} Escalation result with new owner info
   */
  async escalateTicketOwnership(ticketNumber, reason) {
    try {
      const url = `${WORKFLOW_URL}/tasks/ticket-owner/escalate/`;
      console.log('Escalating ticket ownership:', ticketNumber);
      
      const response = await fetch(url, getFetchOptions('POST', { 
        ticket_number: ticketNumber, 
        reason 
      }));
      
      handleAuthError(response);
      
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || err.detail || `Failed to escalate ticket: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error escalating ticket ownership:', error);
      throw error;
    }
  },

  /**
   * Transfer ticket ownership to another Ticket Coordinator (Admin only).
   * @param {string} ticketNumber - The ticket number to transfer
   * @param {number} newOwnerUserId - User ID of the new owner
   * @param {string} reason - Reason for transfer
   * @returns {Promise<Object>} Transfer result with new owner info
   */
  async transferTicketOwnership(ticketNumber, newOwnerUserId, reason = '') {
    try {
      const url = `${WORKFLOW_URL}/tasks/ticket-owner/transfer/`;
      console.log('Transferring ticket ownership:', ticketNumber, 'to user:', newOwnerUserId);
      
      const response = await fetch(url, getFetchOptions('POST', { 
        ticket_number: ticketNumber, 
        new_owner_user_id: newOwnerUserId,
        reason 
      }));
      
      handleAuthError(response);
      
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || err.detail || `Failed to transfer ticket: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error transferring ticket ownership:', error);
      throw error;
    }
  },

  /**
   * Get list of available Ticket Coordinators for transfer/escalation.
   * @param {number} excludeUserId - Optional user ID to exclude from list
   * @returns {Promise<Object>} List of available coordinators
   */
  async getAvailableCoordinators(excludeUserId = null) {
    try {
      let url = `${WORKFLOW_URL}/tasks/ticket-owner/available-coordinators/`;
      if (excludeUserId) {
        url += `?exclude_user_id=${excludeUserId}`;
      }
      console.log('Fetching available coordinators from:', url);
      
      const response = await fetch(url, getFetchOptions('GET'));
      
      handleAuthError(response);
      
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || err.detail || `Failed to fetch coordinators: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error fetching available coordinators:', error);
      throw error;
    }
  }
};