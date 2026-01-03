import React from 'react';
import styles from './AuthLayout.module.css';

/**
 * Shared layout for Auth pages (Login, Register, Forgot Password)
 */
const AuthLayout = ({ children, title, subtitle, wide = false }) => {
  return (
    <div className={styles.authLayout}>
      <div className={`${styles.authContainer} ${wide ? styles.wide : ''}`}>
        <div className={styles.logo}>
          <h1>TTS AUTH</h1>
        </div>
        
        <div className={styles.card}>
          {title && <h2 style={{ 
            marginBottom: 'var(--space-xs)', 
            fontSize: 'var(--font-2xl)',
            color: 'var(--heading-color)',
            textAlign: 'center'
          }}>{title}</h2>}
          
          {subtitle && <p style={{ 
            marginBottom: 'var(--space-lg)', 
            fontSize: 'var(--font-sm)',
            color: 'var(--muted-text-color)',
            textAlign: 'center'
          }}>{subtitle}</p>}
          
          {children}
        </div>
        
        <div className={styles.footer}>
          &copy; {new Date().getFullYear()} Ticket Tracking System. All rights reserved.
        </div>
      </div>
    </div>
  );
};

export default AuthLayout;
