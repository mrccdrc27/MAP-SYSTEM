import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import AuthLayout from '../../../components/Layout/AuthLayout';
import Button from '../../../components/common/Button';
import styles from './LandingPage.module.css';

const LandingPage = () => {
  const navigate = useNavigate();
  const { isAuthenticated, loading } = useAuth();

  // Redirect authenticated users to /welcome
  useEffect(() => {
    if (!loading && isAuthenticated) {
      navigate('/welcome', { replace: true });
    }
  }, [isAuthenticated, loading, navigate]);

  // Show loading while checking auth
  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        backgroundColor: '#fcfcfc'
      }}>
        <div className="spinner" style={{
          width: '40px',
          height: '40px',
          border: '4px solid #f3f3f3',
          borderTop: '4px solid #007bff',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }}></div>
      </div>
    );
  }

  return (
    <AuthLayout
      title="Map Active Information System"
      subtitle="Please select your user type to continue."
      sideImage="/TTS_MAP_BG.png" 
    >
      <div className={styles.container}>
        <div className={styles.option}>
          <Button
            variant="primary"
            size="large"
            fullWidth
            onClick={() => navigate('/employee')}
            className={styles.button}
            icon={<i className="fa-solid fa-user-tie"></i>}
          >
            Employee
          </Button>
          <p className={styles.description}>
            Access the helpdesk to report issues and track tickets.
          </p>
        </div>

        <div className={styles.divider}>
          <span>OR</span>
        </div>

        <div className={styles.option}>
          <Button
            variant="outline" 
            size="large"
            fullWidth
            onClick={() => navigate('/staff')}
            className={styles.button}
            icon={<i className="fa-solid fa-id-card"></i>}
          >
            Staff
          </Button>
          <p className={styles.description}>
             Manage system resources, tickets, and administrative tasks.
          </p>
        </div>
      </div>
    </AuthLayout>
  );
};

export default LandingPage;

