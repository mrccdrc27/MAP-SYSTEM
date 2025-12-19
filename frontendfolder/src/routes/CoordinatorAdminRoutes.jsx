import { Routes, Route } from 'react-router-dom';
import CoordinatorAdminLayout from '../coordinator-admin/layouts/CoordinatorAdminLayout';
import CoordinatorAdminDashboard from '../coordinator-admin/pages/dashboard/CoordinatorAdminDashboard';
import CoordinatorAdminTicketManagement from '../coordinator-admin/pages/ticket-management/CoordinatorAdminTicketManagement';
import CoordinatorAdminTicketTracker from '../coordinator-admin/pages/ticket-tracker/CoordinatorAdminTicketTracker';
import CoordinatorAdminUserAccess from '../coordinator-admin/pages/user-management/CoordinatorAdminUserAccess';
import CoordinatorAdminUserProfileView from '../coordinator-admin/pages/user-profile/SysAdminUserProfileView';
import CoordinatorAdminSettings from '../coordinator-admin/pages/settings/CoordinatorAdminSettings';
import CoordinatorAdminAccountRegister from '../coordinator-admin/pages/account-register/CoordinatorAdminAccountRegister';
import CoordinatorAdminTicketReports from '../coordinator-admin/pages/reports/CoordinatorAdminTicketReports';
import CoordinatorAdminSLAReports from '../coordinator-admin/pages/reports/CoordinatorAdminSLAReports';
// Knowledgebase admin pages
import KnowledgeCreate from '../coordinator-admin/pages/knowledgebase/KnowledgeCreate';
import KnowledgeEdit from '../coordinator-admin/pages/knowledgebase/KnowledgeEdit';
import KnowledgeArticles from '../coordinator-admin/pages/knowledgebase/KnowledgeArticles';
import KnowledgeArchived from '../coordinator-admin/pages/knowledgebase/KnowledgeArchived';
import KnowledgeArticleView from '../coordinator-admin/pages/knowledgebase-article/KnowledgeArticleView';
import CoordinatorAMSDashboard from '../coordinator-admin/pages/integration/ams/CoordinatorAMSDashboard';
import CoordinatorAMSTickets from '../coordinator-admin/pages/integration/ams/CoordinatorAMSTickets';
import CoordinatorOwnedTickets from '../coordinator-admin/pages/owned-tickets/CoordinatorOwnedTickets';
import CoordinatorOwnedTicketDetail from '../coordinator-admin/pages/owned-tickets/CoordinatorOwnedTicketDetail';
import NotFoundPage from '../shared/not-found-page/NotFoundPage';
// protected route
import ProtectedRoute from "./ProtectedRoute";

const CoordinatorAdminRoutes = () => (
  <Routes>
    <Route element={<ProtectedRoute requireAdmin={true} />}>
    <Route path="/admin" element={<CoordinatorAdminLayout />}>
      {/* Dashboard */}
      <Route path="dashboard" element={<CoordinatorAdminDashboard />} />

      {/* Ticket Management (Dynamic by Status) */}
      <Route path="ticket-management/:status" element={<CoordinatorAdminTicketManagement />} />

      {/* Ticket Tracker (Dynamic by Ticket ID) */}
      <Route path="ticket-tracker/:ticketNumber" element={<CoordinatorAdminTicketTracker />} />

      {/* User Access (Dynamic by Status) */}
      <Route path="user-access/:status" element={<CoordinatorAdminUserAccess />} />

      {/* Account Register */}
      <Route path="account-register" element={<CoordinatorAdminAccountRegister />} />
  {/* User Profile View */}
  <Route path="user-profile/:companyId" element={<CoordinatorAdminUserProfileView />} />

      {/* Reports */}
      <Route path="reports/tickets" element={<CoordinatorAdminTicketReports />} />
      <Route path="reports/sla" element={<CoordinatorAdminSLAReports />} />

      {/* Settings */}
      <Route path="settings" element={<CoordinatorAdminSettings />} />
      {/* Knowledgebase */}
      <Route path="knowledge">
        <Route path="articles" element={<KnowledgeArticles />} />
        <Route path="view/:id" element={<KnowledgeArticleView />} />
        <Route path="archived" element={<KnowledgeArchived />} />
        <Route path="create" element={<KnowledgeCreate />} />
        <Route path="edit/:id" element={<KnowledgeEdit />} />
      </Route>
      {/* AMS integration routes */}
      <Route path="ams">
        <Route path="dashboard" element={<CoordinatorAMSDashboard />} />
        <Route path="tickets" element={<CoordinatorAMSTickets />} />
      </Route>

      {/* Owned Tickets routes */}
      <Route path="owned-tickets">
        <Route path="" element={<CoordinatorOwnedTickets />} />
        <Route path=":ticketNumber" element={<CoordinatorOwnedTicketDetail />} />
      </Route>
      
      <Route path="*" element={<NotFoundPage />} />
    </Route>
    </Route>
  </Routes>
);

export default CoordinatorAdminRoutes;
