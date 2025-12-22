// Mock ticket data shaped to match the submission form and ticketStorage expectations
export const mockTickets = [
  {
    id: 1,
    ticketNumber: 'TCK-2025-001',
    employeeId: 1,
    employeeName: 'John Doe',
    employeeDepartment: 'IT Department',
    subject: 'Computer will not start',
    category: 'IT Support',
    subCategory: 'Hardware Troubleshooting',
    priority: 'High',
    description: "My computer won't boot. Power light is on but the screen stays black.",
    fileAttachments: [],
    scheduleRequest: null,
    assignedDepartment: 'IT Support',
    status: 'Open',
    assignedTo: null,
    assignedToName: null,
    coordinatorComment: null,
    createdAt: '2025-03-20T09:00:00',
    updatedAt: '2025-03-20T09:00:00',
    resolvedAt: null,
    closedAt: null,
    withdrawnAt: null,
    rejectedAt: null,
  },
  {
    id: 2,
    ticketNumber: 'TCK-2025-002',
    employeeId: 2,
    employeeName: 'Jane Smith',
    employeeDepartment: 'IT Department',
    subject: 'Password reset request',
    category: 'IT Support',
  subCategory: 'Email/Account Access Issue',
    priority: 'Medium',
    description: 'I cannot access my email. Please reset my password.',
    fileAttachments: [],
    scheduleRequest: null,
    assignedDepartment: 'IT Support',
    status: 'In Progress',
    assignedTo: 3,
    assignedToName: 'Rumi Nakamura',
    coordinatorComment: 'Working on account reset.',
    createdAt: '2025-03-19T14:30:00',
    updatedAt: '2025-03-20T10:15:00',
    withdrawnAt: null,
    rejectedAt: null,
  },
  {
    id: 3,
    ticketNumber: 'TCK-2025-003',
    employeeId: 3,
    employeeName: 'Mike Wilson',
    employeeDepartment: 'Budget Department',
    subject: 'Budget system access issue',
    category: 'IT Support',
  subCategory: 'Email/Account Access Issue',
    priority: 'Low',
    description: 'Unable to log into the budget system due to credentials error.',
    fileAttachments: [],
    scheduleRequest: null,
    assignedDepartment: 'IT Support',
    status: 'Resolved',
    assignedTo: 4,
    assignedToName: 'Ticket Coordinator',
    coordinatorComment: 'Access restored after reset.',
    createdAt: '2025-03-18T11:00:00',
    updatedAt: '2025-03-19T16:30:00',
    resolvedAt: '2025-03-19T16:30:00',
    closedAt: null,
    withdrawnAt: null,
    rejectedAt: null,
  },
  // Asset check-in example
  {
    id: 4,
    ticketNumber: 'TCK-2025-004',
    employeeId: 1,
    employeeName: 'John Doe',
    employeeDepartment: 'IT Department',
    subject: 'Returning Projector',
    category: 'Asset Check In',
    subCategory: 'Projector',
    priority: 'Medium',
    description: 'Returning the projector after a client presentation.',
    fileAttachments: [],
    scheduleRequest: null,
    assetName: 'Epson PowerLite 2247U',
    serialNumber: 'PJ-2024-001',
    location: 'Main Office - 2nd Floor',
  issueType: 'Other',
  otherIssue: 'Good Condition',
    assignedDepartment: 'Asset Management',
    status: 'Resolved',
    assignedTo: 5,
    assignedToName: 'Asset Manager',
    createdAt: '2025-03-22T10:45:00',
    updatedAt: '2025-03-22T15:00:00',
    resolvedAt: '2025-03-22T15:00:00',
    withdrawnAt: null,
    rejectedAt: null,
  },
  // Asset check-out example
  {
    id: 5,
    ticketNumber: 'TCK-2025-005',
    employeeId: 2,
    employeeName: 'Jane Smith',
    employeeDepartment: 'Marketing Department',
    subject: 'Request Laptop for New Team Member',
    category: 'Asset Check Out',
    subCategory: 'Laptop',
    priority: 'Medium',
    description: 'Requesting a laptop for new hire starting next week.',
    fileAttachments: [],
    scheduleRequest: null,
    assetName: 'Dell Latitude 5420',
    serialNumber: 'DL-2024-001',
    location: 'Main Office - 3rd Floor',
    expectedReturnDate: '2026-06-10',
    assignedDepartment: 'Asset Management',
    status: 'Open',
    assignedTo: null,
    assignedToName: null,
    createdAt: '2025-06-10T08:00:00',
    updatedAt: '2025-06-10T08:00:00',
    withdrawnAt: null,
    rejectedAt: null,
  },
  // Budget proposal example
  {
    id: 6,
    ticketNumber: 'TCK-2025-006',
    employeeId: 1,
    employeeName: 'John Doe',
    employeeDepartment: 'Finance Department',
    subject: 'Q3 Budget Proposal - Software Upgrade',
    category: 'New Budget Proposal',
    subCategory: 'Capital Expenses (CapEx)',
    priority: 'High',
    description: 'Requesting budget approval for finance software upgrade.',
    fileAttachments: [],
    scheduleRequest: null,
    budgetItems: [
      { costElement: 'Software (long-term value like MS Office, Adobe Suite, Antivirus)', estimatedCost: '₱500,001 - ₱1,000,000' }
    ],
    totalBudget: 1000000,
    performanceStartDate: '2025-07-01',
    performanceEndDate: '2026-06-30',
    preparedBy: 'John Doe',
    assignedDepartment: 'Budget Department',
    status: 'Open',
    assignedTo: null,
    createdAt: '2025-06-11T09:00:00',
    updatedAt: '2025-06-11T09:00:00',
    withdrawnAt: null,
    rejectedAt: null,
  },
  // General request example
  {
    id: 7,
    ticketNumber: 'TCK-2025-007',
    employeeId: 3,
    employeeName: 'Mike Wilson',
    employeeDepartment: 'Budget Department',
    subject: 'Office Space Too Cold',
    category: 'General Request',
    subCategory: 'Facilities Issue',
    priority: 'Low',
    description: 'The AC in our area is too cold. Please adjust.',
    fileAttachments: [],
    scheduleRequest: { date: '2025-06-03', time: '10:00', notes: 'Morning preferred' },
    assignedDepartment: 'Facilities',
    status: 'In Progress',
    assignedTo: 4,
    assignedToName: 'Facilities Lead',
    createdAt: '2025-06-03T09:00:00',
    updatedAt: '2025-06-03T15:20:00',
    withdrawnAt: null,
    rejectedAt: null,
  }
];

export const ticketStatuses = [
  'New',
  'Open',
  'In Progress',
  'On Hold',
  'Pending',
  'Resolved',
  'Rejected',
  'Closed',
  'Withdrawn'
];

export const priorityLevels = ['Critical', 'High', 'Medium', 'Low'];

export const departments = ['IT Department', 'Asset Management', 'Budget Department', 'Facilities'];

// Categories aligned with the submission form
export const categories = ['IT Support', 'Asset Check In', 'Asset Check Out', 'New Budget Proposal', 'General Request'];

// IT Support sub-categories and device types (from ITSupportForm.jsx)
export const itSupportSubCategories = [
  'Technical Assistance',
  'Software Installation/Update',
  'Hardware Troubleshooting',
  'Email/Account Access Issue',
  'Internet/Network Connectivity Issue',
  'Printer/Scanner Setup or Issue',
  'System Performance Issue',
  'Virus/Malware Check',
  'IT Consultation Request',
  'Data Backup/Restore'
];

export const deviceTypes = ['Laptop', 'Printer', 'Projector', 'Monitor', 'Other'];

// Asset categories, issue types, locations and mock asset inventory (from AssetCheckIn/Out forms)
export const assetSubCategories = ['Laptop', 'Printer', 'Projector', 'Mouse', 'Keyboard'];

export const assetIssueTypes = [
  'Not Functioning',
  'Missing Accessories (e.g., charger, case)',
  'Physical Damage (e.g., cracked screen, broken keys)',
  'Battery Issue (e.g., not charging, quick drain)',
  'Software Issue (e.g., system crash, unable to boot)',
  'Screen/Display Issue (e.g., flickering, dead pixels)',
  'Other'
];

export const locations = [
  'Main Office - 1st Floor',
  'Main Office - 2nd Floor',
  'Main Office - 3rd Floor',
  'Branch Office - North',
  'Branch Office - South',
  'Warehouse',
  'Remote/Home Office'
];

export const mockAssets = {
  'Laptop': [
    { name: 'Dell Latitude 5420', serialNumber: 'DL-2024-001' },
    { name: 'HP ProBook 450 G9', serialNumber: 'HP-2024-002' },
    { name: 'Lenovo ThinkPad X1', serialNumber: 'LN-2024-003' }
  ],
  'Printer': [
    { name: 'HP LaserJet Pro M404dn', serialNumber: 'PR-2024-001' },
    { name: 'Canon imageCLASS MF445dw', serialNumber: 'PR-2024-002' }
  ],
  'Projector': [
    { name: 'Epson PowerLite 2247U', serialNumber: 'PJ-2024-001' },
    { name: 'BenQ MH535A', serialNumber: 'PJ-2024-002' }
  ],
  'Mouse': [
    { name: 'Logitech MX Master 3', serialNumber: 'MS-2024-001' },
    { name: 'Microsoft Surface Mouse', serialNumber: 'MS-2024-002' }
  ],
  'Keyboard': [
    { name: 'Logitech K380', serialNumber: 'KB-2024-001' },
    { name: 'Microsoft Ergonomic Keyboard', serialNumber: 'KB-2024-002' }
  ]
};

// Budget proposal sub-categories, cost elements and ranges (from BudgetProposalForm.jsx)
export const budgetSubCategories = [
  'Capital Expenses (CapEx)',
  'Operational Expenses (OpEx)',
  'Reimbursement Claim (Liabilities)',
  'Charging Department (Cost Center)'
];

export const costElements = {
  'Capital Expenses (CapEx)': [
    'Equipment',
    'Software (long-term value like MS Office, Adobe Suite, Antivirus)',
    'Furniture'
  ],
  'Operational Expenses (OpEx)': [
    'Utilities',
    'Supplies',
    'IT Services',
    'Software Subscriptions'
  ],
  'Reimbursement Claim (Liabilities)': [
    'Payable',
    'Loans (if applicable)'
  ],
  'Charging Department (Cost Center)': [
    'IT Operations (day-to-day support)',
    'System Development (in-house software projects)',
    'Infrastructure & Equipment (hardware, network, servers)',
    'Training and Seminars (employee development)'
  ]
};

export const costRanges = [
  '₱0 - ₱10,000',
  '₱10,001 - ₱50,000',
  '₱50,001 - ₱100,000',
  '₱100,001 - ₱500,000',
  '₱500,001 - ₱1,000,000',
  '₱1,000,001 and above'
];

// Combined mapping for UI convenience
export const subCategories = {
  'IT Support': itSupportSubCategories,
  'Asset Check In': assetSubCategories,
  'Asset Check Out': assetSubCategories,
  'New Budget Proposal': budgetSubCategories,
  'General Request': ['Facilities Issue', 'Other']
};



