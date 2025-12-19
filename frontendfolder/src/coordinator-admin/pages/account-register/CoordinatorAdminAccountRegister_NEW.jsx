import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { toast } from 'react-toastify';
import Breadcrumb from '../../../shared/components/Breadcrumb';
import FormCard from '../../../shared/components/FormCard';
import styles from './CoordinatorAdminAccountRegister.module.css';
import { getEmployeeUsers, addEmployeeUser } from '../../../utilities/storages/employeeUserStorage';
import CloseIcon from '../../../shared/assets/icons/close.svg';

const departments = [
  'IT Support',
  'Budget Department',
  'Finance Department',
  'Admin Department',
  'HR Department',
  'Operations Department',
  'Sales Department',
  'Marketing Department'
];

const roles = [
  'Employee',
  'Ticket Coordinator',
  'System Admin'
];

const CoordinatorAdminAccountRegister = () => {
  const navigate = useNavigate();
  const [profileImageFile, setProfileImageFile] = useState(null);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isValid },
    reset
  } = useForm({
    defaultValues: {
      companyId: '',
      firstName: '',
      lastName: '',
      department: '',
      role: '',
      email: '',
      password: '',
      confirmPassword: ''
    },
    mode: 'all',
  });

  const password = watch('password');

  // Custom validation: Check if Company ID already exists
  const validateCompanyId = (value) => {
    const existingUsers = getEmployeeUsers();
    if (existingUsers.some(user => user.companyId === value)) {
      return 'Company ID already exists';
    }
    return true;
  };

  // Custom validation: Check if Email already exists
  const validateEmail = (value) => {
    const existingUsers = getEmployeeUsers();
    if (existingUsers.some(user => user.email === value)) {
      return 'Email already exists';
    }
    return true;
  };

  const handleImageSelection = (e) => {
    if (e.target.files && e.target.files[0]) {
      // Check file size (max 5MB)
      if (e.target.files[0].size > 5 * 1024 * 1024) {
        toast.error('File size must be less than 5MB');
        e.target.value = '';
        return;
      }
      
      // Check file type
      if (!e.target.files[0].type.startsWith('image/')) {
        toast.error('Please select an image file');
        e.target.value = '';
        return;
      }
      
      setProfileImageFile(e.target.files[0]);
    }
  };

  const onSubmit = async (data) => {
    try {
      // Create new user object
      const newUserData = {
        companyId: data.companyId.trim(),
        firstName: data.firstName.trim(),
        lastName: data.lastName.trim(),
        department: data.department,
        role: data.role,
        email: data.email.trim(),
        password: data.password,
        profileImage: profileImageFile ? URL.createObjectURL(profileImageFile) : undefined
      };

      // Add user using helper function
      addEmployeeUser(newUserData);

      toast.success('User account created successfully!');
      
      // Navigate back to user access page after short delay
      setTimeout(() => {
        navigate('/admin/user-access/all-users');
      }, 1500);
    } catch (error) {
      toast.error('Failed to create user account. Please try again.');
      console.error('Error creating user:', error);
    }
  };

  const handleReset = () => {
    reset();
    setProfileImageFile(null);
  };

  return (
    <main className={styles.registration}>
      <Breadcrumb
        root="User Management"
        currentPage="Create Account"
        rootNavigatePage="/admin/user-access/all-users"
        title="Create New User Account"
      />

      <section>
  <FormCard>
          <form onSubmit={handleSubmit(onSubmit)}>
          {/* Company ID */}
          <fieldset>
            <label htmlFor="companyId">Company ID *</label>
            <input
              type="text"
              id="companyId"
              placeholder="e.g., IT0001"
              maxLength="50"
              className={errors.companyId ? styles.inputError : ''}
              {...register('companyId', {
                required: 'Company ID is required',
                minLength: {
                  value: 3,
                  message: 'Company ID must be at least 3 characters'
                },
                validate: validateCompanyId
              })}
            />
            {errors.companyId && (
              <span className={styles.errorMessage}>
                {errors.companyId.message}
              </span>
            )}
          </fieldset>

          {/* First Name */}
          <fieldset>
            <label htmlFor="firstName">First Name *</label>
            <input
              type="text"
              id="firstName"
              placeholder="Enter first name"
              maxLength="50"
              className={errors.firstName ? styles.inputError : ''}
              {...register('firstName', {
                required: 'First Name is required',
                minLength: {
                  value: 2,
                  message: 'First Name must be at least 2 characters'
                }
              })}
            />
            {errors.firstName && (
              <span className={styles.errorMessage}>
                {errors.firstName.message}
              </span>
            )}
          </fieldset>

          {/* Last Name */}
          <fieldset>
            <label htmlFor="lastName">Last Name *</label>
            <input
              type="text"
              id="lastName"
              placeholder="Enter last name"
              maxLength="50"
              className={errors.lastName ? styles.inputError : ''}
              {...register('lastName', {
                required: 'Last Name is required',
                minLength: {
                  value: 2,
                  message: 'Last Name must be at least 2 characters'
                }
              })}
            />
            {errors.lastName && (
              <span className={styles.errorMessage}>
                {errors.lastName.message}
              </span>
            )}
          </fieldset>

          {/* Department */}
          <fieldset>
            <label htmlFor="department">Department *</label>
            <select
              id="department"
              className={errors.department ? styles.inputError : ''}
              {...register('department', {
                required: 'Department is required',
              })}
            >
              <option value="">Select Department</option>
              {departments.map((dept) => (
                <option key={dept} value={dept}>
                  {dept}
                </option>
              ))}
            </select>
            {errors.department && (
              <span className={styles.errorMessage}>
                {errors.department.message}
              </span>
            )}
          </fieldset>

          {/* Role */}
          <fieldset>
            <label htmlFor="role">Role *</label>
            <select
              id="role"
              className={errors.role ? styles.inputError : ''}
              {...register('role', {
                required: 'Role is required',
              })}
            >
              <option value="">Select Role</option>
              {roles.map((role) => (
                <option key={role} value={role}>
                  {role}
                </option>
              ))}
            </select>
            {errors.role && (
              <span className={styles.errorMessage}>
                {errors.role.message}
              </span>
            )}
          </fieldset>

          {/* Email */}
          <fieldset>
            <label htmlFor="email">Email Address *</label>
            <input
              type="email"
              id="email"
              placeholder="e.g., user@example.com"
              maxLength="100"
              className={errors.email ? styles.inputError : ''}
              {...register('email', {
                required: 'Email is required',
                pattern: {
                  value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                  message: 'Invalid email format'
                },
                validate: validateEmail
              })}
            />
            {errors.email && (
              <span className={styles.errorMessage}>
                {errors.email.message}
              </span>
            )}
          </fieldset>

          {/* Password */}
          <fieldset>
            <label htmlFor="password">Password *</label>
            <input
              type="password"
              id="password"
              placeholder="Enter password"
              className={errors.password ? styles.inputError : ''}
              {...register('password', {
                required: 'Password is required',
                minLength: {
                  value: 6,
                  message: 'Password must be at least 6 characters'
                }
              })}
            />
            {errors.password && (
              <span className={styles.errorMessage}>
                {errors.password.message}
              </span>
            )}
          </fieldset>

          {/* Confirm Password */}
          <fieldset>
            <label htmlFor="confirmPassword">Confirm Password *</label>
            <input
              type="password"
              id="confirmPassword"
              placeholder="Confirm password"
              className={errors.confirmPassword ? styles.inputError : ''}
              {...register('confirmPassword', {
                required: 'Please confirm password',
                validate: (value) =>
                  value === password || 'Passwords do not match'
              })}
            />
            {errors.confirmPassword && (
              <span className={styles.errorMessage}>
                {errors.confirmPassword.message}
              </span>
            )}
          </fieldset>

          {/* Profile Image */}
          <fieldset>
            <label>Profile Image (Optional)</label>
            {profileImageFile ? (
              <div className={styles.imageSelected}>
                <img
                  src={URL.createObjectURL(profileImageFile)}
                  alt="Profile preview"
                />
                <button
                  type="button"
                  onClick={() => setProfileImageFile(null)}
                >
                  <img src={CloseIcon} alt="Remove" />
                </button>
              </div>
            ) : (
              <label className={styles.uploadImageBtn}>
                Choose File
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageSelection}
                  style={{ display: 'none' }}
                />
              </label>
            )}
            <small className={styles.fileSizeInfo}>
              Maximum file size must be 5MB
            </small>
          </fieldset>

          {/* Buttons */}
          <div className={styles.buttonGroup}>
            <button
              type="button"
              className={styles.cancelBtn}
              onClick={() => navigate('/admin/user-access/all-users')}
            >
              Cancel
            </button>

            <button
              type="button"
              className={styles.resetBtn}
              onClick={handleReset}
            >
              Reset
            </button>

            <button
              type="submit"
              className={styles.primaryButton}
              disabled={!isValid}
            >
              Create Account
            </button>
          </div>
          </form>
        </FormCard>
      </section>
    </main>
  );
};

export default CoordinatorAdminAccountRegister;
