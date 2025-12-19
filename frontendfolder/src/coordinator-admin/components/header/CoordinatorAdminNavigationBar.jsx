import { useState, useRef, useEffect } from 'react';
import useScrollShrink from '../../../shared/hooks/useScrollShrink.jsx';
import { useNavigate, useLocation } from 'react-router-dom';
import { FiMenu, FiX } from 'react-icons/fi';
import CoordinatorAdminNotifications from '../pop-ups/CoordinatorAdminNotifications';
import styles from './CoordinatorAdminNavigationBar.module.css';
import MapLogo from '../../../shared/assets/MapLogo.png';
import authService from '../../../utilities/service/authService';
import { useAuth } from '../../../context/AuthContext';
import { backendEmployeeService } from '../../../services/backend/employeeService';
import { API_CONFIG } from '../../../config/environment';
import { resolveMediaUrl } from '../../../utilities/helpers/mediaUrl';
import { navigateToVerifiedEndpoint } from '../../../utilities/helpers/verifyEndpoint';

const ArrowDownIcon = ({ flipped }) => (
  <svg
    className={`${styles['arrow-icon']} ${flipped ? styles['arrow-flipped'] : ''}`}
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="var(--primary-color)"
    strokeWidth="2"
  >
    <polyline points="6 9 12 15 18 9" />
  </svg>
);

const NotificationIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className={styles['notif-icon']} viewBox="0 0 24 24" fill="currentColor">
    <path
      fillRule="evenodd"
      d="M5.25 9a6.75 6.75 0 0113.5 0v.75c0 2.123.8 4.057 2.118 5.52a.75.75 0 01-.297 1.206c-1.544.57-3.16.99-4.831 1.243a3.75 3.75 0 11-7.48 0 24.585 24.585 0 01-4.831-1.244.75.75 0 01-.298-1.205A8.217 8.217 0 005.25 9.75V9zm4.502 8.9a2.25 2.25 0 104.496 0 25.057 25.057 0 01-4.496 0z"
      clipRule="evenodd"
    />
  </svg>
);

const CoordinatorAdminNavBar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const navRef = useRef(null);
  const { user: currentUser } = useAuth();
  console.debug('[CoordinatorAdminNav] currentUser:', currentUser);
  const DEFAULT_PROFILE_IMAGE = '/media/employee_images/default-profile.png'; // relative path on backend (matches backend filename)
  const BACKEND_BASE_URL = 'http://localhost:8000';
  // Inline SVG fallback used if the PNG looks wrong or fails to load
  const FALLBACK_SVG = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"%3E%3Ccircle cx="50" cy="50" r="50" fill="%23007bff"/%3E%3Ctext x="50" y="55" text-anchor="middle" font-size="36" fill="%23fff"%3E%3C/tspan%3E%3C/text%3E%3C/svg%3E';

  // State to hold the actual profile image URL fetched from backend
  const [profileImageUrl, setProfileImageUrl] = useState(FALLBACK_SVG);

  // Fetch current employee profile from backend to get freshest image path
  useEffect(() => {
    const fetchProfileImage = async () => {
      try {
        const AUTH_BASE = API_CONFIG.AUTH.BASE_URL.replace(/\/$/, '');

        // Helper to normalize image URL
        const normalizeImageUrl = (rawUrl, base) => {
          if (!rawUrl) return null;
          let imageUrl = rawUrl;
          if (typeof imageUrl !== 'string') imageUrl = (imageUrl.url || imageUrl.image || '') + '';
          imageUrl = imageUrl.trim();

          // If already absolute or data URL, return as-is
          if (imageUrl.startsWith('data:') || imageUrl.startsWith('http')) return imageUrl;

          // If relative path, attach provided base
          if (base) {
            const pref = imageUrl.startsWith('/') ? '' : '/';
            return `${base}${pref}${imageUrl}`;
          }

          return null;
        };

        // Try auth service profile endpoint with cookies (same as employee navbar)
        try {
          const resp = await fetch(`${AUTH_BASE}/api/v1/users/profile/`, { 
            method: 'GET', 
            credentials: 'include', 
            headers: { 'Accept': 'application/json' } 
          });
          
          if (resp && resp.ok) {
            const profile = await resp.json();
            const candidate = normalizeImageUrl(
              profile.image || profile.profile_image || profile.image_url || profile.imageUrl || profile.profile_picture, 
              AUTH_BASE
            );
            if (candidate) { 
              setProfileImageUrl(candidate); 
              return; 
            }
          }
        } catch (err) {
          console.error('[Admin Navbar] Auth profile fetch failed:', err);
        }

        // Fallback to backend employee service
        try {
          const profile = await backendEmployeeService.getCurrentEmployee();
          const imgCandidate = profile?.image || profile?.profile_image || profile?.profile_picture || profile?.image_url || profile?.imageUrl;
          if (imgCandidate) {
            const candidate = normalizeImageUrl(imgCandidate, AUTH_BASE);
            if (candidate) setProfileImageUrl(candidate);
          }
        } catch (err) {
          console.error('Failed to fetch admin profile image:', err);
        }
      } catch (err) {
        console.error('Unexpected error fetching profile image:', err);
      }
    };

    if (currentUser) fetchProfileImage();
  }, [currentUser]);

  // Listen for profile updates dispatched by settings or other UI
  useEffect(() => {
    const onProfileUpdated = (e) => {
      console.debug('[CoordinatorAdminNav] profile:updated event', e && e.detail);
      try {
  const detail = e?.detail || {};
  const eventUserId = detail.userId || detail.user_id || detail.companyId || detail.company_id || null;
  const current = currentUser;
  const currentId = current?.id || current?.companyId || current?.company_id || null;

        // If the event is for a different user, ignore it
        if (eventUserId && currentId && String(eventUserId) !== String(currentId)) return;

        // If the event includes a resolved (and cache-busted) image URL, use it directly
        const newImg = detail.profileImage || detail.image || detail.imageUrl || detail.profile_picture;
        if (newImg) {
          setProfileImageUrl(newImg);
          return;
        }
      } catch (err) {
        // fall through to re-fetch below
      }

      // Fallback: re-fetch profile from auth service
      const AUTH_BASE = API_CONFIG.AUTH.BASE_URL.replace(/\/$/, '');
      
      fetch(`${AUTH_BASE}/api/v1/users/profile/`, { 
        method: 'GET', 
        credentials: 'include', 
        headers: { 'Accept': 'application/json' } 
      })
        .then(resp => resp.ok ? resp.json() : null)
        .then((profile) => {
          if (!profile) return;
          const imgCandidate = profile.image || profile.profile_image || profile.profile_picture || profile.image_url || profile.imageUrl;
          if (imgCandidate) {
            if (imgCandidate.startsWith('data:') || imgCandidate.startsWith('http')) {
              setProfileImageUrl(imgCandidate);
            } else {
              const pref = imgCandidate.startsWith('/') ? '' : '/';
              setProfileImageUrl(`${AUTH_BASE}${pref}${imgCandidate}`);
            }
          }
        })
        .catch((err) => {
          console.warn('[CoordinatorAdminNav] failed to re-fetch profile after profile:updated', err);
        });
    };

    window.addEventListener('profile:updated', onProfileUpdated);
    return () => window.removeEventListener('profile:updated', onProfileUpdated);
  }, []);
  const [openDropdown, setOpenDropdown] = useState(null);
  const [notifCount, setNotifCount] = useState(0);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  // temporarily set threshold to 0; debug disabled in production to avoid noisy logs
  const scrolled = useScrollShrink(0, { debug: false });

  const toggleDropdown = (key) => {
    setOpenDropdown((prev) => (prev === key ? null : key));
  };

  const handleNavigate = (path) => {
    // Debug log navigation attempts to help diagnose routing issues
    // eslint-disable-next-line no-console
    console.debug('[CoordinatorAdminNavigationBar] navigate ->', path, 'current pathname:', location.pathname);
    // If user is already on the same pathname, force a full reload so the
    // admin page re-initializes its data (avoids needing a manual refresh).
    if (location.pathname === path) {
      try {
        window.location.href = path;
      } catch (e) {
        // fallback to SPA navigate if full reload is blocked
        navigate(path);
      }
    } else {
      navigate(path);
    }
    setOpenDropdown(null);
    setIsMobileMenuOpen(false);
  };

  const handleLogout = async () => {
    // Try to call the auth service logout endpoint (server should clear HttpOnly cookies)
    try {
      const AUTH_BASE = API_CONFIG.AUTH.BASE_URL.replace(/\/$/, '');
      const LOGOUT_URL = `${AUTH_BASE}/api/v1/token/logout/`;
      try {
        await fetch(LOGOUT_URL, { method: 'POST', credentials: 'include' });
        if (import.meta.env.DEV) console.debug('[CoordinatorAdminNavigationBar] Called auth logout endpoint');
      } catch (err) {
        if (import.meta.env.DEV) console.debug('[CoordinatorAdminNavigationBar] Auth logout endpoint call failed:', err);
      }
    } catch (e) {
      if (import.meta.env.DEV) console.debug('[CoordinatorAdminNavigationBar] Logout: failed to compute auth logout URL', e);
    }

    // Clear all auth-related localStorage items
    try {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('loggedInUser');
      localStorage.removeItem('user');
      localStorage.removeItem('chatbotMessages');
    } catch (e) {
      if (import.meta.env.DEV) console.debug('[CoordinatorAdminNavigationBar] Clearing localStorage failed', e);
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
      if (import.meta.env.DEV) console.debug('[CoordinatorAdminNavigationBar] Clearing cookies failed', e);
    }

    // Dispatch auth:logout event to stop the inactivity watcher
    try {
      window.dispatchEvent(new CustomEvent('auth:logout'));
      if (import.meta.env.DEV) console.debug('[CoordinatorAdminNavigationBar] Dispatched auth:logout event');
    } catch (e) {
      if (import.meta.env.DEV) console.debug('[CoordinatorAdminNavigationBar] Failed to dispatch auth:logout', e);
    }

    setIsMobileMenuOpen(false);

    // Redirect to auth service login page (use configured AUTH base; defaults to localhost:8003)
    try {
      const AUTH_BASE = API_CONFIG.AUTH.BASE_URL.replace(/\/$/, '');
      window.location.href = `${AUTH_BASE}/login`;
    } catch (e) {
      navigate('/', { state: { fromLogout: true } });
    }
  };

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (navRef.current && !navRef.current.contains(e.target)) {
        setOpenDropdown(null);
        setIsMobileMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close mobile menu on window resize
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth > 768) {
        setIsMobileMenuOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Build nav sections based on current user role
  const role = currentUser?.role;

  // Normalize displayed role labels across the admin navbar
  const getDisplayRole = (user) => {
    if (!user) return '';
    const raw = (user.role || (user.system_roles && user.system_roles.find(r=>r.system_slug==='hdts')?.role_name) || '').toString();
    if (!raw) return '';
    const normalized = raw.trim();
    // Map backend 'Admin' to UI-facing 'System Admin'
    if (normalized.toLowerCase() === 'admin') return 'System Admin';
    return normalized;
  };

  const ticketsSection = {
    key: 'tickets',
    label: 'Ticket Management',
    basePath: '/admin/ticket-management',
    links: [
      { label: 'All Tickets', path: '/admin/ticket-management/all-tickets' },
      { label: 'New Tickets', path: '/admin/ticket-management/new-tickets' },
      { label: 'Pending Tickets', path: '/admin/ticket-management/pending-tickets' },
      { label: 'Open Tickets', path: '/admin/ticket-management/open-tickets' },
      { label: 'In Progress Tickets', path: '/admin/ticket-management/in-progress-tickets' },
      { label: 'On Hold Tickets', path: '/admin/ticket-management/on-hold-tickets' },
      { label: 'Withdrawn Tickets', path: '/admin/ticket-management/withdrawn-tickets' },
      { label: 'Closed Tickets', path: '/admin/ticket-management/closed-tickets' },
      { label: 'Rejected Tickets', path: '/admin/ticket-management/rejected-tickets' }
    ]
  };

  const usersSection = {
    key: 'users',
    label: 'User Access',
    basePath: '/admin/user-access',
    links: [
      { label: 'All Users', path: '/admin/user-access/all-users' },
      { label: 'Employees', path: '/admin/user-access/employees' },
      { label: 'Ticket Coordinators', path: '/admin/user-access/ticket-coordinators' },
      { label: 'System Admins', path: '/admin/user-access/system-admins' },
      { label: 'Pending Users', path: '/admin/user-access/pending-users' },
      { label: 'Rejected Users', path: '/admin/user-access/rejected-users' }
    ]
  };

  const reportsSection = {
    key: 'reports',
    label: 'Reports',
    basePath: '/admin/reports',
    links: [
      { label: 'Ticket Reports', path: '/admin/reports/tickets' },
      { label: 'SLA Compliance', path: '/admin/reports/sla' }
    ]
  };

  const kbSection = {
    key: 'kb',
    label: 'Knowledge Base',
    basePath: '/admin/knowledge',
    links: [
      { label: 'Articles', path: '/admin/knowledge/articles' },
      { label: 'Archived Articles', path: '/admin/knowledge/archived' }
    ]
  };

  const amsSection = {
    key: 'ams',
    label: 'AMS',
    basePath: '/admin/ams',
    links: [
      { label: 'AMS Dashboard', path: '/admin/ams/dashboard' },
      { label: 'AMS Tickets', path: '/admin/ams/tickets' }
    ]
  };

  const bmsSection = {
    key: 'bms',
    label: 'BMS',
    basePath: '/admin/bms',
    links: [
      { label: 'BMS Dashboard', path: '/admin/bms/dashboard' },
      { label: 'BMS Tickets', path: '/admin/bms/tickets' }
    ]
  };

  const ownedTicketsSection = {
    key: 'owned-tickets',
    label: 'Owned Tickets',
    basePath: '/admin/owned-tickets',
    links: [
      { label: 'My Tickets', path: '/admin/owned-tickets' }
    ]
  };

  // Role-based section composition
  let navSections = [];
  if (role === 'Ticket Coordinator') {
    // Ticket coordinator: Ticket Management, Owned Tickets, AMS, BMS, Reports
    navSections = [ticketsSection, ownedTicketsSection, amsSection, bmsSection, reportsSection];
  } else if (role === 'System Admin') {
    // System Admin: Dashboard (all), Ticket Management (view-only), User Access, Reports, KB
    navSections = [ticketsSection, usersSection, reportsSection, kbSection];
  } else {
    // Default: show everything
    navSections = [ticketsSection, usersSection, reportsSection, kbSection];
  }

  // If current user is a Ticket Coordinator, they should not see User Access
  const visibleNavSections = navSections.filter(s => {
    if (s.key === 'users' && currentUser?.role === 'Ticket Coordinator') return false;
    return true;
  });

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen((prev) => !prev);
    // Close any open dropdowns when toggling mobile menu
    setOpenDropdown(null);
  };

  return (
    <nav className={`${styles['main-nav-bar']} ${scrolled ? styles.scrolled : ''}`} ref={navRef}>
      {/* Logo & Brand (Desktop: Left, Mobile: Right) */}
      <section className={styles['logo-placeholder']}>
        <img src={MapLogo} alt="SmartSupport Logo" className={styles['logo-image']} />
        <div className={styles['brand-wrapper']}>
          <span className={styles['brand-name']}>SmartSupport</span>
          <span className={styles['admin-badge']}>{getDisplayRole(currentUser)}</span>
        </div>
      </section>

      {/* Navigation Links (Desktop: Middle, Mobile: Sidebar) */}
      <section>
        <ul className={`${styles['nav-list']} ${isMobileMenuOpen ? styles.open : ''}`}>
          {/* Mobile Profile Section - Shows at top of mobile menu */}
          <li className={styles['mobile-profile-section']}>
            <div className={styles['profile-avatar-large']}>
              <img 
                src={profileImageUrl} 
                onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = FALLBACK_SVG; }}
                alt="Profile" 
                className={styles['avatar-image']} 
              />
            </div>
              <div className={styles['mobile-profile-info']}>
                {(() => {
                  const first = currentUser?.first_name || currentUser?.firstName || currentUser?.first || currentUser?.username || (currentUser?.email ? currentUser.email.split('@')[0] : '');
                  const last = currentUser?.last_name || currentUser?.lastName || currentUser?.last || '';
                  return (
                    <>
                      <h3>{`${first} ${last}`.trim()}</h3>
                      <span className={styles['admin-badge']}>{getDisplayRole(currentUser)}</span>
                    </>
                  );
                })()}
              <div className={styles['mobile-profile-actions']}>
                <button 
                  className={styles['mobile-settings-btn']}
                  onClick={() => handleNavigate('/admin/settings')}
                >
                  Settings
                </button>
                <button
                  className={styles['mobile-logout-btn']}
                  onClick={handleLogout}
                >
                  Log Out
                </button>
              </div>
            </div>
          </li>

          {/* Dashboard Link */}
          <li className={styles['nav-item']}>
            <button
              className={`${styles['nav-link']} ${location.pathname === '/admin/dashboard' ? styles.clicked : ''}`}
              onClick={() => handleNavigate('/admin/dashboard')}
            >
              Dashboard
            </button>
          </li>

          {/* Navigation Sections with Dropdowns */}
          {visibleNavSections.map(({ key, label, links, basePath }) => {
            const isActiveSection = location.pathname.startsWith(basePath);
            return (
              <li
                key={key}
                className={`${styles['dropdown-container']} ${openDropdown === key ? styles['open'] : ''}`}
              >
                <div
                  className={`${styles['dropdown-trigger']} ${isActiveSection ? styles.clicked : ''}`}
                  onClick={() => toggleDropdown(key)}
                >
                  <span className={styles['dropdown-text']}>{label}</span>
                  <ArrowDownIcon flipped={openDropdown === key} />
                </div>
                {openDropdown === key && (
                  <div className={styles['custom-dropdown']}>
                    <div className={styles['dropdown-menu']}>
                      {links.map(({ label, path }) => (
                        <button
                          key={path}
                          onClick={() => handleNavigate(path)}
                          className={location.pathname === path ? styles.clicked : ''}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </li>
            );
          })}


        </ul>
      </section>

      {/* Right Section: Notifications & Profile (Desktop Only) */}
      <section className={styles['nav-right-section']}>
        {/* Hamburger on the right for mobile */}
        <button
          className={`${styles.hamburgerBtn} ${isMobileMenuOpen ? styles.open : ''}`}
          onClick={toggleMobileMenu}
          aria-expanded={isMobileMenuOpen}
          aria-label={isMobileMenuOpen ? 'Close menu' : 'Open menu'}
        >
          {isMobileMenuOpen ? <FiX size={22} /> : <FiMenu size={22} />}
        </button>

        <div
          className={`${styles['notification-icon-container']} ${
            openDropdown === 'notifications' ? styles['open'] : ''
          }`}
        >
          <div
            className={styles['notification-icon-wrapper']}
            onClick={() => toggleDropdown('notifications')}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => ['Enter', ' '].includes(e.key) && toggleDropdown('notifications')}
          >
            <NotificationIcon />
            {notifCount > 0 && (
              <span className={styles['notification-badge']}>{notifCount}</span>
            )}
          </div>
          {openDropdown === 'notifications' && (
            <CoordinatorAdminNotifications
              show={openDropdown === 'notifications'}
              onClose={() => setOpenDropdown(null)}
              onCountChange={setNotifCount}
            />
          )}
        </div>

        <div className={styles['profile-container']}>
          <div className={styles['profile-avatar']} onClick={() => toggleDropdown('profile')}>
            <img src={profileImageUrl} alt="Profile" className={styles['avatar-image']} onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = FALLBACK_SVG; }} />
          </div>
          {openDropdown === 'profile' && (
            <div className={styles['profile-dropdown']}>
              <div className={styles['profile-header']}>
                <div className={styles['profile-avatar-large']}>
                  <img src={profileImageUrl} alt="Profile" className={styles['avatar-image']} onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = FALLBACK_SVG; }} />
                </div>
                <div className={styles['profile-info']}>
                  {(() => {
                    const first = currentUser?.first_name || currentUser?.firstName || currentUser?.first || currentUser?.username || (currentUser?.email ? currentUser.email.split('@')[0] : '');
                    const last = currentUser?.last_name || currentUser?.lastName || currentUser?.last || '';
                    const roleDisplay = getDisplayRole(currentUser);
                    return (
                      <>
                        <h3>{`${first} ${last}`.trim()}</h3>
                        <span className={styles['admin-badge']}>{roleDisplay}</span>
                      </>
                    );
                  })()}
                </div>
              </div>
              <div className={styles['profile-menu']}>
                <button onClick={() => handleNavigate('/admin/settings')}>Settings</button>
                <button onClick={() => {
                  const AUTH_URL = import.meta.env.VITE_AUTH_URL || 'http://localhost:8003';
                  navigateToVerifiedEndpoint(`${AUTH_URL}/staff/settings/profile`, () => toggleDropdown(null));
                }}>Profile Settings</button>
                <button className={styles['logout-btn']} onClick={handleLogout}>Log Out</button>
              </div>
            </div>
          )}
        </div>
      </section>
    </nav>
  );
};

export default CoordinatorAdminNavBar;