import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import SuperAdminLayout from '../../../components/SuperAdminLayout/SuperAdminLayout';
import { Button, Input, Modal } from '../../../components/common';
import styles from './UserMasterlist.module.css';

const UserMasterlist = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchEmail, setSearchEmail] = useState('');
  const [searchName, setSearchName] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [isActiveFilter, setIsActiveFilter] = useState('');
  const [isStaffFilter, setIsStaffFilter] = useState('');
  const [isSuperuserFilter, setIsSuperuserFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [deleteModalUser, setDeleteModalUser] = useState(null);

  useEffect(() => {
    loadUsers();
  }, [currentPage, searchEmail, searchName, statusFilter, isActiveFilter, isStaffFilter, isSuperuserFilter]);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        ...(searchEmail && { email: searchEmail }),
        ...(searchName && { name: searchName }),
        ...(statusFilter && { status: statusFilter }),
        ...(isActiveFilter && { is_active: isActiveFilter }),
        ...(isStaffFilter && { is_staff: isStaffFilter }),
        ...(isSuperuserFilter && { is_superuser: isSuperuserFilter }),
      });

      const response = await fetch(`http://localhost:8003/superadmin/api/users/?${params}`, {
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        setUsers(data.users || []);
        setTotalPages(data.total_pages || 1);
        setError('');
      } else {
        setError('Failed to load users');
      }
    } catch (err) {
      console.error('Error loading users:', err);
      setError('An error occurred while loading users');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setCurrentPage(1);
    loadUsers();
  };

  const handleReset = () => {
    setSearchEmail('');
    setSearchName('');
    setStatusFilter('');
    setIsActiveFilter('');
    setIsStaffFilter('');
    setIsSuperuserFilter('');
    setCurrentPage(1);
  };

  const handleDeleteClick = (user) => {
    setDeleteModalUser(user);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteModalUser) return;

    try {
      const response = await fetch(`http://localhost:8003/superadmin/api/users/${deleteModalUser.id}/`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (response.ok) {
        setDeleteModalUser(null);
        loadUsers();
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to delete user');
      }
    } catch (err) {
      console.error('Error deleting user:', err);
      alert('An error occurred while deleting user');
    }
  };

  const handleExport = async () => {
    try {
      const response = await fetch('http://localhost:8003/superadmin/api/users/export/', {
        credentials: 'include',
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `users_export_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      } else {
        alert('Failed to export users');
      }
    } catch (err) {
      console.error('Error exporting users:', err);
      alert('An error occurred while exporting users');
    }
  };

  return (
    <SuperAdminLayout>
      <div className={styles.pageHeader}>
        <h2>User Masterlist</h2>
        <div className={styles.btnGroup}>
          <Button variant="secondary" onClick={handleExport} icon={<i className="fa fa-file-export"></i>}>
            Export CSV
          </Button>
          <Link to="/superadmin/users/create" className={styles.btnPrimaryLink}>
            <Button icon={<i className="fa fa-user-plus"></i>}>
              Add User
            </Button>
          </Link>
        </div>
      </div>

      {error && (
        <div className={styles.alert}>
          <i className="fa fa-exclamation-circle"></i> {error}
        </div>
      )}

      {/* Search and Filter */}
      <div className={styles.card}>
        <form onSubmit={handleSearch} className={styles.filterForm}>
          <div className={styles.formGrid}>
            <Input
              label="Email"
              type="text"
              placeholder="Search by email"
              value={searchEmail}
              onChange={(e) => setSearchEmail(e.target.value)}
            />

            <Input
              label="Name"
              type="text"
              placeholder="Search by name"
              value={searchName}
              onChange={(e) => setSearchName(e.target.value)}
            />

            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Status</label>
              <select
                className={styles.formControl}
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="">All</option>
                <option value="Pending">Pending</option>
                <option value="Approved">Approved</option>
                <option value="Rejected">Rejected</option>
              </select>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Active</label>
              <select
                className={styles.formControl}
                value={isActiveFilter}
                onChange={(e) => setIsActiveFilter(e.target.value)}
              >
                <option value="">All</option>
                <option value="true">Active</option>
                <option value="false">Inactive</option>
              </select>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Staff</label>
              <select
                className={styles.formControl}
                value={isStaffFilter}
                onChange={(e) => setIsStaffFilter(e.target.value)}
              >
                <option value="">All</option>
                <option value="true">Staff</option>
                <option value="false">Non-Staff</option>
              </select>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Superuser</label>
              <select
                className={styles.formControl}
                value={isSuperuserFilter}
                onChange={(e) => setIsSuperuserFilter(e.target.value)}
              >
                <option value="">All</option>
                <option value="true">Superusers</option>
                <option value="false">Non-Superusers</option>
              </select>
            </div>
          </div>

          <div className={styles.formActions}>
            <Button type="submit" icon={<i className="fa fa-search"></i>}>
              Search
            </Button>
            <Button variant="secondary" onClick={handleReset} icon={<i className="fa fa-redo"></i>}>
              Reset
            </Button>
          </div>
        </form>
      </div>

      {/* User Table */}
      <div className={styles.card}>
        {loading ? (
          <div className={styles.loading}>
            <i className="fa fa-spinner fa-spin"></i> Loading users...
          </div>
        ) : (
          <>
            <div className={styles.tableContainer}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Email</th>
                    <th>Username</th>
                    <th>Name</th>
                    <th>Status</th>
                    <th>Active</th>
                    <th>Staff</th>
                    <th>Superuser</th>
                    <th>Last Login</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.length > 0 ? (
                    users.map((user) => (
                      <tr key={user.id}>
                        <td>{user.email}</td>
                        <td>{user.username || '-'}</td>
                        <td>{user.first_name} {user.last_name}</td>
                        <td>
                          <span className={`${styles.badge} ${styles[user.status?.toLowerCase() || 'pending']}`}>
                            {user.status || 'Pending'}
                          </span>
                        </td>
                        <td>
                          <span className={`${styles.badge} ${user.is_active ? styles.success : styles.secondary}`}>
                            {user.is_active ? 'Yes' : 'No'}
                          </span>
                        </td>
                        <td>
                          <span className={`${styles.badge} ${user.is_staff ? styles.info : styles.secondary}`}>
                            {user.is_staff ? 'Yes' : 'No'}
                          </span>
                        </td>
                        <td>
                          <span className={`${styles.badge} ${user.is_superuser ? styles.danger : styles.secondary}`}>
                            {user.is_superuser ? 'Yes' : 'No'}
                          </span>
                        </td>
                        <td>{user.last_login ? new Date(user.last_login).toLocaleString() : '-'}</td>
                        <td>
                          <div className={styles.btnGroup}>
                            <Link
                              to={`/superadmin/users/${user.id}/edit`}
                              className={styles.btnIconSecondary}
                              title="Edit"
                            >
                              <i className="fa fa-edit"></i>
                            </Link>
                            <button
                              onClick={() => handleDeleteClick(user)}
                              className={styles.btnIconDanger}
                              title="Delete"
                            >
                              <i className="fa fa-trash"></i>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="9" className={styles.noData}>
                        No users found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className={styles.pagination}>
                <Button
                  onClick={() => setCurrentPage(currentPage - 1)}
                  disabled={currentPage === 1}
                  variant="secondary"
                  size="small"
                  icon={<i className="fa fa-chevron-left"></i>}
                >
                  Previous
                </Button>
                <span className={styles.paginationInfo}>
                  Page {currentPage} of {totalPages}
                </span>
                <Button
                  onClick={() => setCurrentPage(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  variant="secondary"
                  size="small"
                >
                  Next <i className="fa fa-chevron-right"></i>
                </Button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={Boolean(deleteModalUser)}
        onClose={() => setDeleteModalUser(null)}
        title="Confirm Delete"
        footer={
          <>
            <Button variant="secondary" onClick={() => setDeleteModalUser(null)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={handleDeleteConfirm}>
              Delete
            </Button>
          </>
        }
      >
        <p>Are you sure you want to delete user <strong>{deleteModalUser?.email}</strong>?</p>
      </Modal>
    </SuperAdminLayout>
  );
};

export default UserMasterlist;
