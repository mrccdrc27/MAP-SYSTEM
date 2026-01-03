import { useState, useEffect } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { resetPassword } from '../../../services/authService';
import { USER_TYPES } from '../../../utils/constants';
import { useToast, Button, Input } from '../../../components/common';
import { AuthLayout } from '../../../components/layout';
import styles from './ResetPassword.module.css';

const ResetPassword = ({ userType = 'staff' }) => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { ToastContainer, success, error } = useToast();

  const isEmployee = userType === 'employee';
  const currentUserType = isEmployee ? USER_TYPES.EMPLOYEE : USER_TYPES.STAFF;
  const loginLink = isEmployee ? '/employee/login' : '/login';
  const forgotPasswordLink = isEmployee ? '/employee/forgot-password' : '/forgot-password';
  const pageTitle = isEmployee ? 'Employee Reset' : 'Staff Reset';
  const pageSubtitle = 'Please enter your new password below.';

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
    if (!password) newErrors.password = 'Password is required';
    else if (password.length < 8) newErrors.password = 'Min 8 characters';

    if (!confirmPassword) newErrors.confirmPassword = 'Please confirm';
    else if (password !== confirmPassword) newErrors.confirmPassword = 'Passwords do not match';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsLoading(true);
    try {
      const response = await resetPassword(token, password, confirmPassword, currentUserType);

      if (response.ok) {
        setIsSuccess(true);
        success('Success', 'Password reset successfully!');
        setTimeout(() => navigate(loginLink), 3000);
      } else {
        if (response.data.token || response.data.detail?.includes('token')) {
          setIsTokenValid(false);
          error('Invalid Link', 'The reset link is invalid or expired.');
        } else {
          const apiErrors = {};
          for (const [field, messages] of Object.entries(response.data)) {
            apiErrors[field] = Array.isArray(messages) ? messages[0] : messages;
          }
          setErrors(apiErrors);
        }
      }
    } catch (err) {
      error('Error', 'An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isTokenValid) {
    return (
      <AuthLayout 
        title="Invalid Link" 
        subtitle="This password reset link is invalid or has expired."
        sideImage="/TTS_MAP_BG.png"
        logoImage="/map-logo.png"
      >
        <ToastContainer />
        <div className={styles.content}>
          <div className={styles.errorBox}>
            <i className="fa-solid fa-circle-xmark"></i>
            <p>Please request a new password reset link to continue.</p>
          </div>
          <div className={styles.forgotLink}>
            <Link to={forgotPasswordLink} className={styles.backToLogin}>
              <i className="fa-solid fa-arrow-left"></i> Request New Link
            </Link>
          </div>
        </div>
      </AuthLayout>
    );
  }

  if (isSuccess) {
    return (
      <AuthLayout 
        title="Success!" 
        subtitle="Your password has been reset successfully."
        sideImage="/TTS_MAP_BG.png"
        logoImage="/map-logo.png"
      >
        <ToastContainer />
        <div className={styles.content}>
          <div className={styles.successBox}>
            <i className="fa-solid fa-circle-check"></i>
            <p>You will be redirected to the login page shortly.</p>
          </div>
          <div className={styles.forgotLink}>
            <Link to={loginLink} className={styles.backToLogin}>
              <i className="fa-solid fa-arrow-left"></i> Go to Login
            </Link>
          </div>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout 
      title="Reset Password" 
      subtitle="Please enter your new password below."
      sideImage="/TTS_MAP_BG.png"
      logoImage="/map-logo.png"
    >
      <ToastContainer />
      <form onSubmit={handleSubmit} className={styles.resetForm}>
        <Input
          label="New Password:"
          type={showPassword ? 'text' : 'password'}
          value={password}
          onChange={(e) => {
            setPassword(e.target.value);
            if (errors.password) setErrors(prev => ({ ...prev, password: '' }));
          }}
          placeholder="Enter new password"
          error={errors.password}
          hint="Min 8 characters"
          icon={<i className={`fa-solid ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>}
          onIconClick={() => setShowPassword(!showPassword)}
          required
          className={styles.roundedInput}
        />

        <Input
          label="Confirm New Password:"
          type={showConfirmPassword ? 'text' : 'password'}
          value={confirmPassword}
          onChange={(e) => {
            setConfirmPassword(e.target.value);
            if (errors.confirmPassword) setErrors(prev => ({ ...prev, confirmPassword: '' }));
          }}
          placeholder="Confirm new password"
          error={errors.confirmPassword}
          icon={<i className={`fa-solid ${showConfirmPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>}
          onIconClick={() => setShowConfirmPassword(!showConfirmPassword)}
          required
          className={styles.roundedInput}
        />

        <Button 
          type="submit" 
          className={styles.submitButton}
          isLoading={isLoading}
          variant="primary"
          size="large"
          fullWidth
        >
          Reset Password
        </Button>

        <div className={styles.forgotLink}>
          <Link to={loginLink} className={styles.backToLogin}>
            <i className="fa-solid fa-arrow-left"></i> Back to Login
          </Link>
        </div>
      </form>
    </AuthLayout>
  );
};

export default ResetPassword;