import { useState } from 'react';
import { Link } from 'react-router-dom';
import { forgotPassword } from '../../../services/authService';
import { USER_TYPES } from '../../../utils/constants';
import { useToast, Button, Input } from '../../../components/common';
import { AuthLayout } from '../../../components/layout';
import styles from './ForgotPassword.module.css';

const ForgotPassword = ({ userType = 'staff' }) => {
  const { ToastContainer, success, error } = useToast();
  
  const isEmployee = userType === 'employee';
  const currentUserType = isEmployee ? USER_TYPES.EMPLOYEE : USER_TYPES.STAFF;
  const loginLink = isEmployee ? '/employee/login' : '/login';
  const pageTitle = isEmployee ? 'Employee Recovery' : 'Staff Recovery';
  const pageSubtitle = 'Enter your email to receive a password reset link.';
  
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isEmailSent, setIsEmailSent] = useState(false);

  const validateEmail = () => {
    if (!email) {
      setEmailError('Email address is required');
      return false;
    }
    if (!/\S+@\S+\.\S+/.test(email)) {
      setEmailError('Please enter a valid email address');
      return false;
    }
    setEmailError('');
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateEmail()) return;

    setIsLoading(true);
    try {
      const response = await forgotPassword(email, currentUserType);
      setIsEmailSent(true);
      success('Email Sent', 'If an account exists, you will receive reset instructions.');
    } catch (err) {
      error('Error', 'An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout 
      title="Account Recovery" 
      subtitle="Enter your email to receive a password reset link."
      sideImage="/TTS_MAP_BG.png"
      logoImage="/map-logo.png"
    >
      <ToastContainer />

      {isEmailSent ? (
        <div className={styles.content}>
          <div className={styles.successBox}>
            <i className="fa-solid fa-circle-check"></i>
            <p>
              Password reset instructions have been sent to your email. 
              Please check your inbox.
            </p>
          </div>
          
          <div className={styles.forgotLink}>
            <Link to={loginLink} className={styles.backToLogin}>
              <i className="fa-solid fa-arrow-left"></i> Back to Login
            </Link>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className={styles.recoveryForm}>
          <div className={styles.infoBox}>
            <i className="fa-solid fa-info-circle"></i>
            <p>
              Enter your email address and we'll send you a link to reset your password.
            </p>
          </div>

          <Input
            label="Email Address:"
            type="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (emailError) setEmailError('');
            }}
            placeholder="Enter your registered email"
            error={emailError}
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
            Send Reset Link
          </Button>

          <div className={styles.forgotLink}>
            <Link to={loginLink} className={styles.backToLogin}>
              <i className="fa-solid fa-arrow-left"></i> Back to Login
            </Link>
          </div>
        </form>
      )}
    </AuthLayout>
  );
};

export default ForgotPassword;