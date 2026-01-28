import { createBrowserRouter, Navigate, Outlet } from 'react-router-dom';
import { AuthProvider } from '../context/AuthContext';
import { SuperAdminProvider } from '../context/SuperAdminContext';

// Components (Lazy loading could be added here later)
import Login from '../features/auth/Login/Login';
import LandingPage from '../features/auth/LandingPage';
import Welcome from '../features/auth/Welcome';
import Register from '../features/auth/Register/Register';
import ForgotPassword from '../features/auth/ForgotPassword/ForgotPassword';
import ResetPassword from '../features/auth/ResetPassword/ResetPassword';
import Profile from '../features/user/Profile/Profile';
import ChangePassword from '../features/user/ChangePassword/ChangePassword';
import SystemSelect from '../features/user/SystemSelect/SystemSelect';
import AgentManagement from '../features/admin/AgentManagement';
import InviteAgent from '../features/admin/InviteAgent';
import ManageRoles from '../features/admin/ManageRoles';
import ManageAssignments from '../features/admin/ManageAssignments';
import ManageLocations from '../features/admin/ManageLocations';
import SuperAdminLogin from '../features/superadmin/SuperAdminLogin';
import SuperAdminDashboard from '../features/superadmin/SuperAdminDashboard';
import UserMasterlist from '../features/superadmin/UserMasterlist';
import UserForm from '../features/superadmin/UserForm';
import UserImport from '../features/superadmin/UserImport';
import ProtectedRoute from '../components/ProtectedRoute/ProtectedRoute';
import SuperAdminProtectedRoute from '../components/SuperAdminProtectedRoute/SuperAdminProtectedRoute';
import Layout from '../components/Layout/Layout';

const router = createBrowserRouter([
  {
    element: (
      <AuthProvider>
        <Outlet />
      </AuthProvider>
    ),
    children: [
      {
        path: '/',
        element: <LandingPage />,
      },
      {
        path: '/welcome',
        element: (
          <ProtectedRoute>
            <Welcome />
          </ProtectedRoute>
        ),
      },
      {
        path: '/staff',
        element: <Login userType="staff" />,
      },
      {
        path: '/register',
        element: <Register userType="staff" />,
      },
      {
        path: '/staff/register',
        element: <Register userType="staff" />,
      },
      {
        path: '/employee',
        element: <Login userType="employee" />,
      },
      {
        path: '/employee/register',
        element: <Register userType="employee" />,
      },
      {
        path: '/forgot-password',
        element: <ForgotPassword />,
      },
      {
        path: '/staff/forgot-password',
        element: <ForgotPassword userType="staff" />,
      },
      {
        path: '/employee/forgot-password',
        element: <ForgotPassword userType="employee" />,
      },
      {
        path: '/reset-password',
        element: <ResetPassword />,
      },
      {
        path: '/staff/reset-password',
        element: <ResetPassword userType="staff" />,
      },
      {
        path: '/employee/reset-password',
        element: <ResetPassword userType="employee" />,
      },
      {
        path: '/superadmin',
        element: (
          <SuperAdminProvider>
            <Outlet />
          </SuperAdminProvider>
        ),
        children: [
          {
            index: true,
            element: <Navigate to="/superadmin/login" replace />,
          },
          {
            path: 'login',
            element: <SuperAdminLogin />,
          },
          {
            element: (
              <SuperAdminProtectedRoute>
                <Outlet />
              </SuperAdminProtectedRoute>
            ),
            children: [
              {
                path: 'dashboard',
                element: <SuperAdminDashboard />,
              },
              {
                path: 'users',
                children: [
                  {
                    index: true,
                    element: <UserMasterlist />,
                  },
                  {
                    path: 'create',
                    element: <UserForm />,
                  },
                  {
                    path: ':userId/edit',
                    element: <UserForm />,
                  },
                  {
                    path: 'import',
                    element: <UserImport />,
                  },
                ],
              },
            ],
          },
        ],
      },
      {
        element: (
          <ProtectedRoute>
            <Outlet />
          </ProtectedRoute>
        ),
        children: [
          {
            path: '/systems',
            element: <SystemSelect />,
          },
          {
            element: (
              <Layout>
                <Outlet />
              </Layout>
            ),
            children: [
              {
                path: '/profile',
                element: <Profile />,
              },
              {
                path: '/change-password',
                element: <ChangePassword />,
              },
              {
                path: '/agents',
                element: <AgentManagement />,
              },
              {
                path: '/invite-agent',
                element: <InviteAgent />,
              },
              {
                path: '/roles',
                element: <ManageRoles />,
              },
              {
                path: '/manage-assignments',
                element: <ManageAssignments />,
              },
              {
                path: '/manage-locations',
                element: <ManageLocations />,
              },
            ],
          },
        ],
      },
      {
        path: '*',
        element: <Navigate to="/" replace />,
      },
    ]
  }
], {
  basename: import.meta.env.VITE_APP_BASENAME || '/'
});

export default router;

