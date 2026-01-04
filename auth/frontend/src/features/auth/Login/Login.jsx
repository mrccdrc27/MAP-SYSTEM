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
  const [temporaryToken, setTemporaryToken] = useState('');
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
      
      if (response.ok && !response.data.otp_required) {
        const profileResponse = await getProfile();
        if (profileResponse.ok) {
          login(profileResponse.data);
          success('Success', 'Logged in successfully!');
          setTimeout(() => navigate('/profile'), 1000);
        } else {
           error('Login Failed', 'Could not retrieve user profile.');
        }
      } else if (response.data.otp_required) {
        info('2FA Required', 'OTP sent to your email.');
        setTemporaryToken(response.data.temporary_token);
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
      const response = await verifyOtpLogin(temporaryToken, otpCode, currentUserType);
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

  const registerLink = isEmployee ? '/employee/register' : '/register';
  const forgotPasswordLink = isEmployee ? '/employee/forgot-password' : '/forgot-password';
  
  const pageTitle = isEmployee ? 'Helpdesk and Ticketing system' : 'Staff Sign In';
  const pageSubtitle = isEmployee 
    ? 'Access the helpdesk to manage your support requests.'
    : 'Manage system resources and track tickets.';
  
  const sideImage = isEmployee 
    ? "/HELPDESK_BG.jpg"
    : "/TTS_MAP_BG.png";

  return (
    <AuthLayout 
      title={pageTitle}
      subtitle={pageSubtitle}
      sideImage={sideImage}
      logoImage="/map-logo.png"
    >
      <ToastContainer />
      
      <form onSubmit={mode === 'login' ? handleLoginSubmit : handleOtpSubmit} className={styles.loginForm}>
        {mode === 'login' ? (
          <>
            <Input
              label="Email:"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              required
              autoComplete="username"
              className={styles.roundedInput}
            />

            <Input
              label="Password:"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              required
              autoComplete="current-password"
              className={styles.roundedInput}
              icon={
                password ? (
                  <i className={`fa-solid ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                ) : null
              }
              onIconClick={togglePasswordVisibility}
            />

            <div className={styles.rememberMe}>
              <input
                type="checkbox"
                id="rememberMe"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
              />
              <label htmlFor="rememberMe">Remember me</label>
            </div>

            <Button 
              type="submit" 
              className={styles.logInButton}
              isLoading={isLoading}
              variant="primary"
              size="large"
              fullWidth
            >
              Log In
            </Button>

            <div className={styles.formFooter}>
              {isEmployee && (
                <div className={styles.registerPrompt}>
                  Don't have an account? <Link to={registerLink} className={styles.registerLink}>Register here</Link>
                </div>
              )}
              
              <div className={styles.forgotLink}>
                <Link to={forgotPasswordLink}>
                  <i className="fa-solid fa-question-circle"></i> Forgot Password?
                </Link>
              </div>
            </div>
          </>
        ) : (
          <>
            <div className={styles.infoBox}>
              <i className="fa-solid fa-info-circle"></i> Enter the 6-digit code sent to your email address.
            </div>

            <Input
              label="OTP Code:"
              type="text"
              value={otpCode}
              onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="Enter 6-digit code"
              maxLength={6}
              inputMode="numeric"
              required
              className={styles.roundedInput}
            />

            <Button 
              type="submit" 
              className={styles.logInButton}
              isLoading={isLoading}
              variant="primary"
              size="large"
              fullWidth
            >
              Verify OTP
            </Button>

            <div className={styles.forgotLink}>
              <button 
                type="button" 
                onClick={() => setMode('login')} 
                className={styles.backToLogin}
              >
                <i className="fa-solid fa-arrow-left"></i> Back to Login
              </button>
            </div>
          </>
        )}
      </form>
    </AuthLayout>
  );
};

export default Login;