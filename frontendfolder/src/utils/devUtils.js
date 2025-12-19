// Development utilities for local frontend development
import { USE_LOCAL_API } from '../config/environment.js';
import { initializeLocalAuth } from './authUtils.js';

// Initialize development environment
if (USE_LOCAL_API) {
  console.log('🚀 Frontend-Only Development Mode Activated!');
  console.log('');
  console.log('📋 Available Features:');
  console.log('  ✅ Local data storage (localStorage)');
  console.log('  ✅ Mock authentication (no passwords required)');
  console.log('  ✅ Bypassed protected routes');
  console.log('  ✅ Sample data pre-loaded');
  console.log('  ✅ No backend dependencies');
  console.log('');
  console.log('🔑 Login Credentials (Updated):');
  console.log('  👨‍💼 ADMIN ACCOUNTS:');
  console.log('    📧 sysadmin@gmail.com | 🔒 sysadmin123 | 🎭 System Admin');
  console.log('    📧 coordinator@gmail.com | 🔒 coordinator123 | 🎭 Ticket Coordinator');
  console.log('    📧 superadmin@gmail.com | 🔒 superadmin123 | 🎭 Super Admin');
  console.log('');
  console.log('  👤 EMPLOYEE ACCOUNTS:');
  console.log('    📧 john.doe@gmail.com | 🔒 employee123 | 🎭 Employee');
  console.log('    📧 jane.smith@gmail.com | 🔒 manager123 | 🎭 Employee');
  console.log('    📧 mike.wilson@gmail.com | 🔒 analyst123 | 🎭 Employee');
  console.log('');
  console.log('🎮 Quick Access URLs (Direct Access):');
  console.log('  📱 Employee Dashboard: /employee/home');
  console.log('  👔 Admin Dashboard: /coordinator-admin/dashboard');
  console.log('  🎫 Submit Ticket: /employee/ticket-submission-form');
  console.log('  📊 Ticket Tracker: /employee/ticket-tracker');
  console.log('  ⚙️  Settings: /employee/settings');
  console.log('');
  console.log('💡 Tips:');
  console.log('  - You can access any page directly via URL');
  console.log('  - All data persists in localStorage');
  console.log('  - No login required (authentication bypassed)');
  console.log('  - Use browser dev tools to inspect localStorage');
  console.log('');

  // Initialize authentication for seamless development
  initializeLocalAuth();
  console.log('🚀 Frontend-Only Development Mode Activated!');
  console.log('');
  console.log('📋 Available Features:');
  console.log('  ✅ Local data storage (localStorage)');
  console.log('  ✅ Mock authentication (no passwords required)');
  console.log('  ✅ Bypassed protected routes');
  console.log('  ✅ Sample data pre-loaded');
  console.log('  ✅ No backend dependencies');
  console.log('');
  console.log('🔑 Login Credentials:');
  console.log('  👨‍💼 ADMIN ACCOUNTS:');
  console.log('    📧 sysadmin@company.com | 🔒 sysadmin123 | 🎭 System Administrator');
  console.log('    📧 coordinator@company.com | 🔒 coordinator123 | � Ticket Coordinator');
  console.log('    📧 superadmin@company.com | 🔒 superadmin123 | 🎭 Super Administrator');
  console.log('');
  console.log('  👤 EMPLOYEE ACCOUNTS:');
  console.log('    📧 john.doe@company.com | 🔒 employee123 | 🎭 Developer');
  console.log('    📧 jane.smith@company.com | 🔒 manager123 | 🎭 HR Manager');
  console.log('    📧 mike.wilson@company.com | 🔒 analyst123 | 🎭 Finance Analyst');
  console.log('');
  console.log('�🎮 Quick Access URLs (Direct Access):');
  console.log('  📱 Employee Dashboard: /employee/home');
  console.log('  👔 Admin Dashboard: /coordinator-admin/dashboard');
  console.log('  🎫 Submit Ticket: /employee/ticket-submission-form');
  console.log('  📊 Ticket Tracker: /employee/ticket-tracker');
  console.log('  ⚙️  Settings: /employee/settings');
  console.log('');
  console.log('💡 Tips:');
  console.log('  - You can access any page directly via URL');
  console.log('  - All data persists in localStorage');
  console.log('  - No login required (authentication bypassed)');
  console.log('  - Use browser dev tools to inspect localStorage');
  console.log('');

  // Initialize authentication for seamless development
  initializeLocalAuth();

  // Add global development helpers
  window.devUtils = {
    clearStorage: () => {
      localStorage.clear();
      console.log('🧹 Local storage cleared. Refresh to reload mock data.');
    },
    
    showCurrentUser: () => {
      console.log('👤 Current user:', JSON.parse(localStorage.getItem('hdts_current_user') || 'null'));
    },
    
    showAllData: () => {
      console.log('📊 All stored data:');
      console.log('Employees:', JSON.parse(localStorage.getItem('hdts_employees') || '[]'));
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
    
    showCredentials: () => {
      console.log('🔑 AVAILABLE LOGIN CREDENTIALS:');
      console.log('');
      console.log('👨‍💼 ADMIN ACCOUNTS:');
      console.log('┌─────────────────────────────┬─────────────────┬──────────────────────┐');
      console.log('│ Email                       │ Password        │ Role                 │');
      console.log('├─────────────────────────────┼─────────────────┼──────────────────────┤');
      console.log('│ sysadmin@gmail.com          │ sysadmin123     │ System Administrator │');
      console.log('│ coordinator@gmail.com       │ coordinator123  │ Ticket Coordinator   │');
      console.log('│ superadmin@gmail.com        │ superadmin123   │ Super Administrator  │');
      console.log('└─────────────────────────────┴─────────────────┴──────────────────────┘');
      console.log('');
      console.log('👤 EMPLOYEE ACCOUNTS:');
      console.log('┌─────────────────────────────┬─────────────────┬──────────────────────┐');
      console.log('│ Email                       │ Password        │ Role                 │');
      console.log('├─────────────────────────────┼─────────────────┼──────────────────────┤');
      console.log('│ john.doe@gmail.com          │ employee123     │ Developer            │');
      console.log('│ jane.smith@gmail.com        │ manager123      │ HR Manager           │');
      console.log('│ mike.wilson@gmail.com       │ analyst123      │ Finance Analyst      │');
      console.log('└─────────────────────────────┴─────────────────┴──────────────────────┘');
    },
    
    quickLogin: (userType) => {
      const accounts = {
        sysad: { email: 'sysadmin@gmail.com', password: 'sysadmin123' },
        coordinator: { email: 'coordinator@gmail.com', password: 'coordinator123' },
        superadmin: { email: 'superadmin@gmail.com', password: 'superadmin123' },
        employee: { email: 'john.doe@gmail.com', password: 'employee123' },
        manager: { email: 'jane.smith@gmail.com', password: 'manager123' },
        analyst: { email: 'mike.wilson@gmail.com', password: 'analyst123' }
      };
      
      const account = accounts[userType];
      if (account) {
        console.log(`🚀 Quick login as ${userType}:`, account);
        console.log('Go to login page and use these credentials!');
      } else {
        console.log('❌ Invalid user type. Available: sysad, coordinator, superadmin, employee, manager, analyst');
      }
    },

    help: () => {
      console.log('🛠️  Available dev utilities:');
      console.log('  devUtils.showCredentials() - Show all login credentials');
      console.log('  devUtils.quickLogin(type) - Get credentials for quick login');
      console.log('  devUtils.clearStorage() - Clear all local data');
      console.log('  devUtils.showCurrentUser() - Show current user info');
      console.log('  devUtils.showAllData() - Show all stored data');
      console.log('  devUtils.switchUser(id) - Switch to different user');
      console.log('  devUtils.help() - Show this help');
      console.log('');
      console.log('💡 Examples:');
      console.log('  devUtils.quickLogin("sysad") - Get system admin credentials');
      console.log('  devUtils.quickLogin("coordinator") - Get coordinator credentials');
      console.log('  devUtils.quickLogin("employee") - Get employee credentials');
    }
  };

  console.log('🛠️  Type "devUtils.help()" in console for development utilities');
  console.log('');
}
