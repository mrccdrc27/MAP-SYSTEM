// employeeTicketStorage.js

export const EMPLOYEE_TICKET_STORAGE_KEY = 'employeeTickets';

// Status options visible to Employees
// Note: "New" and "Open" (admin side) are shown as "Pending" to employees
export const employeeTicketStatuses = [
  'Pending',
  'In Progress',
  'On Hold',
  'Withdrawn',
  'Resolved',
  'Closed',
  'Rejected',
];

// Mock data - All created by the same employee user
const sampleEmployeeTickets = [
  {
    ticketNumber: 'TCK-001',
    subject: 'VPN setup request',
    status: 'New', // Changed from 'Submitted' to 'New' (admin view)
    priorityLevel: '',
    department: 'IT Department',
    category: 'IT Category',
    subCategory: 'Technical Support & Troubleshooting',
    dateCreated: '2025-06-08T08:00:00Z',
    lastUpdated: null,
    fileUploaded: null,
    description: 'Need help setting up VPN on my laptop.',
    scheduledRequest: null,
    assignedTo: { id: null, name: null },
    handledBy: { id: 'U003', role: 'Ticket Coordinator', name: 'Kristine Villanueva' },
    createdBy: { userId: 'U001', role: 'Employee', name: 'Bonjing San Jose' }
  },
  {
    ticketNumber: 'TCK-002',
    subject: 'Outlook configuration issue',
    status: 'New', // Changed from 'Pending' to 'New' (admin view)
    priorityLevel: 'Medium',
    department: 'IT Department',
    category: 'IT Category',
    subCategory: 'Software & Applications Deployment',
    dateCreated: '2025-06-09T10:30:00Z',
    lastUpdated: '2025-06-10T09:15:00Z',
    fileUploaded: null,
    description: 'Cannot configure Outlook profile for internal email.',
    scheduledRequest: null,
    assignedTo: { id: 'A001', name: 'Joseph Dela Cruz' },
    handledBy: { id: 'U003', role: 'Ticket Coordinator', name: 'Kristine Villanueva' },
    createdBy: { userId: 'U001', role: 'Employee', name: 'Bonjing San Jose' }
  },
  {
    ticketNumber: 'TCK-003',
    subject: 'Access to system maintenance logs',
    status: 'Open', // Stays 'Open'
    priorityLevel: 'Low',
    department: 'IT Department',
    category: 'IT Category',
    subCategory: 'System Maintenance',
    dateCreated: '2025-06-10T13:45:00Z',
    lastUpdated: null,
    fileUploaded: null,
    description: 'Need access to system logs for review.',
    scheduledRequest: null,
    assignedTo: { id: 'A001', name: 'Joseph Dela Cruz' },
    handledBy: { id: 'U003', role: 'Ticket Coordinator', name: 'Kristine Villanueva' },
    createdBy: { userId: 'U001', role: 'Employee', name: 'Bonjing San Jose' }
  },
  {
    ticketNumber: 'TCK-004',
    subject: 'Internet disconnection in office',
    status: 'In Progress', // Stays 'In Progress'
    priorityLevel: 'High',
    department: 'IT Department',
    category: 'IT Category',
    subCategory: 'Network & Security Administration',
    dateCreated: '2025-06-11T07:30:00Z',
    lastUpdated: '2025-06-11T10:00:00Z',
    fileUploaded: null,
    description: 'Random internet disconnections happening in workstation area.',
    scheduledRequest: null,
    assignedTo: { id: 'A001', name: 'Joseph Dela Cruz' },
    handledBy: { id: 'U003', role: 'Ticket Coordinator', name: 'Kristine Villanueva' },
    createdBy: { userId: 'U001', role: 'Employee', name: 'Bonjing San Jose' }
  },
  {
    ticketNumber: 'TCK-005',
    subject: 'Antivirus license expired',
    status: 'Resolved',
    priorityLevel: 'Critical',
    department: 'IT Department',
    category: 'IT Category',
    subCategory: 'Software & Applications Deployment',
    dateCreated: '2025-06-11T14:00:00Z',
    lastUpdated: '2025-06-12T08:00:00Z',
    fileUploaded: null,
    description: 'Our ESET antivirus licenses expired and need renewal ASAP.',
    scheduledRequest: null,
    assignedTo: { id: 'A001', name: 'Joseph Dela Cruz' },
    handledBy: { id: 'U003', role: 'Ticket Coordinator', name: 'Kristine Villanueva' },
    createdBy: { userId: 'U001', role: 'Employee', name: 'Bonjing San Jose' }
  },
  {
    ticketNumber: 'TCK-006',
    subject: 'Laptop for return - hardware issue',
    status: 'Closed',
    priorityLevel: 'Medium',
    department: 'Asset Department',
    category: 'Asset Category',
    subCategory: 'Asset Check-in',
    dateCreated: '2025-06-10T09:00:00Z',
    lastUpdated: '2025-06-12T09:45:00Z',
    fileUploaded: null,
    description: 'Returning laptop for hardware diagnostics.',
    scheduledRequest: null,
    assignedTo: { id: 'A002', name: 'Ariel Santiago' },
    handledBy: { id: 'U003', role: 'Ticket Coordinator', name: 'Kristine Villanueva' },
    createdBy: { userId: 'U001', role: 'Employee', name: 'Bonjing San Jose' }
  },
  {
    ticketNumber: 'TCK-007',
    subject: 'Request to reallocate software budget',
    status: 'Rejected',
    priorityLevel: 'High',
    department: 'Budget Department',
    category: 'Budget Category',
    subCategory: 'Software Subscriptions',
    dateCreated: '2025-06-07T16:30:00Z',
    lastUpdated: '2025-06-08T08:00:00Z',
    fileUploaded: null,
    description: 'Need to adjust budget allocations for licenses.',
    scheduledRequest: null,
    assignedTo: { id: 'A003', name: 'Karlo Ramirez' },
    handledBy: { id: 'U003', role: 'Ticket Coordinator', name: 'Kristine Villanueva' },
    createdBy: { userId: 'U001', role: 'Employee', name: 'Bonjing San Jose' }
  },
  {
    ticketNumber: 'TCK-008',
    subject: 'Cancelled asset repair request',
    status: 'Withdrawn',
    priorityLevel: 'Low',
    department: 'Asset Department',
    category: 'Asset Category',
    subCategory: 'Asset Repair',
    dateCreated: '2025-06-09T11:00:00Z',
    lastUpdated: '2025-06-09T15:00:00Z',
    fileUploaded: null,
    description: 'Withdrawn asset repair request for old scanner.',
    scheduledRequest: null,
    assignedTo: { id: null, name: null },
    handledBy: { id: 'U003', role: 'Ticket Coordinator', name: 'Kristine Villanueva' },
    createdBy: { userId: 'U001', role: 'Employee', name: 'Bonjing San Jose' }
  },
  {
  ticketNumber: 'TCK-009',
  subject: 'VPN setup request',
  status: 'On Hold',
  priorityLevel: 'Medium',
  department: 'IT Department',
  category: 'IT Category',
  subCategory: 'Technical Support & Troubleshooting',
  dateCreated: '2025-06-08T08:00:00Z',
  lastUpdated: null,
  fileUploaded: null,
  description: 'Need help setting up VPN on my laptop.',
  scheduledRequest: null,
  assignedTo: { id: null, name: null },
  handledBy: { id: 'U003', role: 'Ticket Coordinator', name: 'Kristine Villanueva' },
  createdBy: { userId: 'U001', role: 'Employee', name: 'Bonjing San Jose' }
  }
];

// Generate next ticket number
export const generateTicketNumber = () => {
  const tickets = getEmployeeTickets();
  const numbers = tickets.map(t => parseInt(t.ticketNumber.replace('TCK-', ''), 10)).filter(Boolean);
  const next = numbers.length ? Math.max(...numbers) + 1 : 1;
  return `TCK-${String(next).padStart(3, '0')}`;
};

// Add new ticket from Employee
export const addNewEmployeeTicket = ({
  subject,
  category,
  subCategory,
  description,
  createdBy,
  fileUploaded = null,
  scheduledRequest = null
}) => {
  const newTicket = {
    ticketNumber: generateTicketNumber(),
    subject,
    status: 'New', // Changed from 'Submitted' to 'New'
    priorityLevel: '',
    department: createdBy.department || '',
    category,
    subCategory,
    dateCreated: new Date().toISOString(),
    lastUpdated: null,
    fileUploaded,
    description,
    scheduledRequest,
    assignedTo: { id: null, name: null },
    handledBy: null,
    createdBy
  };

  const tickets = getEmployeeTickets();
  tickets.push(newTicket);
  saveEmployeeTickets(tickets);
  return newTicket;
};

// Retrieve all employee tickets
export const getEmployeeTickets = () => {
  const data = localStorage.getItem(EMPLOYEE_TICKET_STORAGE_KEY);
  return data ? JSON.parse(data) : [];
};

// Save tickets
export const saveEmployeeTickets = (tickets) => {
  localStorage.setItem(EMPLOYEE_TICKET_STORAGE_KEY, JSON.stringify(tickets));
};

// Retrieve by ticket number
export const getEmployeeTicketByNumber = (ticketNumber) => {
  return getEmployeeTickets().find(ticket => ticket.ticketNumber === ticketNumber) || null;
};

// Initialize data if none exists
if (!localStorage.getItem(EMPLOYEE_TICKET_STORAGE_KEY)) {
  saveEmployeeTickets(sampleEmployeeTickets);
}

