// style
import styles from "./admin-nav.module.css";

// react
import { NavLink, useLocation } from "react-router-dom";
import { useState, useEffect } from "react";

// modal
import Notification from "../modal/Notification";
import ProfileModal from "../modal/ProfileModal";
import AdminProfileModal from "../modal/AdminProfileModal";

// notifications context (shared WebSocket connection)
import { useNotificationContext } from "../../context/NotificationContext";

// hooks
import { useAuth } from "../../context/AuthContext";

export default function AdminNav() {
  const { user, loading } = useAuth();
  const location = useLocation();
  const [openProfileModal, setOpenProfileModal] = useState(false);
  const [openNotifModal, setOpenNotifModal] = useState(false);
  
  // Use shared notification context (single WebSocket connection)
  const { notifications, fetchNotifications, wsConnected, unreadCount } = useNotificationContext();
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
        <div className={styles.logoSection}>
          <div className={styles.logoImg}>
            <img
              src="/map-logo.png" // relative to the public folder
              alt="logo"
            />
          </div>

          <p>
            {/* Ticket<span>Flow</span> */}
            <span>TicketFlow</span>
          </p>

          <span className={styles.anAdminLogo}>admin</span>
        </div>

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
          {" "}
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
              "https://i.pinimg.com/736x/01/c2/09/01c209e18fd7a17c9c5dcc7a4e03db0e.jpg"
            }
            alt="Anime Avatar"
            onClick={handleAvatarClick}
          />
        </div>

        {openNotifModal && (
          <Notification
            closeNotifAction={() => setOpenNotifModal(false)}
          />
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
