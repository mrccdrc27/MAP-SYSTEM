// LOGIN CREDENTIALS FOR TESTING
// All emails use @gmail.com domain as required by the login form

// ==========================================================
// 🔑 AVAILABLE LOGIN CREDENTIALS
// ==========================================================

export const LOGIN_CREDENTIALS = {
  
  // 👤 EMPLOYEES (Regular Users)
  employees: [
    {
      email: "john.doe@gmail.com",
      password: "employee123",
      company_id: "MA0001",
      name: "John Michael Doe Jr.",
      department: "IT Department",
      role: "Employee",
      status: "Approved",
      description: "IT Department Employee - Can submit and track tickets"
    },
    {
      email: "jane.smith@gmail.com", 
      password: "manager123",
      company_id: "MA0002",
      name: "Jane Anne Smith",
      department: "Asset Department", 
      role: "Employee",
      status: "Approved",
      description: "Asset Department Employee - Can submit and track tickets"
    },
    {
      email: "mike.wilson@gmail.com",
      password: "analyst123", 
      company_id: "MA0003",
      name: "Mike Wilson",
      department: "Budget Department",
      role: "Employee", 
      status: "Pending",
      description: "Budget Department Employee - Pending approval"
    }
  ],

  // 👔 ADMINISTRATORS
  admins: [
    {
      email: "sysadmin@gmail.com",
      password: "sysadmin123",
      company_id: "MA9001", 
      name: "System Administrator",
      department: "IT Department",
      role: "System Admin",
      admin_type: "sysad",
      status: "Approved",
      description: "Full system access - User management, system settings, all permissions"
    },
    {
      email: "coordinator@gmail.com",
      password: "coordinator123",
      company_id: "MA9002",
      name: "Ticket Coordinator", 
      department: "IT Department",
      role: "Ticket Coordinator",
      admin_type: "coordinator", 
      status: "Approved",
      description: "Ticket management focus - Assignment, tracking, limited settings"
    }
  ]
};

// ==========================================================
// 🎯 QUICK REFERENCE TABLE
// ==========================================================
/*
┌─────────────────────────────┬──────────────────┬─────────────┬─────────────────────┐
│ EMAIL                       │ PASSWORD         │ ROLE        │ INTERFACE ACCESS    │
├─────────────────────────────┼──────────────────┼─────────────┼─────────────────────┤
│ john.doe@gmail.com          │ employee123      │ Employee    │ Submit/Track Tickets│
│ jane.smith@gmail.com        │ manager123       │ Employee    │ Submit/Track Tickets│
│ mike.wilson@gmail.com       │ analyst123       │ Employee    │ Pending Approval    │
│ sysadmin@gmail.com          │ sysadmin123      │ System Admin│ Full System Access  │
│ coordinator@gmail.com       │ coordinator123   │ Coordinator │ Ticket Management   │
└─────────────────────────────┴──────────────────┴─────────────┴─────────────────────┘
*/

// ==========================================================
// 🛠️ DEVELOPMENT HELPER FUNCTIONS
// ==========================================================

// Get all credentials in a formatted way
export const getAllCredentials = () => {
  console.log('🔑 AVAILABLE LOGIN CREDENTIALS:');
  console.log('');
  
  console.log('👤 EMPLOYEES:');
  LOGIN_CREDENTIALS.employees.forEach((emp, index) => {
    console.log(`${index + 1}. ${emp.email} | ${emp.password} | ${emp.role}`);
    console.log(`   ${emp.description}`);
  });
  
  console.log('');
  console.log('👔 ADMINISTRATORS:'); 
  LOGIN_CREDENTIALS.admins.forEach((admin, index) => {
    console.log(`${index + 1}. ${admin.email} | ${admin.password} | ${admin.role}`);
    console.log(`   ${admin.description}`);
  });
  
  console.log('');
  console.log('💡 Usage: Copy any email/password pair to test different user interfaces');
};

// Get credentials by role
export const getCredentialsByRole = (role) => {
  const allUsers = [...LOGIN_CREDENTIALS.employees, ...LOGIN_CREDENTIALS.admins];
  return allUsers.filter(user => user.role.toLowerCase().includes(role.toLowerCase()));
};

// Get random credentials for testing
export const getRandomCredentials = () => {
  const allUsers = [...LOGIN_CREDENTIALS.employees, ...LOGIN_CREDENTIALS.admins];
  const randomUser = allUsers[Math.floor(Math.random() * allUsers.length)];
  console.log('🎲 Random credentials:', randomUser.email, '|', randomUser.password);
  return randomUser;
};

// Export for console access
if (typeof window !== 'undefined') {
  window.loginCredentials = {
    getAll: getAllCredentials,
    getByRole: getCredentialsByRole,
    getRandom: getRandomCredentials,
    data: LOGIN_CREDENTIALS
  };
}
