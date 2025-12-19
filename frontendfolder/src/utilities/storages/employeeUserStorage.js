const EMPLOYEE_USERS = [
  {
    id: 1,
    companyId: "EMP-001",
    firstName: "Zoey",
    lastName: "Martinez",
    email: "zoey.martinez@gmail.com",
    password: "password123",
    role: "Employee",
    department: "Finance Department",
    profileImage: "https://api.dicebear.com/7.x/avataaars/svg?seed=Zoey",
    status: "Active",
    dateJoined: "2024-01-15T09:00:00",
    lastLogin: "2025-06-12T08:30:00",
  },
  {
    id: 2,
    companyId: "EMP-002",
    firstName: "Mira",
    lastName: "Chen",
    email: "mira.chen@gmail.com",
    password: "password123",
    role: "Employee",
    department: "Marketing Department",
    profileImage: "https://api.dicebear.com/7.x/avataaars/svg?seed=Mira",
    status: "Active",
    dateJoined: "2024-02-20T09:00:00",
    lastLogin: "2025-06-12T09:15:00",
  },
  {
    id: 3,
    companyId: "COORD-001",
    firstName: "Rumi",
    lastName: "Nakamura",
    email: "rumi.nakamura@gmail.com",
    password: "password123",
    role: "Ticket Coordinator",
    department: "IT Support",
    profileImage: "https://api.dicebear.com/7.x/avataaars/svg?seed=Rumi",
    status: "Active",
    dateJoined: "2023-08-10T09:00:00",
    lastLogin: "2025-06-12T07:45:00",
  },
  {
    id: 4,
    companyId: "ADMIN-001",
    firstName: "Bobby",
    lastName: "Thompson",
    email: "bobby.thompson@gmail.com",
    password: "password123",
    role: "System Admin",
    department: "IT Support",
    profileImage: "https://api.dicebear.com/7.x/avataaars/svg?seed=Bobby",
    status: "Active",
    dateJoined: "2023-05-01T09:00:00",
    lastLogin: "2025-06-12T07:30:00",
  },
];

// Initialize users in localStorage on first load
if (typeof window !== 'undefined' && !localStorage.getItem("employeeUsers")) {
  localStorage.setItem("employeeUsers", JSON.stringify(EMPLOYEE_USERS));
}

// Normalize stored user roles to canonical labels and ensure loggedInUser role matches stored user
const normalizeRole = (role) => {
  if (!role) return role;
  const r = String(role).trim().toLowerCase();
  if (r === 'system admin' || r === 'system_admin' || r === 'admin') return 'System Admin';
  if (r === 'ticket coordinator' || r === 'coordinator' || r === 'ticket_coordinator') return 'Ticket Coordinator';
  if (r === 'employee' || r === 'staff') return 'Employee';
  // fallback: capitalize words
  return role.replace(/\b\w/g, c => c.toUpperCase());
};

const normalizeStoredUsers = () => {
  if (typeof window === 'undefined') return;
  try {
    const stored = localStorage.getItem('employeeUsers');
    if (!stored) return;
    let users = JSON.parse(stored);
    let changed = false;
    users = users.map(u => {
      const normalized = normalizeRole(u.role);
      if (u.role !== normalized) {
        changed = true;
        return { ...u, role: normalized };
      }
      return u;
    });
    if (changed) {
      localStorage.setItem('employeeUsers', JSON.stringify(users));
    }

    // Also update loggedInUser role if present and different
    const USER_KEY = 'loggedInUser';
    const storedUser = localStorage.getItem(USER_KEY);
    if (storedUser) {
      const parsed = JSON.parse(storedUser);
      const match = users.find(u => u.email && parsed.email && u.email.toLowerCase() === parsed.email.toLowerCase());
      if (match && match.role && parsed.role !== match.role) {
        const { password, ...withoutPassword } = match;
        localStorage.setItem(USER_KEY, JSON.stringify(withoutPassword));
      }
    }
  } catch (e) {
    // silent fail - don't break app
    // console.warn('normalizeStoredUsers failed', e);
  }
};

// Run normalization on module load
normalizeStoredUsers();

export const getEmployeeUsers = () => {
  const stored = localStorage.getItem("employeeUsers");
  return stored ? JSON.parse(stored) : EMPLOYEE_USERS;
};

export const getEmployeeUserById = (id) => {
  return getEmployeeUsers().find(user => user.id === id);
};

export const getEmployeeUserByEmail = (email) => {
  return getEmployeeUsers().find(user => user.email.toLowerCase() === email.toLowerCase());
};

export const getUsersByRole = (role) => {
  return getEmployeeUsers().filter(user => user.role === role);
};

export const addEmployeeUser = (userData) => {
  const users = getEmployeeUsers();
  const newUser = {
    id: users.length > 0 ? Math.max(...users.map(u => u.id)) + 1 : 1,
    ...userData,
    // Allow callers to set initial status (e.g., 'Pending'); default to 'Active'
    status: userData.status || "Active",
    dateJoined: new Date().toISOString(),
    lastLogin: null,
  };
  users.push(newUser);
  localStorage.setItem("employeeUsers", JSON.stringify(users));
  return newUser;
};

export const updateEmployeeUser = (id, updates) => {
  const users = getEmployeeUsers();
  const index = users.findIndex(user => user.id === id);
  if (index !== -1) {
    users[index] = { ...users[index], ...updates };
    localStorage.setItem("employeeUsers", JSON.stringify(users));
    return users[index];
  }
  return null;
};

export default EMPLOYEE_USERS;
