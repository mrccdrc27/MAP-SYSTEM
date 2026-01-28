# Auth Frontend Refactoring Plan

This document outlines a comprehensive plan to refactor the Auth Frontend (`auth/frontend`) to improve scalability, maintainability, and fix existing architectural issues.

## Current Issues
1.  **Monolithic API File**: `src/api/auth.js` mixes authentication, user management, and system role logic.
2.  **Flat Folder Structure**: `src/pages` lacks organization, mixing different user roles (Staff, Employee, SuperAdmin).
3.  **Routing Conflicts**: The current `BrowserRouter` setup conflicts with production deployment paths (basename issues).
4.  **Repetitive Logic**: Form handling and state management are duplicated across multiple components.

---

## Phase 1: Architecture & Folder Restructuring

We will transition from a "Page-based" structure to a "Feature-based" structure.

### New Directory Structure
```text
src/
├── components/          # Generic UI components
│   ├── common/          # Atomic components (Button, Input, Modal, Toast)
│   └── layout/          # Layout wrappers (MainLayout, AuthLayout, SuperAdminLayout)
├── context/             # Global State (AuthContext, ThemeContext)
├── features/            # Business logic grouped by domain
│   ├── auth/            # Login, Register, ForgotPassword, OTP
│   ├── admin/           # AgentManagement, Roles, Invites
│   ├── superadmin/      # Dashboard, UserMasterlist, UserForm
│   └── user/            # Profile, SystemSelect, Settings
├── hooks/               # Shared hooks (useForm, useFetch, useAuth)
├── routes/              # Router configuration
├── services/            # API interaction layer
│   ├── api.js           # Core HTTP client (axios/fetch wrapper)
│   ├── authService.js   # Auth endpoints
│   ├── userService.js   # User/Profile endpoints
│   └── adminService.js  # System/Role endpoints
├── utils/               # Helpers and constants
├── App.jsx              # Application Entry
└── main.jsx
```

---

## Phase 2: API Layer Modularization

The current `src/api/auth.js` and `src/api/config.js` will be refactored into a `services` directory to separate concerns.

### 1. `services/api.js`
A centralized HTTP client responsible for:
-   Base URL configuration (handling local vs prod).
-   Request headers (CSRF, Content-Type).
-   Response interception (Global 401 handling, error parsing).

### 2. Domain Services
-   **`authService.js`**: `login`, `logout`, `register`, `verifyOtp`, `refreshToken`.
-   **`userService.js`**: `getMe`, `getProfile`, `updateProfile`, `changePassword`.
-   **`adminService.js`**: `getSystemRoles`, `inviteAgent`, `manageAssignments`.

---

## Phase 3: Routing Modernization & Fixes

We will upgrade from the legacy `BrowserRouter` to the modern **Data Router** (`createBrowserRouter`) introduced in React Router v6.4+.

### Key Changes
1.  **Centralized Configuration**: Move routes from `App.jsx` to `src/routes/index.jsx`.
2.  **Dynamic Basename**: Use `import.meta.env.BASE_URL` or a specific environment variable to handle deployment subdirectories correctly (fixing the `/app` vs `/` conflict).
3.  **Loaders & Actions**: Utilize React Router loaders for data fetching where appropriate to reduce `useEffect` boilerplate.

```jsx
// Example src/routes/index.jsx
const router = createBrowserRouter([
  {
    path: "/",
    element: <AuthLayout />,
    children: [
      { path: "login", element: <Login /> },
      // ...
    ]
  }
], {
  basename: import.meta.env.VITE_APP_BASENAME || '/'
});
```

---

## Phase 4: Component & Hook Cleanup

### 1. Extract Custom Hooks
-   **`useForm`**: Encapsulate form state, change handling, and validation logic.
-   **`useFetch`**: Simplify data fetching states (`loading`, `error`, `data`) for non-global data.

### 2. Standardize UI Components
-   Refactor `Modal` implementations (currently duplicated in `Disable2FAModal`, `Enable2FAModal`, `AgentManagement`) into a generic `<Modal />` component.
-   Standardize Input fields and Buttons to ensure consistent styling across the app.

---

## Execution Strategy

1.  **Setup**: Create the new directory structure without deleting existing files yet.
2.  **Service Migration**: Create `services/` and migrate API calls one by one.
3.  **Router Refactor**: Implement `createBrowserRouter` in parallel with the existing router, then switch over.
4.  **Component Migration**: Move pages into `features/` and update their imports.
5.  **Cleanup**: Remove the old `api/` directory and unused components.
