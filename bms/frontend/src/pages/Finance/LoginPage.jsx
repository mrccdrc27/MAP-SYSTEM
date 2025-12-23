import { useState } from 'react';
import { useLocation, Link } from 'react-router-dom'; 
import { useForm } from "react-hook-form"; 
import './loginPage.css';
import backgroundImage from '../../assets/LOGO.jpg';
import { FaEye, FaEyeSlash } from 'react-icons/fa';

import { login as apiLogin } from '../../API/authAPI';
import { useAuth } from '../../context/AuthContext';

function LoginPage() {
  const { login } = useAuth(); // Getlogin function from context
  const location = useLocation(); // To get messages from other pages (like password reset)
  const [apiError, setApiError] = useState(null);
  const [isSubmitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Display success message from password reset if it exists
  const successMessage = location.state?.message;

  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
  } = useForm({ mode: "all" });

  const submission = async (data) => {
    setSubmitting(true);
    setApiError(null);

    try {
      // Call the login function from the context
      await login(data.email, data.password);
      // Navigation now handled inside the login function in AuthContext
    } catch (error) {
      const errorMessage = error.response?.data?.detail || 'Login failed. Please check your credentials.';
      setApiError(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };


  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  return (
    <>
      {apiError && <div className="error-message">{apiError}</div>}
      {successMessage && <div className="success-message">{successMessage}</div>}

      <main className="login-page">
        <section className="left-panel">
          <img
            src={backgroundImage}
            alt="login-illustration"
            className="asset-image"
          />
        </section>
        
        <section className="right-panel">
          <header className="form-header">
            <section className="logo">
              <h1 className="logo-text">BUDGET PRO</h1>
            </section>
            <p>Welcome! Please provide the credentials to log in</p>
          </header>

          <form onSubmit={handleSubmit(submission)}>
            <fieldset>
              {/* The label can say "Email / Phone Number" for clarity */}
              <label>Email / Phone Number:</label>
              {errors.email && <span>{errors.email.message}</span>}
              <input
                type="text" // Change to text to allow phone numbers
                name="email"
                placeholder="Enter your email or phone number"
                {...register("email", { // Keep using 'email' as the field name for simplicity
                  required: "This field must not be empty",
                })}
              />
            </fieldset>

            <fieldset>
              <label>Password:</label>
              {errors.password && <span>{errors.password.message}</span>}
              <div className="password-container">
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  placeholder="Enter your password"
                  {...register("password", { 
                    required: "Password must not be empty",
                  })}
                />
                <span 
                  className="password-toggle"
                  onClick={togglePasswordVisibility}
                >
                  {showPassword ? <FaEyeSlash /> : <FaEye />}
                </span>
              </div>
            </fieldset>

            <button
              type="submit"
              disabled={!isValid || isSubmitting}
              className="log-in-button"
            >
              {!isSubmitting ? "LOG IN" : "LOGGING IN..."}
            </button>
          </form>

          <Link to="/forgot-password" className="forgot-password-link">
            Forgot Password?
          </Link>
        </section>
      </main>
    </>
  );
}

export default LoginPage;