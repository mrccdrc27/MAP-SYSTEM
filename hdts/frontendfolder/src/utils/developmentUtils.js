// Development utilities for local frontend development

// Debug utilities
export const debugUtils = {
  // Log current localStorage data
  logStorageData: () => {
    console.group('📊 Current localStorage Data');
    const keys = [
      'hdts_employees',
      'hdts_admins', 
      'hdts_tickets',
      'hdts_current_user',
      'hdts_auth_token',
      'hdts_rejected_employees'
    ];
    
    keys.forEach(key => {
      const data = localStorage.getItem(key);
      if (data) {
        try {
          const parsed = JSON.parse(data);
          console.log(`${key}:`, parsed);
        } catch (e) {
          console.log(`${key}:`, data);
        }
      } else {
        console.log(`${key}:`, 'Not found');
      }
    });
    console.groupEnd();
  },

  // Clear all app data
  clearAllData: () => {
    const keys = Object.keys(localStorage).filter(key => key.startsWith('hdts_'));
    keys.forEach(key => localStorage.removeItem(key));
    console.log('🧹 Cleared all app data');
    location.reload();
  },

  // Add sample data
  addSampleData: () => {
    // This will be called by initializeLocalStorage
    location.reload();
    console.log('📊 Added sample data');
  },

  // Toggle API mode
  toggleApiMode: () => {
    console.log('⚠️ To toggle API mode, edit src/config/environment.js');
    console.log('Set USE_LOCAL_API to true for local mode, false for backend');
  }
};

// Export to window for easy access in console
if (typeof window !== 'undefined') {
  window.debugUtils = debugUtils;
  console.log('🛠️ Debug utilities available: window.debugUtils');
  console.log('Commands:');
  console.log('  - debugUtils.logStorageData() - View all localStorage data');
  console.log('  - debugUtils.clearAllData() - Clear all data and reload');
  console.log('  - debugUtils.addSampleData() - Add sample data and reload');
  console.log('  - debugUtils.toggleApiMode() - Instructions to toggle API mode');
}
