import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useToast } from '../../../components/common';
import PrivacyPolicyModal from '../../../components/common/PrivacyPolicyModal';
import { register } from '../../../services/authService';
import { USER_TYPES } from '../../../utils/constants';
import styles from "./EmployeeRegister.module.css";

const namePattern = /^[a-zA-Z.\-'\s]+$/;
const letterPresencePattern = /[a-zA-Z]/;

const getPasswordErrorMessage = (password) => {
  if (!password || password.trim() === "") {
    return "Please fill in the required field.";
  }
  const hasMinLength = password.length >= 8;
  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasDigit = /[0-9]/.test(password);
  const hasSpecial = /[!@#$%^&*(),.?":{}|<>`~\-_=\\/;'\[\]]/.test(password);

  const missing = {
    upper: !hasUpper,
    lower: !hasLower,
    digit: !hasDigit,
    special: !hasSpecial,
  };

  const missingKeys = Object.entries(missing)
    .filter(([_, isMissing]) => isMissing)
    .map(([key]) => key);

  const descriptors = {
    upper: "uppercase",
    lower: "lowercase",
    digit: "number",
    special: "special character",
  };

  const buildList = (items) => {
    if (items.length === 1) return descriptors[items[0]];
    if (items.length === 2)
      return `${descriptors[items[0]]} and ${descriptors[items[1]]}`;
    return (
      items
        .slice(0, -1)
        .map((key) => descriptors[key])
        .join(", ") +
      ", and " +
      descriptors[items[items.length - 1]]
    );
  };

  if (!hasMinLength && missingKeys.length) {
    return `Password must be at least 8 characters long and include ${buildList(
      missingKeys
    )}.`;
  } else if (!hasMinLength) {
    return "Password must be at least 8 characters long.";
  } else if (missingKeys.length) {
    return `Password must include ${buildList(missingKeys)}.`;
  }
};

// Suffix options (same as HDTS)
const suffixOptions = ["Jr.", "Sr.", "II", "III", "IV"];

// Department options: restrict to allowed departments
const departmentOptions = [
  { value: "IT Department", label: "IT Department" },
  { value: "Asset Department", label: "Asset Department" },
  { value: "Budget Department", label: "Budget Department" },
];

export default function EmployeeRegister() {
  const navigate = useNavigate();
  const { ToastContainer, success, error } = useToast();
  const [isSubmitting, setSubmitting] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showPolicyModal, setShowPolicyModal] = useState(false);
  
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    middleName: "",
    suffix: "",
    username: "",
    phoneNumber: "",
    department: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const [errors, setErrors] = useState({});

  const handleChange = (e) => {
    const { name, value } = e.target;
    let processedValue = value;

    // Auto-capitalize names
    if (name === "firstName" || name === "lastName" || name === "middleName") {
      processedValue = value.replace(/\b\w/g, (char) => char.toUpperCase());
    }
    
    // Only allow digits for phone number
    if (name === "phoneNumber") {
      processedValue = value.replace(/\D/g, "").slice(0, 11);
    }

    setFormData(prev => ({ ...prev, [name]: processedValue }));
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validateField = (name, value) => {
    switch (name) {
      case "firstName":
      case "lastName":
        if (!value) return "Please fill in the required field.";
        if (!namePattern.test(value)) return "Invalid character.";
        if (!letterPresencePattern.test(value)) return `Invalid ${name === "firstName" ? "First" : "Last"} Name.`;
        return "";
      
      case "middleName":
        if (value && (!namePattern.test(value) || !letterPresencePattern.test(value))) {
          return !namePattern.test(value) ? "Invalid character." : "Invalid Middle Name.";
        }
        return "";
      
      case "username":
        if (!value) return "Please fill in the required field.";
        if (!/^[a-zA-Z0-9_.-]+$/.test(value)) return "Invalid characters. Only letters, numbers, underscores, dots, and hyphens allowed.";
        return "";
      
      case "phoneNumber":
        if (!value) return "Please fill in the required field.";
        if (!/^09\d{9}$/.test(value)) return "Phone number must be 11 digits starting with 09 (e.g., 09123456789).";
        return "";
      
      case "department":
        if (!value) return "Please fill in the required field.";
        return "";
      
      case "email":
        if (!value) return "Please fill in the required field.";
        if (!/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(value)) return "Invalid email format.";
        return "";
      
      case "password":
        return getPasswordErrorMessage(value);
      
      case "confirmPassword":
        if (!value) return "Please fill in the required field.";
        if (value !== formData.password) return "Password did not match.";
        return "";
      
      default:
        return "";
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    Object.keys(formData).forEach(key => {
      if (key !== "middleName" && key !== "suffix") { // These are optional
        const error = validateField(key, formData[key]);
        if (error) newErrors[key] = error;
      }
    });

    if (!agreed) {
      newErrors.agreement = "Please agree to the Privacy Policy and Terms and Conditions.";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handlePolicyClick = (e) => {
    e.preventDefault();
    setShowPolicyModal(true);
  };

  const handlePolicyAgree = () => {
    setAgreed(true);
    setShowPolicyModal(false);
  };

  const handlePolicyClose = () => {
    setShowPolicyModal(false);
  };

  const onSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      error('Validation Error', 'Please fix the errors in the form.');
      return;
    }

    setSubmitting(true);

    try {
      // Use the auth service register endpoint for employees
      const res = await register({
        first_name: formData.firstName,
        last_name: formData.lastName,
        middle_name: formData.middleName || "",
        suffix: formData.suffix || "",
        department: formData.department,
        username: formData.username,
        phone_number: formData.phoneNumber,
        email: formData.email,
        password: formData.password,
        user_type: USER_TYPES.EMPLOYEE
      }, USER_TYPES.EMPLOYEE);

      if (!res.ok) {
        const err = res.data;

        // Field-specific error handling
        const newErrors = {};
        if (err.email) {
          newErrors.email = Array.isArray(err.email) ? err.email[0] : err.email;
        }
        if (err.username) {
          newErrors.username = Array.isArray(err.username) ? err.username[0] : err.username;
        }
        if (err.phone_number) {
          newErrors.phoneNumber = Array.isArray(err.phone_number) ? err.phone_number[0] : err.phone_number;
        }
        
        setErrors(newErrors);

        // Show a toast for general errors
        if (Object.keys(newErrors).length === 0) {
          error('Registration Failed', err.error || err.message || "Failed to create account. Please check your details.");
        }
        setSubmitting(false);
        return;
      }

      // Handle successful account creation
      success('Success', 'Account created successfully! Please log in.');
      setSubmitting(false);
      setTimeout(() => navigate("/employee"), 3000);
    } catch (err) {
      error('Network Error', 'Network error. Please try again.');
      setSubmitting(false);
    }
  };

  return (
    <main className={styles.container}>
      <ToastContainer />
      
      <section className={styles.leftPanel}>
        <img src="/HELPDESK_BG.jpg" alt="Create Account" className={styles.assetImage} />
      </section>

      <section className={styles.rightPanel}>
        <div className={styles.formWrapper}>
          <header className={styles.formHeader}>
            <div className={styles.logo}>
              <img src="/map-logo.png" alt="Logo" />
              <h1 className={styles.logoText}>Ticketing System</h1>
            </div>
            <h2>Create Account</h2>
            <p className={styles.welcomeMessage}>
              Welcome! As an Employee, you can create your account below.
            </p>
          </header>

          <form onSubmit={onSubmit} className={styles.form}>
            <fieldset className={styles.fieldset}>
              <label>
                Last Name <span className={styles.required}> *</span>
              </label>
              <input
                type="text"
                name="lastName"
                className={styles.input}
                value={formData.lastName}
                onChange={handleChange}
                autoComplete="off"
              />
              {errors.lastName && <span className={styles.errorMsg}>{errors.lastName}</span>}
            </fieldset>

            <fieldset className={styles.fieldset}>
              <label>
                First Name <span className={styles.required}> *</span>
              </label>
              <input
                type="text"
                name="firstName"
                className={styles.input}
                value={formData.firstName}
                onChange={handleChange}
                autoComplete="off"
              />
              {errors.firstName && <span className={styles.errorMsg}>{errors.firstName}</span>}
            </fieldset>

            <fieldset className={styles.fieldset}>
              <label>Middle Name</label>
              <input
                type="text"
                name="middleName"
                className={styles.input}
                value={formData.middleName}
                onChange={handleChange}
                autoComplete="off"
              />
              {errors.middleName && <span className={styles.errorMsg}>{errors.middleName}</span>}
            </fieldset>

            <fieldset className={styles.fieldset}>
              <label>Suffix</label>
              <select 
                name="suffix" 
                className={styles.select}
                value={formData.suffix}
                onChange={handleChange}
              >
                <option value="">Select Suffix</option>
                {suffixOptions.map((suffix) => (
                  <option key={suffix} value={suffix}>
                    {suffix}
                  </option>
                ))}
              </select>
            </fieldset>

            <fieldset className={styles.fieldset}>
              <label>
                Username <span className={styles.required}> *</span>
              </label>
              <input
                type="text"
                name="username"
                className={styles.input}
                value={formData.username}
                onChange={handleChange}
                autoComplete="off"
              />
              {errors.username && <span className={styles.errorMsg}>{errors.username}</span>}
            </fieldset>

            <fieldset className={styles.fieldset}>
              <label>
                Phone Number <span className={styles.required}> *</span>
              </label>
              <input
                type="text"
                name="phoneNumber"
                inputMode="numeric"
                maxLength="11"
                placeholder="09123456789"
                className={styles.input}
                value={formData.phoneNumber}
                onChange={handleChange}
                autoComplete="off"
              />
              {errors.phoneNumber && <span className={styles.errorMsg}>{errors.phoneNumber}</span>}
            </fieldset>

            <fieldset className={styles.fieldset}>
              <label>
                Department <span className={styles.required}>*</span>
              </label>
              <select
                name="department"
                className={styles.select}
                value={formData.department}
                onChange={handleChange}
              >
                <option value="">Select Department</option>
                {departmentOptions.map(({ value, label }) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
              {errors.department && <span className={styles.errorMsg}>{errors.department}</span>}
            </fieldset>

            <fieldset className={styles.fieldset}>
              <label>
                Email Address <span className={styles.required}> *</span>
              </label>
              <input
                type="email"
                name="email"
                className={styles.input}
                value={formData.email}
                onChange={handleChange}
                autoComplete="off"
              />
              {errors.email && <span className={styles.errorMsg}>{errors.email}</span>}
            </fieldset>

            <fieldset className={styles.fieldset}>
              <label>
                Password <span className={styles.required}>*</span>
              </label>
              <div className={styles.passwordContainer}>
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  className={styles.input}
                  value={formData.password}
                  onChange={handleChange}
                  autoComplete="new-password"
                />
                {formData.password && (
                  <span
                    className={styles.showPassword}
                    onClick={() => setShowPassword(prev => !prev)}
                  >
                    <i className={`fa-solid ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                  </span>
                )}
              </div>
              {errors.password && <span className={styles.errorMsg}>{errors.password}</span>}
            </fieldset>

            <fieldset className={styles.fieldset}>
              <label>
                Confirm Password <span className={styles.required}>*</span>
              </label>
              <div className={styles.passwordContainer}>
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  name="confirmPassword"
                  className={styles.input}
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  autoComplete="new-password"
                  autoCorrect="off"
                  spellCheck="false"
                />
                {formData.confirmPassword && (
                  <span
                    className={styles.showPassword}
                    onClick={() => setShowConfirmPassword(prev => !prev)}
                  >
                    <i className={`fa-solid ${showConfirmPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                  </span>
                )}
              </div>
              {errors.confirmPassword && (
                <span className={styles.errorMsg}>{errors.confirmPassword}</span>
              )}
            </fieldset>

            <div className={styles.checkboxWrapper}>
              <input
                type="checkbox"
                id="privacypolicy_termsandconditions"
                name="privacypolicy_termsandconditions"
                checked={agreed}
                readOnly
              />
              <label htmlFor="privacypolicy_termsandconditions" className={styles.checkboxLabel}>
                Read and agree to the{" "}
                <span
                  className={styles.link}
                  onClick={handlePolicyClick}
                  role="button"
                  tabIndex={0}
                  onKeyDown={e => { if (e.key === "Enter" || e.key === " ") handlePolicyClick(e); }}
                >
                  Privacy Policy and Terms and Conditions
                </span>
                <span className={styles.required}> *</span>
              </label>
              {errors.agreement && <span className={styles.errorMsg}>{errors.agreement}</span>}
            </div>

            <button
              type="submit"
              disabled={!agreed || isSubmitting}
              className={styles.button}
            >
              {isSubmitting ? "Creating Account..." : "Sign Up"}
            </button>

            <p className={styles.backToLogin}>
              Already have an account? <Link to="/employee">Log In</Link>
            </p>
          </form>
        </div>
      </section>

      <PrivacyPolicyModal 
        onAgree={handlePolicyAgree}
        onClose={handlePolicyClose}
        showModal={showPolicyModal}
      />
    </main>
  );
}