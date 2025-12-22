import { Routes, Route } from 'react-router-dom';
import SmartSupportLogIn from '../authentication/pages/log-in/SmartSupportLogIn';
import SmartSupportEmployeeCreateAccount from '../authentication/pages/employee-create-account/SmartSupportEmployeeCreateAccount';
import SmartSupportForgotPassword from '../authentication/pages/forgot-password/SmartSupportForgotPassword';
import Unauthorized from "../pages/error/Unauthorized";
import ProtectedRoute from "./ProtectedRoute";
import SSOCallback from '../authentication/pages/sso-callback/SSOCallback';

const AuthRoutes = () => (
  <Routes>
    <Route element={<ProtectedRoute requireAdmin={true} requireAgent={false} />}>
    {/* if logged in, instead of being stuck on root (login) and unauthorized, navigate to proper pages */}
      <Route path="/" element={<SmartSupportLogIn />} />
      <Route path="/unauthorized" element={<Unauthorized />} />
    </Route>
    <Route path="/hdts" element={<SSOCallback />} />
    <Route path="/create-account" element={<SmartSupportEmployeeCreateAccount />} />
    <Route path="/forgot-password" element={<SmartSupportForgotPassword />} />
    {/* Intentionally no top-level catch-all here so other route groups (e.g. /employee, /admin) can match. */}
  </Routes>
);

export default AuthRoutes;
