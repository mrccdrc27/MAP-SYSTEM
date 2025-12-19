import React from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import styles from "./unauthorized.module.css";

const Unauthorized = () => {
  const { user, isAdmin, hasSystemAccess, logout } = useAuth();

  const getRedirectPath = () => {
    if (!user) return "/login";
    if (isAdmin) return "/admin/dashboard";
    if (hasSystemAccess) return "/agent/dashboard";
    return "/login";
  };

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.iconWrapper}>
          <i className={`fas fa-lock ${styles.icon}`}></i>
        </div>

        <h1 className={styles.title}>Access Denied</h1>
        <p className={styles.message}>
          You don’t have permission to view this page.
          <br />
          Please check your account permissions or return to a safe page.
        </p>

        <div className={styles.buttonGroup}>
          {/* <Link to={getRedirectPath()} className={styles.primaryButton}>
            Return to Dashboard
          </Link> */}

          {user ? (
            <button
              onClick={logout}
              className={styles.secondaryButton}
              aria-label="Back to login and sign out"
            >
              Log Out
            </button>
          ) : (
            <Link to="/login" className={styles.secondaryButton}>
              Log In
            </Link>
          )}
        </div>

        <div className={styles.footer}>
          Need help?{" "}
          <Link to="/support" className={styles.supportLink}>
            Contact Support
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Unauthorized;
