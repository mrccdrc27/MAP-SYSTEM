import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import Breadcrumb from '../../../shared/components/Breadcrumb';
import FormCard from '../../../shared/components/FormCard';
import InputField from '../../../shared/components/InputField';
import ProfileImageUpload from '../../../shared/components/ProfileImageUpload';
import Button from '../../../shared/components/Button';
import styles from './CoordinatorAdminAccountRegister.module.css';
import formActions from '../../../shared/styles/formActions.module.css';
import FormActions from '../../../shared/components/FormActions';
import { getEmployeeUsers, addEmployeeUser } from '../../../utilities/storages/employeeUserStorage';
import { API_CONFIG } from '../../../config/environment';
import { useEffect } from 'react';

const departments = [
  'IT Department',
  'Asset Department',
  'Budget Department'
];

const SUFFIX_OPTIONS = [
  '', 'Jr.', 'Sr.', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'
];

// roles will be fetched from the auth service (role id + name)
const initialRoleOptions = [];

const CoordinatorAdminAccountRegister = () => {
  const navigate = useNavigate();
  
  const [formData, setFormData] = useState({
    lastName: '',
    firstName: '',
    middleName: '',
    suffix: '',
    department: '',
    role: '',
    email: ''
  });
  const [roleOptions, setRoleOptions] = useState(initialRoleOptions);

  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validateField = (field, value) => {
    let error = '';
  switch (field) {
      case 'lastName':
        if (!value.trim()) {
          error = 'Last Name is required';
        } else if (value.trim().length < 2) {
          error = 'Last Name must be at least 2 characters';
        }
        break;
      case 'firstName':
        if (!value.trim()) {
          error = 'First Name is required';
        } else if (value.trim().length < 2) {
          error = 'First Name must be at least 2 characters';
        }
        break;
      case 'middleName':
        // Middle Name is optional, no validation
        break;
      case 'suffix':
        // Suffix is optional, no validation
        break;
      case 'department':
        if (!value) {
          error = 'Department is required';
        }
        break;
      case 'role':
        if (!value) {
          error = 'Role is required';
        }
        break;
      case 'email':
        if (!value.trim()) {
          error = 'Email is required';
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
          error = 'Invalid email format';
        } else {
          const existingUsers = getEmployeeUsers();
          if (existingUsers.some(user => user.email === value.trim())) {
            error = 'Email already exists';
          }
        }
        break;
      default:
        break;
    }
    return error;
  };

  const handleInputChange = (field) => (e) => {
    const value = e.target.value;
    
    setFormData({
      ...formData,
      [field]: value
    });

    // Validate field if it has been touched
    if (touched[field]) {
      const error = validateField(field, value);
      setErrors({
        ...errors,
        [field]: error
      });
    }

    // Also validate confirmPassword when password changes
    if (field === 'password' && touched.confirmPassword) {
      const confirmError = validateField('confirmPassword', formData.confirmPassword);
      setErrors({
        ...errors,
        password: validateField('password', value),
        confirmPassword: confirmError
      });
    }
  };

  const handleBlur = (field) => () => {
    setTouched({
      ...touched,
      [field]: true
    });

    const error = validateField(field, formData[field]);
    setErrors({
      ...errors,
      [field]: error
    });
  };

  const validateAllFields = () => {
    const newErrors = {};
    const newTouched = {};
    


    const fieldsToValidate = [
      'lastName',
      'firstName',
      'middleName',
      'suffix',
      'department',
      'role',
      'email'
    ];

    fieldsToValidate.forEach(field => {
      newTouched[field] = true;
      newErrors[field] = validateField(field, formData[field]);
    });

    // Validate profile image if provided
    if (formData.profileImage) {
      newTouched.profileImage = true;
      newErrors.profileImage = validateField('profileImage', formData.profileImage);
    }
    
    setTouched(newTouched);
    setErrors(newErrors);
    
    // Return true if no errors
    return !Object.values(newErrors).some(error => error !== '');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateAllFields()) {
      toast.error('Please fix the errors in the form before submitting.');
      return;
    }
      setIsSubmitting(true);
      try {
  // Some login flows store tokens under 'access_token' (generic) while
  // dev utilities or older code may use 'admin_access_token'. Prefer
  // admin-specific key but fall back to generic 'access_token'.
  const token = localStorage.getItem('admin_access_token') || localStorage.getItem('access_token'); 
      // Validate required business fields before sending
      if (!formData.role) {
        toast.error('Please select a role before submitting.');
        setIsSubmitting(false);
        return;
      }

      // Build payload expected by the auth system invite endpoint
      const payload = new FormData();
      payload.append('last_name', formData.lastName.trim());
      payload.append('first_name', formData.firstName.trim());
      payload.append('middle_name', formData.middleName.trim());
      payload.append('suffix', formData.suffix || '');
      payload.append('department', formData.department);
      // role_id must be an existing role id (integer/string)
      payload.append('role_id', formData.role);
      payload.append('email', formData.email.trim());
      // Only add image if a file is uploaded (not used in admin form, but future-proof)
      // if (formData.profileImage) {
      //   payload.image = formData.profileImage;
      // }
  const res = await fetch(`${API_CONFIG.AUTH.BASE_URL.replace(/\/$/, '')}/api/v1/system-roles/invite/`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        credentials: 'include',
        body: payload
      });
      let data;
      try {
        data = await res.json();
      } catch (err) {
        const text = await res.text().catch(() => '');
        console.error('Account register unexpected response:', res.status, text);
        toast.error('Failed to create user account. Server returned unexpected response.');
        setIsSubmitting(false);
        return;
      }

      if (!res.ok) {
        console.error('Account register failed:', res.status, data);
        // Show first meaningful error
        const message = data.error || data.detail || (data.role_id && Array.isArray(data.role_id) ? data.role_id.join(', ') : null) || JSON.stringify(data);
        toast.error(message || 'Failed to create user account.');
        setIsSubmitting(false);
        return;
      }

      toast.success(`User ${data.user} created. Company ID: ${data.company_id || ''}`);
      setTimeout(() => navigate('/admin/user-access/all-users'), 1500);
      } catch (error) {
        toast.error('Failed to create user account. Please try again.');
        setIsSubmitting(false);
      }
  };

    // Fetch available roles for the HDTS system so we can present role ids
    useEffect(() => {
      let mounted = true;
      (async () => {
        try {
          const token = localStorage.getItem('admin_access_token') || localStorage.getItem('access_token');
          const headers = token ? { 'Authorization': `Bearer ${token}` } : {};

          // Try global roles endpoint first
          const url = `${API_CONFIG.AUTH.BASE_URL.replace(/\/$/, '')}/api/v1/roles/`;
          const resp = await fetch(url, { credentials: 'include', headers });
          if (!mounted) return;
          if (resp && resp.ok) {
            const json = await resp.json();
            if (Array.isArray(json)) {
              // api/v1/roles/ may return an array of role objects
              const tc = json.find(r => String(r.name).toLowerCase() === 'ticket coordinator');
              // Find Admin role in HDTS system
              const adminHdts = json.find(r => String(r.name).toLowerCase() === 'admin' && (r.system && String(r.system.slug || r.system).toLowerCase() === 'hdts'));
              const options = [];
              if (tc) options.push({ id: tc.id, name: 'Ticket Coordinator' });
              if (adminHdts) options.push({ id: adminHdts.id, name: 'System Admin' });
              // Ensure both options exist: prefer discovered ids, otherwise add fallbacks
              const ensureOptions = [];
              // Ticket Coordinator: prefer discovered, else include placeholder with null id
              const foundTC = options.find(o => o.name === 'Ticket Coordinator');
              if (foundTC) ensureOptions.push(foundTC); else ensureOptions.push({ id: null, name: 'Ticket Coordinator' });
              // System Admin: prefer discovered, else include special token 'admin_hdts'
              const foundAdmin = options.find(o => o.name === 'System Admin');
              if (foundAdmin) ensureOptions.push(foundAdmin); else ensureOptions.push({ id: 'admin_hdts', name: 'System Admin' });

              setRoleOptions(ensureOptions);
              return;
            }
          }

          // Fallback: try system-roles HDTS endpoint and look for Ticket Coordinator/Admin there
          try {
            const url2 = `${API_CONFIG.AUTH.BASE_URL.replace(/\/$/, '')}/api/v1/system-roles/system/hdts/roles/`;
            const resp2 = await fetch(url2, { credentials: 'include', headers });
            if (!mounted) return;
            if (resp2 && resp2.ok) {
              const json2 = await resp2.json();
              if (json2 && Array.isArray(json2.roles)) {
                const tc = json2.roles.find(r => String(r.name).toLowerCase() === 'ticket coordinator');
                const admin = json2.roles.find(r => String(r.name).toLowerCase() === 'admin');
                const opts = [];
                if (tc) opts.push({ id: tc.id, name: 'Ticket Coordinator' });
                if (admin) opts.push({ id: admin.id, name: 'System Admin' });
                // Ensure both options present
                const ensured = [];
                const fTC = opts.find(o => o.name === 'Ticket Coordinator');
                if (fTC) ensured.push(fTC); else ensured.push({ id: null, name: 'Ticket Coordinator' });
                const fAdmin = opts.find(o => o.name === 'System Admin');
                if (fAdmin) ensured.push(fAdmin); else ensured.push({ id: 'admin_hdts', name: 'System Admin' });
                if (ensured.length > 0) {
                  setRoleOptions(ensured);
                  return;
                }
              }
            }
          } catch (e) {
            // ignore
          }

          // Final fallback: provide fixed options where System Admin uses the special token
          setRoleOptions([{ id: null, name: 'Ticket Coordinator' }, { id: 'admin_hdts', name: 'System Admin' }]);
        } catch (e) {
          // ignore - leave roleOptions empty and rely on manual entry
          setRoleOptions([{ id: null, name: 'Ticket Coordinator' }, { id: 'admin_hdts', name: 'System Admin' }]);
        }
      })();
      return () => { mounted = false; };
    }, []);

  const resetForm = () => {
    setFormData({
      lastName: '',
      firstName: '',
      middleName: '',
      suffix: '',
      department: '',
      role: '',
      email: ''
    });
    setErrors({});
    setTouched({});
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
          <form onSubmit={handleSubmit}>
            {/* Personal Information */}
            <fieldset>
              <legend className={styles.fieldsetLegend}>
                Personal Information
              </legend>
              <InputField
                label="Last Name"
                placeholder="Enter last name"
                value={formData.lastName}
                onChange={handleInputChange('lastName')}
                onBlur={handleBlur('lastName')}
                required
                error={errors.lastName}
              />
              <InputField
                label="First Name"
                placeholder="Enter first name"
                value={formData.firstName}
                onChange={handleInputChange('firstName')}
                onBlur={handleBlur('firstName')}
                required
                error={errors.firstName}
              />
              <InputField
                label="Middle Name"
                placeholder="Enter middle name"
                value={formData.middleName}
                onChange={handleInputChange('middleName')}
                onBlur={handleBlur('middleName')}
                error={errors.middleName}
              />
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Suffix</label>
                <select
                  value={formData.suffix}
                  onChange={handleInputChange('suffix')}
                  onBlur={handleBlur('suffix')}
                >
                  <option value="">None</option>
                  {SUFFIX_OPTIONS.filter(x => x).map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
                {errors.suffix && <div className={styles.errorMessage}>{errors.suffix}</div>}
              </div>
            </fieldset>
            {/* Department */}
            <fieldset>
              <legend className={styles.fieldsetLegend}>
                Department
              </legend>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>
                  Department <span className={styles.required}>*</span>
                </label>
                <select
                  value={formData.department}
                  onChange={handleInputChange('department')}
                  onBlur={handleBlur('department')}
                  className={errors.department ? styles.inputError : ''}
                >
                  <option value="">Select Department</option>
                  {departments.map(dept => (
                    <option key={dept} value={dept}>{dept}</option>
                  ))}
                </select>
                {errors.department && (
                  <div className={styles.errorMessage}>
                    {errors.department}
                  </div>
                )}
              </div>
            </fieldset>
            {/* Role and Account Information */}
            <fieldset>
              <legend className={styles.fieldsetLegend}>
                Role & Account Information
              </legend>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>
                  Role <span className={styles.required}>*</span>
                </label>
                <select
                  value={formData.role}
                  onChange={handleInputChange('role')}
                  onBlur={handleBlur('role')}
                  className={errors.role ? styles.inputError : ''}
                >
                  <option value="">Select Role</option>
                  {roleOptions.length > 0 ? (
                    roleOptions.map(r => (
                      <option key={r.id} value={r.id}>{r.name}</option>
                    ))
                  ) : (
                    <>
                      <option value="">No roles available</option>
                      <option value="admin_hdts">System Admin (HDTS)</option>
                    </>
                  )}
                </select>
                {errors.role && (
                  <div className={styles.errorMessage}>
                    {errors.role}
                  </div>
                )}
              </div>
              <InputField
                type="email"
                label="Email Address"
                placeholder="@gmail.com"
                value={formData.email}
                onChange={handleInputChange('email')}
                onBlur={handleBlur('email')}
                required
                error={errors.email}
              />
            </fieldset>
            {/* Action Buttons */}
            <FormActions
              onCancel={() => navigate('/admin/user-access/all-users')}
              cancelLabel="Cancel"
              submitLabel={isSubmitting ? 'Creating...' : 'Create Account'}
              submitDisabled={isSubmitting}
              submitVariant="primary"
            />
          </form>
        </FormCard>
      </section>
    </main>
  );
};

export default CoordinatorAdminAccountRegister;
