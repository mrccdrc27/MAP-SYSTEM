import { useRef, useEffect, useState } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import MapLogo from '../../../shared/assets/MapLogo.png';
import EmployeeNotification from '../popups/EmployeeNotification';
import { backendEmployeeService } from '../../../services/backend/employeeService';
import { API_CONFIG } from '../../../config/environment';
import { resolveMediaUrl } from '../../../utilities/helpers/mediaUrl';
import { convertToSecureUrl, isSecureUrl } from '../../../utilities/secureMedia';
import { useAuth } from '../../../context/AuthContext';
// Dropdown items left-aligned with flex display
import NavigationBar from '../../../shared/components/NavigationBar.jsx';
import customNavStyles from './EmployeeNavigationBar.module.css';

// Fallback profile image
const DEFAULT_PROFILE_IMAGE = 'https://img.freepik.com/free-vector/blue-circle-with-white-user_78370-4707.jpg';

// Note: dropdown menu was moved inside `.dropdown-container` to
// support mobile accordion rendering (dropdown-container -> dropdown-menu).
// Mobile items are left-aligned under the trigger via CSS text-align: left !important;
// Dropdown state (openSection, toggleSection, closeSection) is now centralized in NavigationBar.jsx.
// Mobile nav now uses drawer style (slides from left with fixed 280px width).

const EmployeeNavBar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user: currentUser } = useAuth();
  const navRef = useRef(null);

  // Track profile image via state so we can update it dynamically
  const [profileImageUrl, setProfileImageUrl] = useState(currentUser?.image || currentUser?.profileImage || currentUser?.profile_picture || DEFAULT_PROFILE_IMAGE);

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
            }
          } catch (err) {
            if (import.meta.env.DEV) console.debug('[Navbar] Auth profile (Bearer) fetch failed:', err);
          }
        }

        // 3) Backend employee service fallback
        try {
          const profile = await backendEmployeeService.getCurrentEmployee();
          if (import.meta.env.DEV) console.debug('[Navbar] Backend employee profile:', profile);
          const BACKEND_BASE = API_CONFIG.BACKEND.BASE_URL.replace(/\/$/, '');
          let candidate = normalizeImageUrl(profile.image || profile.profile_image || profile.profile_picture || profile.image_url || profile.imageUrl, AUTH_BASE);
          if (!candidate) {
            candidate = normalizeImageUrl(profile.image || profile.profile_image || profile.profile_picture || profile.image_url || profile.imageUrl, BACKEND_BASE);
          }
          if (candidate) { setProfileImageUrl(candidate); return; }
        } catch (err) {
          if (import.meta.env.DEV) console.debug('[Navbar] Backend employee fetch failed:', err);
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

  // Listen for profile updates (dispatched by settings or other UI)
  useEffect(() => {
    const onProfileUpdated = (e) => {
      try {
        const detail = e?.detail || {};
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

  const sections = [
    {
      key: 'active',
      label: dropdowns.active.label,
      basePath: dropdowns.active.path,
      links: dropdowns.active.items.map(([route, label]) => ({ label, path: `${dropdowns.active.path}${route}` })),
    },
    {
      key: 'records',
      label: dropdowns.records.label,
      basePath: dropdowns.records.path,
      links: dropdowns.records.items.map(([route, label]) => ({ label, path: `${dropdowns.records.path}${route}` })),
    },
  ];

  // Build currentUser object for NavigationBar with profile image
  const currentUserForNav = currentUser ? {
    ...currentUser,
    profileImage: profileImageUrl,
    firstName: currentUser.first_name || currentUser.firstName || '',
    lastName: currentUser.last_name || currentUser.lastName || '',
  } : null;

  // Employee supplies `navContent` (Home + dropdowns) so navigation
  // behavior (routing) remains here while layout stays in NavigationBar.
  const navContent = ({ closeMobileMenu, toggleSection, openSection, closeSection, ChevronIcon, mergedStyles, onNavigate }) => {
    const renderDropdownMenu = (key) => {
      const dropdown = dropdowns[key];
      const isInPath = dropdown.items.some(([route]) => location.pathname === `${dropdown.path}${route}`);
      const isOpen = openSection === key;

      return (
        <li key={key} data-open={isOpen ? 'true' : 'false'} data-current={isInPath ? 'true' : 'false'} data-section={key} className={mergedStyles['nav-item']}>
          <div
            className={`${mergedStyles['dropdown-container']} ${isOpen ? mergedStyles['open'] : ''} ${isInPath ? mergedStyles['active-link'] : ''}`}
            data-open={isOpen ? 'true' : 'false'}
            data-current={isInPath ? 'true' : 'false'}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                toggleSection(key);
              }
            }}
          >
            <button
              className={`${mergedStyles['dropdown-trigger']}`}
              aria-expanded={isOpen}
              onClick={() => toggleSection(key)}
              type="button"
            >
              <span className={mergedStyles['dropdown-text']}>{dropdown.label}</span>
              {ChevronIcon && (
                <ChevronIcon
                  className={`${mergedStyles['arrow-icon']} ${isOpen ? mergedStyles['arrow-flipped'] : ''}`}
                />
              )}
            </button>

            {isOpen && (
              <div
                className={mergedStyles['custom-dropdown']}
                role="menu"
              >
                <div className={mergedStyles['dropdown-menu']}>
                  {dropdown.items.map(([route, label], index) => {
                    const itemPath = `${dropdown.path}${route}`;
                    const isCurrentItem = location.pathname === itemPath;
                    return (
                      <button
                        key={route}
                        role="menuitem"
                        data-current={isCurrentItem ? 'true' : 'false'}
                        className={mergedStyles['dropdown-menu-item']}
                        onClick={() => {
                          closeSection();
                          closeMobileMenu();
                          if (typeof onNavigate === 'function') onNavigate(itemPath);
                        }}
                        style={{ animationDelay: `${index * 0.05}s` }}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </li>
      );
    };

    return (
      <>
        <li data-section="home" className={mergedStyles['nav-item']}>
          <NavLink 
            to="/employee/home" 
            className={({ isActive }) => `${mergedStyles['nav-link']} ${isActive ? mergedStyles['active-link'] : ''}`}
            onClick={() => closeMobileMenu()}
          >
            Home
          </NavLink>
        </li>

        {renderDropdownMenu('active')}
        {renderDropdownMenu('records')}
      </>
    );
  };

  // Handle logout - clear cookies and redirect to auth frontend
  const handleLogout = () => {
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

    // Clear all cookies
    try {
      const cookies = document.cookie.split(';');
      for (let i = 0; i < cookies.length; i++) {
        const cookie = cookies[i];
        const eqPos = cookie.indexOf('=');
        const name = eqPos > -1 ? cookie.substr(0, eqPos).trim() : cookie.trim();
        // Clear cookie for current path and domain
        document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
        // Also try to clear with domain variations
        document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=${window.location.hostname}`;
        document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=.${window.location.hostname}`;
      }
    } catch (e) {
      if (import.meta.env.DEV) console.debug('[EmployeeNavigationBar] Clearing cookies failed', e);
    }

    // Dispatch auth:logout event to stop the inactivity watcher
    try {
      window.dispatchEvent(new CustomEvent('auth:logout'));
    } catch (e) {
      // ignore
    }

    // Redirect to the auth frontend employee login page
    const authFrontendUrl = import.meta.env.VITE_AUTH_FRONTEND_URL || 'http://localhost:3001';
    window.location.href = `${authFrontendUrl}/employee`;
  };

  // Settings path - redirect to auth frontend profile
  const getSettingsPath = () => {
    const authFrontendUrl = import.meta.env.VITE_AUTH_FRONTEND_URL || 'http://localhost:3001';
    return `${authFrontendUrl}/profile`;
  };

  return (
    <NavigationBar
      logoImage={MapLogo}
      brandName="SmartSupport"
      homePath="/employee/home"
      logoPath="/employee/home"
      brandPath="/employee/home"
      onNavigate={(p) => { 
        // Handle external URLs (settings/logout)
        if (p.startsWith('http')) {
          window.location.href = p;
        } else {
          navigate(p); 
        }
      }}
      customNavStyles={customNavStyles}
      navRole="employee"
      navContent={navContent}
      sections={sections}
      NotificationDropdown={EmployeeNotification}
      notificationProps={{}}
      currentUser={currentUserForNav}
      profileSettingsPath={getSettingsPath()}
      onLogout={handleLogout}
      forceFixed={true}
      navRef={navRef}
    />
  );
};

export default EmployeeNavBar;
