import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useToast, Button, Input } from '../../../components/common';
import { AuthLayout } from '../../../components/layout';
import { useSuperAdmin } from '../../../context/SuperAdminContext';
import styles from './SuperAdminLogin.module.css';

const SuperAdminLogin = () => {
  const navigate = useNavigate();
  const { ToastContainer, error: toastError, success: toastSuccess } = useToast();
  const { checkSession, isAuthenticated } = useSuperAdmin();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Check if already authenticated as superuser
    if (isAuthenticated) {
      navigate('/superadmin/dashboard');
    }
  }, [navigate, isAuthenticated]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    if (!email || !password) {
      setError('Email and password are required.');
      return;
    }

    setLoading(true);
    try {
      // Use the correct port (8003) based on the auth service configuration
      const response = await fetch('http://localhost:8003/superadmin/api/login/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (response.ok) {
        toastSuccess('Login Successful', 'Redirecting to dashboard...');
        
        // After successful login, check the session to update context
        await checkSession();
        
        // Navigate to dashboard
        setTimeout(() => navigate('/superadmin/dashboard'), 1000);
      } else {
        const errorMsg = data.error || 'Invalid email or password';
        setError(errorMsg);
        toastError('Login Failed', errorMsg);
      }
    } catch (err) {
      console.error('Login error:', err);
      setError('An error occurred. Please try again.');
      toastError('Error', 'An error occurred during login.');
    } finally {
      setLoading(false);
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  return (
    <AuthLayout
      title="Superuser Login"
      subtitle="Authentication System Administration Portal"
      sideImage="/TTS_MAP_BG.png" // Using the standard background
    >
      <ToastContainer />
      
      <div className={styles.warningBox}>
        <i className="fa-solid fa-shield-halved"></i>
        <span>This portal is restricted to system administrators.</span>
      </div>

      <form onSubmit={handleSubmit} className={styles.loginForm}>
        <Input
          label="Superuser Email:"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Enter superuser email"
          required
          autoFocus
          disabled={loading}
          className={styles.roundedInput}
          icon={<i className="fa-solid fa-envelope"></i>}
        />

        <Input
          label="Password:"
          type={showPassword ? 'text' : 'password'}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Enter password"
          required
          disabled={loading}
          className={styles.roundedInput}
          icon={
            password ? (
              <i className={`fa-solid ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
            ) : null
          }
          onIconClick={togglePasswordVisibility}
        />

        {error && (
          <div className={styles.errorMessage}>
            <i className="fa-solid fa-circle-exclamation"></i>
            <span>{error}</span>
          </div>
        )}

        <Button
          type="submit"
          className={styles.logInButton}
          isLoading={loading}
          variant="primary"
          size="large"
          fullWidth
        >
          Sign In as Administrator
        </Button>

        <div className={styles.formFooter}>
          <Link to="/login" className={styles.backLink}>
            <i className="fa-solid fa-arrow-left"></i> Back to Staff Login
          </Link>
        </div>
      </form>
    </AuthLayout>
  );
};

export default SuperAdminLogin;
