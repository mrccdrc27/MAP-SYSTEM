import React from 'react';
import styles from './AuthLayout.module.css';

/**
 * Shared layout for Auth pages (Login, Register, Forgot Password)
 */
const AuthLayout = ({ children, title, subtitle, sideImage, logoImage, wide = false }) => {
  return (
    <main className={styles.loginPage}>
      {/* Left Panel */}
      <section className={styles.leftPanel}>
        <div className={styles.leftImage}>
          <img src={sideImage || "/TTS_MAP_BG.png"} alt="Background" className={styles.assetImage} />
        </div>
      </section>

      {/* Right Panel */}
      <section className={styles.rightPanel}>
        <header className={styles.formHeader}>
          <section className={styles.logo}>
            <img src={logoImage || "/map-logo.png"} alt="Logo" />
            <h1 className={styles.logoText}>{title || "Sign In"}</h1>
          </section>
          {subtitle && <p>{subtitle}</p>}
        </header>
        
        <div className={`${styles.formContainer} ${wide ? styles.wide : ''}`}>
          {children}
        </div>
      </section>
    </main>
  );
};

export default AuthLayout;
