import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import styles from './Sidebar.module.css';

const defaultAvatar = 'https://i.pinimg.com/1200x/a9/a8/c8/a9a8c8258957c8c7d6fcd320e9973203.jpg';

const Sidebar = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const handleOverlayClick = () => {
    if (onClose) onClose();
  };

  const handleLinkClick = () => {
    // Close sidebar on mobile when a link is clicked
    if (window.innerWidth <= 768 && onClose) {
      onClose();
    }
  };

  // Check if user is admin - check is_superuser flag OR if any system_role has 'Admin' role_name
  const isAdmin = user?.is_superuser || user?.is_staff || user?.system_roles?.some(sr => sr.role_name === 'Admin');
  const hasMultipleSystems = user?.system_roles?.length > 1;
  
  // Check if user is specifically TTS Admin (must have TTS system AND Admin role)
  const isTTSAdmin = user?.is_superuser || user?.system_roles?.some(sr => 
    sr.system_slug === 'tts' && sr.role_name === 'Admin'
  );

  return (
    <>
      {/* Mobile Overlay */}
      <div 
        className={`${styles.overlay} ${isOpen ? styles.active : ''}`}
        onClick={handleOverlayClick}
      />

      {/* Sidebar */}
      <aside className={`${styles.sidebar} ${isOpen ? styles.active : ''}`}>
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.logo}>
            <img src="/map-logo.png" alt="logo" />
          </div>
          <div className={styles.titleSection}>
            <p><span>Settings</span></p>
          </div>
          {isAdmin && <span className={styles.adminBadge}>admin</span>}
        </div>

        {/* Navigation Menu */}
        <nav className={styles.menu}>
          {/* Account Section */}
          <div className={styles.menuSection}>
            <div className={styles.menuLabel}>Account</div>
            <NavLink 
              to="/profile" 
              className={({ isActive }) => `${styles.menuLink} ${isActive ? styles.active : ''}`}
              onClick={handleLinkClick}
            >
              <i className="fa fa-user"></i> My Profile
            </NavLink>
            <NavLink 
              to="/change-password" 
              className={({ isActive }) => `${styles.menuLink} ${isActive ? styles.active : ''}`}
              onClick={handleLinkClick}
            >
              <i className="fa fa-lock"></i> Account Security
            </NavLink>
          </div>

          {/* Admin Section - Only show for admins */}
          {isAdmin && (
            <div className={styles.menuSection}>
              <div className={styles.menuLabel}>Administration</div>
              <NavLink 
                to="/agents" 
                className={({ isActive }) => `${styles.menuLink} ${isActive ? styles.active : ''}`}
                onClick={handleLinkClick}
              >
                <i className="fa fa-users"></i> Manage Agents
              </NavLink>
              <NavLink 
                to="/invite-agent" 
                className={({ isActive }) => `${styles.menuLink} ${isActive ? styles.active : ''}`}
                onClick={handleLinkClick}
              >
                <i className="fa fa-user-plus"></i> Invite Agent
              </NavLink>
              <NavLink 
                to="/roles" 
                className={({ isActive }) => `${styles.menuLink} ${isActive ? styles.active : ''}`}
                onClick={handleLinkClick}
              >
                <i className="fa fa-cogs"></i> Manage Roles
              </NavLink>
            </div>
          )}

          {/* TTS Admin Section - Only show for TTS Admins */}
          {isTTSAdmin && (
            <div className={styles.menuSection}>
              <div className={styles.menuLabel}>TTS Management</div>
              <NavLink 
                to="/manage-assignments" 
                className={({ isActive }) => `${styles.menuLink} ${isActive ? styles.active : ''}`}
                onClick={handleLinkClick}
              >
                <i className="fa fa-users-cog"></i> Manage Assignments
              </NavLink>
            </div>
          )}

          {/* System & Logout Section */}
          <div className={styles.menuSection}>
            {hasMultipleSystems && (
              <NavLink 
                to="/systems" 
                className={({ isActive }) => `${styles.menuLink} ${isActive ? styles.active : ''}`}
                onClick={handleLinkClick}
              >
                <i className="fa fa-sitemap"></i> Select System
              </NavLink>
            )}
            <button className={styles.menuLink} onClick={handleLogout}>
              <i className="fa fa-sign-out"></i> Logout
            </button>
          </div>
        </nav>

        {/* Footer with User Info */}
        <div className={styles.footer}>
          <div className={styles.userInfo}>
            <NavLink to="/profile" onClick={handleLinkClick}>
              <img
                className={styles.userAvatar}
                src={user?.profile_picture || defaultAvatar}
                alt="User Avatar"
                onError={(e) => { e.target.src = defaultAvatar; }}
              />
            </NavLink>
            <div className={styles.userDetails}>
              <p>{user?.first_name} {user?.middle_name ? `${user.middle_name} ` : ''}{user?.last_name}</p>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
