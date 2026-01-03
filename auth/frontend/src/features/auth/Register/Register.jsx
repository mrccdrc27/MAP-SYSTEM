import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import { register } from '../../../services/authService';
import { USER_TYPES } from '../../../utils/constants';
import { useToast } from '../../../components/Toast';
import styles from './Register.module.css';

const logoUrl = '/map-logo.png';
const bgImageUrl = '/TTS_MAP_BG.png';

const Register = ({ userType = 'staff' }) => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { ToastContainer, success, error } = useToast();

  // Determine if this is staff or employee registration
  const isEmployee = userType === 'employee';
  const currentUserType = isEmployee ? USER_TYPES.EMPLOYEE : USER_TYPES.STAFF;

  const [formData, setFormData] = useState({
    email: '',
    username: '',
    password: '',
    confirmPassword: '',
    first_name: '',
    middle_name: '',
    last_name: '',
    suffix: '',
    phone_number: '',
    department: '',
  });

  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [generalError, setGeneralError] = useState('');

  // Get the correct login link based on user type
  const loginLink = isEmployee ? '/employee/login' : '/login';
  const pageTitle = isEmployee ? 'Employee Registration' : 'Staff Registration';
  const alternateRegisterLink = isEmployee ? '/register' : '/employee/register';
  const alternateRegisterText = isEmployee ? 'Register as Staff' : 'Register as Employee';

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/profile');
    }
  }, [isAuthenticated, navigate]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email';
    }

    if (!formData.username) {
      newErrors.username = 'Username is required';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    }

    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    if (!formData.first_name) {
      newErrors.first_name = 'First name is required';
    }

    if (!formData.last_name) {
      newErrors.last_name = 'Last name is required';
    }

    if (!formData.phone_number) {
      newErrors.phone_number = 'Phone number is required';
    } else if (!/^09\d{9}$/.test(formData.phone_number.replace(/\D/g, ''))) {
      newErrors.phone_number = 'Phone must be 11 digits starting with 09';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setGeneralError('');

    if (!validateForm()) {
      return;
    }

    setIsLoading(true);

    try {
      const { confirmPassword, ...submitData } = formData;
      const response = await register(submitData, currentUserType);

      if (response.ok) {
        success('Success', 'Account created successfully! Please log in.');
        setTimeout(() => navigate(loginLink), 2000);
      } else {
        // Handle API errors
        if (response.data) {
          const apiErrors = {};
          for (const [field, messages] of Object.entries(response.data)) {
            if (Array.isArray(messages)) {
              apiErrors[field] = messages[0];
            } else if (typeof messages === 'string') {
              apiErrors[field] = messages;
            }
          }
          setErrors(apiErrors);

          if (response.data.non_field_errors) {
            setGeneralError(response.data.non_field_errors[0]);
          }
        } else {
          error('Registration Failed', 'An error occurred. Please try again.');
        }
      }
    } catch (err) {
      console.error('Registration error:', err);
      error('Error', 'An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className={styles.registerPage}>
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
            <p className={styles.welcomeMessage}>
              Welcome! Create your {isEmployee ? 'employee' : 'staff'} account below.
            </p>
          </header>

          <p className={styles.backToLogin}>
            Already have an account? <Link to={loginLink}><i className="fas fa-sign-in-alt"></i> Log In</Link>
          </p>
          
          <p className={styles.alternateRegister}>
            <Link to={alternateRegisterLink}>
              <i className={`fa-solid ${isEmployee ? 'fa-user-tie' : 'fa-user'}`}></i> {alternateRegisterText}
            </Link>
          </p>

          {generalError && (
            <div className={styles.errorContainer}>
              <p className={styles.errorMsg}>{generalError}</p>
            </div>
          )}

          <form className={styles.registerForm} onSubmit={handleSubmit}>
            <div className={styles.formGrid}>
              {/* Email */}
              <div className={`${styles.formGroup} ${styles.fullWidth}`}>
                <label htmlFor="email">
                  Email <span className={styles.required}>*</span>
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="Enter your email"
                />
                {errors.email && <span className={styles.fieldError}>{errors.email}</span>}
              </div>

              {/* Username */}
              <div className={`${styles.formGroup} ${styles.fullWidth}`}>
                <label htmlFor="username">
                  Username <span className={styles.required}>*</span>
                </label>
                <input
                  type="text"
                  id="username"
                  name="username"
                  value={formData.username}
                  onChange={handleChange}
                  placeholder="Choose a username"
                />
                {errors.username && <span className={styles.fieldError}>{errors.username}</span>}
              </div>

              {/* First Name */}
              <div className={styles.formGroup}>
                <label htmlFor="first_name">
                  First Name <span className={styles.required}>*</span>
                </label>
                <input
                  type="text"
                  id="first_name"
                  name="first_name"
                  value={formData.first_name}
                  onChange={handleChange}
                  placeholder="First name"
                />
                {errors.first_name && <span className={styles.fieldError}>{errors.first_name}</span>}
              </div>

              {/* Middle Name */}
              <div className={styles.formGroup}>
                <label htmlFor="middle_name">Middle Name</label>
                <input
                  type="text"
                  id="middle_name"
                  name="middle_name"
                  value={formData.middle_name}
                  onChange={handleChange}
                  placeholder="Middle name"
                />
              </div>

              {/* Last Name */}
              <div className={styles.formGroup}>
                <label htmlFor="last_name">
                  Last Name <span className={styles.required}>*</span>
                </label>
                <input
                  type="text"
                  id="last_name"
                  name="last_name"
                  value={formData.last_name}
                  onChange={handleChange}
                  placeholder="Last name"
                />
                {errors.last_name && <span className={styles.fieldError}>{errors.last_name}</span>}
              </div>

              {/* Suffix */}
              <div className={styles.formGroup}>
                <label htmlFor="suffix">Suffix</label>
                <input
                  type="text"
                  id="suffix"
                  name="suffix"
                  value={formData.suffix}
                  onChange={handleChange}
                  placeholder="Jr., Sr., III, etc."
                />
              </div>

              {/* Phone Number */}
              <div className={`${styles.formGroup} ${styles.fullWidth}`}>
                <label htmlFor="phone_number">
                  Phone Number <span className={styles.required}>*</span>
                </label>
                <input
                  type="tel"
                  id="phone_number"
                  name="phone_number"
                  value={formData.phone_number}
                  onChange={handleChange}
                  placeholder="09123456789"
                />
                {errors.phone_number && <span className={styles.fieldError}>{errors.phone_number}</span>}
              </div>

              {/* Department */}
              <div className={`${styles.formGroup} ${styles.fullWidth}`}>
                <label htmlFor="department">Department</label>
                <input
                  type="text"
                  id="department"
                  name="department"
                  value={formData.department}
                  onChange={handleChange}
                  placeholder="Your department"
                />
              </div>

              {/* Password */}
              <div className={`${styles.formGroup} ${styles.fullWidth}`}>
                <label htmlFor="password">
                  Password <span className={styles.required}>*</span>
                </label>
                <div className={styles.passwordContainer}>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    id="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="Create a password"
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

              {/* Confirm Password */}
              <div className={`${styles.formGroup} ${styles.fullWidth}`}>
                <label htmlFor="confirmPassword">
                  Confirm Password <span className={styles.required}>*</span>
                </label>
                <div className={styles.passwordContainer}>
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    id="confirmPassword"
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    placeholder="Confirm your password"
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
            </div>

            <button 
              type="submit" 
              className={styles.submitButton}
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <span>Creating Account...</span>
                  <span className={styles.spinner}></span>
                </>
              ) : (
                <>
                  <i className="fas fa-user-plus"></i>
                  <span>Sign Up</span>
                </>
              )}
            </button>
          </form>
        </div>
      </section>
    </main>
  );
};

export default Register;
