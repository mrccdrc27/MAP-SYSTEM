import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import SuperAdminLayout from '../../../components/SuperAdminLayout/SuperAdminLayout';
import styles from './UserForm.module.css';

const UserForm = () => {
  const navigate = useNavigate();
  const { userId } = useParams();
  const isEditMode = Boolean(userId);

  const [formData, setFormData] = useState({
    email: '',
    username: '',
    password: '',
    confirm_password: '',
    first_name: '',
    middle_name: '',
    last_name: '',
    suffix: '',
    phone_number: '',
    department: '',
    status: 'Pending',
    is_active: true,
    is_staff: false,
    is_superuser: false,
    is_locked: false,
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (isEditMode) {
      loadUser();
    }
  }, [userId]);

  const loadUser = async () => {
    try {
      const response = await fetch(`http://localhost:8003/superadmin/api/users/${userId}/`, {
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        setFormData({
          email: data.email || '',
          username: data.username || '',
          password: '',
          confirm_password: '',
          first_name: data.first_name || '',
          middle_name: data.middle_name || '',
          last_name: data.last_name || '',
          suffix: data.suffix || '',
          phone_number: data.phone_number || '',
          department: data.department || '',
          status: data.status || 'Pending',
          is_active: data.is_active ?? true,
          is_staff: data.is_staff ?? false,
          is_superuser: data.is_superuser ?? false,
          is_locked: data.is_locked ?? false,
        });
      } else {
        setError('Failed to load user data');
      }
    } catch (err) {
      console.error('Error loading user:', err);
      setError('An error occurred while loading user');
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // Validation
    if (!formData.email) {
      setError('Email is required');
      return;
    }

    if (!isEditMode && !formData.password) {
      setError('Password is required for new users');
      return;
    }

    if (formData.password && formData.password !== formData.confirm_password) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);

    try {
      const url = isEditMode
        ? `http://localhost:8003/superadmin/api/users/${userId}/`
        : 'http://localhost:8003/superadmin/api/users/create/';

      const method = isEditMode ? 'PUT' : 'POST';

      // Prepare data - don't send password fields if empty in edit mode
      const submitData = { ...formData };
      if (isEditMode && !formData.password) {
        delete submitData.password;
        delete submitData.confirm_password;
      }

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(submitData),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess(isEditMode ? 'User updated successfully!' : 'User created successfully!');
        setTimeout(() => {
          navigate('/superadmin/users');
        }, 1500);
      } else {
        setError(data.error || 'Failed to save user');
      }
    } catch (err) {
      console.error('Error saving user:', err);
      setError('An error occurred while saving user');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SuperAdminLayout>
      <div className={styles.pageHeader}>
        <h2>{isEditMode ? 'Edit User' : 'Create New User'}</h2>
        <button onClick={() => navigate('/superadmin/users')} className={styles.btnSecondary}>
          <i className="fa fa-arrow-left"></i> Back to List
        </button>
      </div>

      {error && (
        <div className={styles.alertDanger}>
          <i className="fa fa-exclamation-circle"></i> {error}
        </div>
      )}

      {success && (
        <div className={styles.alertSuccess}>
          <i className="fa fa-check-circle"></i> {success}
        </div>
      )}

      <div className={styles.card}>
        <form onSubmit={handleSubmit}>
          <h3 className={styles.cardTitle}>
            <i className="fa fa-user"></i> Account Information
          </h3>

          <div className={styles.formGrid}>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>
                Email <span className={styles.required}>*</span>
              </label>
              <input
                type="email"
                name="email"
                className={styles.formControl}
                value={formData.email}
                onChange={handleChange}
                required
                disabled={loading}
              />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Username</label>
              <input
                type="text"
                name="username"
                className={styles.formControl}
                value={formData.username}
                onChange={handleChange}
                disabled={loading}
              />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.formLabel}>
                Password {!isEditMode && <span className={styles.required}>*</span>}
              </label>
              <input
                type="password"
                name="password"
                className={styles.formControl}
                value={formData.password}
                onChange={handleChange}
                required={!isEditMode}
                disabled={loading}
                placeholder={isEditMode ? 'Leave blank to keep current password' : ''}
              />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.formLabel}>
                Confirm Password {!isEditMode && <span className={styles.required}>*</span>}
              </label>
              <input
                type="password"
                name="confirm_password"
                className={styles.formControl}
                value={formData.confirm_password}
                onChange={handleChange}
                required={!isEditMode}
                disabled={loading}
              />
            </div>
          </div>

          <h3 className={styles.cardTitle}>
            <i className="fa fa-id-card"></i> Personal Information
          </h3>

          <div className={styles.formGrid}>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>First Name</label>
              <input
                type="text"
                name="first_name"
                className={styles.formControl}
                value={formData.first_name}
                onChange={handleChange}
                disabled={loading}
              />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Middle Name</label>
              <input
                type="text"
                name="middle_name"
                className={styles.formControl}
                value={formData.middle_name}
                onChange={handleChange}
                disabled={loading}
              />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Last Name</label>
              <input
                type="text"
                name="last_name"
                className={styles.formControl}
                value={formData.last_name}
                onChange={handleChange}
                disabled={loading}
              />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Suffix</label>
              <input
                type="text"
                name="suffix"
                className={styles.formControl}
                value={formData.suffix}
                onChange={handleChange}
                placeholder="Jr., Sr., III, etc."
                disabled={loading}
              />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Phone Number</label>
              <input
                type="tel"
                name="phone_number"
                className={styles.formControl}
                value={formData.phone_number}
                onChange={handleChange}
                disabled={loading}
              />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Department</label>
              <select
                name="department"
                className={styles.formControl}
                value={formData.department}
                onChange={handleChange}
                disabled={loading}
              >
                <option value="">Select Department</option>
                <option value="IT Department">IT Department</option>
                <option value="Asset Department">Asset Department</option>
                <option value="Budget Department">Budget Department</option>
              </select>
            </div>
          </div>

          <h3 className={styles.cardTitle}>
            <i className="fa fa-cog"></i> Account Settings
          </h3>

          <div className={styles.formGrid}>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Status</label>
              <select
                name="status"
                className={styles.formControl}
                value={formData.status}
                onChange={handleChange}
                disabled={loading}
              >
                <option value="Pending">Pending</option>
                <option value="Approved">Approved</option>
                <option value="Rejected">Rejected</option>
              </select>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  name="is_active"
                  checked={formData.is_active}
                  onChange={handleChange}
                  disabled={loading}
                />
                <span>Active Account</span>
              </label>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  name="is_staff"
                  checked={formData.is_staff}
                  onChange={handleChange}
                  disabled={loading}
                />
                <span>Staff Access</span>
              </label>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  name="is_superuser"
                  checked={formData.is_superuser}
                  onChange={handleChange}
                  disabled={loading}
                />
                <span>Superuser Privileges</span>
              </label>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  name="is_locked"
                  checked={formData.is_locked}
                  onChange={handleChange}
                  disabled={loading}
                />
                <span>Lock Account</span>
              </label>
            </div>
          </div>

          <div className={styles.formActions}>
            <button
              type="button"
              onClick={() => navigate('/superadmin/users')}
              className={styles.btnSecondary}
              disabled={loading}
            >
              Cancel
            </button>
            <button type="submit" className={styles.btnPrimary} disabled={loading}>
              {loading ? (
                <>
                  <i className="fa fa-spinner fa-spin"></i> Saving...
                </>
              ) : (
                <>
                  <i className="fa fa-save"></i> {isEditMode ? 'Update User' : 'Create User'}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </SuperAdminLayout>
  );
};

export default UserForm;
