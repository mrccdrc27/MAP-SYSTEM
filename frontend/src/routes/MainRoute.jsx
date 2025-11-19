import { Route, Routes } from "react-router-dom";
import React from "react";
import ProtectedRoute from "./ProtectedRoute";

// pages > agent
import Dashboard from "../pages/agent/dashboard-page/Dashboard";
import Archive from "../pages/agent/archive-page/Archive";
import Ticket from "../pages/agent/ticket-page/Ticket";
import Track from "../pages/agent/track-page/Track";
import TicketDetail from "../pages/agent/ticket-detail-page/TicketDetail";
import Profile from "../pages/auth/Profile";

// pages > admin
import AdminDashboard from "../pages/admin/dashboard-page/AdminDashboard";
import Workflow from "../pages/admin/workflow-page/Workflow";
import Agent from "../pages/admin/agent-page/Agent";
import AdminArchive from "../pages/admin/archive-page/AdminArchive";
import AdminArchiveDetail from "../pages/admin/archive-page/archive-detail-page/AdminArchiveDetail";
import AdminTicket from "../pages/admin/ticket-page/AdminTicket";

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

      {/* PROTECTED REGISTER - Special case that requires admin privileges */}
      <Route path="/register" element={<ProtectedRegister />} />
      
      {/* PUBLIC REPORT - May need to be protected depending on requirements */}
      <Route path="/report" element={<Report />} />

      {/* WEBSOCKET TEST ROUTES - Available for testing WebSocket functionality */}
      <Route path="/websocket-test" element={<WebSocketTest />} />
      <Route path="/websocket-test/:ticketId" element={<WebSocketTest />} />

      {/* PROTECTED AGENT ROUTES - Available to any user with TTS role */}
      <Route element={<ProtectedRoute requireAgent={true} />}>
        <Route path="/agent/dashboard" element={<Dashboard />} />
        <Route path="/agent/ticket" element={<Ticket />} />
        <Route path="/agent/track" element={<Track />} />
        <Route path="/agent/archive" element={<Archive />} />
        <Route path="/agent/ticket/:id" element={<TicketDetail />} />
        <Route path="/agent/profile" element={<AgentProfile />} />
      </Route>

      {/* PROTECTED ADMIN ROUTES - Only available to users with TTS Admin role */}
      <Route element={<ProtectedRoute requireAdmin={true} />}>
        <Route path="/admin/dashboard" element={<AdminDashboard />} />
        <Route path="/admin/workflow" element={<Workflow />} />
        <Route path="/admin/agent" element={<Agent />} />
        <Route path="/admin/archive" element={<AdminArchive />} />
        <Route path="/admin/archive/:id" element={<AdminArchiveDetail />} />
        <Route path="/admin/ticket" element={<AdminTicket />} />
        <Route path="/admin/ticket/:id" element={<AdminTicketDetail />} />
        <Route path="/admin/workflow/:workflowId" element={<WorkflowEditorPage />} />
        <Route path="/admin/assigned" element={<AdminTicket />} />
        <Route path="/admin/profile" element={<AdminProfile />} />
      </Route>

      {/* WORKFLOW EDITOR ROUTES - Test/development routes */}
      {/* <Route path="/test/workflow/:workflowId" element={<WorkflowEditorPage />} /> */}

      {/* TEST ROUTE - Consider protecting or removing in production */}
      <Route path="/test" element={<Test />} />

      {/* 404 ROUTE */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}