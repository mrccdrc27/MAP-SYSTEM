import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './SuperAdminLogin.module.css';

const SuperAdminLogin = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Check if already logged in as superuser
    const token = localStorage.getItem('superadmin_access_token');
    if (token) {
      navigate('/superadmin/dashboard');
    }
  }, [navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!email || !password) {
      setError('Email and password are required.');
      setLoading(false);
      return;
    }

    try {
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
        navigate('/superadmin/dashboard');
      } else {
        setError(data.error || 'Invalid email or password');
      }
    } catch (err) {
      console.error('Login error:', err);
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  return (
    <div className={styles.loginPage}>
      <div className={styles.loginContainer}>
        <div className={styles.loginHeader}>
          <div className={styles.icon}>
            <i className="fa fa-shield-halved"></i>
          </div>
          <h1>Superuser Login</h1>
          <p>Authentication System Administration</p>
        </div>

        <div className={styles.warningBox}>
          <i className="fa fa-exclamation-triangle"></i>
          <span>This portal is restricted to superuser accounts only.</span>
        </div>

        {error && (
          <div className={styles.errorMessage}>
            <i className="fa fa-exclamation-circle"></i>
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className={styles.formGroup}>
            <label className={styles.formLabel} htmlFor="email">
              Email Address
            </label>
            <div className={styles.inputWrapper}>
              <i className="fa fa-envelope"></i>
              <input
                type="email"
                id="email"
                className={styles.formControl}
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoFocus
                disabled={loading}
              />
            </div>
          </div>

          <div className={styles.formGroup}>
            <label className={styles.formLabel} htmlFor="password">
              Password
            </label>
            <div className={styles.inputWrapper}>
              <i className="fa fa-lock"></i>
              <input
                type={showPassword ? 'text' : 'password'}
                id="password"
                className={styles.formControl}
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
              />
              <button
                type="button"
                className={styles.passwordToggle}
                onClick={togglePasswordVisibility}
              >
                <i className={`fa ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
              </button>
            </div>
          </div>

          <button type="submit" className={styles.btnLogin} disabled={loading}>
            {loading ? (
              <>
                <i className="fa fa-spinner fa-spin"></i> Signing In...
              </>
            ) : (
              <>
                <i className="fa fa-sign-in-alt"></i> Sign In
              </>
            )}
          </button>
        </form>

        <div className={styles.loginFooter}>
          <p>
            Not a superuser? <a href="/login">Go to Staff Login</a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default SuperAdminLogin;
