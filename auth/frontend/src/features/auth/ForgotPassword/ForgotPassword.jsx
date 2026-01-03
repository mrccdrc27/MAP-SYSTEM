import { useState } from 'react';
import { Link } from 'react-router-dom';
import { forgotPassword } from '../../../services/authService';
import { USER_TYPES } from '../../../utils/constants';
import { useToast } from '../../../components/Toast';
import styles from './ForgotPassword.module.css';

const logoUrl = '/map-logo.png';
const bgImageUrl = '/TTS_MAP_BG.png';

const ForgotPassword = ({ userType = 'staff' }) => {
  const { ToastContainer, success, error } = useToast();
  
  // Determine if this is staff or employee
  const isEmployee = userType === 'employee';
  const currentUserType = isEmployee ? USER_TYPES.EMPLOYEE : USER_TYPES.STAFF;
  const loginLink = isEmployee ? '/employee/login' : '/login';
  const pageTitle = isEmployee ? 'Employee Password Recovery' : 'Staff Password Recovery';
  
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

    if (!validateEmail()) {
      return;
    }

    setIsLoading(true);

    try {
      const response = await forgotPassword(email, currentUserType);

      if (response.ok) {
        setIsEmailSent(true);
        success('Email Sent', 'Check your email for password reset instructions.');
      } else {
        // For security, API always returns success even if email doesn't exist
        setIsEmailSent(true);
        success('Email Sent', 'If an account exists, you will receive reset instructions.');
      }
    } catch (err) {
      console.error('Forgot password error:', err);
      error('Error', 'An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className={styles.forgotPasswordPage}>
      <ToastContainer />

      <section className={styles.leftPanel}>
        <img src={bgImageUrl} alt="Background" />
      </section>

      <section className={styles.rightPanel}>
        <div className={styles.formWrapper}>
          <header className={styles.formHeader}>
            <div className={styles.logo}>
              <img src={logoUrl} alt="Logo" />
              <h1 className={styles.logoText}>MAP Active</h1>
            </div>
            <h2>{pageTitle}</h2>
            <p>Enter your email to receive a password reset link.</p>
          </header>

          {isEmailSent ? (
            <div className={styles.forgotForm}>
              <div className={styles.successBox}>
                <i className="fa-solid fa-circle-check"></i>
                <span>
                  Password reset instructions have been sent to your email. 
                  Please check your inbox and follow the link to reset your password.
                </span>
              </div>
              
              <div className={styles.backLink}>
                <Link to={loginLink}>
                  <i className="fa-solid fa-arrow-left"></i> Back to Login
                </Link>
              </div>
            </div>
          ) : (
            <form className={styles.forgotForm} onSubmit={handleSubmit}>
              <div className={styles.infoBox}>
                <i className="fa-solid fa-info-circle"></i>
                <span>
                  Enter your registered email address and we'll send you a link to reset your password.
                </span>
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="email">Email Address</label>
                <input
                  type="email"
                  id="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (emailError) setEmailError('');
                  }}
                  placeholder="Enter your email"
                />
                {emailError && <span className={styles.fieldError}>{emailError}</span>}
              </div>

              <button 
                type="submit" 
                className={styles.submitButton}
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <span>Sending...</span>
                    <span className={styles.spinner}></span>
                  </>
                ) : (
                  <>
                    <i className="fa-solid fa-paper-plane"></i>
                    <span>Send Reset Link</span>
                  </>
                )}
              </button>

              <div className={styles.backLink}>
                <Link to={loginLink}>
                  <i className="fa-solid fa-arrow-left"></i> Back to Login
                </Link>
              </div>
            </form>
          )}
        </div>
      </section>
    </main>
  );
};

export default ForgotPassword;
