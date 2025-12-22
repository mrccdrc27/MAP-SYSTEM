// Local ticket service that replaces backend API calls
import { 
  STORAGE_KEYS, 
  getFromStorage, 
  setToStorage, 
  generateId 
} from '../../mock-data/localStorage.js';

// Simulate API delay
const delay = (ms = 500) => new Promise(resolve => setTimeout(resolve, ms));

export const localTicketService = {
  // Get all tickets
  getAllTickets: async () => {
    await delay();
    const tickets = getFromStorage(STORAGE_KEYS.TICKETS) || [];
    return {
      success: true,
      data: tickets
    };
  },

  // Get tickets by employee (in local dev mode, return ALL tickets for better testing)
  getEmployeeTickets: async (employeeId) => {
    await delay();
    const tickets = getFromStorage(STORAGE_KEYS.TICKETS) || [];

    // Filter tickets by employeeId
    const employeeTickets = tickets.filter(ticket => ticket.employeeId === employeeId);

    return {
      success: true,
      data: employeeTickets
    };
  },

  // Get ticket by ID
  getTicketById: async (ticketId) => {
    await delay();
    const tickets = getFromStorage(STORAGE_KEYS.TICKETS) || [];
    const ticket = tickets.find(t => t.id === parseInt(ticketId));
    
    if (ticket) {
      return {
        success: true,
        data: ticket
      };
    } else {
      return {
        success: false,
        error: 'Ticket not found'
      };
    }
  },

  // Get ticket by ticket number
  getTicketByTicketNumber: async (ticketNumber) => {
    await delay();
    const tickets = getFromStorage(STORAGE_KEYS.TICKETS) || [];
    const ticket = tickets.find(t => t.ticket_number === ticketNumber);
    
    if (ticket) {
      return {
        success: true,
        data: ticket
      };
    } else {
      return {
        success: false,
        error: `Ticket with number ${ticketNumber} not found`
      };
    }
  },

  // Create new ticket
  createTicket: async (ticketData, currentUser) => {
    await delay();
    const tickets = getFromStorage(STORAGE_KEYS.TICKETS) || [];
    
    // Generate ticket number with exactly 4 random digits: TX + XXXX
    const randomFourDigits = Math.floor(Math.random() * 9000) + 1000; // Random number between 1000-9999
    const ticketNumber = `TX${randomFourDigits}`;
    
    const currentDateTime = new Date().toISOString();
    
    const newTicket = {
      id: generateId(),
      ticket_number: ticketNumber,
      subject: ticketData.subject,
      description: ticketData.description,
      priority_level: ticketData.priority_level,
      priority: ticketData.priority_level, // For compatibility
      category: ticketData.category,
      sub_category: ticketData.sub_category,
      department: null, // Will be assigned by coordinator
      status: 'Pending',
      date_created: currentDateTime,
      date_updated: currentDateTime,
      submit_date: currentDateTime,
      update_date: currentDateTime,
      scheduled_date: ticketData.scheduled_date,
      employee: {
        id: currentUser.id,
        first_name: currentUser.first_name,
        last_name: currentUser.last_name,
        email: currentUser.email
      },
      assigned_to: null,
      attachments: ticketData.attachments || [],
      comments: []
    };
    
    tickets.push(newTicket);
    setToStorage(STORAGE_KEYS.TICKETS, tickets);
    
    return {
      success: true,
      data: newTicket
    };
  },

  // Update ticket status
  updateTicketStatus: async (ticketId, status, comment = null) => {
    await delay();
    const tickets = getFromStorage(STORAGE_KEYS.TICKETS) || [];
    const ticketIndex = tickets.findIndex(t => t.id === parseInt(ticketId));
    
    if (ticketIndex === -1) {
      return {
        success: false,
        error: 'Ticket not found'
      };
    }
    
    tickets[ticketIndex].status = status;
    tickets[ticketIndex].date_updated = new Date().toISOString();
    
    // Add comment if provided
    if (comment) {
      const currentUser = getFromStorage(STORAGE_KEYS.CURRENT_USER);
      const newComment = {
        id: tickets[ticketIndex].comments.length + 1,
        comment: comment,
        date_created: new Date().toISOString(),
        created_by: {
          first_name: currentUser.first_name,
          last_name: currentUser.last_name
        }
      };
      tickets[ticketIndex].comments.push(newComment);
    }
    
    setToStorage(STORAGE_KEYS.TICKETS, tickets);
    
    return {
      success: true,
      data: tickets[ticketIndex]
    };
  },

  // Add comment to ticket
  addComment: async (ticketId, commentText) => {
    await delay();
    const tickets = getFromStorage(STORAGE_KEYS.TICKETS) || [];
    const ticketIndex = tickets.findIndex(t => t.id === parseInt(ticketId));
    
    if (ticketIndex === -1) {
      return {
        success: false,
        error: 'Ticket not found'
      };
    }
    
    const currentUser = getFromStorage(STORAGE_KEYS.CURRENT_USER);
    const newComment = {
      id: tickets[ticketIndex].comments.length + 1,
      comment: commentText,
      date_created: new Date().toISOString(),
      created_by: {
        first_name: currentUser.first_name,
        last_name: currentUser.last_name
      }
    };
    
    tickets[ticketIndex].comments.push(newComment);
    tickets[ticketIndex].date_updated = new Date().toISOString();
    setToStorage(STORAGE_KEYS.TICKETS, tickets);
    
    return {
      success: true,
      data: newComment
    };
  },

  // Get ticket statistics
  getTicketStats: async () => {
    await delay();
    const tickets = getFromStorage(STORAGE_KEYS.TICKETS) || [];
    
    const stats = {
      total: tickets.length,
      open: tickets.filter(t => t.status === 'Open').length,
      in_progress: tickets.filter(t => t.status === 'In Progress').length,
      resolved: tickets.filter(t => t.status === 'Resolved').length,
      closed: tickets.filter(t => t.status === 'Closed').length,
      rejected: tickets.filter(t => t.status === 'Rejected').length
    };
    
    return {
      success: true,
      data: stats
    };
  },

  // Force create ticket (Employee) - creates ticket with custom status immediately
  forceCreateTicket: async (ticketData) => {
    await delay(200);
    const tickets = getFromStorage(STORAGE_KEYS.TICKETS) || [];
    
    const randomFourDigits = Math.floor(Math.random() * 9000) + 1000;
    const ticketNumber = `TCK-${new Date().getFullYear()}-${String(tickets.length + 1).padStart(3, '0')}`;
    const currentDateTime = new Date().toISOString();
    
    const newTicket = {
      id: generateId(),
      ticketNumber: ticketNumber,
      ticket_number: ticketNumber,
      employeeId: ticketData.employeeId || 1,
      employeeName: ticketData.employeeName || 'Employee',
      employeeDepartment: ticketData.employeeDepartment || 'General',
      subject: ticketData.subject || 'New Ticket',
      category: ticketData.category || 'General Request',
      subCategory: ticketData.subCategory || null,
      priority: ticketData.priority || 'Medium',
      priorityLevel: ticketData.priority || 'Medium',
      description: ticketData.description || '',
      status: ticketData.status || 'New',
      assignedDepartment: ticketData.assignedDepartment || null,
      assignedTo: ticketData.assignedTo || null,
      assignedToName: ticketData.assignedToName || null,
      createdAt: currentDateTime,
      updatedAt: currentDateTime,
      dateCreated: currentDateTime,
      date_created: currentDateTime,
      fileAttachments: ticketData.fileAttachments || [],
      scheduleRequest: ticketData.scheduleRequest || null,
      assetName: ticketData.assetName || null,
      serialNumber: ticketData.serialNumber || null,
      location: ticketData.location || null,
      issueType: ticketData.issueType || null,
      otherIssue: ticketData.otherIssue || null,
      comments: []
    };
    
    tickets.push(newTicket);
    setToStorage(STORAGE_KEYS.TICKETS, tickets);
    
    return {
      success: true,
      data: newTicket
    };
  },

  // Update ticket (Ticket Coordinator) - update ticket with coordinator actions
  coordinatorUpdateTicket: async (ticketNumber, updates) => {
    await delay(200);
    const tickets = getFromStorage(STORAGE_KEYS.TICKETS) || [];
    const ticketIndex = tickets.findIndex(t => 
      t.ticketNumber === ticketNumber || t.ticket_number === ticketNumber
    );
    
    if (ticketIndex === -1) {
      return {
        success: false,
        error: 'Ticket not found'
      };
    }
    
    const currentDateTime = new Date().toISOString();
    tickets[ticketIndex] = {
      ...tickets[ticketIndex],
      ...updates,
      updatedAt: currentDateTime,
      date_updated: currentDateTime
    };
    
    setToStorage(STORAGE_KEYS.TICKETS, tickets);
    // Also write to 'tickets' key for UI visibility
    localStorage.setItem('tickets', JSON.stringify(tickets));
    
    return {
      success: true,
      data: tickets[ticketIndex]
    };
  },

  // Reset mock data for testing
  resetMockData: async () => {
    await delay(100);
    try {
      const mod = await import('../../mock-data/tickets.js');
      const mockTickets = mod.mockTickets || [];
      setToStorage(STORAGE_KEYS.TICKETS, mockTickets);
      // Also write to 'tickets' key for UI visibility
      localStorage.setItem('tickets', JSON.stringify(mockTickets));
      
      return {
        success: true,
        data: mockTickets,
        message: `Reset ${mockTickets.length} mock tickets`
      };
    } catch (err) {
      return {
        success: false,
        error: String(err)
      };
    }
  }
};
