// 🔑 LOGIN CREDENTIALS FOR FRONTEND TESTING
// All emails use @gmail.com domain to enable login button

// ==============================================
// 👨‍💼 ADMIN USERS (Different Interface Roles)
// ==============================================

export const ADMIN_CREDENTIALS = [
  {
    email: "sysadmin@gmail.com",
    password: "sysadmin123",
    role: "System Administrator",
    admin_type: "sysad",
    description: "Full system access, user management, system settings",
    interface_features: [
      "User management",
      "System settings",
      "Full permissions",
      "Admin controls"
    ]
  },
  {
    email: "coordinator@gmail.com",
    password: "coordinator123", 
    role: "Ticket Coordinator",
    admin_type: "coordinator",
    description: "Ticket management, assignment features, limited settings",
    interface_features: [
      "Ticket management",
      "Assignment controls", 
      "Basic reporting",
      "Limited settings"
    ]
  },
  {
    email: "superadmin@gmail.com",
    password: "superadmin123",
    role: "Super Administrator", 
    admin_type: "superadmin",
    description: "Everything + advanced system controls",
    interface_features: [
      "All system features",
      "Advanced controls",
      "Full reporting",
      "Super admin tools"
    ]
  }
];

// ==============================================
// 👥 EMPLOYEE USERS 
// ==============================================

export const EMPLOYEE_CREDENTIALS = [
  {
    email: "john.doe@gmail.com",
    password: "employee123",
    role: "Developer",
    department: "IT",
    status: "approved",
    description: "Regular employee with ticket submission access"
  },
  {
    email: "jane.smith@gmail.com", 
    password: "manager123",
    role: "Manager",
    department: "HR",
    status: "approved", 
    description: "Manager level employee"
  },
  {
    email: "mike.wilson@gmail.com",
    password: "analyst123", 
    role: "Analyst",
    department: "Finance",
    status: "pending",
    description: "Pending approval employee (limited access)"
  }
];

// ==============================================
// 🚀 QUICK TEST COMMANDS 
// ==============================================

export const QUICK_LOGIN_COMMANDS = {
  // Admin logins
  sysAdmin: 'devUtils.quickLogin("sysadmin@gmail.com", "sysadmin123")',
  coordinator: 'devUtils.quickLogin("coordinator@gmail.com", "coordinator123")', 
  superAdmin: 'devUtils.quickLogin("superadmin@gmail.com", "superadmin123")',
  
  // Employee logins
  employee: 'devUtils.quickLogin("john.doe@gmail.com", "employee123")',
  manager: 'devUtils.quickLogin("jane.smith@gmail.com", "manager123")',
  pending: 'devUtils.quickLogin("mike.wilson@gmail.com", "analyst123")'
};

// ==============================================
// 📋 TESTING CHECKLIST
// ==============================================

export const TESTING_GUIDE = {
  steps: [
    "1. Start app: npm run dev",
    "2. Go to login page",
    "3. Use any credential above (emails must be @gmail.com)",
    "4. Check interface changes based on role",
    "5. Switch users to compare interfaces"
  ],
  
  interfaceDifferences: {
    sysAdmin: "Full admin dashboard with user management",
    coordinator: "Ticket-focused dashboard with limited admin features", 
    superAdmin: "Enhanced admin dashboard with advanced features",
    employee: "Employee dashboard with ticket submission/tracking"
  },
  
  consoleCommands: [
    "devUtils.showCredentials() - Show all available logins",
    "devUtils.quickLogin(email, password) - Fast login",
    "devUtils.getCurrentUser() - Check current logged in user",
    "devUtils.logout() - Logout current user"
  ]
};

// ==============================================
// 🎯 ALL CREDENTIALS SUMMARY 
// ==============================================

export const ALL_CREDENTIALS = [
  // ADMINS
  { email: "sysadmin@gmail.com", password: "sysadmin123", type: "System Admin" },
  { email: "coordinator@gmail.com", password: "coordinator123", type: "Coordinator" },
  { email: "superadmin@gmail.com", password: "superadmin123", type: "Super Admin" },
  
  // EMPLOYEES  
  { email: "john.doe@gmail.com", password: "employee123", type: "Employee" },
  { email: "jane.smith@gmail.com", password: "manager123", type: "Manager" },
  { email: "mike.wilson@gmail.com", password: "analyst123", type: "Pending Employee" }
];

export default {
  ADMIN_CREDENTIALS,
  EMPLOYEE_CREDENTIALS, 
  QUICK_LOGIN_COMMANDS,
  TESTING_GUIDE,
  ALL_CREDENTIALS
};
