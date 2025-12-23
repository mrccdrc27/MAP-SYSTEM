import { Routes, Route, Navigate } from "react-router-dom";
import LoginPage from "./pages/Finance/LoginPage";
import ForgotPasswordPage from "./pages/Finance/ForgotPasswordPage"; // Import the ForgotPassword component
import Dashboard from "./pages/Finance/Dashboard";
import LedgerView from "./pages/Finance/LedgerView";
import BudgetAllocation from "./pages/Finance/BudgetAllocation";
import BudgetProposal from "./pages/Finance/BudgetProposal";
import ProposalHistory from "./pages/Finance/ProposalHistory";
import ExpenseTracking from "./pages/Finance/ExpenseTracking";
import ExpenseHistory from "./pages/Finance/ExpenseHistory";
import BudgetVarianceReport from "./pages/Finance/BudgetVarianceReport";
import { useAuth } from "./context/AuthContext"; // Import the custom hook
import ResetPasswordPage from "./pages/ResetPasswordPage"; // Correct path

// --- MODIFICATION START ---
// 1. ProtectedRoute component to handle authentication checks
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  // While checking for authentication, show a loading indicator
  if (loading) {
    return <div>Loading session...</div>;
  }

  // If not authenticated, redirect to the login page.
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // If authenticated, render the requested component.
  return children;
};

// 2. Create a PublicRoute component to handle logged in users on public pages.
const PublicRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return <div>Loading session...</div>;
  }

  // If user is already logged in, redirect them to the dashboard.
  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};
// --- MODIFICATION END ---

function App() {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <Routes>
      {/* --- MODIFICATION START --- */}
      {/* 3. Restructure routes to use the new wrapper components. */}

      {/* Default route */}
      <Route
        path="/"
        element={<Navigate to="/dashboard" replace />} // Always try to go to dashboard first
      />

      {/* Public Routes */}
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

      {/* Protected Routes */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/finance/ledger-view"
        element={
          <ProtectedRoute>
            <LedgerView />
          </ProtectedRoute>
        }
      />
      <Route
        path="/finance/budget-allocation"
        element={
          <ProtectedRoute>
            <BudgetAllocation />
          </ProtectedRoute>
        }
      />
      <Route
        path="/finance/budget-proposal"
        element={
          <ProtectedRoute>
            <BudgetProposal />
          </ProtectedRoute>
        }
      />
      <Route
        path="/finance/proposal-history"
        element={
          <ProtectedRoute>
            <ProposalHistory />
          </ProtectedRoute>
        }
      />
      <Route
        path="/finance/expense-tracking"
        element={
          <ProtectedRoute>
            <ExpenseTracking />
          </ProtectedRoute>
        }
      />
      <Route
        path="/finance/expense-history"
        element={
          <ProtectedRoute>
            <ExpenseHistory />
          </ProtectedRoute>
        }
      />
      <Route
        path="/finance/budget-variance-report"
        element={
          <ProtectedRoute>
            <BudgetVarianceReport />
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}

export default App;