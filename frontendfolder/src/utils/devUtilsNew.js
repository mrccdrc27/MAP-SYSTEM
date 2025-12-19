// Development utilities for local frontend development
import { USE_LOCAL_API } from '../config/environment.js';
import { initializeLocalAuth } from './authUtils.js';

// Initialize development environment
if (USE_LOCAL_API) {
  console.log('🚀 Frontend-Only Development Mode Activated!');
  console.log('');
  console.log('📋 Available Features:');
  console.log('  ✅ Local data storage (localStorage)');
  console.log('  ✅ Mock authentication with real login flow');
  console.log('  ✅ Bypassed protected routes (optional direct access)');
  console.log('  ✅ Sample data pre-loaded');
  console.log('  ✅ No backend dependencies');
  console.log('');
  console.log('🔑 AVAILABLE LOGIN CREDENTIALS (@gmail.com for login button):');
  console.log('');
  console.log('👨‍💼 ADMIN USERS:');
  console.log('    📧 sysadmin@gmail.com | 🔒 sysadmin123 | 🎭 System Administrator');
  console.log('    📧 coordinator@gmail.com | 🔒 coordinator123 | 🎭 Ticket Coordinator'); 
  console.log('    📧 superadmin@gmail.com | 🔒 superadmin123 | 🎭 Super Administrator');
  console.log('');
  console.log('👥 EMPLOYEE USERS:');
  console.log('    📧 john.doe@gmail.com | 🔒 employee123 | 🎭 IT Developer');
  console.log('    📧 jane.smith@gmail.com | 🔒 manager123 | 🎭 HR Manager');
  console.log('    📧 mike.wilson@gmail.com | 🔒 analyst123 | 🎭 Finance Analyst');
  console.log('');
  console.log('🎮 Quick Access URLs (Direct Access):');
  console.log('  📱 Employee Dashboard: /employee/home');
  console.log('  👔 Admin Dashboard: /coordinator-admin/dashboard');
  console.log('  🎫 Submit Ticket: /employee/ticket-submission-form');
  console.log('  📊 Ticket Tracker: /employee/ticket-tracker');
  console.log('  ⚙️  Settings: /employee/settings');
  console.log('');
  console.log('💡 Tips:');
  console.log('  - Login with credentials above to see role-specific interfaces');
  console.log('  - Or access any page directly via URL (auth bypassed)');
  console.log('  - All data persists in localStorage');
  console.log('  - Use browser dev tools to inspect localStorage');
  console.log('');

  // Initialize authentication for seamless development
  initializeLocalAuth();

  // Add global development helpers
  window.devUtils = {
    // 🔑 LOGIN CREDENTIALS & FUNCTIONS
    showCredentials: () => {
      console.log('🔑 AVAILABLE LOGIN CREDENTIALS (All @gmail.com)');
      console.log('');
      console.log('👨‍💼 ADMIN USERS:');
      console.log('  📧 sysadmin@gmail.com      🔑 sysadmin123      👤 System Administrator');
      console.log('  📧 coordinator@gmail.com   🔑 coordinator123   👤 Ticket Coordinator'); 
      console.log('  📧 superadmin@gmail.com    🔑 superadmin123    👤 Super Administrator');
      console.log('');
      console.log('👥 EMPLOYEE USERS:');
      console.log('  📧 john.doe@gmail.com      🔑 employee123      👤 Developer');
      console.log('  📧 jane.smith@gmail.com    🔑 manager123       👤 Manager');
      console.log('  📧 mike.wilson@gmail.com   🔑 analyst123       👤 Analyst (Pending)');
      console.log('');
      console.log('🚀 Quick login: devUtils.quickLogin("email", "password")');
      console.log('🎯 Different admin roles show different interfaces!');
    },

    quickLogin: (email, password) => {
      const employees = JSON.parse(localStorage.getItem('hdts_employees') || '[]');
      const admins = JSON.parse(localStorage.getItem('hdts_admins') || '[]');
      const allUsers = [...employees, ...admins];
      const user = allUsers.find(u => u.email === email && u.password === password);
      
      if (user) {
        localStorage.setItem('hdts_current_user', JSON.stringify(user));
        localStorage.setItem('hdts_auth_token', `mock_token_${user.id}`);
        
        // Set appropriate role tokens
        if (user.admin_type) {
          localStorage.setItem('admin_access_token', `mock_admin_token_${user.id}`);
          localStorage.setItem('userRole', user.admin_type);
        } else {
          localStorage.setItem('employee_access_token', `mock_employee_token_${user.id}`);
          localStorage.setItem('userRole', 'employee');
        }
        
        console.log('✅ Login successful!');
        console.log('👤 User:', `${user.first_name} ${user.last_name}`);
        console.log('🎭 Role:', user.role);
        console.log('📧 Email:', user.email);
        
        if (user.admin_type) {
          console.log('🛡️  Admin Type:', user.admin_type);
          console.log('🎯 Interface will show role-specific features');
        }
        
        console.log('');
        console.log('🔄 Navigate to dashboard or refresh page to see interface');
        return user;
      } else {
        console.log('❌ Invalid credentials. Use devUtils.showCredentials() to see available logins');
        return null;
      }
    },

    logout: () => {
      localStorage.removeItem('hdts_current_user');
      localStorage.removeItem('hdts_auth_token');
      localStorage.removeItem('admin_access_token');
      localStorage.removeItem('employee_access_token');
      localStorage.removeItem('userRole');
      console.log('✅ Logged out successfully');
      console.log('🔄 Refresh page or go to login');
    },

    getCurrentUser: () => {
      const user = JSON.parse(localStorage.getItem('hdts_current_user') || 'null');
      const role = localStorage.getItem('userRole');
      if (user) {
        console.log('👤 Current user:', `${user.first_name} ${user.last_name}`);
        console.log('📧 Email:', user.email);
        console.log('🎭 Role:', user.role);
        console.log('🏢 Department:', user.department);
        console.log('📊 Status:', user.status);
        if (user.admin_type) {
          console.log('🛡️  Admin Type:', user.admin_type);
        }
      } else {
        console.log('❌ No user logged in');
        console.log('🔑 Use devUtils.showCredentials() to see available logins');
      }
      return { user, role };
    },

    // 🎯 QUICK LOGIN SHORTCUTS
    loginAsAdmin: (adminType = 'sysad') => {
      const adminLogins = {
        sysad: { email: 'sysadmin@gmail.com', password: 'sysadmin123' },
        coordinator: { email: 'coordinator@gmail.com', password: 'coordinator123' },
        superadmin: { email: 'superadmin@gmail.com', password: 'superadmin123' }
      };
      
      const login = adminLogins[adminType];
      if (login) {
        return devUtils.quickLogin(login.email, login.password);
      } else {
        console.log('❌ Invalid admin type. Use: sysad, coordinator, superadmin');
      }
    },

    loginAsEmployee: () => {
      return devUtils.quickLogin('john.doe@gmail.com', 'employee123');
    },

    // 🔧 DATA MANAGEMENT
    clearStorage: () => {
      localStorage.clear();
      console.log('🧹 Local storage cleared. Refresh to reload mock data.');
    },
    
    showAllData: () => {
      console.log('📊 All stored data:');
      console.log('Employees:', JSON.parse(localStorage.getItem('hdts_employees') || '[]'));
      console.log('Admins:', JSON.parse(localStorage.getItem('hdts_admins') || '[]'));
      console.log('Tickets:', JSON.parse(localStorage.getItem('hdts_tickets') || '[]'));
      console.log('Rejected Employees:', JSON.parse(localStorage.getItem('hdts_rejected_employees') || '[]'));
    },
    
    switchUser: (userId) => {
      const employees = JSON.parse(localStorage.getItem('hdts_employees') || '[]');
      const admins = JSON.parse(localStorage.getItem('hdts_admins') || '[]');
      const allUsers = [...employees, ...admins];
      const user = allUsers.find(u => u.id === userId);
      
      if (user) {
        localStorage.setItem('hdts_current_user', JSON.stringify(user));
        console.log('👤 Switched to user:', user);
        window.location.reload();
      } else {
        console.log('❌ User not found. Available users:');
        allUsers.forEach(u => console.log(`  ${u.id}: ${u.first_name} ${u.last_name} (${u.role})`));
      }
    },
    
    help: () => {
      console.log('🛠️  FRONTEND DEVELOPMENT UTILITIES');
      console.log('');
      console.log('🔑 Authentication:');
      console.log('  devUtils.showCredentials() - Show all login credentials');
      console.log('  devUtils.quickLogin(email, password) - Fast login');
      console.log('  devUtils.loginAsAdmin("sysad"|"coordinator"|"superadmin") - Quick admin login');
      console.log('  devUtils.loginAsEmployee() - Quick employee login');
      console.log('  devUtils.getCurrentUser() - Show current logged in user');
      console.log('  devUtils.logout() - Logout current user');
      console.log('');
      console.log('🔧 Data Management:');
      console.log('  devUtils.clearStorage() - Clear all local data');
      console.log('  devUtils.showAllData() - Show all stored data');
      console.log('  devUtils.switchUser(id) - Switch to different user by ID');
      console.log('');
      console.log('🚀 Quick Start:');
      console.log('  1. devUtils.showCredentials() - See all available logins');
      console.log('  2. devUtils.loginAsAdmin("sysad") - Login as System Admin');
      console.log('  3. Navigate to dashboard to see interface changes');
      console.log('  4. Try different admin types to see interface differences!');
    }
  };

  console.log('🛠️  Type "devUtils.help()" in console for development utilities');
  console.log('🔑 Type "devUtils.showCredentials()" to see all login options');
  console.log('');
}
