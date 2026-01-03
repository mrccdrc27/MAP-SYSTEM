import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import { register } from '../../../services/authService';
import { USER_TYPES } from '../../../utils/constants';
import { useToast, Button, Input } from '../../../components/common';
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
              <Input
                label="Email"
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="Enter your email"
                required
                error={errors.email}
                className={styles.fullWidth}
              />

              <Input
                label="Username"
                type="text"
                name="username"
                value={formData.username}
                onChange={handleChange}
                placeholder="Choose a username"
                required
                error={errors.username}
                className={styles.fullWidth}
              />

              <Input
                label="First Name"
                type="text"
                name="first_name"
                value={formData.first_name}
                onChange={handleChange}
                placeholder="First name"
                required
                error={errors.first_name}
              />

              <Input
                label="Middle Name"
                type="text"
                name="middle_name"
                value={formData.middle_name}
                onChange={handleChange}
                placeholder="Middle name"
              />

              <Input
                label="Last Name"
                type="text"
                name="last_name"
                value={formData.last_name}
                onChange={handleChange}
                placeholder="Last name"
                required
                error={errors.last_name}
              />

              <Input
                label="Suffix"
                type="text"
                name="suffix"
                value={formData.suffix}
                onChange={handleChange}
                placeholder="Jr., Sr., III, etc."
              />

              <Input
                label="Phone Number"
                type="tel"
                name="phone_number"
                value={formData.phone_number}
                onChange={handleChange}
                placeholder="09123456789"
                required
                error={errors.phone_number}
                className={styles.fullWidth}
              />

              <Input
                label="Department"
                type="text"
                name="department"
                value={formData.department}
                onChange={handleChange}
                placeholder="Your department"
                className={styles.fullWidth}
              />

              <Input
                label="Password"
                type={showPassword ? 'text' : 'password'}
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="Create a password"
                required
                error={errors.password}
                hint="Password must be at least 8 characters long."
                className={styles.fullWidth}
                icon={<i className={`fa-solid ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>}
                onIconClick={() => setShowPassword(!showPassword)}
              />

              <Input
                label="Confirm Password"
                type={showConfirmPassword ? 'text' : 'password'}
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                placeholder="Confirm your password"
                required
                error={errors.confirmPassword}
                className={styles.fullWidth}
                icon={<i className={`fa-solid ${showConfirmPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>}
                onIconClick={() => setShowConfirmPassword(!showConfirmPassword)}
              />
            </div>

            <Button 
              type="submit" 
              className={styles.submitButton}
              isLoading={isLoading}
              icon={<i className="fas fa-user-plus"></i>}
            >
              Sign Up
            </Button>
          </form>
        </div>
      </section>
    </main>
  );
};

export default Register;
