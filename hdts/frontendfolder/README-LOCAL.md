# Frontend-Only Development Setup

This branch has been configured for **frontend-only development** with local data management, perfect for UI/UX development without backend dependencies.

## 🏠 Local Development Features

### ✅ What's Included
- **Local Data Storage**: All data stored in browser's localStorage
- **Mock API Services**: Simulated backend API calls with realistic delays
- **Sample Data**: Pre-populated employees, tickets, and admin data
- **Authentication Bypass**: No login required - direct access to all pages
- **Protected Routes Disabled**: Access any URL directly without authentication
- **Auto Mock Tokens**: Automatic authentication tokens for seamless development
- **No Backend Required**: Completely self-contained frontend

### 🚫 What's Disabled
- Real backend API calls
- File upload functionality
- Email notifications
- Real-time updates
- External dependencies

## 🚀 Getting Started

### 1. Install Dependencies
```bash
cd frontendfolder
npm install
```

### 2. Start Development Server
```bash
npm run dev
```

### 3. Access the Application
Open http://localhost:5173 in your browser

## 📁 Local Development Structure

```
frontendfolder/
├── src/
│   ├── mock-data/           # Sample data and localStorage utilities
│   │   ├── employees.js     # Mock employee data
│   │   ├── tickets.js       # Mock ticket data
│   │   └── localStorage.js  # Local storage utilities
│   ├── services/
│   │   ├── local/          # Local API services
│   │   │   ├── authService.js      # Local authentication
│   │   │   ├── ticketService.js    # Local ticket management
│   │   │   └── employeeService.js  # Local employee management
│   │   └── apiService.js   # Service factory (local/backend)
│   ├── config/
│   │   └── environment.js  # Environment configuration
│   └── ...
├── .env.local              # Local environment variables
└── README-LOCAL.md         # This file
```

## 🎮 Direct Access (No Login Required!)

### 🔓 Authentication Bypassed
- **No login needed**: All pages are directly accessible
- **No passwords required**: Authentication is completely bypassed
- **Direct URL access**: Navigate to any route without restrictions

### 🎯 Quick Access URLs
- **Employee Dashboard**: `http://localhost:5173/employee/home`
- **Admin Dashboard**: `http://localhost:5173/coordinator-admin/dashboard`
- **Submit Ticket**: `http://localhost:5173/employee/ticket-submission-form`
- **Ticket Tracker**: `http://localhost:5173/employee/ticket-tracker`
- **User Management**: `http://localhost:5173/coordinator-admin/user-access`
- **Settings**: `http://localhost:5173/employee/settings`

### 👤 User Switching
Use browser console to switch between different user roles:
```javascript
// Switch to admin user
devUtils.switchUser(1);

// Switch to employee user  
devUtils.switchUser(2);
```

## 🔧 Configuration

### Toggle Between Local and Backend API
Edit `src/config/environment.js`:
```javascript
// Set to true for local development, false for backend API
export const USE_LOCAL_API = true;
```

### Environment Variables
Edit `.env.local`:
```
VITE_USE_LOCAL_API=true
VITE_ENABLE_MOCK_DATA=true
VITE_MOCK_DELAY_MS=500
```

## 📊 Local Data Management

### localStorage Keys
- `hdts_employees` - Employee data
- `hdts_admins` - Admin data
- `hdts_tickets` - Ticket data
- `hdts_current_user` - Current logged-in user
- `hdts_auth_token` - Authentication token

### Reset Local Data
To reset all local data:
```javascript
// In browser console
localStorage.clear();
location.reload();
```

## 🎨 UI/UX Development Focus

This setup is perfect for:
- ✅ Component development
- ✅ Styling and theming
- ✅ User interface interactions
- ✅ Frontend logic testing
- ✅ Responsive design
- ✅ User experience flows

## 🔄 Integration with Backend Branch

When you're ready to integrate with the backend:

1. **Switch to backend branch**:
   ```bash
   git checkout backend
   ```

2. **Update configuration**:
   - Set `USE_LOCAL_API = false` in `src/config/environment.js`
   - Update API endpoints to match backend

3. **Remove local services** (optional):
   - Delete `src/services/local/` folder
   - Delete `src/mock-data/` folder

## 📝 Development Workflow

1. **Frontend Development**: Work on UI/UX in this branch
2. **Push Changes**: Push frontend updates
3. **Backend Integration**: Backend team pulls changes and adapts
4. **Backend Cleanup**: Backend removes local JS dependencies
5. **Merge**: Integrate both branches

## 🐛 Troubleshooting

### Issue: No data showing
- **Solution**: Check browser console for errors, try clearing localStorage

### Issue: Login not working
- **Solution**: Any email/password combination works in local mode

### Issue: Changes not persisting
- **Solution**: Check if localStorage is enabled in your browser

## 🎯 Next Steps

1. Start developing your UI components
2. Test user flows with mock data  
3. Focus on styling and user experience
4. Push changes when ready for backend integration

---

**Happy Frontend Development!** 🎨✨
