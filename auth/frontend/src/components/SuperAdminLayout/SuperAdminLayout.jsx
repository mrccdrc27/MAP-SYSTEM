import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useSuperAdmin } from '../../context/SuperAdminContext';
import styles from './SuperAdminLayout.module.css';

const SuperAdminLayout = ({ children }) => {
  const { user, logout } = useSuperAdmin();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/superadmin/login');
  };

  const getInitials = () => {
    if (user?.first_name && user?.last_name) {
      return `${user.first_name.charAt(0)}${user.last_name.charAt(0)}`.toUpperCase();
    }
    return user?.email?.charAt(0).toUpperCase() || 'A';
  };

  return (
    <div className={styles.superAdminWrapper}>
      {/* Sidebar */}
      <nav className={styles.sidebar}>
        <div className={styles.sidebarHeader}>
          <h1>
            <i className="fa fa-shield-halved"></i> Admin
          </h1>
          <p>Superuser Portal</p>
        </div>

        <ul className={styles.navMenu}>
          <li>
            <NavLink
              to="/superadmin/dashboard"
              className={({ isActive }) => isActive ? styles.active : ''}
            >
              <i className="fa fa-chart-line"></i>
              Dashboard
            </NavLink>
          </li>
          <li>
            <NavLink
              to="/superadmin/users"
              className={({ isActive }) => isActive ? styles.active : ''}
            >
              <i className="fa fa-users"></i>
              User Masterlist
            </NavLink>
          </li>
          <li>
            <NavLink to="/superadmin/users/create">
              <i className="fa fa-user-plus"></i>
              Create User
            </NavLink>
          </li>
          <li>
            <NavLink to="/superadmin/users/import">
              <i className="fa fa-file-import"></i>
              Import Users
            </NavLink>
          </li>
        </ul>

        <div className={styles.navDivider}></div>

        <ul className={styles.navMenu}>
          <li>
            <button onClick={handleLogout} className={styles.logoutBtn}>
              <i className="fa fa-sign-out-alt"></i>
              Logout
            </button>
          </li>
        </ul>

        <div className={styles.userInfo}>
          <div className={styles.userInfoContent}>
            <div className={styles.userAvatar}>{getInitials()}</div>
            <div className={styles.userDetails}>
              <p>{user?.first_name || user?.last_name ? `${user.first_name || ''} ${user.last_name || ''}`.trim() : user?.email}</p>
              <span>Superuser</span>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className={styles.mainContent}>{children}</main>
    </div>
  );
};

export default SuperAdminLayout;
