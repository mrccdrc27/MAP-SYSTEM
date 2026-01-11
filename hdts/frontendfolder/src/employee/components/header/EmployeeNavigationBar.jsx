import { useState, useRef, useEffect } from 'react';
import useScrollShrink from '../../../shared/hooks/useScrollShrink.jsx';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { FiMenu, FiX } from 'react-icons/fi';
import styles from './EmployeeNavigationBar.module.css';
import MapLogo from '../../../shared/assets/MapLogo.png';
import EmployeeNotification from '../popups/EmployeeNotification';
import authService from '../../../utilities/service/authService';
import { backendAuthService } from '../../../services/backend/authService';
import { backendEmployeeService } from '../../../services/backend/employeeService';
import { API_CONFIG } from '../../../config/environment';
import { resolveMediaUrl } from '../../../utilities/helpers/mediaUrl';
import { convertToSecureUrl, isSecureUrl } from '../../../utilities/secureMedia';
import { useAuth } from '../../../context/AuthContext';

// Fallback profile image
const DEFAULT_PROFILE_IMAGE = 'https://img.freepik.com/free-vector/blue-circle-with-white-user_78370-4707.jpg';

const NotificationIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="currentColor"
    className={styles['notif-icon']}
  >
    <path
      fillRule="evenodd"
      d="M5.25 9a6.75 6.75 0 0113.5 0v.75c0 2.123.8 4.057 2.118 5.52a.75.75 0 01-.297 1.206c-1.544.57-3.16.99-4.831 1.243a3.75 3.75 0 11-7.48 0 24.585 24.585 0 01-4.831-1.244.75.75 0 01-.298-1.205A8.217 8.217 0 005.25 9.75V9zm4.502 8.9a2.25 2.25 0 104.496 0 25.057 25.057 0 01-4.496 0z"
      clipRule="evenodd"
    />
  </svg>
);

const ArrowDownIcon = ({ isFlipped }) => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    className={`${styles['arrow-icon']} ${isFlipped ? styles['arrow-flipped'] : ''}`}
  >
    <polyline points="6 9 12 15 18 9" />
  </svg>
);

const EmployeeNavBar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user: currentUser } = useAuth();
  const navRef = useRef(null);

  const [openDropdown, setOpenDropdown] = useState(null);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showNotification, setShowNotification] = useState(false);
  const [notifCount, setNotifCount] = useState(0);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  // track profile image via state so we can update it dynamically
  const [profileImageUrl, setProfileImageUrl] = useState(currentUser?.image || currentUser?.profileImage || currentUser?.profile_picture || DEFAULT_PROFILE_IMAGE);
  const [backendAvailable, setBackendAvailable] = useState(true); // Always assume backend is available
  const scrolled = useScrollShrink(0, { debug: false });

  // Fetch employee profile with image on mount
  useEffect(() => {
    const fetchProfileImage = async () => {
      try {
        const AUTH_BASE = API_CONFIG.AUTH.BASE_URL.replace(/\/$/, '');

        // Helper to normalize and secure any returned image URL
        const normalizeImageUrl = (rawUrl, base) => {
          if (!rawUrl) return null;
          let imageUrl = rawUrl;
          if (typeof imageUrl !== 'string') imageUrl = (imageUrl.url || imageUrl.image || '') + '';
          imageUrl = imageUrl.trim();

          // If already absolute or data URL, prefer it
          if (imageUrl.startsWith('data:') || imageUrl.startsWith('http')) return convertToSecureUrl(imageUrl) || imageUrl;

          // If relative path, attach provided base
          if (base) {
            const pref = imageUrl.startsWith('/') ? '' : '/';
            return convertToSecureUrl(`${base}${pref}${imageUrl}`) || `${base}${pref}${imageUrl}`;
          }

          // Last resort: try backend media resolver
          const resolved = resolveMediaUrl(imageUrl);
          return convertToSecureUrl(resolved) || resolved;
        };

        // Primary: Use the HDTS employee profile endpoint (same as profile page)
        try {
          const resp = await fetch(`${AUTH_BASE}/api/v1/hdts/employees/api/profile/`, { 
            method: 'GET', 
            credentials: 'include', 
            headers: { 'Accept': 'application/json' } 
          });
          
          if (resp && resp.ok) {
            const profile = await resp.json();
            if (import.meta.env.DEV) console.debug('[Navbar] HDTS employee profile:', profile);
            const candidate = normalizeImageUrl(
              profile.profile_picture || profile.image || profile.profile_image || profile.image_url || profile.imageUrl, 
              AUTH_BASE
            );
            if (candidate) { 
              setProfileImageUrl(candidate); 
              return; 
            }
          }
        } catch (err) {
          if (import.meta.env.DEV) console.debug('[Navbar] HDTS employee profile fetch failed:', err);
        }

        // Fallback: Try the general users profile endpoint
        try {
          let resp2 = await fetch(`${AUTH_BASE}/api/v1/users/profile/`, { method: 'GET', credentials: 'include', headers: { 'Accept': 'application/json' } });
          const contentType = resp2 ? (resp2.headers.get('content-type') || '') : '';

          if (resp2 && resp2.ok && contentType.includes('application/json')) {
            try {
              const profile = await resp2.json();
              if (import.meta.env.DEV) console.debug('[Navbar] Auth profile (cookie):', profile);
              const candidate = normalizeImageUrl(profile.image || profile.profile_image || profile.image_url || profile.imageUrl || profile.profile_picture, AUTH_BASE);
              if (candidate) { setProfileImageUrl(candidate); return; }
            } catch (err) {
              if (import.meta.env.DEV) console.debug('[Navbar] Failed to parse /api/v1/users/profile/ JSON:', err);
            }
          }

          // Try agent-management list for render-ready entries
            try {
            const listResp = await fetch(`${AUTH_BASE}/api/v1/users/agents/`, { method: 'GET', credentials: 'include', headers: { 'Accept': 'application/json' } });
            if (listResp && listResp.ok) {
              const list = await listResp.json();
              if (Array.isArray(list) && list.length) {
                const uid = currentUser?.id || currentUser?.user_id || null;
                const match = uid ? list.find((u) => String(u.id) === String(uid)) : list.find((u) => u.email === currentUser?.email);
                if (match) {
                  const candidate2 = normalizeImageUrl(match.image || match.profile_image || match.profile_picture || match.image_url || match.imageUrl, AUTH_BASE);
                  if (candidate2) { setProfileImageUrl(candidate2); return; }
                }
              }
            }
          } catch (err) {
            if (import.meta.env.DEV) console.debug('[Navbar] agent-management fetch failed:', err);
          }

          // As a last-resort, try the settings/profile endpoint which may be present in some deployments
          try {
            const respSettings = await fetch(`${AUTH_BASE}/api/v1/users/profile/`, { method: 'GET', credentials: 'include', headers: { 'Accept': 'application/json' } });
            const ct = respSettings ? (respSettings.headers.get('content-type') || '') : '';
            if (respSettings && respSettings.ok && ct.includes('application/json')) {
              try {
                const profile = await respSettings.json();
                const candidate = normalizeImageUrl(profile.image || profile.profile_image || profile.profile_picture || profile.image_url || profile.imageUrl, AUTH_BASE);
                if (candidate) { setProfileImageUrl(candidate); return; }
              } catch (err) { /* ignore parse errors */ }
            }
          } catch (err) {
            /* ignore */
          }
        } catch (err) {
          if (import.meta.env.DEV) console.debug('[Navbar] Auth profile (cookie) fetch failed:', err);
        }

        // 2) Fallback to Bearer token based call if token exists (secondary)
        let token = null;
        try { token = localStorage.getItem('access_token'); } catch (e) { token = null; }

        if (token) {
          try {
            const resp = await fetch(`${AUTH_BASE}/api/v1/users/profile/`, {
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
              },
              credentials: 'include',
            });
            if (resp.ok) {
              const profile = await resp.json();
              if (import.meta.env.DEV) console.debug('[Navbar] Auth profile (Bearer):', profile);
              const candidate = normalizeImageUrl(profile.image || profile.profile_image || profile.profile_picture || profile.image_url || profile.imageUrl, AUTH_BASE);
              if (candidate) { setProfileImageUrl(candidate); return; }
            } else {
              if (import.meta.env.DEV) console.debug('[Navbar] Auth profile (Bearer) not ok:', resp.status);
            }
          } catch (err) {
            if (import.meta.env.DEV) console.debug('[Navbar] Auth profile (Bearer) fetch failed:', err);
          }
        }

        // 3) Backend employee service fallback
        try {
          const profile = await backendEmployeeService.getCurrentEmployee();
          if (import.meta.env.DEV) console.debug('[Navbar] Backend employee profile:', profile);
          // Prefer auth service base for rendering images created by auth service
          const AUTH_BASE = API_CONFIG.AUTH.BASE_URL.replace(/\/$/, '');
          const BACKEND_BASE = API_CONFIG.BACKEND.BASE_URL.replace(/\/$/, '');
          let candidate = normalizeImageUrl(profile.image || profile.profile_image || profile.profile_picture || profile.image_url || profile.imageUrl, AUTH_BASE);
          if (!candidate) {
            candidate = normalizeImageUrl(profile.image || profile.profile_image || profile.profile_picture || profile.image_url || profile.imageUrl, BACKEND_BASE);
          }
          if (candidate) { setProfileImageUrl(candidate); return; }
        } catch (err) {
          if (import.meta.env.DEV) console.debug('[Navbar] Backend employee fetch failed:', err);
        }

        // 4) Try HDTS employees API for newly registered employees
        try {
          const AUTH_BASE = API_CONFIG.AUTH.BASE_URL.replace(/\/$/, '');
          let token = null;
          try { token = localStorage.getItem('access_token'); } catch (e) { token = null; }
          
          const headers = {
            'Accept': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {})
          };
          
          // Get all HDTS users (which includes employees from hdts_employees table)
          const resp = await fetch(`${AUTH_BASE}/api/v1/hdts/user-management/users/api/`, {
            method: 'GET',
            headers,
            credentials: 'include'
          });
          
          if (resp && resp.ok) {
            const data = await resp.json();
            const allUsers = data.all_users || [];
            
            // Match by email (most reliable for employees)
            const userEmail = currentUser?.email;
            const match = userEmail ? allUsers.find(u => u.email === userEmail) : null;
            
            if (match) {
              if (import.meta.env.DEV) console.debug('[Navbar] HDTS employee profile:', match);
              const candidate = normalizeImageUrl(match.profile_picture || match.image || match.profile_image || match.image_url || match.imageUrl, AUTH_BASE);
              if (candidate) { setProfileImageUrl(candidate); return; }
            }
          }
        } catch (err) {
          if (import.meta.env.DEV) console.debug('[Navbar] HDTS employees fetch failed:', err);
        }

        // If nothing worked, leave default
        if (import.meta.env.DEV) console.debug('[Navbar] No profile image found; using default.');
      } catch (error) {
        console.error('Failed to fetch profile image (unexpected):', error);
      }
    };

    if (currentUser) {
      fetchProfileImage();
    }
  }, [currentUser]);

  const dropdowns = {
    active: {
      label: 'Active Tickets',
      items: [
        ['all-active-tickets', 'All Active Tickets'],
        ['pending-tickets', 'Pending Tickets'],
        ['in-progress-tickets', 'In Progress Tickets'],
        ['on-hold-tickets', 'On Hold Tickets'],
        ['resolved-tickets', 'Resolved Tickets'],
      ],
      path: '/employee/active-tickets/',
    },
    records: {
      label: 'Ticket Records',
      items: [
        ['all-ticket-records', 'All Ticket Records'],
        ['closed-ticket-records', 'Closed Tickets'],
        ['rejected-ticket-records', 'Rejected Tickets'],
        ['withdrawn-ticket-records', 'Withdrawn Tickets'],
      ],
      path: '/employee/ticket-records/',
    },
  };

  const handleDropdownToggle = (key) => {
    setOpenDropdown((prev) => (prev === key ? null : key));
    setShowProfileMenu(false);
    setShowNotification(false);
  };

  const toggleProfileMenu = () => {
    setShowProfileMenu((prev) => !prev);
    setOpenDropdown(null);
    setShowNotification(false);
  };

  const handleLogout = async () => {
    // Clear all auth-related localStorage items first
    try {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('loggedInUser');
      localStorage.removeItem('user');
      localStorage.removeItem('chatbotMessages');
    } catch (e) {
      if (import.meta.env.DEV) console.debug('[EmployeeNavigationBar] Clearing localStorage failed', e);
    }

    // Attempt to clear non-HttpOnly cookies by expiring them.
    try {
      if (typeof document !== 'undefined') {
        const cookies = document.cookie ? document.cookie.split(';').map(c => c.split('=')[0].trim()) : [];
        cookies.forEach((name) => {
          try {
            document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
            document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; domain=${window.location.hostname}`;
          } catch (e) {
            // ignore
          }
        });
      }
    } catch (e) {
      if (import.meta.env.DEV) console.debug('[EmployeeNavigationBar] Clearing cookies failed', e);
    }

    // Dispatch auth:logout event to stop the inactivity watcher
    try {
      window.dispatchEvent(new CustomEvent('auth:logout'));
      if (import.meta.env.DEV) console.debug('[EmployeeNavigationBar] Dispatched auth:logout event');
    } catch (e) {
      if (import.meta.env.DEV) console.debug('[EmployeeNavigationBar] Failed to dispatch auth:logout', e);
    }

    // Close any open menus
    setShowProfileMenu(false);
    setIsMobileMenuOpen(false);

    // Redirect to the auth frontend so the auth app handles logout and final redirect.
    // This mirrors the behavior of the auth `/profile` logout flow and avoids hardcoded localhost.
    const authFrontendUrl = import.meta.env.VITE_AUTH_FRONTEND_URL || 'http://localhost:3001';
    window.location.href = `${authFrontendUrl}/`;
  };

  const getFullName = () => {
    if (!currentUser) return '';
    const firstName = currentUser.firstName || currentUser.first_name || '';
    const middleName = currentUser.middleName || currentUser.middle_name || '';
    const lastName = currentUser.lastName || currentUser.last_name || '';
    
    // Build full name with middle name only if it exists
    return `${firstName}${middleName ? ' ' + middleName : ''} ${lastName}`.trim();
  };

  const getCachedUser = () => {
    if (currentUser) return currentUser;
    try { return JSON.parse(localStorage.getItem('user') || 'null'); } catch (e) { return null; }
  };
  const resolveUser = () => getCachedUser();

  const getProfileImageSrc = () => {
    const user = resolveUser();
    // support multiple possible keys used across the app
  const imgCandidate = user?.profile_image || user?.image || user?.profileImage || user?.profileImg || DEFAULT_PROFILE_IMAGE;

  if (!imgCandidate) return DEFAULT_PROFILE_IMAGE;

    // Track any created object URLs so we can revoke them on unmount
    if (!getProfileImageSrc._createdUrlsRef) getProfileImageSrc._createdUrlsRef = [];
    const createdUrlsRef = getProfileImageSrc._createdUrlsRef;

    // If it's a File or Blob (local file selected and stored), create an object URL
    try {
      if (typeof Blob !== 'undefined' && imgCandidate instanceof Blob) {
        const objUrl = URL.createObjectURL(imgCandidate);
        createdUrlsRef.push(objUrl);
        return objUrl;
      }
    } catch (err) {
      // ignore cross-realm errors
    }

    // If the stored value is an object with a url property (some services store this shape)
    if (typeof imgCandidate === 'object' && imgCandidate !== null) {
      const urlVal = imgCandidate.url || imgCandidate.image || imgCandidate.path;
      if (urlVal && typeof urlVal === 'string') {
        // if it is a data URL or absolute URL, use it
        if (urlVal.startsWith('data:') || urlVal.startsWith('http')) return urlVal;
        // otherwise build absolute media URL
        const MEDIA_URL = import.meta.env.VITE_MEDIA_URL || `${API_CONFIG.BACKEND.BASE_URL.replace(/\/$/, '')}/media/`;
        const clean = urlVal.startsWith('/') ? urlVal.slice(1) : urlVal;
        return `${MEDIA_URL}${clean}`;
      }
    }

  // If it's a data URL, return as-is
    if (typeof imgCandidate === 'string' && imgCandidate.startsWith('data:')) return imgCandidate;

    // If backend is down, avoid constructing remote MEDIA URLs to prevent connection errors
  if (!backendAvailable) return DEFAULT_PROFILE_IMAGE;

    // If it's a string, handle secure/absolute/relative paths
    if (typeof imgCandidate === 'string') {
      if (isSecureUrl(imgCandidate)) return imgCandidate;

        const secure = convertToSecureUrl(imgCandidate);
        if (secure) return secure;

        if (imgCandidate.startsWith('http')) return imgCandidate;

      // Handle cases where the stored path was saved with a '/public/' prefix
      // Trim whitespace to avoid missed prefixes (some stored values include leading spaces)
      let candidate = imgCandidate.trim();
      if (candidate.startsWith('/public/')) candidate = candidate.replace(/^\/public\//, '/');
      if (candidate.startsWith('public/')) candidate = candidate.replace(/^public\//, '');

      // If the stored value already contains a leading 'media/' segment
      // (e.g. '/media/employee_images/...'), strip that so we don't
      // produce duplicated '/media/media/...' when prefixing MEDIA_URL.
      candidate = candidate.replace(/^\/?media\//, '');

      const MEDIA_URL = import.meta.env.VITE_MEDIA_URL || `${API_CONFIG.BACKEND.BASE_URL.replace(/\/$/, '')}/media/`;
      const clean = candidate.startsWith('/') ? candidate.slice(1) : candidate;
      return `${MEDIA_URL}${clean}`;
    }

  return DEFAULT_PROFILE_IMAGE;
  };

  // Revoke any object URLs created for file blobs when the component unmounts
  useEffect(() => {
    return () => {
      try {
        const urls = getProfileImageSrc._createdUrlsRef || [];
        urls.forEach((u) => {
          try { URL.revokeObjectURL(u); } catch (e) {}
        });
      } catch (err) {}
    };
  }, []);

  // Listen for profile updates (dispatched by settings or other UI)
  useEffect(() => {
    const onProfileUpdated = (e) => {
      try {
        const detail = e?.detail || {};
        const eventUserId = detail.userId || detail.user_id || detail.companyId || detail.company_id || null;
  const current = getCachedUser();
  const currentId = current?.id || current?.companyId || current?.company_id || null;

        // If the event is for a different user, ignore it
        if (eventUserId && currentId && String(eventUserId) !== String(currentId)) return;

        const newImg = detail.profileImage || detail.image || detail.imageUrl;
        if (newImg) {
          setProfileImageUrl(newImg);
          return;
        }

        // If no explicit image provided, prefer cookie-based fetch from auth service
        const AUTH_BASE = API_CONFIG.AUTH.BASE_URL.replace(/\/$/, '');

        fetch(`${AUTH_BASE}/api/v1/users/profile/`, {
          method: 'GET',
          credentials: 'include',
        })
          .then(response => response.ok ? response.json() : null)
          .then((profile) => {
            if (profile && (profile.image || profile.profile_image || profile.image_url || profile.imageUrl)) {
              const imageUrl = profile.image || profile.profile_image || profile.image_url || profile.imageUrl;
              const clean = (typeof imageUrl === 'string' && imageUrl.startsWith('http')) ? imageUrl : `${AUTH_BASE}${imageUrl.startsWith('/') ? '' : '/'}${imageUrl}`;
              setProfileImageUrl(clean);
            } else {
              // Fallback to backend employee service
              return backendEmployeeService.getCurrentEmployee();
            }
          })
          .then((profile) => {
            if (profile && (profile.image || profile.profile_image || profile.image_url || profile.imageUrl)) {
              const AUTH_BASE = API_CONFIG.AUTH.BASE_URL.replace(/\/$/, '');
              const BASE_URL = API_CONFIG.BACKEND.BASE_URL.replace(/\/$/, '');
              let imageUrl = profile.image || profile.profile_image || profile.image_url || profile.imageUrl;
              const candidateAuth = (typeof imageUrl === 'string' && imageUrl.startsWith('http')) ? imageUrl : `${AUTH_BASE}${imageUrl.startsWith('/') ? '' : '/'}${imageUrl}`;
              const candidateBackend = (typeof imageUrl === 'string' && imageUrl.startsWith('http')) ? imageUrl : `${BASE_URL}${imageUrl.startsWith('/') ? '' : '/'}${imageUrl}`;
              // Prefer auth-hosted rendering path
              setProfileImageUrl(candidateAuth || candidateBackend);
            }
          })
          .catch(() => {});
      } catch (err) {
        // ignore
      }
    };

    window.addEventListener('profile:updated', onProfileUpdated);
    return () => window.removeEventListener('profile:updated', onProfileUpdated);
  }, []);

  // Track which URLs we've attempted an authenticated fetch for to avoid retry loops
  const attemptedAuthFetchRef = useRef(new Set());

  // Quick backend reachability probe to avoid rendering broken media URLs when devserver is down
  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 800);

    (async () => {
      try {
        const base = API_CONFIG.BACKEND.BASE_URL.replace(/\/$/, '');
        const probeUrl = `${base}/api/`;
        const res = await fetch(probeUrl, { method: 'GET', signal: controller.signal });
        if (!cancelled) setBackendAvailable(res.ok);
      } catch (e) {
        if (!cancelled) setBackendAvailable(false);
      } finally {
        clearTimeout(timeout);
      }
    })();

    return () => {
      cancelled = true;
      controller.abort();
      clearTimeout(timeout);
    };
  }, []);

  const toggleNotification = () => {
    setShowNotification((prev) => !prev);
    setOpenDropdown(null);
    setShowProfileMenu(false);
  };

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (navRef.current && !navRef.current.contains(e.target)) {
        setOpenDropdown(null);
        setShowProfileMenu(false);
        setShowNotification(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close mobile menu when resizing to desktop
  useEffect(() => {
    const onResize = () => {
      if (window.innerWidth > 768) setIsMobileMenuOpen(false);
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const renderDropdownMenu = (key) => {
    const dropdown = dropdowns[key];
    const isInPath = dropdown.items.some(
      ([route]) => location.pathname === `${dropdown.path}${route}`
    );
    const isOpen = openDropdown === key;

    return (
      <li className={`${styles['dropdown-container']} ${isOpen ? styles['open'] : ''}`}>
        <div
          className={`${styles['dropdown-trigger']} ${isInPath || isOpen ? styles['active-link'] : ''}`}
          onClick={() => handleDropdownToggle(key)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              handleDropdownToggle(key);
            }
          }}
        >
          <span className={styles['dropdown-text']}>{dropdown.label}</span>
          <ArrowDownIcon isFlipped={isOpen} />
        </div>
        {isOpen && (
          <div className={styles['custom-dropdown']}>
            <div className={styles['dropdown-menu']}>
              {dropdown.items.map(([route, label]) => (
                <button
                  key={route}
                  onClick={() => {
                    setOpenDropdown(null);
                    setIsMobileMenuOpen(false);
                    navigate(`${dropdown.path}${route}`);
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        )}
      </li>
    );
  };

  return (
    <nav className={`${styles['main-nav-bar']} ${scrolled ? styles.scrolled : ''}`} ref={navRef}>
      <section>
        <div className={styles['logo-placeholder']}>
          <img src={MapLogo} alt="Logo" className={styles['logo-image']} />
          <div className={styles['brand-wrapper']}>
            <span className={styles['brand-name']}>SmartSupport</span>
          </div>
        </div>
      </section>

      <section>
        <ul className={`${styles['nav-list']} ${isMobileMenuOpen ? styles.open : ''}`}>
          {/* Mobile profile section - mirrors Coordinator mobile layout */}
          <li className={styles['mobile-profile-section']}>
            <div className={styles['profile-avatar-large']}>
              <img src={profileImageUrl} alt="Profile" className={styles['avatar-image']} onError={e => e.target.src = DEFAULT_PROFILE_IMAGE} />
            </div>
            <div className={styles['mobile-profile-info']}>
              <h3>{getFullName()}</h3>
              <div className={styles['mobile-profile-actions']}>
                <button className={styles['mobile-settings-btn']} onClick={() => { setIsMobileMenuOpen(false); const authFrontendUrl = import.meta.env.VITE_AUTH_FRONTEND_URL || 'http://localhost:3001'; window.location.href = `${authFrontendUrl}/profile`; }}>Settings</button>
                <button className={styles['mobile-logout-btn']} onClick={handleLogout}>Log Out</button>
              </div>
            </div>
          </li>

          <li className={styles['nav-item']}>
            <NavLink
              to="/employee/home"
              className={({ isActive }) =>
                `${styles['nav-link']} ${isActive ? styles['active-link'] : ''}`
              }
              onClick={() => setIsMobileMenuOpen(false)}
            >
              Home
            </NavLink>
          </li>
          {renderDropdownMenu('active')}
          {renderDropdownMenu('records')}
          {/* Mobile menu actions: notifications/profile quick access */}
          <li className={styles['nav-item'] + ' ' + styles['mobile-only-action']}>
            <button onClick={() => { setIsMobileMenuOpen(false); toggleNotification(); }}>Notifications</button>
          </li>
        </ul>
      </section>

      <section className={styles['nav-right-section']}>
        {/* Right-side hamburger for mobile (matches Coordinator admin behavior) */}
        <button
          className={`${styles.hamburgerBtn} ${isMobileMenuOpen ? styles.open : ''}`}
          onClick={() => setIsMobileMenuOpen((v) => !v)}
          aria-expanded={isMobileMenuOpen}
          aria-label={isMobileMenuOpen ? 'Close menu' : 'Open menu'}
        >
          {isMobileMenuOpen ? <FiX size={20} /> : <FiMenu size={20} />}
        </button>
        {!scrolled && (
          <>
            <div className={styles['notification-icon-container']} style={{ position: 'relative' }}>
              <div
                className={styles['notification-icon-wrapper']}
                onClick={toggleNotification}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    toggleNotification();
                  }
                }}
              >
                <NotificationIcon />
                {notifCount > 0 && (
                  <span className={styles['notification-badge']}>{notifCount}</span>
                )}
              </div>
              <EmployeeNotification
                show={showNotification}
                onClose={() => setShowNotification(false)}
                onCountChange={setNotifCount}
              />
            </div>

            <div className={styles['profile-container']}>
              <div
                className={styles['profile-avatar']}
                onClick={toggleProfileMenu}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    toggleProfileMenu();
                  }
                }}
              >
                <img
                  src={profileImageUrl}
                  alt="Profile"
                  className={styles['avatar-placeholder']}
                  onError={e => e.target.src = DEFAULT_PROFILE_IMAGE}
                />
              </div>
              {showProfileMenu && (
                <div className={styles['profile-dropdown']}>
                  <div className={styles['profile-header']}>
                    <div className={styles['profile-avatar-large']}>
                      <img
                        src={profileImageUrl}
                        alt="Profile"
                        className={styles['avatar-image']}
                        onError={e => e.target.src = DEFAULT_PROFILE_IMAGE}
                      />
                    </div>
                    <div className={styles['profile-info']}>
                      <h3>{getFullName()}</h3>
                    </div>
                  </div>
                  <div className={styles['profile-menu']}>
                    <button
                      onClick={() => {
                        setShowProfileMenu(false);
                        const authFrontendUrl = import.meta.env.VITE_AUTH_FRONTEND_URL || 'http://localhost:3001';
                        window.location.href = `${authFrontendUrl}/profile`;
                      }}
                    >
                      Settings
                    </button>
                    <button
                      className={styles['logout-btn']}
                      onClick={handleLogout}
                    >
                      Log Out
                    </button>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </section>
    </nav>
  );
};

export default EmployeeNavBar;