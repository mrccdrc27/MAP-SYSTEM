import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import SuperAdminLayout from '../../../components/SuperAdminLayout/SuperAdminLayout';
import { Button, Input, Modal, Table, Badge, Card, Alert } from '../../../components/common';
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
      setError('An error occurred while loading users');
    } finally {
      setLoading(false);
    }
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
      }
    } catch (err) {
      alert('An error occurred while exporting users');
    }
  };

  const tableHeaders = ['User', 'Username', 'Status', 'Active', 'Staff', 'Superuser', 'Last Login', 'Actions'];

  return (
    <SuperAdminLayout>
      <div className="page-wrapper">
        <header className="page-header">
          <div className="page-title-section">
            <h1>User Masterlist</h1>
            <p className="page-subtitle">Comprehensive list of all registered users in the system.</p>
          </div>
          <div className="page-actions">
            <Button variant="secondary" onClick={handleExport} icon={<i className="fa fa-file-export"></i>}>
              Export CSV
            </Button>
            <Link to="/superadmin/users/create">
              <Button icon={<i className="fa fa-user-plus"></i>}>
                Add User
              </Button>
            </Link>
          </div>
        </header>

        {error && (
          <Alert type="error" onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        <div className="page-content">
          <Card className={styles.filterCard} flat>
            <div className={styles.filterGrid}>
              <Input label="Email" placeholder="Search email..." value={searchEmail} onChange={(e) => setSearchEmail(e.target.value)} />
              <Input label="Name" placeholder="Search name..." value={searchName} onChange={(e) => setSearchName(e.target.value)} />
              <div className={styles.selectGroup}>
                <label>Status</label>
                <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                  <option value="">All Statuses</option>
                  <option value="Pending">Pending</option>
                  <option value="Approved">Approved</option>
                  <option value="Rejected">Rejected</option>
                </select>
              </div>
              <div className={styles.selectGroup}>
                <label>Is Active</label>
                <select value={isActiveFilter} onChange={(e) => setIsActiveFilter(e.target.value)}>
                  <option value="">All</option>
                  <option value="true">Active</option>
                  <option value="false">Inactive</option>
                </select>
              </div>
            </div>
            <div className={styles.filterActions}>
              <Button variant="secondary" onClick={handleReset}>Reset Filters</Button>
            </div>
          </Card>

          <Table headers={tableHeaders} loading={loading}>
            {users.map((user) => (
              <tr key={user.id}>
                <td>
                  <div className={styles.userCell}>
                    <div className={styles.userName}>{user.first_name} {user.last_name}</div>
                    <div className={styles.userEmail}>{user.email}</div>
                  </div>
                </td>
                <td>{user.username || '-'}</td>
                <td><Badge variant={user.status === 'Approved' ? 'success' : user.status === 'Rejected' ? 'danger' : 'warning'}>{user.status || 'Pending'}</Badge></td>
                <td><Badge variant={user.is_active ? 'success' : 'secondary'}>{user.is_active ? 'Yes' : 'No'}</Badge></td>
                <td><Badge variant={user.is_staff ? 'info' : 'secondary'}>{user.is_staff ? 'Yes' : 'No'}</Badge></td>
                <td><Badge variant={user.is_superuser ? 'danger' : 'secondary'}>{user.is_superuser ? 'Yes' : 'No'}</Badge></td>
                <td className={styles.dateCell}>{user.last_login ? new Date(user.last_login).toLocaleDateString() : '-'}</td>
                <td>
                  <div className={styles.actions}>
                    <Link to={`/superadmin/users/${user.id}/edit`} className={styles.actionBtn}><i className="fa fa-edit"></i></Link>
                    <button onClick={() => setDeleteModalUser(user)} className={`${styles.actionBtn} ${styles.danger}`}><i className="fa fa-trash"></i></button>
                  </div>
                </td>
              </tr>
            ))}
          </Table>

          {totalPages > 1 && (
            <div className={styles.pagination}>
              <Button onClick={() => setCurrentPage(currentPage - 1)} disabled={currentPage === 1} variant="secondary" size="small"><i className="fa fa-chevron-left"></i> Previous</Button>
              <span className={styles.paginationText}>Page <strong>{currentPage}</strong> of {totalPages}</span>
              <Button onClick={() => setCurrentPage(currentPage + 1)} disabled={currentPage === totalPages} variant="secondary" size="small">Next <i className="fa fa-chevron-right"></i></Button>
            </div>
          )}
        </div>
      </div>

      <Modal isOpen={Boolean(deleteModalUser)} onClose={() => setDeleteModalUser(null)} title="Delete User Account" footer={<><Button variant="secondary" onClick={() => setDeleteModalUser(null)}>Cancel</Button><Button variant="danger" onClick={handleDeleteConfirm}>Delete Permanently</Button></>}>
        <p>Are you sure you want to delete <strong>{deleteModalUser?.email}</strong>?</p>
        <p className={styles.modalWarning}>This action cannot be undone. All user data will be removed.</p>
      </Modal>
    </SuperAdminLayout>
  );
};

export default UserMasterlist;
