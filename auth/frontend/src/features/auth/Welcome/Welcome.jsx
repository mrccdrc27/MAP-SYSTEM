import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import { useToast, Button } from '../../../components/common';
import { SYSTEM_INFO, getSystemUrl } from '../../../utils/constants';
import styles from './Welcome.module.css';

const logoUrl = '/map-logo.png';

const Welcome = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated, loading, logout } = useAuth();
  const { ToastContainer, error } = useToast();

  const [redirecting, setRedirecting] = useState(null);

  // Redirect to landing if not authenticated
  useEffect(() => {
    if (!loading && !isAuthenticated) {
      navigate('/', { replace: true });
    }
  }, [isAuthenticated, loading, navigate]);

  // Extract systems from user's system_roles
  const systems = user?.system_roles?.filter(role => role.is_active) || [];

  const handleSystemSelect = (systemRole) => {
    const slug = systemRole.system_slug?.toUpperCase();
    const systemUrl = getSystemUrl(slug);
    
    if (systemUrl) {
      setRedirecting(slug);
      // Add slight delay for visual feedback
      setTimeout(() => {
        window.location.href = systemUrl;
      }, 300);
    } else {
      error('Error', `No URL configured for ${systemRole.system_name || slug}`);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  // Get enriched system info with display metadata
  const getSystemDisplayInfo = (systemRole) => {
    const slug = systemRole.system_slug?.toUpperCase() || '';
    const info = SYSTEM_INFO[slug] || {};
    return {
      ...systemRole,
      displayName: info.name || systemRole.system_name || slug,
      icon: info.icon || 'fa-globe',
      description: info.description || `Access ${systemRole.system_name}`,
      url: getSystemUrl(slug),
      roleName: systemRole.role_name,
    };
  };

  if (loading || (!isAuthenticated && !loading)) {
    return (
      <main className={styles.welcomePage}>
        <div className={styles.loadingContainer}>
          <div className={styles.spinner}></div>
        </div>
      </main>
    );
  }

  return (
    <main className={styles.welcomePage}>
      <ToastContainer />
      
      <section className={styles.welcomeCard}>
        <header className={styles.cardHeader}>
          <div className={styles.logo}>
            <img src={logoUrl} alt="MAP Active logo" />
          </div>
          <h1 className={styles.greeting}>
            Welcome back, {user?.first_name || user?.username || 'User'}!
          </h1>
          <p className={styles.subtitle}>
            Select a system to continue. Choose where you'd like to go today.
          </p>
        </header>

        {systems.length > 0 ? (
          <div className={styles.systemsGrid}>
            {systems.map((systemRole) => {
              const displayInfo = getSystemDisplayInfo(systemRole);
              const isRedirecting = redirecting === systemRole.system_slug?.toUpperCase();
              
              return (
                <button
                  key={systemRole.id || systemRole.system_slug}
                  className={`${styles.systemCard} ${isRedirecting ? styles.redirecting : ''}`}
                  onClick={() => handleSystemSelect(systemRole)}
                  disabled={redirecting !== null}
                >
                  <div className={styles.iconContainer}>
                    <i className={`fa-solid ${displayInfo.icon}`}></i>
                  </div>
                  <h3 className={styles.systemName}>{displayInfo.displayName}</h3>
                  <p className={styles.systemDescription}>{displayInfo.description}</p>
                  <span className={styles.roleTag}>
                    <i className="fa-solid fa-user-tag"></i> {displayInfo.roleName}
                  </span>
                  {isRedirecting && (
                    <div className={styles.redirectIndicator}>
                      <div className={styles.miniSpinner}></div>
                      Redirecting...
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        ) : (
          <div className={styles.emptyState}>
            <i className="fa-solid fa-circle-exclamation"></i>
            <h3>No Systems Assigned</h3>
            <p>Your account is not linked to any systems. Please contact your administrator to request access.</p>
          </div>
        )}

        <footer className={styles.cardFooter}>
          <Link to="/profile" className={styles.profileLink}>
            <Button variant="outline" size="small" icon={<i className="fa-solid fa-user"></i>}>
              Manage Profile
            </Button>
          </Link>
          <Button 
            variant="text" 
            size="small" 
            onClick={handleLogout} 
            icon={<i className="fa-solid fa-arrow-right-from-bracket"></i>}
          >
            Sign out
          </Button>
        </footer>
      </section>
    </main>
  );
};

export default Welcome;
