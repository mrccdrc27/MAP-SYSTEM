import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import { register } from '../../../services/authService';
import { USER_TYPES } from '../../../utils/constants';
import { useToast, Button, Input } from '../../../components/common';
import { AuthLayout } from '../../../components/layout';
import EmployeeRegister from './EmployeeRegister';
import styles from './Register.module.css';

const Register = ({ userType = 'staff' }) => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { ToastContainer, success, error } = useToast();

  const isEmployee = userType === 'employee';
  const currentUserType = isEmployee ? USER_TYPES.EMPLOYEE : USER_TYPES.STAFF;

  // If this is employee registration, use the new HDTS-style component
  if (isEmployee) {
    return <EmployeeRegister />;
  }

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

  const loginLink = isEmployee ? '/employee' : '/staff';
  const pageTitle = isEmployee ? 'Employee Registration' : 'Staff Registration';
  const pageSubtitle = `Create your ${isEmployee ? 'employee' : 'staff'} account below.`;

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/profile');
    }
  }, [isAuthenticated, navigate]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.email) newErrors.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(formData.email)) newErrors.email = 'Invalid email format';

    if (!formData.username) newErrors.username = 'Username is required';
    if (!formData.password) newErrors.password = 'Password is required';
    else if (formData.password.length < 8) newErrors.password = 'Min 8 characters';

    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    if (!formData.first_name) newErrors.first_name = 'Required';
    if (!formData.last_name) newErrors.last_name = 'Required';

    if (!formData.phone_number) {
      newErrors.phone_number = 'Required';
    } else if (!/^09\d{9}$/.test(formData.phone_number.replace(/\D/g, ''))) {
      newErrors.phone_number = '11 digits starting with 09';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setGeneralError('');
    if (!validateForm()) return;

    setIsLoading(true);
    try {
      const { confirmPassword, ...submitData } = formData;
      const response = await register(submitData, currentUserType);

      if (response.ok) {
        success('Success', 'Account created! Please log in.');
        setTimeout(() => navigate(loginLink), 2000);
      } else {
        if (response.data) {
          const apiErrors = {};
          for (const [field, messages] of Object.entries(response.data)) {
            apiErrors[field] = Array.isArray(messages) ? messages[0] : messages;
          }
          setErrors(apiErrors);
          if (response.data.non_field_errors) setGeneralError(response.data.non_field_errors[0]);
        } else {
          error('Registration Failed', 'An error occurred.');
        }
      }
    } catch (err) {
      error('Error', 'An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout title={pageTitle} subtitle={pageSubtitle} wide>
      <ToastContainer />

      {generalError && (
        <div className={styles.errorBanner}>
          {generalError}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className={styles.formGrid}>
          <div className={styles.gridFull}>
            <Input
              label="Email"
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="name@company.com"
              required
              error={errors.email}
              className={styles.roundedInput}
            />
          </div>

          <div className={styles.gridFull}>
            <Input
              label="Username"
              type="text"
              name="username"
              value={formData.username}
              onChange={handleChange}
              placeholder="jdoe123"
              required
              error={errors.username}
              className={styles.roundedInput}
            />
          </div>

          <Input
            label="First Name"
            name="first_name"
            value={formData.first_name}
            onChange={handleChange}
            placeholder="John"
            required
            error={errors.first_name}
            className={styles.roundedInput}
          />

          <Input
            label="Middle Name"
            name="middle_name"
            value={formData.middle_name}
            onChange={handleChange}
            placeholder="Quincy"
            className={styles.roundedInput}
          />

          <Input
            label="Last Name"
            name="last_name"
            value={formData.last_name}
            onChange={handleChange}
            placeholder="Doe"
            required
            error={errors.last_name}
            className={styles.roundedInput}
          />

          <Input
            label="Suffix"
            name="suffix"
            value={formData.suffix}
            onChange={handleChange}
            placeholder="Jr., Sr., etc."
            className={styles.roundedInput}
          />

          <div className={styles.gridFull}>
            <Input
              label="Phone Number"
              type="tel"
              name="phone_number"
              value={formData.phone_number}
              onChange={handleChange}
              placeholder="09123456789"
              required
              error={errors.phone_number}
              className={styles.roundedInput}
            />
          </div>

          <div className={styles.gridFull}>
            <Input
              label="Department"
              name="department"
              value={formData.department}
              onChange={handleChange}
              placeholder="IT Department"
              className={styles.roundedInput}
            />
          </div>

          <div className={styles.gridHalf}>
            <Input
              label="Password"
              type={showPassword ? 'text' : 'password'}
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="••••••••"
              required
              error={errors.password}
              icon={formData.password ? <i className={`fa-solid ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i> : null}
              onIconClick={() => setShowPassword(!showPassword)}
              className={styles.roundedInput}
            />
          </div>

          <div className={styles.gridHalf}>
            <Input
              label="Confirm Password"
              type={showConfirmPassword ? 'text' : 'password'}
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              placeholder="••••••••"
              required
              error={errors.confirmPassword}
              icon={formData.confirmPassword ? <i className={`fa-solid ${showConfirmPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i> : null}
              onIconClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className={styles.roundedInput}
            />
          </div>
        </div>

        <Button 
          type="submit" 
          className={styles.submitButton}
          isLoading={isLoading}
          variant="primary"
          size="large"
          fullWidth
        >
          Create Account
        </Button>

        <div className={styles.authFooter}>
          <p>
            Already have an account? <Link to={loginLink} className={styles.link}>Sign In</Link>
          </p>
        </div>
      </form>
    </AuthLayout>
  );
};

export default Register;