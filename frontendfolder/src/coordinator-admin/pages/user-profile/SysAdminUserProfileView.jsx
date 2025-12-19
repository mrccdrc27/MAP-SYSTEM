import React, { useEffect, useState, useMemo, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Breadcrumb from '../../../shared/components/Breadcrumb';
import Skeleton from '../../../shared/components/Skeleton/Skeleton';
import ViewCard from '../../../shared/components/ViewCard';
import Tabs from '../../../shared/components/Tabs';
import Button from '../../../shared/components/Button';
import styles from './SysAdminUserProfileView.module.css';
import detailStyles from '../ticket-tracker/CoordinatorAdminTicketDetails.module.css';
import { getEmployeeUsers, getEmployeeUserById } from '../../../utilities/storages/employeeUserStorage';
import { backendEmployeeService } from '../../../services/backend/employeeService';
import { backendUserService } from '../../../services/backend/userService.js';
import { getUserActivityLogs } from '../../../utilities/storages/userActivityLog';
import SysAdminUserProfileLogs from './SysAdminUserProfileLogs';

export default function CoordinatorAdminUserProfileView() {
  const { companyId } = useParams();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('logs');
  const leftColRef = useRef(null);
  const rightColRef = useRef(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (!companyId) {
        setIsLoading(false);
        return;
      }
      const numeric = Number(companyId);

      // Helper to fallback to local fixtures
      const applyLocalFallback = () => {
        const all = getEmployeeUsers();
        const foundLocal = all.find(u => String(u.companyId) === String(companyId) || String(u.id) === String(companyId));
        setUser(foundLocal ? normalizeEmployee(foundLocal) : null);
        setIsLoading(false);
      };

      // Prefer the AUTH service (users) as authoritative source for user profiles.
      // If companyId looks numeric, we still try employee lookup by id, but
      // non-numeric company IDs (like MA0520) will be matched against the
      // auth users list returned by backendUserService.getAllUsers().
      (async () => {
        try {
          // Try auth users endpoint first
          try {
            // First try a server-side company_id lookup (admin-only endpoint)
            try {
              const byCompany = await backendUserService.getUserByCompanyId(companyId);
              if (byCompany && (byCompany.id || byCompany.company_id)) {
                setUser(normalizeEmployee(byCompany));
                setIsLoading(false);
                return;
              }
            } catch (err) {
              // eslint-disable-next-line no-console
              console.debug('[UserProfile] getUserByCompanyId failed, falling back to list lookup', err && err.message ? err.message : err);
            }

            // Fallback: fetch all users and try client-side matching
            const allUsersResp = await backendUserService.getAllUsers();
            let users = [];
            if (!allUsersResp) users = [];
            else if (Array.isArray(allUsersResp)) users = allUsersResp;
            else if (Array.isArray(allUsersResp.users)) users = allUsersResp.users;
            else if (Array.isArray(allUsersResp.data)) users = allUsersResp.data;

            if (users.length > 0) {
              // Prefer exact company_id match when companyId looks non-numeric
              const isNumericLike = !isNaN(Number(companyId));

              let match = null;
              if (!isNumericLike) {
                match = users.find(u => String(u.company_id || u.companyId || u.company || '').toLowerCase() === String(companyId).toLowerCase());
              }
              // If no company_id match or companyId is numeric-like, try id match
              if (!match) {
                match = users.find(u => String(u.id) === String(companyId));
              }
              // As a last resort only if still not found, try username exact match
              if (!match) {
                match = users.find(u => String(u.username || '').toLowerCase() === String(companyId).toLowerCase());
              }

              if (match) {
                setUser(normalizeEmployee(match));
                setIsLoading(false);
                return;
              }
            } else {
              // eslint-disable-next-line no-console
              console.debug('[UserProfile] auth users returned 0 users for lookup');
            }
            // If we reach here, auth users returned but no match found
            // eslint-disable-next-line no-console
            console.debug('[UserProfile] auth users fetched:', users.length, 'no match for', companyId);
          } catch (e) {
            // auth users lookup failed; fall back to employee service below
            // eslint-disable-next-line no-console
            console.debug('[UserProfile] auth users lookup failed, will try employee service', e && e.message ? e.message : e);
          }

          // If companyId looks numeric, ask backend employee service by numeric id
          if (!Number.isNaN(numeric)) {
            try {
              const emp = await backendEmployeeService.getEmployeeById(numeric);
              if (emp) {
                setUser(normalizeEmployee(emp));
                setIsLoading(false);
                return;
              }
            } catch (e) {
              // backend lookup failed; fall through to local fallback
            }
          } else {
            // Try employee service full list as a last backend attempt
            try {
              const emps = await backendEmployeeService.getAllEmployees();
              if (Array.isArray(emps) && emps.length > 0) {
                const match = emps.find(e => String(e.company_id || e.companyId || e.companyIdNumber || e.companyId) === String(companyId) || String(e.id) === String(companyId));
                if (match) {
                  setUser(normalizeEmployee(match));
                  setIsLoading(false);
                  return;
                }
              }
            } catch (e) {
              // backend lookup failed; fall through to local fallback
            }
          }
        } catch (e) {
          // unexpected error - fall back to fixtures
        }

        // If we reach here, backend did not return a match or failed — use local fixtures
        applyLocalFallback();
      })();
    }, 300);
    return () => clearTimeout(timer);
  }, [companyId]);

  // Normalize employee object shape from backend (snake_case) or local storage to the
  // frontend shape expected by this component (camelCase keys like firstName, lastName, profileImage)
  const normalizeEmployee = (e) => {
    if (!e) return null;
    // If already appears normalized (has firstName), return as-is
    if (e.firstName) return e;
    // Derive role from system_roles if present (auth API provides system_roles array)
    let derivedRole = '';
    try {
      if (Array.isArray(e.system_roles) && e.system_roles.length > 0) {
        // Prefer HDTS role when present
        const hdts = e.system_roles.find(r => String(r.system_slug || r.system || '').toLowerCase() === 'hdts');
        const pick = hdts || e.system_roles[0];
        derivedRole = pick.role_name || pick.role || '';
      }
    } catch (err) {
      // ignore and fall back
      derivedRole = '';
    }

    // Normalize profile picture variations: API returns `profile_picture` (string URL),
    // serializer sometimes returns absolute URL; some backends use `profile_image`.
    let picture = '';
    if (e.profile_picture) {
      if (typeof e.profile_picture === 'string') picture = e.profile_picture;
      else if (e.profile_picture.url) picture = e.profile_picture.url;
    }
    if (!picture) picture = e.profile_image || e.profileImage || e.image || e.profile_picture_url || '';

    return {
      id: e.id || e.pk || e.employee_id || null,
      companyId: e.company_id || e.companyId || e.companyIdNumber || e.companyId || e.company_id_number || '',
      firstName: e.first_name || e.firstName || e.first || '',
      lastName: e.last_name || e.lastName || e.last || '',
      email: e.email || e.email_address || '',
      role: derivedRole || e.role || e.user_role || '',
      department: e.department || e.dept || '',
      profileImage: picture,
      status: e.status || e.account_status || '',
      phone: e.phone || e.contact_number || '',
    };
  };

  const [activityLogs, setActivityLogs] = useState([]);
  const [logsLoading, setLogsLoading] = useState(false);

  // Fetch activity logs from backend when user changes
  useEffect(() => {
    let mounted = true;
    if (!user?.id) {
      setActivityLogs([]);
      setLogsLoading(false);
      return;
    }
    setLogsLoading(true);
    (async () => {
      try {
        const logs = await backendEmployeeService.getActivityLogs(user.id);
        if (!mounted) return;
        setActivityLogs(Array.isArray(logs) ? logs : []);
      } catch (e) {
        console.error('Failed to fetch activity logs', e);
        if (mounted) setActivityLogs([]);
      } finally {
        if (mounted) setLogsLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [user?.id]);

  // Sync column heights
  useEffect(() => {
    const syncHeights = () => {
      const leftCol = leftColRef.current;
      const rightCol = rightColRef.current;
      if (leftCol && rightCol) {
        const leftHeight = leftCol.offsetHeight;
        const rightHeight = rightCol.offsetHeight;
        const maxHeight = Math.max(leftHeight, rightHeight);
        leftCol.style.minHeight = `${maxHeight}px`;
        rightCol.style.minHeight = `${maxHeight}px`;
      }
    };

    const observer = new MutationObserver(syncHeights);
    if (leftColRef.current) {
      observer.observe(leftColRef.current, { subtree: true, childList: true });
    }

    const resizeObserver = new ResizeObserver(syncHeights);
    if (leftColRef.current) resizeObserver.observe(leftColRef.current);
    if (rightColRef.current) resizeObserver.observe(rightColRef.current);

    const timeout = setTimeout(syncHeights, 100);
    return () => {
      clearTimeout(timeout);
      observer.disconnect();
      resizeObserver.disconnect();
    };
  }, [user, activeTab]);

  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInSeconds = Math.floor((now - date) / 1000);

    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)} days ago`;

    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  

  if (isLoading && !user) {
    return (
      <main className={styles.pageRoot}>
        <Breadcrumb
          root="User Management"
          currentPage="User Profile"
          rootNavigatePage="/admin/user-access/all"
          title="User Profile"
        />
        <ViewCard>
          <div className={styles.contentGrid}>
            <div className={styles.leftColumn}>
              <Skeleton width="100px" height="32px" />
              <Skeleton width="100%" height="200px" style={{ marginTop: '16px' }} />
              {[1, 2, 3, 4].map(i => (
                <div key={i} style={{ marginTop: '16px' }}>
                  <Skeleton width="150px" height="20px" />
                  <Skeleton width="100%" height="24px" style={{ marginTop: '8px' }} />
                </div>
              ))}
            </div>
            <div className={styles.rightColumn}>
              <Skeleton width="100%" height="300px" />
            </div>
          </div>
        </ViewCard>
      </main>
    );
  }

  if (!user) {
    return (
      <main className={styles.pageRoot}>
        <Breadcrumb
          root="User Management"
          currentPage="User Profile"
          rootNavigatePage="/admin/user-access/all"
          title="User Profile"
        />
        <ViewCard>
          <div style={{ padding: '40px 28px', textAlign: 'center', color: '#6c757d' }}>
            No user found for ID <strong>{companyId}</strong>.
          </div>
        </ViewCard>
      </main>
    );
  }

  return (
    <main className={styles.pageRoot}>
      <Breadcrumb
        root="User Management"
        currentPage={`${user.firstName} ${user.lastName}`}
        rootNavigatePage="/admin/user-access/all"
        title={`${user.firstName} ${user.lastName}`}
      />

      <ViewCard>
        <div className={styles.contentGrid}>
          {/* Left Column */}
          <div className={styles.leftColumn} ref={leftColRef}>
            {/* Status Badge - Top Left */}
            <div className={styles.statusBadgeContainer}>
              <span className={`${styles.statusBadge} ${styles[`status${user.status?.replace(/\s+/g, '')}`]}`}>
                {user.status}
              </span>
            </div>

            {/* User Header with Profile Section */}
            <div className={styles.userHeader}>
              <div className={styles.profileSection}>
                <div className={styles.profileImageContainer}>
                  <img 
                    src={user.profileImage || `https://ui-avatars.com/api/?name=${user.firstName}+${user.lastName}&background=667eea&color=fff&size=96`} 
                    alt={`${user.firstName} ${user.lastName}`}
                    className={styles.avatar}
                  />
                </div>
                <div className={styles.profileInfo}>
                  <h1>{user.firstName} {user.lastName}</h1>
                  <p className={styles.email}>{user.email}</p>
                  <div className={styles.badges}>
                    <span className={styles.roleBadge}>{user.role}</span>
                    <span className={styles.deptBadge}>{user.department}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* User Details - Contact Information Only */}
            <div className={styles.detailsSection}>
              <h3 className={styles.sectionTitle}>Contact Information</h3>
              <div className={styles.detailsGrid}>
                <div className={styles.detailItem}>
                  <div className={styles.detailLabel}>Phone</div>
                  <div className={styles.detailValue}>{user.phone || '—'}</div>
                </div>
                <div className={styles.detailItem}>
                  <div className={styles.detailLabel}>Address</div>
                  <div className={styles.detailValue}>{user.address || '—'}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Edit Status & Activity Logs */}
          <div ref={rightColRef} className={styles.rightColumn}>
            {/* Edit Status Button */}
            <div className={styles.actionButtons}>
              <Button 
                variant="primary" 
                onClick={() => alert('Edit Status feature coming soon')}
              >
                Edit Status
              </Button>
            </div>

            {/* Activity Logs */}
            <Tabs
              tabs={[
                { label: 'Activity Logs', value: 'logs' }
              ]}
              active={activeTab}
              onChange={setActiveTab}
              className={`${styles.tabsContainer} ${detailStyles.tabsFill}`}
            >
              <div className={styles.panelRoot}>
                <div className={styles.panelContent}>
                  <div className={styles.logsPanel}>
                    {activityLogs && activityLogs.length > 0 ? (
                      <SysAdminUserProfileLogs activityLogs={activityLogs} />
                    ) : (
                      <div className={styles.noLogs}>No activity recorded for this user.</div>
                    )}
                  </div>
                </div>
              </div>
            </Tabs>
          </div>
        </div>
      </ViewCard>
    </main>
  );
}