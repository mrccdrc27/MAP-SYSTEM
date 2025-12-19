import { Outlet, useLocation, matchPath } from 'react-router-dom';
import EmployeeNavBar from '../components/header/EmployeeNavigationBar';
import Breadcrumb from '../../shared/components/Breadcrumb';
import { getEmployeeTickets } from '../../utilities/storages/ticketStorage';
import { isActiveStatus } from '../../utilities/helpers/statusMapper';
import { useAuth } from '../../context/AuthContext';
import PageLayout from '../../shared/layouts/PageLayout';

const getHeaderConfig = (path, currentUser, location) => {
  const ticketMatch = matchPath({ path: '/employee/ticket-tracker/:ticketNumber', end: true }, path);

  if (ticketMatch) {
    const ticketNumber = ticketMatch.params.ticketNumber;
    // Prefer explicit navigation state when available (deterministic)
    const fromState = String(location?.state?.from || '').toLowerCase();
    if (fromState) {
      if (fromState === 'home') {
        return {
          root: 'Home',
          currentPage: 'Ticket Tracker',
          rootNavigatePage: '/employee/home',
          title: `${ticketNumber}`,
        };
      }
      if (fromState === 'activetickets' || fromState === 'active-tickets' || fromState === 'active_tickets') {
        return {
          root: 'Active Tickets',
          currentPage: 'Ticket Tracker',
          rootNavigatePage: '/employee/active-tickets/all-active-tickets',
          title: `${ticketNumber}`,
        };
      }
      if (fromState === 'ticketrecords' || fromState === 'ticket-records' || fromState === 'ticket_records') {
        return {
          root: 'Ticket Records',
          currentPage: 'Ticket Tracker',
          rootNavigatePage: '/employee/ticket-records/all-ticket-records',
          title: `${ticketNumber}`,
        };
      }
    }

    // Fallback: try to infer from locally cached tickets
    const tickets = getEmployeeTickets(currentUser?.id);
    const ticket = tickets.find((t) => String(t.ticketNumber) === String(ticketNumber));
    const isActive = ticket && isActiveStatus(ticket.status);

    return {
      root: isActive ? 'Active Tickets' : 'Ticket Records',
      currentPage: 'Ticket Tracker',
      rootNavigatePage: isActive
        ? '/employee/active-tickets/all-active-tickets'
        : '/employee/ticket-records/all-ticket-records',
      title: `${ticketNumber}`,
    };
  }

  const staticHeaders = {
    '/employee/submit-ticket': {
      root: 'Home',
      currentPage: 'Submit Ticket',
      rootNavigatePage: '/employee/home',
      title: 'Ticket Submission Form',
    },
    '/employee/frequently-asked-questions': {
      root: 'Home',
      currentPage: 'Frequently Asked Questions',
      rootNavigatePage: '/employee/home',
      title: 'Frequently Asked Questions',
    },
  };

  return staticHeaders[path] || null;
};

const EmployeeLayout = () => {
  const location = useLocation();
  const pathname = location.pathname;
  const { user: currentUser } = useAuth();
  const headerConfig = getHeaderConfig(pathname, currentUser, location);

  return (
    <PageLayout Navbar={EmployeeNavBar}>
      {headerConfig && (
        <Breadcrumb
          root={headerConfig.root}
          currentPage={headerConfig.currentPage}
          rootNavigatePage={headerConfig.rootNavigatePage}
          title={headerConfig.title}
        />
      )}
      <Outlet />
    </PageLayout>
  );
};

export default EmployeeLayout;
