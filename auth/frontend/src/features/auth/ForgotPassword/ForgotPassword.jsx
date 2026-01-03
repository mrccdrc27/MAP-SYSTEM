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
    <AuthLayout title={pageTitle} subtitle={pageSubtitle}>
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
          
          <Link to={loginLink} className={styles.backButton}>
            <i className="fa-solid fa-arrow-left"></i> Back to Login
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit}>
          <div className={styles.infoBox}>
            <i className="fa-solid fa-info-circle"></i>
            <p>
              We'll send a secure link to your registered email to reset your password.
            </p>
          </div>

          <Input
            label="Email Address"
            type="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (emailError) setEmailError('');
            }}
            placeholder="name@company.com"
            error={emailError}
            required
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

          <Link to={loginLink} className={styles.backButton}>
            <i className="fa-solid fa-arrow-left"></i> Back to Login
          </Link>
        </form>
      )}
    </AuthLayout>
  );
};

export default ForgotPassword;