import { StrictMode, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.jsx';
import { AuthProvider } from './context/AuthContext.jsx';
import AuthExpiredModal from './shared/components/AuthExpiredModal';
import createSessionTimeout from './utils/sessionTimeout';

const Root = () => {
  const [expired, setExpired] = useState(false);

  useEffect(() => {
    const handler = () => setExpired(true);
    window.addEventListener('auth:expired', handler);
    return () => window.removeEventListener('auth:expired', handler);
  }, []);

  useEffect(() => {
    // Protect against double initialization in React StrictMode (dev)
    if (window.__APP_SESSION_INITIALIZED__) {
      // eslint-disable-next-line no-console
      console.debug('[main.jsx] session already initialized - skipping duplicate init');
      return;
    }

    // Create an INACTIVITY timeout watcher (separate from access/refresh token logic)
    // This only fires if user is inactive for 30 minutes - does NOT interfere with token refresh
    const session = createSessionTimeout({ 
      timeoutMinutes: 30, // 30 minutes inactivity timeout
      onTimeout: () => {
        if (import.meta.env.DEV) console.debug('[main.jsx] Inactivity timeout fired - user will be logged out');
      }
    });
    
    // Expose globally for debugging and mark initialized so StrictMode won't re-init
    window.__APP_SESSION__ = session;
    window.__APP_SESSION_INITIALIZED__ = true;

    // Start the inactivity watcher if user is logged in (has any access token).
    // Some deployments use cookie-based SSO (access token stored in cookie).
    const cookieHasToken = (() => {
      try {
        const m = document.cookie.match(/(?:^|; )access_token=([^;]+)/);
        return !!(m && m[1]);
      } catch (e) {
        return false;
      }
    })();

    const hasToken = !!(
      localStorage.getItem('admin_access_token') || 
      localStorage.getItem('employee_access_token') || 
      localStorage.getItem('access_token') ||
      cookieHasToken
    );
    
    if (hasToken) {
      if (import.meta.env.DEV) console.debug('[main.jsx] Token found - starting inactivity watcher');
      session.start();
    } else {
      if (import.meta.env.DEV) console.debug('[main.jsx] No token found - inactivity watcher not started');
    }

    // Listen for login/logout events to start/stop the inactivity watcher
    const onLogin = () => {
      if (import.meta.env.DEV) console.debug('[main.jsx] auth:login event - starting inactivity watcher');
      session.start();
    };
    const onLogout = () => {
      if (import.meta.env.DEV) console.debug('[main.jsx] auth:logout event - stopping inactivity watcher');
      session.stop();
    };
    
    window.addEventListener('auth:login', onLogin);
    window.addEventListener('auth:logout', onLogout);

    // Listen to storage events (other tabs) to sync the watcher
    const onStorage = (e) => {
      if (e.key && (e.key.includes('access_token'))) {
        const present = !!(
          localStorage.getItem('admin_access_token') || 
          localStorage.getItem('employee_access_token') || 
          localStorage.getItem('access_token')
        );
        if (present) {
          if (import.meta.env.DEV) console.debug('[main.jsx] Storage event - token added, starting watcher');
          session.start();
        } else {
          if (import.meta.env.DEV) console.debug('[main.jsx] Storage event - token removed, stopping watcher');
          session.stop();
        }
      }
    };
    window.addEventListener('storage', onStorage);

    return () => {
      try { session.stop(); } catch (e) {}
      window.removeEventListener('auth:login', onLogin);
      window.removeEventListener('auth:logout', onLogout);
      window.removeEventListener('storage', onStorage);
      // Do not unset __APP_SESSION_INITIALIZED__ so that strict-mode mounts don't re-init
    };
  }, []);

  useEffect(() => {
    const appEl = document.getElementById('app-root');
    if (!appEl) return;
    if (expired) appEl.classList.add('aem-blur');
    else appEl.classList.remove('aem-blur');
  }, [expired]);

  return (
    <>
      <div id="app-root">
        <App />
      </div>
      <AuthExpiredModal open={expired} onClose={() => {
        // Clear auth state then redirect when user confirms
        try { localStorage.removeItem('access_token'); localStorage.removeItem('refresh_token'); } catch(e) {}
        try { localStorage.removeItem('admin_access_token'); localStorage.removeItem('employee_access_token'); } catch(e) {}
        try { localStorage.removeItem('admin_refresh_token'); localStorage.removeItem('employee_refresh_token'); } catch(e) {}
        try { localStorage.removeItem('user'); localStorage.removeItem('loggedInUser'); } catch(e) {}
        setExpired(false);
        window.location.href = '/';
      }} />
    </>
  );
};

createRoot(document.getElementById('root')).render(
  <StrictMode>
      <AuthProvider>
        <Root />    
      </AuthProvider>
  </StrictMode>
);
