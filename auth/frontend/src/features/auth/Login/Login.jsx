import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import { login as apiLogin, verifyOtpLogin } from '../../../services/authService';
import { getProfile } from '../../../services/userService';
import { USER_TYPES } from '../../../utils/constants';
import { useToast, Button, Input } from '../../../components/common';
import { AuthLayout } from '../../../components/layout';
import styles from './Login.module.css';

const Login = ({ userType = 'staff' }) => {
  const navigate = useNavigate();
  const { isAuthenticated, loading, login } = useAuth();
  const { ToastContainer, success, error, info } = useToast();
  
  const isEmployee = userType === 'employee';
  const currentUserType = isEmployee ? USER_TYPES.EMPLOYEE : USER_TYPES.STAFF;
  
  const [mode, setMode] = useState('login'); // 'login' | 'otp'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!loading && isAuthenticated) {
      navigate('/profile');
    }
  }, [isAuthenticated, loading, navigate]);

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      error('Invalid Input', 'Email and password are required.');
      return;
    }

    setIsLoading(true);
    try {
      const response = await apiLogin(email, password, currentUserType);
      
      if (response.ok) {
        const profileResponse = await getProfile();
        if (profileResponse.ok) {
          login(profileResponse.data);
          success('Success', 'Logged in successfully!');
          setTimeout(() => navigate('/profile'), 1000);
        } else {
           error('Login Failed', 'Could not retrieve user profile.');
        }
      } else if (response.data.requires_otp) {
        info('2FA Required', 'OTP sent to your email.');
        setMode('otp');
      } else if (response.data.errors) {
        const errorMessages = Object.values(response.data.errors).flat();
        error('Login Failed', errorMessages[0] || 'Login failed. Please try again.');
      } else {
        error('Error', response.data.detail || response.data.message || 'Login failed. Please try again.');
      }
    } catch (err) {
      console.error('Login error:', err);
      error('Error', 'An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOtpSubmit = async (e) => {
    e.preventDefault();
    if (!otpCode) {
      error('Invalid Input', 'OTP code is required.');
      return;
    }

    setIsLoading(true);
    try {
      const response = await verifyOtpLogin(email, otpCode, currentUserType);
      if (response.ok) {
        const profileResponse = await getProfile();
        if (profileResponse.ok) {
          login(profileResponse.data);
          success('Success', 'Logged in successfully!');
          setTimeout(() => navigate('/profile'), 1000);
        } else {
           error('Verification Failed', 'Could not retrieve user profile.');
        }
      } else {
        error('Verification Failed', response.data.detail || response.data.message || 'Invalid OTP code.');
      }
    } catch (err) {
      console.error('OTP verification error:', err);
      error('Error', 'An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const togglePasswordVisibility = () => setShowPassword(!showPassword);

  const alternateLoginLink = isEmployee ? '/staff/login' : '/employee/login';
  const alternateLoginText = isEmployee ? 'Login as Staff' : 'Login as Employee';
  const registerLink = isEmployee ? '/employee/register' : '/register';
  const forgotPasswordLink = isEmployee ? '/employee/forgot-password' : '/forgot-password';
  const pageTitle = isEmployee ? 'Employee Sign In' : 'Staff Sign In';
  const pageSubtitle = isEmployee 
    ? 'Please provide your credentials to log in as an employee.'
    : 'Please provide your credentials to log in as staff.';

  return (
    <AuthLayout title={pageTitle} subtitle={pageSubtitle}>
      <ToastContainer />
      
      <form onSubmit={mode === 'login' ? handleLoginSubmit : handleOtpSubmit}>
        {mode === 'login' ? (
          <>
            <Input
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@company.com"
              required
            />

            <Input
              label="Password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              icon={
                <i className={`fa-solid ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
              }
              onIconClick={togglePasswordVisibility}
            />

            <div className={styles.flexRow}>
              <div className={styles.rememberMe}>
                <input
                  type="checkbox"
                  id="rememberMe"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                />
                <label htmlFor="rememberMe">Remember me</label>
              </div>
              <Link to={forgotPasswordLink} className={styles.link}>
                Forgot Password?
              </Link>
            </div>

            <Button 
              type="submit" 
              className={styles.submitButton}
              isLoading={isLoading}
              variant="primary"
              size="large"
              fullWidth
            >
              Sign In
            </Button>
          </>
        ) : (
          <>
            <div className={styles.infoBox}>
              Enter the 6-digit code sent to <strong>{email}</strong>
            </div>

            <Input
              label="OTP Code"
              type="text"
              value={otpCode}
              onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="000000"
              maxLength={6}
              inputMode="numeric"
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
              Verify OTP
            </Button>

            <button 
              type="button" 
              onClick={() => setMode('login')} 
              className={styles.backButton}
            >
              <i className="fa-solid fa-arrow-left"></i> Back to Login
            </button>
          </>
        )}

        {mode === 'login' && (
          <div className={styles.authFooter}>
            <p>
              Don't have an account? <Link to={registerLink} className={styles.link}>Register here</Link>
            </p>
            <hr className={styles.divider} />
            <Link to={alternateLoginLink} className={styles.secondaryLink}>
              {alternateLoginText}
            </Link>
          </div>
        )}
      </form>
    </AuthLayout>
  );
};

export default Login;