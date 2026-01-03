import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { changePassword } from '../../../services/userService';
import { useToast } from '../../../components/Toast';
import styles from './ChangePassword.module.css';

const ChangePassword = () => {
  const navigate = useNavigate();
  const { ToastContainer, success, error } = useToast();

  const [formData, setFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  });
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [generalError, setGeneralError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
    setGeneralError('');
  };

  const togglePasswordVisibility = (field) => {
    setShowPasswords(prev => ({ ...prev, [field]: !prev[field] }));
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.currentPassword) {
      newErrors.currentPassword = 'Current password is required';
    }

    if (!formData.newPassword) {
      newErrors.newPassword = 'New password is required';
    } else if (formData.newPassword.length < 8) {
      newErrors.newPassword = 'Password must be at least 8 characters';
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your new password';
    } else if (formData.newPassword !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    if (formData.currentPassword && formData.newPassword && formData.currentPassword === formData.newPassword) {
      newErrors.newPassword = 'New password must be different from current password';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setGeneralError('');
    setSuccessMessage('');

    if (!validateForm()) {
      return;
    }

    setIsLoading(true);

    try {
      const response = await changePassword(
        formData.currentPassword,
        formData.newPassword,
        formData.confirmPassword
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
    } finally {
      setIsLoading(false);
    }
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
          <div className={styles.formGroup}>
            <label htmlFor="currentPassword">Current Password</label>
            <div className={styles.passwordContainer}>
              <input
                type={showPasswords.current ? 'text' : 'password'}
                id="currentPassword"
                name="currentPassword"
                value={formData.currentPassword}
                onChange={handleChange}
                placeholder="Enter current password"
              />
              <span 
                className={styles.showPassword}
                onClick={() => togglePasswordVisibility('current')}
              >
                <i className={`fa-solid ${showPasswords.current ? 'fa-eye-slash' : 'fa-eye'}`}></i>
              </span>
            </div>
            {errors.currentPassword && <span className={styles.fieldError}>{errors.currentPassword}</span>}
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="newPassword">New Password</label>
            <div className={styles.passwordContainer}>
              <input
                type={showPasswords.new ? 'text' : 'password'}
                id="newPassword"
                name="newPassword"
                value={formData.newPassword}
                onChange={handleChange}
                placeholder="Enter new password"
              />
              <span 
                className={styles.showPassword}
                onClick={() => togglePasswordVisibility('new')}
              >
                <i className={`fa-solid ${showPasswords.new ? 'fa-eye-slash' : 'fa-eye'}`}></i>
              </span>
            </div>
            <p className={styles.passwordRequirements}>
              Password must be at least 8 characters long.
            </p>
            {errors.newPassword && <span className={styles.fieldError}>{errors.newPassword}</span>}
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="confirmPassword">Confirm New Password</label>
            <div className={styles.passwordContainer}>
              <input
                type={showPasswords.confirm ? 'text' : 'password'}
                id="confirmPassword"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                placeholder="Confirm new password"
              />
              <span 
                className={styles.showPassword}
                onClick={() => togglePasswordVisibility('confirm')}
              >
                <i className={`fa-solid ${showPasswords.confirm ? 'fa-eye-slash' : 'fa-eye'}`}></i>
              </span>
            </div>
            {errors.confirmPassword && <span className={styles.fieldError}>{errors.confirmPassword}</span>}
          </div>

          <div className={styles.formActions}>
            <button 
              type="submit" 
              className={styles.submitBtn}
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <span>Changing...</span>
                  <span className={styles.spinner}></span>
                </>
              ) : (
                <>
                  <i className="fa-solid fa-key"></i>
                  <span>Change Password</span>
                </>
              )}
            </button>
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
