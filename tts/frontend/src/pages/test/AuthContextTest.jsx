import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import styles from './AuthContextTest.module.css';

export default function AuthContextTest() {
  const auth = useAuth();
  const [expandedSections, setExpandedSections] = useState({
    user: true,
    auth: true,
    roles: false,
    token: false,
  });

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const renderValue = (value) => {
    if (value === null) return <span className={styles.null}>null</span>;
    if (value === undefined) return <span className={styles.undefined}>undefined</span>;
    if (typeof value === 'boolean') return <span className={styles.boolean}>{String(value)}</span>;
    if (typeof value === 'object') {
      return <pre className={styles.json}>{JSON.stringify(value, null, 2)}</pre>;
    }
    return <span className={styles.string}>{String(value)}</span>;
  };

  return (
    <div className={styles.container}>
      <h1>Auth Context State Inspector</h1>
      <p className={styles.subtitle}>Real-time view of authentication state</p>

      {/* Quick Status Bar */}
      <div className={styles.statusBar}>
        <div className={`${styles.statusItem} ${auth.hasAuth ? styles.authenticated : styles.unauthenticated}`}>
          <span className={styles.statusLabel}>Auth Status:</span>
          <span className={styles.statusValue}>{auth.hasAuth ? '✓ Authenticated' : '✗ Not Authenticated'}</span>
        </div>
        <div className={`${styles.statusItem} ${!auth.loading ? styles.ready : styles.loading}`}>
          <span className={styles.statusLabel}>Loading:</span>
          <span className={styles.statusValue}>{auth.loading ? 'Yes' : 'No'}</span>
        </div>
        <div className={`${styles.statusItem} ${auth.initialized ? styles.ready : styles.notReady}`}>
          <span className={styles.statusLabel}>Initialized:</span>
          <span className={styles.statusValue}>{auth.initialized ? 'Yes' : 'No'}</span>
        </div>
      </div>

      {/* User Data Section */}
      <div className={styles.section}>
        <div 
          className={styles.sectionHeader}
          onClick={() => toggleSection('user')}
        >
          <span className={styles.toggle}>{expandedSections.user ? '▼' : '▶'}</span>
          <h2>User Object</h2>
          {auth.user && <span className={styles.badge}>{auth.user.email}</span>}
        </div>
        {expandedSections.user && (
          <div className={styles.sectionContent}>
            {auth.user ? (
              <div className={styles.dataTable}>
                <div className={styles.row}>
                  <span className={styles.key}>ID:</span>
                  <span className={styles.value}>{renderValue(auth.user.id)}</span>
                </div>
                <div className={styles.row}>
                  <span className={styles.key}>Email:</span>
                  <span className={styles.value}>{renderValue(auth.user.email)}</span>
                </div>
                <div className={styles.row}>
                  <span className={styles.key}>First Name:</span>
                  <span className={styles.value}>{renderValue(auth.user.first_name)}</span>
                </div>
                <div className={styles.row}>
                  <span className={styles.key}>Last Name:</span>
                  <span className={styles.value}>{renderValue(auth.user.last_name)}</span>
                </div>
                <div className={styles.row}>
                  <span className={styles.key}>Username:</span>
                  <span className={styles.value}>{renderValue(auth.user.username)}</span>
                </div>
                <div className={styles.row}>
                  <span className={styles.key}>Full Object:</span>
                  <span className={styles.value}>{renderValue(auth.user)}</span>
                </div>
              </div>
            ) : (
              <p className={styles.empty}>No user logged in</p>
            )}
          </div>
        )}
      </div>

      {/* Roles Section */}
      <div className={styles.section}>
        <div 
          className={styles.sectionHeader}
          onClick={() => toggleSection('roles')}
        >
          <span className={styles.toggle}>{expandedSections.roles ? '▼' : '▶'}</span>
          <h2>Roles & Access</h2>
        </div>
        {expandedSections.roles && (
          <div className={styles.sectionContent}>
            {auth.user ? (
              <div className={styles.dataTable}>
                <div className={styles.row}>
                  <span className={styles.key}>All Roles:</span>
                  <span className={styles.value}>{renderValue(auth.user.roles)}</span>
                </div>
                <div className={styles.row}>
                  <span className={styles.key}>Is Admin (TTS):</span>
                  <span className={styles.value}>
                    {renderValue(auth.isAdmin ? auth.isAdmin() : 'function unavailable')}
                  </span>
                </div>
                <div className={styles.row}>
                  <span className={styles.key}>Has TTS Access:</span>
                  <span className={styles.value}>
                    {renderValue(auth.hasTtsAccess ? auth.hasTtsAccess() : 'function unavailable')}
                  </span>
                </div>
              </div>
            ) : (
              <p className={styles.empty}>No user logged in</p>
            )}
          </div>
        )}
      </div>

      {/* Auth Context State Section */}
      <div className={styles.section}>
        <div 
          className={styles.sectionHeader}
          onClick={() => toggleSection('auth')}
        >
          <span className={styles.toggle}>{expandedSections.auth ? '▼' : '▶'}</span>
          <h2>Auth Context State</h2>
        </div>
        {expandedSections.auth && (
          <div className={styles.sectionContent}>
            <div className={styles.dataTable}>
              <div className={styles.row}>
                <span className={styles.key}>user:</span>
                <span className={styles.value}>{renderValue(auth.user)}</span>
              </div>
              <div className={styles.row}>
                <span className={styles.key}>loading:</span>
                <span className={styles.value}>{renderValue(auth.loading)}</span>
              </div>
              <div className={styles.row}>
                <span className={styles.key}>initialized:</span>
                <span className={styles.value}>{renderValue(auth.initialized)}</span>
              </div>
              <div className={styles.row}>
                <span className={styles.key}>hasAuth:</span>
                <span className={styles.value}>{renderValue(auth.hasAuth)}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Token Section */}
      <div className={styles.section}>
        <div 
          className={styles.sectionHeader}
          onClick={() => toggleSection('token')}
        >
          <span className={styles.toggle}>{expandedSections.token ? '▼' : '▶'}</span>
          <h2>Token Info</h2>
        </div>
        {expandedSections.token && (
          <div className={styles.sectionContent}>
            <div className={styles.dataTable}>
              <div className={styles.row}>
                <span className={styles.key}>Token Present:</span>
                <span className={styles.value}>{renderValue(!!auth.getToken())}</span>
              </div>
              <div className={styles.row}>
                <span className={styles.key}>Token (truncated):</span>
                <span className={styles.value}>
                  {auth.getToken() 
                    ? `${auth.getToken().substring(0, 20)}...${auth.getToken().substring(auth.getToken().length - 20)}`
                    : 'No token'
                  }
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className={styles.actions}>
        <button 
          onClick={() => auth.refreshAuth()}
          className={styles.button}
        >
          Refresh Auth
        </button>
        <button 
          onClick={() => window.location.reload()}
          className={styles.button}
        >
          Reload Page
        </button>
        <button 
          onClick={() => auth.logout()}
          className={`${styles.button} ${styles.danger}`}
        >
          Logout
        </button>
      </div>

      {/* Console-style JSON view */}
      <div className={styles.section}>
        <div 
          className={styles.sectionHeader}
        >
          <h2>Raw Context Object</h2>
        </div>
        <div className={styles.sectionContent}>
          <pre className={styles.jsonView}>
{JSON.stringify({
  user: auth.user,
  loading: auth.loading,
  initialized: auth.initialized,
  hasAuth: auth.hasAuth,
  hasToken: !!auth.getToken(),
  isAdmin: auth.isAdmin ? auth.isAdmin() : 'function unavailable',
  hasTtsAccess: auth.hasTtsAccess ? auth.hasTtsAccess() : 'function unavailable',
}, null, 2)}
          </pre>
        </div>
      </div>
    </div>
  );
}
