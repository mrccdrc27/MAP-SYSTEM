import { Route, Routes } from "react-router-dom";
import React from "react";
import ProtectedRoute from "./ProtectedRoute";

// pages > agent
import Track from "../pages/agent/track-page/Track";
import Profile from "../pages/auth/Profile";

// pages > admin
import Workflow from "../pages/admin/workflow-page/Workflow";
import Agent from "../pages/admin/agent-page/Agent";
import AdminArchive from "../pages/admin/archive-page/AdminArchive";
import AdminArchiveDetail from "../pages/admin/archive-page/archive-detail-page/AdminArchiveDetail";
import AdminTicket from "../pages/admin/ticket-page/AdminTicket";

// unified pages
import Dashboard from "../pages/unified-page/dashboard-page/Dashboard";
import Ticket from "../pages/unified-page/ticket-page/Ticket";
import TicketDetail from "../pages/unified-page/ticket-detail-page/TicketDetail";
import Archive from "../pages/unified-page/archive-page/Archive";

// reporting
import Report from "../pages/report/Report";

// auth
import Login from "../pages/auth/Login";
import PasswordReset from "../pages/auth/PasswordReset";
import NotFound from "../pages/error/NotFound";
import AdminProfile from "../pages/auth/AdminProfile";
import ProtectedRegister from "./ProtectedRegister";
import ManageProfile from "../pages/auth/ManageProfile";
import AgentProfile from "../pages/auth/AgentProfile";
import Unauthorized from "../pages/error/Unauthorized";

// test
import Test from "../pages/test";
import AdminTicketDetail from "../pages/admin/ticket-detail-page/AdminTicketDetail";
import ResetPassword from "../pages/auth/PasswordReset";
import WorkflowEditorPage from "../pages/test/WorkflowEditorPage";
import AuthContextTest from "../pages/test/AuthContextTest";

// WebSocket test
import WebSocketTest from "../components/WebSocketTest";

export default function MainRoute() {
  return (
    <Routes>
      {/* PUBLIC ROUTES */}
      <Route path="/" element={<Login />} />
      <Route path="/login" element={<Login />} />
      <Route path="/reset-password/:uid/:token" element={<ResetPassword />} />
      <Route path="/unauthorized" element={<Unauthorized />} />

      {/* PROTECTED AGENT ROUTES - Available to any user with TTS role */}
      <Route element={<ProtectedRoute requireAgent={true} />}>
        <Route path="/agent/track" element={<Track />} />
        <Route path="/agent/archive" element={<Archive />} />
        <Route path="/agent/ticket/:id" element={<TicketDetail />} />
        <Route path="/agent/profile" element={<AgentProfile />} />
      </Route>

      {/* PROTECTED ADMIN ROUTES - Only available to users with TTS Admin role */}
      <Route element={<ProtectedRoute requireAdmin={true} />}>
        <Route path="/admin/workflow" element={<Workflow />} />
        <Route path="/admin/agent" element={<Agent />} />
        <Route path="/admin/archive" element={<AdminArchive />} />
        <Route path="/admin/archive/:id" element={<AdminArchiveDetail />} />
        <Route
          path="/admin/workflow/:workflowId"
          element={<WorkflowEditorPage />}
        />
        <Route path="/admin/assigned" element={<AdminTicket />} />
        <Route path="/admin/profile" element={<AdminProfile />} />
      </Route>

      {/* PROTECTED UNIFIED PAGES */}
      <Route element={<ProtectedRoute requireAuth={true} />}>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/ticket" element={<Ticket />} />
        <Route path="/ticket/:id" element={<TicketDetail />} />
        <Route path="/archive" element={<Archive />} />
      </Route>

      {/* PROTECTED REGISTER - Special case that requires admin privileges */}
      <Route path="/register" element={<ProtectedRegister />} />

      {/* PUBLIC REPORT - May need to be protected depending on requirements */}
      <Route path="/report" element={<Report />} />

      {/* WEBSOCKET TEST ROUTES - Available for testing WebSocket functionality */}
      <Route path="/websocket-test" element={<WebSocketTest />} />
      <Route path="/websocket-test/:ticketId" element={<WebSocketTest />} />

      {/* WORKFLOW EDITOR ROUTES - Test/development routes */}
      {/* <Route path="/test/workflow/:workflowId" element={<WorkflowEditorPage />} /> */}

      {/* TEST ROUTE - Consider protecting or removing in production */}
      <Route path="/test" element={<Test />} />
      <Route path="/test/auth-context" element={<AuthContextTest />} />

      {/* 404 ROUTE */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
