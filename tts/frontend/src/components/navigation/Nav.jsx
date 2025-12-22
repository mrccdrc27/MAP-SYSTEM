// style
import styles from "./nav.module.css";

// react
import { NavLink, useLocation } from "react-router-dom";
import { useState, useEffect } from "react";

// modal
import Notification from "../modal/Notification";

// hooks
import { useAuth } from "../../context/AuthContext";
import { useNotifications } from "../../api/useNotification";

// split navs
import AdminNav from './AdminNav';
import AgentNav from './AgentNav';
export default function Nav() {
  const { user, loading, isAdmin, hasTtsAccess } = useAuth();

  if (loading) return null;

  if (typeof isAdmin === "function" && isAdmin()) {
    return <AdminNav />;
  }

  if (typeof hasTtsAccess === "function" && hasTtsAccess()) {
    return <AgentNav />;
  }

  return null;
}
