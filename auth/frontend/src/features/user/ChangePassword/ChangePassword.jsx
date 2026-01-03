import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { changePassword } from '../../../services/userService';
import { useToast, Button, Input } from '../../../components/common';
import useForm from '../../../hooks/useForm';
import styles from './ChangePassword.module.css';

const ChangePassword = () => {
  const navigate = useNavigate();
  const { ToastContainer, success, error } = useToast();

  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  });
  const [generalError, setGeneralError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const validate = (values) => {
    const newErrors = {};

    if (!values.currentPassword) {
      newErrors.currentPassword = 'Current password is required';
    }

    if (!values.newPassword) {
      newErrors.newPassword = 'New password is required';
    } else if (values.newPassword.length < 8) {
      newErrors.newPassword = 'Password must be at least 8 characters';
    }

    if (!values.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your new password';
    } else if (values.newPassword !== values.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    if (values.currentPassword && values.newPassword && values.currentPassword === values.newPassword) {
      newErrors.newPassword = 'New password must be different from current password';
    }

    return newErrors;
  };

  const onSubmit = async (values) => {
    setGeneralError('');
    setSuccessMessage('');

    try {
      const response = await changePassword(
        values.currentPassword,
        values.newPassword,
        values.confirmPassword
      );

      if (response.ok) {
        setSuccessMessage('Password changed successfully!');
        success('Success', 'Password changed successfully!');
        setTimeout(() => navigate('/profile'), 2000);
      } else {
        if (response.data.current_password) {
          setErrors(prev => ({ ...prev, currentPassword: response.data.current_password[0] || 'Current password is incorrect' }));
        } else if (response.data.new_password) {
          setErrors(prev => ({ ...prev, newPassword: response.data.new_password[0] }));
        } else {
          setGeneralError(response.data.detail || response.data.message || 'Failed to change password');
        }
      }
    } catch (err) {
      console.error('Change password error:', err);
      error('Error', 'An error occurred. Please try again.');
    }
  };

  const {
    values,
    errors,
    isSubmitting,
    handleChange,
    handleSubmit,
    setErrors,
  } = useForm(
    {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
    validate,
    onSubmit
  );

  const togglePasswordVisibility = (field) => {
    setShowPasswords(prev => ({ ...prev, [field]: !prev[field] }));
  };

  return (
    <main className={styles.changePasswordPage}>
      <ToastContainer />

      <div className={styles.container}>
        <div className={styles.header}>
          <h1>Change Password</h1>
          <p>Enter your current password and choose a new one.</p>
        </div>

        {generalError && (
          <div className={styles.alertError}>{generalError}</div>
        )}

        {successMessage && (
          <div className={styles.alertSuccess}>{successMessage}</div>
        )}

        <form className={styles.changePasswordForm} onSubmit={handleSubmit}>
          <Input
            label="Current Password"
            type={showPasswords.current ? 'text' : 'password'}
            name="currentPassword"
            value={values.currentPassword}
            onChange={handleChange}
            placeholder="Enter current password"
            error={errors.currentPassword}
            icon={<i className={`fa-solid ${showPasswords.current ? 'fa-eye-slash' : 'fa-eye'}`}></i>}
            onIconClick={() => togglePasswordVisibility('current')}
          />

          <Input
            label="New Password"
            type={showPasswords.new ? 'text' : 'password'}
            name="newPassword"
            value={values.newPassword}
            onChange={handleChange}
            placeholder="Enter new password"
            error={errors.newPassword}
            hint="Password must be at least 8 characters long."
            icon={<i className={`fa-solid ${showPasswords.new ? 'fa-eye-slash' : 'fa-eye'}`}></i>}
            onIconClick={() => togglePasswordVisibility('new')}
          />

          <Input
            label="Confirm New Password"
            type={showPasswords.confirm ? 'text' : 'password'}
            name="confirmPassword"
            value={values.confirmPassword}
            onChange={handleChange}
            placeholder="Confirm new password"
            error={errors.confirmPassword}
            icon={<i className={`fa-solid ${showPasswords.confirm ? 'fa-eye-slash' : 'fa-eye'}`}></i>}
            onIconClick={() => togglePasswordVisibility('confirm')}
          />

          <div className={styles.formActions}>
            <Button 
              type="submit" 
              isLoading={isSubmitting}
              icon={<i className="fa-solid fa-key"></i>}
            >
              Change Password
            </Button>
            <Link to="/profile" className={styles.cancelBtn}>
              <i className="fa-solid fa-times"></i>
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </main>
  );
};

export default ChangePassword;
