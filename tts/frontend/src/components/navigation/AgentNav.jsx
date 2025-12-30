// style
import styles from "./agent-nav.module.css";

// react
import { NavLink, useLocation } from "react-router-dom";
import { useState, useEffect, useRef } from "react";

// modal
import Notification from "../modal/Notification";
import ProfileModal from "../modal/ProfileModal";

// hooks
import { useAuth } from "../../context/AuthContext";
import { useNotificationContext } from "../../context/NotificationContext";

import ThemeToggle from "../component/ThemeToggle";

export default function AgentNav() {
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

  // console.log("User in AgentNav:", user);

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
        </div>

        {/* nav-links */}
        <div className={`${styles.navLinks} ${menuOpen ? styles.active : ""}`}>
          <NavLink
            // to="/agent/dashboard"
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
            Task
          </NavLink>
          <NavLink
            to="/agent/track"
            className={({ isActive }) =>
              isActive ? `${styles.navLink} ${styles.active}` : styles.navLink
            }
          >
            Track
          </NavLink>
          <NavLink
            to="/archive"
            className={({ isActive }) =>
              isActive ? `${styles.navLink} ${styles.active}` : styles.navLink
            }
          >
            Archive
          </NavLink>
        </div>

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
            // src="https://i.pinimg.com/736x/e6/50/7f/e6507f42d79520263d8d952633cedcf2.jpg"
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
          <ProfileModal closeProfileAction={() => setOpenProfileModal(false)} />
        )}
      </nav>
    </>
  );
}
