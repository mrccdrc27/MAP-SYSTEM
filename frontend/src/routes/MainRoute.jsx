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
import WorkflowDetail from "../pages/admin/workflow-detail-page/WorkflowDetail";
import AdminTicket from "../pages/admin/ticket-page/AdminTicket";

// auth
import Login from "../pages/auth/Login";
import PasswordReset from "../pages/auth/PasswordReset";
import NotFound from "../pages/error/NotFound";
import AdminTicketDetail from "../pages/admin/ticket-detail-page/AdminTicketDetail";
import AdminProfile from "../pages/auth/AdminProfile";
import ProtectedRegister from "./ProtectedRegister";
import ManageProfile from "../pages/auth/ManageProfile";
import AgentProfile from "../pages/auth/AdminProfile";

// test
import Test from "../pages/test";

export default function MainRoute() {
  return (
    <Routes>
      <Route path="/register" element={<ProtectedRegister />} />
      {/* PUBLIC ROUTES */}
      <Route path="/" element={<Login />} />
      <Route path="/password-reset" element={<PasswordReset />} />

      {/* PROTECTED AGENT ROUTES */}
      <Route element={<ProtectedRoute />}>
        <Route path="/agent/dashboard" element={<Dashboard />} />
        <Route path="/agent/ticket" element={<Ticket />} />
        <Route path="/agent/track" element={<Track />} />
        <Route path="/agent/archive" element={<Archive />} />
        <Route path="/agent/ticket/:id" element={<TicketDetail />} />
        <Route path="/agent/profile" element={<AgentProfile />} />
      </Route>

      {/* PROTECTED ADMIN ROUTES */}
      <Route element={<ProtectedRoute requireAdmin={true} />}>
        <Route path="/admin/dashboard" element={<AdminDashboard />} />
        <Route path="/admin/workflow" element={<Workflow />} />
        <Route path="/admin/agent" element={<Agent />} />
        <Route path="/admin/archive" element={<AdminArchive />} />
        <Route path="/admin/workflow/detail" element={<WorkflowDetail />} />
        <Route path="/admin/ticket" element={<AdminTicket />} />
        <Route path="/admin/ticket/:id" element={<AdminTicketDetail />} />
        <Route path="/admin/assigned" element={<AdminTicket />} />
        <Route path="/admin/workflow/:uuid" element={<WorkflowDetail />} />
        <Route path="/admin/profile" element={<AdminProfile />} />
      </Route>

      <Route path="/test" element={<Test />} />

      {/* 404 */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
