import { useState, useEffect } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { resetPassword } from '../../../services/authService';
import { USER_TYPES } from '../../../utils/constants';
import { useToast } from '../../../components/Toast';
import styles from './ResetPassword.module.css';

const ResetPassword = ({ userType = 'staff' }) => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { ToastContainer, success, error } = useToast();

  // Determine if this is staff or employee
  const isEmployee = userType === 'employee';
  const currentUserType = isEmployee ? USER_TYPES.EMPLOYEE : USER_TYPES.STAFF;
  const loginLink = isEmployee ? '/employee/login' : '/login';
  const forgotPasswordLink = isEmployee ? '/employee/forgot-password' : '/forgot-password';
  const pageTitle = isEmployee ? 'Employee Password Reset' : 'Staff Password Reset';

  const [token, setToken] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [isTokenValid, setIsTokenValid] = useState(true);
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    const tokenParam = searchParams.get('token');
    if (tokenParam) {
      setToken(tokenParam);
    } else {
      setIsTokenValid(false);
    }
  }, [searchParams]);

  const validateForm = () => {
    const newErrors = {};

    if (!password) {
      newErrors.password = 'Password is required';
    } else if (password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    }

    if (!confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (password !== confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsLoading(true);

    try {
      const response = await resetPassword(token, password, confirmPassword, currentUserType);

      if (response.ok) {
        setIsSuccess(true);
        success('Success', 'Password has been reset successfully!');
        setTimeout(() => navigate(loginLink), 3000);
      } else {
        if (response.data.token || response.data.detail?.includes('token')) {
          setIsTokenValid(false);
          error('Invalid Token', 'The reset link is invalid or has expired.');
        } else {
          const apiErrors = {};
          for (const [field, messages] of Object.entries(response.data)) {
            if (Array.isArray(messages)) {
              apiErrors[field] = messages[0];
            } else if (typeof messages === 'string') {
              apiErrors[field] = messages;
            }
          }
          setErrors(apiErrors);
        }
      }
    } catch (err) {
      console.error('Reset password error:', err);
      error('Error', 'An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isTokenValid) {
    return (
      <main className={styles.resetPasswordPage}>
        <ToastContainer />
        <div className={styles.container}>
          <div className={styles.header}>
            <h1>{pageTitle}</h1>
          </div>
          <div className={styles.alertDanger}>
            <strong>Invalid or expired reset link.</strong>
            <p>Please request a new password reset link.</p>
          </div>
          <div className={styles.backLink}>
            <Link to={forgotPasswordLink}>
              <i className="fa-solid fa-arrow-left"></i> Request New Link
            </Link>
          </div>
        </div>
      </main>
    );
  }

  if (isSuccess) {
    return (
      <main className={styles.resetPasswordPage}>
        <ToastContainer />
        <div className={styles.container}>
          <div className={styles.header}>
            <h1>Password Reset Successful</h1>
          </div>
          <div className={styles.alertSuccess}>
            <strong>Your password has been reset successfully!</strong>
            <p>You will be redirected to the login page shortly.</p>
          </div>
          <div className={styles.backLink}>
            <Link to={loginLink}>
              <i className="fa-solid fa-arrow-left"></i> Go to Login
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className={styles.resetPasswordPage}>
      <ToastContainer />
      <div className={styles.container}>
        <div className={styles.header}>
          <h1>{pageTitle}</h1>
        </div>

        <form className={styles.resetForm} onSubmit={handleSubmit}>
          <div className={styles.formGroup}>
            <label htmlFor="password">New Password</label>
            <div className={styles.passwordContainer}>
              <input
                type={showPassword ? 'text' : 'password'}
                id="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (errors.password) setErrors(prev => ({ ...prev, password: '' }));
                }}
                placeholder="Enter new password"
              />
              <span 
                className={styles.showPassword}
                onClick={() => setShowPassword(!showPassword)}
              >
                <i className={`fa-solid ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
              </span>
            </div>
            <p className={styles.passwordRequirements}>
              Password must be at least 8 characters long.
            </p>
            {errors.password && <span className={styles.fieldError}>{errors.password}</span>}
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="confirmPassword">Confirm Password</label>
            <div className={styles.passwordContainer}>
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                id="confirmPassword"
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  if (errors.confirmPassword) setErrors(prev => ({ ...prev, confirmPassword: '' }));
                }}
                placeholder="Confirm new password"
              />
              <span 
                className={styles.showPassword}
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              >
                <i className={`fa-solid ${showConfirmPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
              </span>
            </div>
            {errors.confirmPassword && <span className={styles.fieldError}>{errors.confirmPassword}</span>}
          </div>

          <button 
            type="submit" 
            className={styles.submitButton}
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <span>Resetting...</span>
                <span className={styles.spinner}></span>
              </>
            ) : (
              <>
                <i className="fa-solid fa-key"></i>
                <span>Reset Password</span>
              </>
            )}
          </button>
        </form>

        <div className={styles.backLink}>
          <Link to={loginLink}>
            <i className="fa-solid fa-arrow-left"></i> Back to Login
          </Link>
        </div>
      </div>
    </main>
  );
};

export default ResetPassword;
