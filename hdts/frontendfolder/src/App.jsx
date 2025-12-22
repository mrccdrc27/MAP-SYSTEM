import { BrowserRouter, useLocation } from 'react-router-dom';
import './App.css';
import AuthRoutes from './routes/AuthRoutes';
import EmployeeRoutes from './routes/EmployeeRoutes';
import CoordinatorAdminRoutes from './routes/CoordinatorAdminRoutes';
import GlobalToast from './shared/toast-notification/GlobalToast';

function RoutesSwitcher() {
  const { pathname } = useLocation();
  // eslint-disable-next-line no-console
  console.debug('[RoutesSwitcher] pathname:', pathname);
  if (pathname.startsWith('/admin')) return <CoordinatorAdminRoutes />;
  if (pathname.startsWith('/employee')) return <EmployeeRoutes />;
  return <AuthRoutes />;
}

function App() {
  return (
    <BrowserRouter>
      <RoutesSwitcher />
      <GlobalToast />
    </BrowserRouter>
  );
}

export default App;
