import { Routes, Route, Navigate } from "react-router-dom";
import LoginPage from "./pages/Finance/LoginPage";
import ForgotPasswordPage from "./pages/Finance/ForgotPasswordPage";
import Dashboard from "./pages/Finance/Dashboard";
import LedgerView from "./pages/Finance/LedgerView";
import BudgetAllocation from "./pages/Finance/BudgetAllocation";
import BudgetProposal from "./pages/Finance/BudgetProposal";
import ProposalHistory from "./pages/Finance/ProposalHistory";
import ExpenseTracking from "./pages/Finance/ExpenseTracking";
import ExpenseHistory from "./pages/Finance/ExpenseHistory";
import BudgetVarianceReport from "./pages/Finance/BudgetVarianceReport";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import { useAuth } from "./context/AuthContext";
import ProtectedRoute, { PublicRoute, UnauthorizedPage } from "./components/ProtectedRoute";

/**
 * BMS App with centralized auth and role-based access control.
 * 
 * BMS Roles:
 * - ADMIN: Full access to all features
 * - FINANCE_HEAD: Access to financial operations and reports
 * - GENERAL_USER: Basic access to view reports
 * 
 * Route Access:
 * - /dashboard: All authenticated BMS users
 * - /finance/ledger-view: All authenticated BMS users
 * - /finance/budget-allocation: ADMIN, FINANCE_HEAD only
 * - /finance/budget-proposal: ADMIN, FINANCE_HEAD only
 * - /finance/proposal-history: All authenticated BMS users
 * - /finance/expense-tracking: ADMIN, FINANCE_HEAD only
 * - /finance/expense-history: All authenticated BMS users
 * - /finance/budget-variance-report: All authenticated BMS users
 */

function App() {
  const { loading, initialized } = useAuth();

  // Show loading while auth is being checked
  if (loading || !initialized) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        fontSize: '16px'
      }}>
        Loading...
      </div>
    );
  }

  return (
    <Routes>
      {/* Default route - redirect to dashboard */}
      <Route path="/" element={<Navigate to="/dashboard" replace />} />

      {/* Unauthorized page */}
      <Route path="/unauthorized" element={<UnauthorizedPage />} />

      {/* Public Routes - redirect to dashboard if already logged in */}
      <Route
        path="/login"
        element={
          <PublicRoute>
            <LoginPage />
          </PublicRoute>
        }
      />
      <Route
        path="/forgot-password"
        element={
          <PublicRoute>
            <ForgotPasswordPage />
          </PublicRoute>
        }
      />
      <Route
        path="/reset-password/:uid/:token"
        element={
          <PublicRoute>
            <ResetPasswordPage />
          </PublicRoute>
        }
      />

      {/* Protected Routes - All BMS users */}
      <Route element={<ProtectedRoute />}>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/finance/ledger-view" element={<LedgerView />} />
        <Route path="/finance/proposal-history" element={<ProposalHistory />} />
        <Route path="/finance/expense-history" element={<ExpenseHistory />} />
        <Route path="/finance/budget-variance-report" element={<BudgetVarianceReport />} />
        
        {/* MODIFICATION START: Moved to general access so Operators can create/request items */}
        <Route path="/finance/budget-allocation" element={<BudgetAllocation />} />
        <Route path="/finance/budget-proposal" element={<BudgetProposal />} />
        <Route path="/finance/expense-tracking" element={<ExpenseTracking />} />
        {/* MODIFICATION END */}
      </Route>

      {/* Protected Routes - ADMIN and FINANCE_HEAD only */}
      <Route element={<ProtectedRoute allowedRoles={['ADMIN', 'FINANCE_HEAD']} />}>
         {/* Currently empty as core workflows require Operator input. 
             If you add "System Settings" or "User Management" pages later, put them here. */}
      </Route>

      {/* Catch-all route for 404 */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

export default App;