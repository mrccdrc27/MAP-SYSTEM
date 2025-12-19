// Mock employee data matching models.py structure
export const mockEmployees = [
  {
    id: 1,
    last_name: "Doe",
    first_name: "John",
    middle_name: "Michael",
    suffix: "Jr.",
    company_id: "MA0001",
    department: "IT Department",
    email: "john.doe@gmail.com",
    password: "employee123",
    image: "employee_images/default-profile.png",
    role: "Employee",
    status: "Approved",
    notified: true,
    is_staff: false,
    is_superuser: false,
    date_created: "2024-01-15T08:00:00Z"
  },
  {
    id: 2,
    last_name: "Smith",
    first_name: "Jane",
    middle_name: "Anne",
    suffix: null,
    company_id: "MA0002",
    department: "Asset Department",
    email: "jane.smith@gmail.com",
    password: "manager123",
    image: "employee_images/default-profile.png",
    role: "Employee",
    status: "Approved",
    notified: true,
    is_staff: false,
    is_superuser: false,
    date_created: "2024-02-20T09:30:00Z"
  },
  {
    id: 3,
    last_name: "Wilson",
    first_name: "Mike",
    middle_name: null,
    suffix: null,
    company_id: "MA0003",
    department: "Budget Department",
    email: "mike.wilson@gmail.com",
    password: "analyst123",
    image: "employee_images/default-profile.png",
    role: "Employee",
    status: "Pending",
    notified: false,
    is_staff: false,
    is_superuser: false,
    date_created: "2024-03-10T10:15:00Z"
  }
];

export const mockAdmins = [
  {
    id: 4,
    last_name: "Administrator",
    first_name: "System",
    middle_name: null,
    suffix: null,
    company_id: "MA9001",
    department: "IT Department",
    email: "sysadmin@gmail.com",
    password: "sysadmin123",
    image: "employee_images/default-profile.png",
    role: "System Admin",
    status: "Approved",
    notified: true,
    is_staff: true,
    is_superuser: true,
    date_created: "2023-12-01T08:00:00Z"
  },
  {
    id: 5,
    last_name: "Coordinator",
    first_name: "Ticket",
    middle_name: null,
    suffix: null,
    company_id: "MA9002",
    department: "IT Department",
    email: "coordinator@gmail.com",
    password: "coordinator123",
    image: "employee_images/default-profile.png",
    role: "Ticket Coordinator",
    status: "Approved",
    notified: true,
    is_staff: true,
    is_superuser: false,
    date_created: "2023-12-01T08:00:00Z"
  }
];

// Mock rejected employees audit
export const mockRejectedEmployees = [
  {
    id: 1,
    original_email: "rejected@gmail.com",
    original_company_id: "MA0099",
    first_name: "Rejected",
    last_name: "User",
    department: "Asset Department",
    role: "Employee",
    reason: "Incomplete documentation",
    rejected_date: "2024-03-15"
  }
];
