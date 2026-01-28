import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import { getUserSystems, selectSystem } from '../../../services/userService';
import { useToast, Button } from '../../../components/common';
import styles from './SystemSelect.module.css';

const logoUrl = '/map-logo.png';

const SystemSelect = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { ToastContainer, error, success } = useToast();

  const [systems, setSystems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selecting, setSelecting] = useState(null);

  useEffect(() => {
    fetchSystems();
  }, []);

  const fetchSystems = async () => {
    setIsLoading(true);
    try {
      const response = await getUserSystems();
      if (response.ok) {
        setSystems(response.data.systems || response.data || []);
      } else {
        error('Error', 'Failed to load systems');
      }
    } catch (err) {
      console.error('Error fetching systems:', err);
      error('Error', 'Failed to load systems');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectSystem = async (systemSlug) => {
    setSelecting(systemSlug);
    try {
      const response = await selectSystem(systemSlug);
      if (response.ok) {
        success('Success', `Switched to ${systemSlug.toUpperCase()}`);
        // Redirect to the system's frontend or profile
        setTimeout(() => {
          // You can customize this redirect based on the system
          if (response.data.redirect_url) {
            window.location.href = response.data.redirect_url;
          } else {
            navigate('/profile');
          }
        }, 500);
      } else {
        error('Error', response.data.message || 'Failed to select system');
      }
    } catch (err) {
      console.error('Error selecting system:', err);
      error('Error', 'Failed to select system');
    } finally {
      setSelecting(null);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  if (isLoading) {
    return (
      <main className={styles.systemSelectPage}>
        <div className={styles.loadingContainer}>
          <div className={styles.spinner}></div>
        </div>
      </main>
    );
  }

  return (
    <main className={styles.systemSelectPage}>
      <ToastContainer />
      
      <section className={styles.systemCard}>
        <header className={styles.cardHeader}>
          <div className={styles.logo}>
            <img src={logoUrl} alt="MAP Active logo" />
            <h1>Select a System</h1>
          </div>
          <p>Choose which system you want to access. You can change this later from the system switcher.</p>
        </header>

        {systems.length > 0 ? (
          <div className={styles.systemList}>
            {systems.map((system) => (
              <Button
                key={system.slug || system.id}
                className={styles.systemOption}
                onClick={() => handleSelectSystem(system.slug)}
                isLoading={selecting === system.slug}
                disabled={selecting !== null && selecting !== system.slug}
              >
                <div className={styles.systemOptionContent}>
                  <span className={styles.systemName}>{system.name}</span>
                  <span className={styles.systemMeta}>
                    <i className="fa-solid fa-network-wired"></i>
                    {system.slug}
                  </span>
                </div>
              </Button>
            ))}
          </div>
        ) : (
          <div className={styles.emptyState}>
            <i className="fa-solid fa-circle-exclamation"></i>
            <p>Your account is not linked to any systems. Contact support to request access.</p>
          </div>
        )}

        <footer className={styles.cardFooter}>
          <Link to="/profile" className={styles.profileLink}>
            <Button variant="outline" size="small" icon={<i className="fa-solid fa-user"></i>}>
              Go to Profile
            </Button>
          </Link>
          <Button variant="text" size="small" onClick={handleLogout} icon={<i className="fa-solid fa-arrow-right-from-bracket"></i>}>
            Sign out
          </Button>
        </footer>
      </section>
    </main>
  );
};

export default SystemSelect;
