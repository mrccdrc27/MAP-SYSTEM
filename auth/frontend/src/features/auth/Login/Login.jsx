import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import { login as apiLogin, verifyOtpLogin } from '../../../services/authService';
import { getProfile } from '../../../services/userService';
import { USER_TYPES } from '../../../utils/constants';
import { useToast } from '../../../components/Toast';
import styles from './Login.module.css';

// Import logo - you can replace this with your actual logo path
const logoUrl = '/map-logo.png';
const bgImageUrl = '/TTS_MAP_BG.png';

const Login = ({ userType = 'staff' }) => {
  const navigate = useNavigate();
  const { isAuthenticated, loading, login } = useAuth();
  const { ToastContainer, success, error, warning, info } = useToast();
  
  // Determine if this is staff or employee login
  const isEmployee = userType === 'employee';
  const currentUserType = isEmployee ? USER_TYPES.EMPLOYEE : USER_TYPES.STAFF;
  
  // Form state
  const [mode, setMode] = useState('login'); // 'login' | 'otp'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Redirect if already authenticated (but only after loading is complete)
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
        // Login successful (cookies set by backend)
        // Fetch profile to confirm auth and get user data
        const profileResponse = await getProfile();
        if (profileResponse.ok) {
          login(profileResponse.data);
          success('Success', 'Logged in successfully!');
          setTimeout(() => navigate('/profile'), 1000);
        } else {
           error('Login Failed', 'Could not retrieve user profile.');
        }
      } else if (response.data.requires_otp) {
        // 2FA required
        info('2FA Required', 'OTP sent to your email.');
        setMode('otp');
      } else if (response.data.errors) {
        // Handle structured errors
        const errorMessages = [];
        for (const [field, messages] of Object.entries(response.data.errors)) {
          if (Array.isArray(messages)) {
            errorMessages.push(messages[0]);
          } else if (typeof messages === 'string') {
            errorMessages.push(messages);
          }
        }
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
        // OTP verification successful (cookies set by backend)
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

  const handleBackToLogin = () => {
    setMode('login');
    setOtpCode('');
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  // Get the alternate login type link
  const alternateLoginLink = isEmployee ? '/staff/login' : '/employee/login';
  const alternateLoginText = isEmployee ? 'Login as Staff' : 'Login as Employee';
  const registerLink = isEmployee ? '/employee/register' : '/register';
  const forgotPasswordLink = isEmployee ? '/employee/forgot-password' : '/forgot-password';
  const pageTitle = isEmployee ? 'Employee Sign In' : 'Staff Sign In';
  const pageSubtitle = isEmployee 
    ? 'Welcome! Please provide your credentials to log in as an employee.'
    : 'Welcome! Please provide your credentials to log in as staff.';

  return (
    <main className={styles.loginPage}>
      <ToastContainer />
      
      {/* Left Panel */}
      <section className={styles.leftPanel}>
        <div className={styles.leftImage}>
          <img src={bgImageUrl} alt="Background" />
        </div>
      </section>

      {/* Right Panel */}
      <section className={styles.rightPanel}>
        <header className={styles.formHeader}>
          <div className={styles.logo}>
            <img src={logoUrl} alt="Logo" />
            <h1 className={styles.logoText}>{pageTitle}</h1>
          </div>
          <p>{pageSubtitle}</p>
        </header>

        <form 
          className={styles.loginForm} 
          onSubmit={mode === 'login' ? handleLoginSubmit : handleOtpSubmit}
        >
          {/* Login Mode */}
          <div className={`${styles.formMode} ${mode === 'login' ? styles.active : ''}`}>
            <div className={styles.fieldset}>
              <label htmlFor="email">Email:</label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                required={mode === 'login'}
              />
            </div>

            <div className={styles.fieldset}>
              <label htmlFor="password">Password:</label>
              <div className={styles.passwordContainer}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required={mode === 'login'}
                />
                <span 
                  className={`${styles.showPassword} ${password ? styles.visible : ''}`}
                  onClick={togglePasswordVisibility}
                  title={showPassword ? 'Hide password' : 'Show password'}
                >
                  <i className={`fa-solid ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                </span>
              </div>
            </div>

            <div className={styles.rememberMe}>
              <input
                type="checkbox"
                id="rememberMe"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
              />
              <label htmlFor="rememberMe">Remember me</label>
            </div>

            <button 
              type="submit" 
              className={styles.submitButton}
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <span>Signing in...</span>
                  <span className={styles.spinner}></span>
                </>
              ) : (
                <span>Sign In</span>
              )}
            </button>
          </div>

          {/* OTP Mode */}
          <div className={`${styles.formMode} ${mode === 'otp' ? styles.active : ''}`}>
            <div className={styles.infoBox}>
              <i className="fa-solid fa-mobile"></i>
              Enter the One-Time Password (OTP) sent to your email.
            </div>

            <div className={styles.fieldset}>
              <label htmlFor="otpCode">OTP Code:</label>
              <input
                type="text"
                id="otpCode"
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="Enter 6-digit code"
                maxLength={6}
                inputMode="numeric"
                required={mode === 'otp'}
              />
            </div>

            <button 
              type="submit" 
              className={styles.submitButton}
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <span>Verifying...</span>
                  <span className={styles.spinner}></span>
                </>
              ) : (
                <span>Verify OTP</span>
              )}
            </button>

            <div className={styles.forgotLink}>
              <button type="button" onClick={handleBackToLogin}>
                <i className="fa-solid fa-arrow-left"></i> Back to Login
              </button>
            </div>
          </div>

          {/* Footer Links */}
          {mode === 'login' && (
            <div className={styles.formFooter}>
              <Link to={forgotPasswordLink}>
                <i className="fa-solid fa-question-circle"></i> Forgot Password?
              </Link>
              <Link to={alternateLoginLink}>
                <i className={`fa-solid ${isEmployee ? 'fa-user-tie' : 'fa-user'}`}></i> {alternateLoginText}
              </Link>
            </div>
          )}
          
          {mode === 'login' && (
            <div className={styles.registerLink}>
              <Link to={registerLink}>
                <i className="fa-solid fa-user-plus"></i> Create an account
              </Link>
            </div>
          )}
        </form>
      </section>
    </main>
  );
};

export default Login;
