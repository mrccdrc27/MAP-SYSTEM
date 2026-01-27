import { useState, useRef, useEffect } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import MapLogo from '../../../shared/assets/MapLogo.png';
import CoordinatorAdminNotifications from '../pop-ups/CoordinatorAdminNotifications';
import { useAuth } from '../../../context/AuthContext';
import NavigationBar from '../../../shared/components/NavigationBar.jsx';
import customNavStyles from './CoordinatorAdminNavigationBar.module.css';
import { resolveMediaUrl } from '../../../utilities/helpers/mediaUrl';

// External URLs for profile and logout
const AUTH_FRONTEND_URL = import.meta.env.VITE_AUTH_FRONTEND_URL || 'https://login.ticketing.mapactive.tech';
const PROFILE_URL = `${AUTH_FRONTEND_URL}/profile`;
const LOGOUT_REDIRECT_URL = `${AUTH_FRONTEND_URL}/staff`;

// Note: dropdown menu is moved inside `.dropdown-container` to
// support mobile accordion rendering (dropdown-container -> dropdown-menu).
// Mobile items are left-aligned under the trigger via CSS text-align: left !important;
// Dropdown state (openSection, toggleSection, closeSection) is centralized in NavigationBar.jsx.
// Mobile nav uses drawer style (slides from left with fixed 280px width).

const CoordinatorAdminNavBar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user: currentUser } = useAuth();
  const navRef = useRef(null);

  // Build nav sections based on current user role
  const role = currentUser?.role;

  // Define all dropdown configurations
  const dropdowns = {
    tickets: {
      label: 'Ticket Management',
      path: '/admin/ticket-management/',
      items: [
        ['all-tickets', 'All Tickets'],
        ['new-tickets', 'New Tickets'],
        ['pending-tickets', 'Pending Tickets'],
        ['open-tickets', 'Open Tickets'],
        ['in-progress-tickets', 'In Progress Tickets'],
        ['on-hold-tickets', 'On Hold Tickets'],
        ['resolved-tickets', 'Resolved Tickets'],
        ['withdrawn-tickets', 'Withdrawn Tickets'],
        ['closed-tickets', 'Closed Tickets'],
        ['rejected-tickets', 'Rejected Tickets'],
      ],
    },
    users: {
      label: 'User Access',
      path: '/admin/user-access/',
      items: [
        ['all-users', 'All Users'],
        ['employees', 'Employees'],
        ['ticket-coordinators', 'Ticket Coordinators'],
        ['system-admins', 'System Admins'],
        ['pending-users', 'Pending Users'],
        ['rejected-users', 'Rejected Users'],
      ],
    },
    reports: {
      label: 'Reports',
      path: '/admin/reports/',
      items: [
        ['ticket', 'Ticket Reports'],
        ['sla-compliance', 'SLA Compliance'],
        ['csat-performance', 'CSAT Performance'],
      ],
    },
    kb: {
      label: 'Knowledge Base',
      path: '/admin/knowledge/',
      items: [
        ['articles', 'Articles'],
        ['archived', 'Archived Articles'],
      ],
    },
    kbCoordinator: {
      label: 'Knowledge Base',
      path: '/admin/coordinator-knowledgebase',
      items: [
        ['', 'Knowledge Base'],
      ],
    },
    csat: {
      label: 'CSAT',
      path: '/admin/csat/',
      items: [
        ['all', 'All Ratings'],
        ['excellent', 'Excellent Ratings'],
        ['good', 'Good Ratings'],
        ['neutral', 'Neutral Ratings'],
        ['poor', 'Poor Ratings'],
        ['very-poor', 'Very Poor Ratings'],
      ],
    },
    ams: {
      label: 'AMS',
      path: '/admin/ams/',
      items: [
        ['dashboard', 'AMS Dashboard'],
        ['tickets', 'AMS Tickets'],
      ],
    },
    bms: {
      label: 'BMS',
      path: '/admin/bms/',
      items: [
        ['dashboard', 'BMS Dashboard'],
        ['tickets', 'BMS Tickets'],
      ],
    },
    integrations: {
      label: 'Integrations',
      path: '',
      // group structure so dropdown shows AMS and BMS as nested sections
      groups: [
        {
          key: 'ams',
          label: 'AMS',
          path: '/admin/ams/',
          items: [
            ['dashboard', 'AMS Dashboard'],
            ['tickets', 'AMS Tickets'],
          ],
        },
        {
          key: 'bms',
          label: 'BMS',
          path: '/admin/bms/',
          items: [
            ['dashboard', 'BMS Dashboard'],
            ['tickets', 'BMS Tickets'],
          ],
        },
      ],
    },
  };

  // Helper to normalize user object for NavigationBar (expects camelCase)
  const normalizedUser = currentUser ? {
    ...currentUser,
    firstName: currentUser.first_name || currentUser.firstName || '',
    lastName: currentUser.last_name || currentUser.lastName || '',
    profileImage: resolveMediaUrl(currentUser.profile_picture || currentUser.profileImage || currentUser.image) || 'https://i.pinimg.com/1200x/a9/a8/c8/a9a8c8258957c8c7d6fcd320e9973203.jpg',
  } : null;

  // Logout handler - clears cookies and redirects to auth frontend
  const handleLogout = async () => {
    try {
      // Try to call backend logout endpoint to clear HttpOnly cookies
      const AUTH_URL = import.meta.env.VITE_AUTH_URL || '';
      await fetch(`${AUTH_URL}/api/v1/token/logout/`, {
        method: 'POST',
        credentials: 'include',
      });
    } catch (e) {
      console.debug('[CoordinatorAdminNav] Logout endpoint call failed:', e);
    }

    // Clear localStorage
    try {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('user');
      localStorage.removeItem('loggedInUser');
      localStorage.removeItem('chatbotMessages');
    } catch (e) {
      console.debug('[CoordinatorAdminNav] Clearing localStorage failed:', e);
    }

    // Clear non-HttpOnly cookies
    try {
      if (typeof document !== 'undefined') {
        const cookies = document.cookie ? document.cookie.split(';').map(c => c.split('=')[0].trim()) : [];
        cookies.forEach((name) => {
          document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
          document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; domain=${window.location.hostname}`;
        });
      }
    } catch (e) {
      console.debug('[CoordinatorAdminNav] Clearing cookies failed:', e);
    }

    // Dispatch logout event
    try {
      window.dispatchEvent(new CustomEvent('auth:logout'));
    } catch (e) {}

    // Redirect to auth frontend
    window.location.href = LOGOUT_REDIRECT_URL;
  };

  // Build sections array for shared layout based on role
  const buildSections = () => {
    // Ticket Coordinator: Ticket Management, Integrations, More (Reports + KB) - My Tickets is a direct link
    // System Admin: Ticket Management, Users, CSAT, More (Reports + KB)
    const sectionKeys =
      role === 'Ticket Coordinator'
        ? ['tickets', 'integrations', 'more']
        : role === 'System Admin' || role === 'Admin'
        ? ['tickets', 'users', 'csat', 'more']
        : ['tickets', 'users', 'reports', 'kb'];

    return sectionKeys.map((key) => {
      if (key === 'more') {
        // Combine Reports and KnowledgeBase into a single 'More' section
        const reports = dropdowns.reports.items.map(([route, label]) => ({ label, path: `${dropdowns.reports.path}${route}` }));
        // Use coordinator KB for Ticket Coordinator, admin KB for System Admin
        const kbItems = (role === 'Ticket Coordinator')
          ? dropdowns.kbCoordinator.items.map(([route, label]) => ({ label, path: `${dropdowns.kbCoordinator.path}${route}` }))
          : dropdowns.kb.items.map(([route, label]) => ({ label, path: `${dropdowns.kb.path}${route}` }));
        return {
          key: 'more',
          label: 'More',
          basePath: '',
          links: [...reports, ...kbItems],
        };
      }

      // Special-case integrations which uses grouped structure
      if (key === 'integrations') {
        const groups = dropdowns.integrations?.groups || [];
        const links = groups.flatMap((g) => (g.items || []).map(([route, label]) => ({
          label,
          path: `${g.path}${route}`,
        })));
        return {
          key: 'integrations',
          label: dropdowns.integrations.label,
          basePath: '',
          links,
        };
      }

      const dropdown = dropdowns[key];
      return {
        key,
        label: dropdown.label,
        basePath: dropdown.path,
        links: (dropdown.items || []).map(([route, label]) => ({
          label,
          path: `${dropdown.path}${route}`,
        })),
      };
    });
  };

  const sections = buildSections();

  // coordinator local hamburger control: ensure hamburger renders so
  // mobile drawer can be opened. Default to true here so coordinator
  // can always open the mobile nav when needed.
  const [showHamburgerForce, setShowHamburgerForce] = useState(true);
  const [isNarrow, setIsNarrow] = useState(false);

  // track which integrations subgroup is expanded (ams or bms)
  const [openIntegrationGroup, setOpenIntegrationGroup] = useState(null);

  // track which subgroup inside `More` is expanded (e.g., reports or kb)
  const [openMoreGroup, setOpenMoreGroup] = useState(null);

  // track viewport width to distinguish desktop vs mobile behavior
  useEffect(() => {
    const onResize = () => setIsNarrow(window.innerWidth < 769);
    onResize();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // Navigation content - follows same pattern as EmployeeNavigationBar
  const navContent = ({ closeMobileMenu, toggleSection, openSection, closeSection, ChevronIcon, mergedStyles, onNavigate }) => {
    // navContent render helpers
    const renderDropdownMenu = (key) => {
      // Special-case the virtual 'more' dropdown which combines reports and coordinator KB
      if (key === 'more') {
          // Build groups based on role
          let groups = [];
          let kbItems = [];
          
          if (role === 'Ticket Coordinator') {
            // Ticket Coordinator: Reports (with submenu) and Knowledge Base items (as direct links)
            groups = [
              { key: 'reports', label: 'Reports', path: dropdowns.reports.path, items: dropdowns.reports.items },
            ];
            kbItems = dropdowns.kbCoordinator.items.map(([route, label]) => ({
              route,
              label,
              path: `${dropdowns.kbCoordinator.path}${route}`,
              isDirectLink: true,
            }));
          } else if (role === 'System Admin' || role === 'Admin') {
            // System Admin: Reports (with submenu) and Knowledge Base (with submenu)
            groups = [
              { key: 'reports', label: 'Reports', path: dropdowns.reports.path, items: dropdowns.reports.items },
              { key: 'kb', label: 'Knowledge Base', path: dropdowns.kb.path, items: dropdowns.kb.items },
            ];
          }

          const isInPath = groups.some((g) => g.items.some(([route]) => location.pathname === `${g.path}${route}` || location.pathname.startsWith(`${g.path}${route}`))) ||
                          kbItems.some((item) => location.pathname === item.path || location.pathname.startsWith(item.path));
          const isOpen = openSection === 'more';

          return (
            <li key="more" data-open={isOpen ? 'true' : 'false'} data-current={isInPath ? 'true' : 'false'} data-section="more" className={mergedStyles['nav-item']}>
              <div className={`${mergedStyles['dropdown-container']} ${isOpen ? mergedStyles['open'] : ''} ${isInPath ? mergedStyles['active-link'] : ''}`} data-open={isOpen ? 'true' : 'false'} data-current={isInPath ? 'true' : 'false'}>
                <button
                  className={`${mergedStyles['dropdown-trigger']}`}
                  aria-expanded={isOpen}
                  onClick={() => toggleSection('more')}
                  type="button"
                >
                  <span className={mergedStyles['dropdown-text']}>More</span>
                  {ChevronIcon && (
                    <ChevronIcon className={`${mergedStyles['arrow-icon']} ${isOpen ? mergedStyles['arrow-flipped'] : ''}`} />
                  )}
                </button>

                {isOpen && (
                  <div className={mergedStyles['custom-dropdown']} role="menu">
                    <div className={mergedStyles['dropdown-menu']}>
                      {groups.map((g) => {
                        const groupOpen = openMoreGroup === g.key;
                        return (
                          <div key={g.key} style={{ padding: '6px 0' }}>
                            <button
                              type="button"
                              className={mergedStyles['dropdown-menu-item']}
                              aria-expanded={groupOpen}
                              onClick={() => setOpenMoreGroup((prev) => (prev === g.key ? null : g.key))}
                              style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', fontWeight: 600, padding: '8px 16px', background: 'transparent' }}
                            >
                              <span>{g.label}</span>
                              {ChevronIcon && (<ChevronIcon className={`${mergedStyles['arrow-icon']} ${groupOpen ? mergedStyles['arrow-flipped'] : ''}`} />)}
                            </button>

                            {groupOpen && (
                              <div style={{ paddingLeft: 12 }}>
                                {g.items.map(([route, label], index) => {
                                  const itemPath = `${g.path}${route}`;
                                  const isCurrentItem = location.pathname === itemPath;
                                  return (
                                    <button
                                      key={g.key + route + index}
                                      role="menuitem"
                                      data-current={isCurrentItem ? 'true' : 'false'}
                                      className={mergedStyles['dropdown-menu-item']}
                                        onClick={() => {
                                        closeSection();
                                        closeMobileMenu();
                                        setOpenMoreGroup(null);
                                        if (typeof onNavigate === 'function') onNavigate(itemPath);
                                      }}
                                      style={{ animationDelay: `${index * 0.05}s` }}
                                    >
                                      {label}
                                    </button>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      })}

                      {/* Knowledge Base as direct link items (no chevron/group) */}
                      {kbItems.map((item, index) => {
                        const isCurrentItem = location.pathname === item.path;
                        return (
                          <button
                            key={`kb-${item.route}-${index}`}
                            role="menuitem"
                            data-current={isCurrentItem ? 'true' : 'false'}
                            className={mergedStyles['dropdown-menu-item']}
                            onClick={() => {
                              closeSection();
                              closeMobileMenu();
                              if (typeof onNavigate === 'function') onNavigate(item.path);
                            }}
                            style={{ animationDelay: `${(groups[0]?.items?.length || 0 + index) * 0.05}s` }}
                          >
                            {item.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </li>
          );
      }

      // Special-case the `integrations` dropdown to render nested AMS/BMS with chevrons
      if (key === 'integrations') {
        const groups = dropdowns.integrations.groups || [];
        const isInPath = groups.some((g) => g.items.some(([route]) => location.pathname === `${g.path}${route}` || location.pathname.startsWith(`${g.path}${route}`)));
        const isOpen = openSection === 'integrations';

        return (
          <li key="integrations" data-open={isOpen ? 'true' : 'false'} data-current={isInPath ? 'true' : 'false'} data-section="integrations" className={mergedStyles['nav-item']}>
            <div className={`${mergedStyles['dropdown-container']} ${isOpen ? mergedStyles['open'] : ''} ${isInPath ? mergedStyles['active-link'] : ''}`} data-open={isOpen ? 'true' : 'false'} data-current={isInPath ? 'true' : 'false'}>
              <button
                className={`${mergedStyles['dropdown-trigger']}`}
                aria-expanded={isOpen}
                onClick={() => toggleSection('integrations')}
                type="button"
              >
                <span className={mergedStyles['dropdown-text']}>Integrations</span>
                {ChevronIcon && (
                  <ChevronIcon className={`${mergedStyles['arrow-icon']} ${isOpen ? mergedStyles['arrow-flipped'] : ''}`} />
                )}
              </button>

              {isOpen && (
                <div className={mergedStyles['custom-dropdown']} role="menu">
                  <div className={mergedStyles['dropdown-menu']}>
                    {groups.map((g) => {
                      const groupOpen = openIntegrationGroup === g.key;
                      return (
                        <div key={g.key} style={{ padding: '6px 0' }}>
                          <button
                            type="button"
                            className={mergedStyles['dropdown-menu-item']}
                            aria-expanded={groupOpen}
                            onClick={() => setOpenIntegrationGroup((prev) => (prev === g.key ? null : g.key))}
                            style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', fontWeight: 600, padding: '8px 16px', background: 'transparent' }}
                          >
                            <span>{g.label}</span>
                            {ChevronIcon && (<ChevronIcon className={`${mergedStyles['arrow-icon']} ${groupOpen ? mergedStyles['arrow-flipped'] : ''}`} />)}
                          </button>

                          {groupOpen && (
                            <div style={{ paddingLeft: 12 }}>
                              {g.items.map(([route, label], index) => {
                                const itemPath = `${g.path}${route}`;
                                const isCurrentItem = location.pathname === itemPath;
                                return (
                                  <button
                                    key={g.key + route + index}
                                    role="menuitem"
                                    data-current={isCurrentItem ? 'true' : 'false'}
                                    className={mergedStyles['dropdown-menu-item']}
                                    onClick={() => {
                                      closeSection();
                                      closeMobileMenu();
                                      setOpenIntegrationGroup(null);
                                      if (typeof onNavigate === 'function') onNavigate(itemPath);
                                    }}
                                    style={{ animationDelay: `${index * 0.05}s` }}
                                  >
                                    {label}
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </li>
        );
      }

      const dropdown = dropdowns[key];
      if (!dropdown) return null;

      const isInPath = dropdown.items.some(([route]) => {
        const itemPath = `${dropdown.path}${route}`;
        return location.pathname === itemPath || location.pathname.startsWith(itemPath.replace(/\/$/, ''));
      });
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
                        key={route || label}
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

    // Determine which dropdown keys to render based on role
    // Note: myTickets is rendered as a direct link after tickets dropdown
    // Order: Dashboard, Ticket Management, My Tickets, Integrations, More
    const dropdownKeysBeforeMyTickets =
      role === 'Ticket Coordinator'
        ? ['tickets']
        : role === 'System Admin' || role === 'Admin'
        ? ['tickets', 'users', 'csat', 'more']
        : ['tickets', 'users', 'reports', 'kb'];

    const dropdownKeysAfterMyTickets =
      role === 'Ticket Coordinator'
        ? ['integrations', 'more']
        : [];

    return (
      <>
        {/* Dashboard Link */}
        <li data-section="dashboard" className={mergedStyles['nav-item']}>
          <NavLink
            to="/admin/dashboard"
            className={({ isActive }) => `${mergedStyles['nav-link']} ${isActive ? mergedStyles['active-link'] : ''}`}
            onClick={() => closeMobileMenu()}
          >
            Dashboard
          </NavLink>
        </li>

        {/* Render dropdown menus before My Tickets */}
        {dropdownKeysBeforeMyTickets.map((key) => renderDropdownMenu(key))}

        {/* My Tickets - Direct link for Ticket Coordinators (no dropdown) */}
        {role === 'Ticket Coordinator' && (
          <li data-section="myTickets" className={mergedStyles['nav-item']}>
            <NavLink
              to="/admin/owned-tickets"
              className={({ isActive }) => `${mergedStyles['nav-link']} ${isActive ? mergedStyles['active-link'] : ''}`}
              onClick={() => closeMobileMenu()}
            >
              My Tickets
            </NavLink>
          </li>
        )}

        {/* Render dropdown menus after My Tickets (Integrations, More) */}
        {dropdownKeysAfterMyTickets.map((key) => renderDropdownMenu(key))}
      </>
    );
  };

  // Custom onNavigate that handles external URLs
  const handleNavigate = (path) => {
    if (path.startsWith('http://') || path.startsWith('https://')) {
      window.location.href = path;
    } else {
      navigate(path);
    }
  };

  return (
    <NavigationBar
      logoImage={MapLogo}
      brandName="SmartSupport"
      homePath="/admin/dashboard"
      logoPath="/admin/dashboard"
      brandPath="/admin/dashboard"
      onNavigate={handleNavigate}
      showHamburgerForce={true}
      customNavStyles={customNavStyles}
      navContent={navContent}
      navRole="coordinator"
      compactOverride={true}
      sections={sections}
      NotificationDropdown={CoordinatorAdminNotifications}
      notificationProps={{}}
      currentUser={normalizedUser}
      profileSettingsPath={PROFILE_URL}
      profileLogoutPath={LOGOUT_REDIRECT_URL}
      onLogout={handleLogout}
      forceFixed={true}
      navRef={navRef}
    />
  );
};

export default CoordinatorAdminNavBar;