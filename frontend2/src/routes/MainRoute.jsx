// react
import { Route, Routes } from "react-router-dom";
import React from "react";

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

export default function MainRoute() {
  return (
    <Routes>
      {/* AUTH */}
      <Route path="/" element={<Login />} />
      <Route path="/password-reset" element={<PasswordReset />} />

      {/* AGENT */}
      <Route path="/agent/dashboard" element={<Dashboard />} />
      <Route path="/agent/ticket" element={<Ticket />} />
      <Route path="/agent/track" element={<Track />} />
      <Route path="/agent/archive" element={<Archive />} />
      <Route path="/agent/ticket/:id" element={<TicketDetail />} />
      <Route path="/profile" element={<Profile />} />

      {/* ADMIN */}
      <Route path="/admin/dashboard" element={<AdminDashboard />} />
      <Route path="/admin/workflow" element={<Workflow />} />
      <Route path="/admin/agent" element={<Agent />} />
      <Route path="/admin/archive" element={<AdminArchive />} />
      <Route path="/admin/workflow/detail" element={<WorkflowDetail />} />
      <Route path="/admin/ticket" element={<AdminTicket />} />
    </Routes>
  );
}
