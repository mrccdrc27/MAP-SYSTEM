import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import SuperAdminLayout from '../../../components/SuperAdminLayout/SuperAdminLayout';
import { Card, Alert, Badge } from '../../../components/common';
import styles from './SuperAdminDashboard.module.css';

const SuperAdminDashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const response = await fetch('/superadmin/api/stats/', {
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        setStats(data);
      } else {
        setError('Failed to load statistics');
      }
    } catch (err) {
      console.error('Error loading stats:', err);
      setError('An error occurred while loading statistics');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <SuperAdminLayout>
        <div className={styles.loading}>
          <i className="fa fa-spinner fa-spin"></i> Loading...
        </div>
      </SuperAdminLayout>
    );
  }

  return (
    <SuperAdminLayout>
      <div className="page-wrapper">
        <header className="page-header">
          <div className="page-title-section">
            <h1>Dashboard</h1>
            <p className="page-subtitle">Overview of system users and account statuses.</p>
          </div>
          <div className="page-actions">
            <Link to="/superadmin/users/create" className={styles.btnPrimary}>
              <i className="fa fa-user-plus"></i> Add User
            </Link>
          </div>
        </header>

        {error && (
          <Alert type="error" onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        <div className="page-content">
          {/* Statistics Grid */}
          <div className={styles.statsGrid}>
            <div className={styles.statCard}>
              <div className={`${styles.statIcon} ${styles.primary}`}>
                <i className="fa fa-users"></i>
              </div>
              <div className={styles.statInfo}>
                <h3>{stats?.total_users || 0}</h3>
                <p>Total Users</p>
              </div>
            </div>

            <div className={styles.statCard}>
              <div className={`${styles.statIcon} ${styles.success}`}>
                <i className="fa fa-user-check"></i>
              </div>
              <div className={styles.statInfo}>
                <h3>{stats?.active_users || 0}</h3>
                <p>Active Users</p>
              </div>
            </div>

            <div className={styles.statCard}>
              <div className={`${styles.statIcon} ${styles.warning}`}>
                <i className="fa fa-clock"></i>
              </div>
              <div className={styles.statInfo}>
                <h3>{stats?.pending_users || 0}</h3>
                <p>Pending Approval</p>
              </div>
            </div>

            <div className={styles.statCard}>
              <div className={`${styles.statIcon} ${styles.info}`}>
                <i className="fa fa-shield-halved"></i>
              </div>
              <div className={styles.statInfo}>
                <h3>{stats?.superusers || 0}</h3>
                <p>Superusers</p>
              </div>
            </div>

            <div className={styles.statCard}>
              <div className={`${styles.statIcon} ${styles.primary}`}>
                <i className="fa fa-user-tie"></i>
              </div>
              <div className={styles.statInfo}>
                <h3>{stats?.staff_users || 0}</h3>
                <p>Staff Users</p>
              </div>
            </div>

            <div className={styles.statCard}>
              <div className={`${styles.statIcon} ${styles.danger}`}>
                <i className="fa fa-lock"></i>
              </div>
              <div className={styles.statInfo}>
                <h3>{stats?.locked_users || 0}</h3>
                <p>Locked Accounts</p>
              </div>
            </div>

            <div className={styles.statCard}>
              <div className={`${styles.statIcon} ${styles.success}`}>
                <i className="fa fa-check-circle"></i>
              </div>
              <div className={styles.statInfo}>
                <h3>{stats?.approved_users || 0}</h3>
                <p>Approved Users</p>
              </div>
            </div>

            <div className={styles.statCard}>
              <div className={`${styles.statIcon} ${styles.danger}`}>
                <i className="fa fa-times-circle"></i>
              </div>
              <div className={styles.statInfo}>
                <h3>{stats?.rejected_users || 0}</h3>
                <p>Rejected Users</p>
              </div>
            </div>
          </div>

          {/* Recent Users */}
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <h3 className={styles.cardTitle}>
                <i className="fa fa-history"></i> Recent Users
              </h3>
              <Link to="/superadmin/users" className={styles.btnSecondary}>
                View All
              </Link>
            </div>

            <div className={styles.tableContainer}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Email</th>
                    <th>Name</th>
                    <th>Status</th>
                    <th>Joined</th>
                  </tr>
                </thead>
                <tbody>
                  {stats?.recent_users && stats.recent_users.length > 0 ? (
                    stats.recent_users.map((user) => (
                      <tr key={user.id}>
                        <td>{user.email}</td>
                        <td>{user.first_name} {user.last_name}</td>
                        <td>
                          <span className={`${styles.badge} ${styles[user.status?.toLowerCase() || 'pending']}`}>
                            {user.status || 'Pending'}
                          </span>
                        </td>
                        <td>{new Date(user.date_joined).toLocaleDateString()}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="4" className={styles.noData}>
                        No recent users found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </SuperAdminLayout>
  );
};

export default SuperAdminDashboard;
