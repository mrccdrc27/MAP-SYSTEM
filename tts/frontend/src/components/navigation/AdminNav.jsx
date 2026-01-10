// style
import styles from "./admin-nav.module.css";

// react
import { Link, NavLink, useLocation } from "react-router-dom";
import { useState, useEffect } from "react";

// modal
import Notification from "../modal/Notification";
import ProfileModal from "../modal/ProfileModal";
import AdminProfileModal from "../modal/AdminProfileModal";

// notifications context (shared WebSocket connection)
import { useNotificationContext } from "../../context/NotificationContext";

// hooks
import { useAuth } from "../../context/AuthContext";

import ThemeToggle from "../component/ThemeToggle";

export default function AdminNav() {
  const { user, loading } = useAuth();
  const location = useLocation();
  const [openProfileModal, setOpenProfileModal] = useState(false);
  const [openNotifModal, setOpenNotifModal] = useState(false);

  // Use shared notification context (single WebSocket connection)
  const { notifications, fetchNotifications, wsConnected, unreadCount } =
    useNotificationContext();
  // nav hide on scroll
  const [hideNav, setHideNav] = useState(false);
  const [lastScrollY, setLastScrollY] = useState(0);

  useEffect(() => {
    const hadleScroll = () => {
      const currentScroll = window.scrollY;

      if (currentScroll > lastScrollY && currentScroll > 80) {
        setHideNav(true);
      } else {
        setHideNav(false);
      }
      setLastScrollY(currentScroll);
    };

    window.addEventListener("scroll", hadleScroll);
    return () => {
      window.removeEventListener("scroll", hadleScroll);
    };
  }, [lastScrollY]);

  // unreadCount is now provided by context

  const handleAvatarClick = () => {
    setOpenProfileModal((prev) => !prev);
    setOpenNotifModal(false);
  };

  const handleNotifClick = () => {
    setOpenNotifModal((prev) => !prev);
    setOpenProfileModal(false);
  };

  // modal close when the page is resized
  useEffect(() => {
    const handleResize = () => {
      setOpenProfileModal(false);
      setOpenNotifModal(false);
      setUserMenuOpen(false);
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  // Burger Menu
  const [menuOpen, setMenuOpen] = useState(false);
  const toggleMenu = () => {
    setMenuOpen(!menuOpen);
    setUserMenuOpen(false);
  };

  // Three dots Menu
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const toggleUserMenu = () => {
    setUserMenuOpen((prev) => !prev);
    setMenuOpen(false);
    setOpenProfileModal(false);
    setOpenNotifModal(false);
  };

  return (
    <>
      <nav className={`${styles.navBar} ${hideNav ? styles.hide : ""}`}>
        {/* logo */}
        <Link to="/dashboard" className={styles.logoLink}>
          <div className={styles.logoSection}>
            <div className={styles.logoImg}>
              <img src="/map-logo.png" alt="logo" />
            </div>

            <p>
              <span>TicketFlow</span>
            </p>

            <span className={styles.anAdminLogo}>admin</span>
          </div>
        </Link>

        {/* nav-links */}
        <div className={`${styles.navLinks} ${menuOpen ? styles.active : ""}`}>
          <NavLink
            // to="/admin/dashboard"
            to="/dashboard"
            end
            className={({ isActive }) =>
              isActive ? `${styles.navLink} ${styles.active}` : styles.navLink
            }
          >
            Dashboard
          </NavLink>
          <NavLink
            to="/ticket"
            className={({ isActive }) =>
              isActive ? `${styles.navLink} ${styles.active}` : styles.navLink
            }
          >
            Tasks
          </NavLink>
          <NavLink
            to="/admin/workflow"
            className={({ isActive }) =>
              isActive ? `${styles.navLink} ${styles.active}` : styles.navLink
            }
          >
            Workflow
          </NavLink>
          {/* <NavLink
            to="/admin/agent"
            className={({ isActive }) =>
              isActive ? `${styles.navLink} ${styles.active}` : styles.navLink
            }
          >
            Agent
          </NavLink> */}
          <NavLink
            to="/admin/archive"
            className={({ isActive }) =>
              isActive ? `${styles.navLink} ${styles.active}` : styles.navLink
            }
          >
            Tickets
          </NavLink>
          <NavLink
            to="/report"
            className={({ isActive }) =>
              isActive ? `${styles.navLink} ${styles.active}` : styles.navLink
            }
          >
            Reports
          </NavLink>
        </div>

        {/* Profile and Notif icon */}
        <div
          className={`${styles.userSection} ${
            userMenuOpen ? styles.userSectionOpen : ""
          }`}
        >
          <ThemeToggle />
          <div className={styles.notifBell} onClick={handleNotifClick}>
            <i className="fa fa-bell"></i>
            {unreadCount > 0 && (
              <span className={styles.notifBadge}>
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
          </div>
          <img
            className={styles.userAvatar}
            src={
              user?.profile_picture ||
              "https://i.pinimg.com/1200x/a9/a8/c8/a9a8c8258957c8c7d6fcd320e9973203.jpg"
            }
            alt="Anime Avatar"
            onClick={handleAvatarClick}
          />
        </div>

        {openNotifModal && (
          <Notification closeNotifAction={() => setOpenNotifModal(false)} />
        )}
        {openProfileModal && (
          <AdminProfileModal
            closeProfileAction={() => setOpenProfileModal(false)}
          />
        )}
      </nav>
    </>
  );
}
