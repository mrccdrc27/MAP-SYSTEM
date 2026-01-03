import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import SuperAdminLayout from '../../../components/SuperAdminLayout/SuperAdminLayout';
import { Button, Input, Alert } from '../../../components/common';
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
      <div className="page-wrapper">
        <header className="page-header">
          <div className="page-title-section">
            <h1>{isEditMode ? 'Edit User' : 'Create New User'}</h1>
            <p className="page-subtitle">{isEditMode ? `Updating user account for ${formData.email}` : 'Add a new user to the system masterlist.'}</p>
          </div>
          <div className="page-actions">
            <Button variant="secondary" onClick={() => navigate('/superadmin/users')} icon={<i className="fa fa-arrow-left"></i>}>
              Back to List
            </Button>
          </div>
        </header>

        {error && (
          <Alert type="error" onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        {success && (
          <Alert type="success" onClose={() => setSuccess('')}>
            {success}
          </Alert>
        )}

        <div className="page-content">
          <div className={styles.card}>
            <form onSubmit={handleSubmit}>
              <h3 className={styles.cardTitle}>
                <i className="fa fa-user"></i> Account Information
              </h3>

              <div className={styles.formGrid}>
                <Input label="Email" type="email" name="email" value={formData.email} onChange={handleChange} required disabled={loading} />
                <Input label="Username" type="text" name="username" value={formData.username} onChange={handleChange} disabled={loading} />
                <Input label={`Password ${!isEditMode ? '*' : ''}`} type="password" name="password" value={formData.password} onChange={handleChange} required={!isEditMode} disabled={loading} placeholder={isEditMode ? 'Leave blank to keep current password' : ''} />
                <Input label={`Confirm Password ${!isEditMode ? '*' : ''}`} type="password" name="confirm_password" value={formData.confirm_password} onChange={handleChange} required={!isEditMode} disabled={loading} />
              </div>

              <h3 className={styles.cardTitle}>
                <i className="fa fa-id-card"></i> Personal Information
              </h3>

              <div className={styles.formGrid}>
                <Input label="First Name" type="text" name="first_name" value={formData.first_name} onChange={handleChange} disabled={loading} />
                <Input label="Middle Name" type="text" name="middle_name" value={formData.middle_name} onChange={handleChange} disabled={loading} />
                <Input label="Last Name" type="text" name="last_name" value={formData.last_name} onChange={handleChange} disabled={loading} />
                <Input label="Suffix" type="text" name="suffix" value={formData.suffix} onChange={handleChange} placeholder="Jr., Sr., III, etc." disabled={loading} />
                <Input label="Phone Number" type="tel" name="phone_number" value={formData.phone_number} onChange={handleChange} disabled={loading} />
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Department</label>
                  <select name="department" className={styles.formControl} value={formData.department} onChange={handleChange} disabled={loading}>
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
                  <select name="status" className={styles.formControl} value={formData.status} onChange={handleChange} disabled={loading}>
                    <option value="Pending">Pending</option>
                    <option value="Approved">Approved</option>
                    <option value="Rejected">Rejected</option>
                  </select>
                </div>
                <div className={styles.formGroup}><label className={styles.checkboxLabel}><input type="checkbox" name="is_active" checked={formData.is_active} onChange={handleChange} disabled={loading} /><span>Active Account</span></label></div>
                <div className={styles.formGroup}><label className={styles.checkboxLabel}><input type="checkbox" name="is_staff" checked={formData.is_staff} onChange={handleChange} disabled={loading} /><span>Staff Access</span></label></div>
                <div className={styles.formGroup}><label className={styles.checkboxLabel}><input type="checkbox" name="is_superuser" checked={formData.is_superuser} onChange={handleChange} disabled={loading} /><span>Superuser Privileges</span></label></div>
                <div className={styles.formGroup}><label className={styles.checkboxLabel}><input type="checkbox" name="is_locked" checked={formData.is_locked} onChange={handleChange} disabled={loading} /><span>Lock Account</span></label></div>
              </div>

              <div className={styles.formActions}>
                <Button variant="secondary" onClick={() => navigate('/superadmin/users')} disabled={loading}>Cancel</Button>
                <Button type="submit" isLoading={loading}>{isEditMode ? 'Update User' : 'Create User'}</Button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </SuperAdminLayout>
  );
};

export default UserForm;