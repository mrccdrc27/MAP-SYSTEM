import { useNavigate, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";

import { useAuth } from '../../../context/AuthContext';
import Alert from "../../../shared/alert/Alert";
import LoadingButton from "../../../shared/buttons/LoadingButton";

import { FaEye, FaEyeSlash } from "react-icons/fa";
import Logo from "../../../shared/assets/MapLogo.png";
import SmartSupportImage from "../../assets/SmartSupportImage.jpg";

import "./SmartSupportLogIn.css";

const SmartSupportLogIn = () => {
  const navigate = useNavigate();
  const { login, user, isAdmin, hasSystemAccess } = useAuth();
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setSubmitting] = useState(false);
  const [isShowPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
    watch,
  } = useForm({ mode: "all" });

  const password = watch("password", "");

  const location = useLocation();

  // Redirect based on role after successful login
  useEffect(() => {
    if (user && hasSystemAccess) {
      if (isAdmin) {
        navigate('/admin/dashboard');
      } else {
        navigate('/employee/home');
      }
    }
  }, [user, hasSystemAccess, isAdmin, navigate]);

  const handleLogin = async ({ email, password }) => {
    setSubmitting(true);
    setErrorMessage("");

    try {
      // Use AuthContext login (cookie-based auth via port 8003)
      const result = await login(email, password);

      if (!result.success) {
        setErrorMessage(result.error || "Invalid credentials.");
        return;
      }

      // After a successful login, AuthContext will fetch the user profile
      // (cookie-based). We simply notify the app and allow the `useEffect`
      // above to redirect based on the fetched profile.
      try {
        window.dispatchEvent(new CustomEvent('auth:login'));
        console.log('[SmartSupportLogIn] Dispatched auth:login event');
      } catch (e) {
        console.warn('[SmartSupportLogIn] Failed to dispatch auth:login', e);
      }
    } catch (err) {
      console.error("Login error:", err);
      setErrorMessage('Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    if (errorMessage) {
      const timer = setTimeout(() => setErrorMessage(""), 5000);
      return () => clearTimeout(timer);
    }
  }, [errorMessage]);

  // If user was redirected here immediately after clicking logout, show a
  // brief loading state so the UI reflects that logout happened and the app
  // is returning to the login screen.
  useEffect(() => {
    if (location?.state?.fromLogout) {
      setSubmitting(true);
      const t = setTimeout(() => setSubmitting(false), 900);
      return () => clearTimeout(t);
    }
  }, [location]);

  useEffect(() => {
    if (!password) setShowPassword(false);
  }, [password]);

  return (
    <>
      {errorMessage && <Alert message={errorMessage} type="danger" />}

      <main className="login-page">
        <section className="left-panel">
          <img src={SmartSupportImage} alt="login illustration" className="asset-image" />
        </section>

        <section className="right-panel">
          <header className="form-header">
            <div className="logo">
              <img src={Logo} alt="logo" />
              <h1 className="logo-text">SmartSupport</h1>
            </div>
            <p>Welcome! Please provide your credentials to log in.</p>
          </header>

          <form onSubmit={handleSubmit(handleLogin)}>
            <fieldset>
              <label>Email:</label>
              {errors.email && (
                <span>{errors.email.message || "Please fill in the required field."}</span>
              )}
              <input
                type="text"
                placeholder="Enter your email"
                {...register("email", {
                  required: true,
                  pattern: {
                    value: /^[a-zA-Z0-9._%+-]+@gmail\.com$/,
                    message: "Invalid email format.",
                  },
                })}
              />
            </fieldset>

            <fieldset>
              <label>Password:</label>
              {errors.password && <span>Please fill in the required field.</span>}
              <div className="password-container">
                <input
                  type={isShowPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  autoComplete="off"
                  {...register("password", { required: true })}
                />
                {password && (
                  <span
                    className="show-password"
                    onClick={() => setShowPassword((prev) => !prev)}
                  >
                    {isShowPassword ? <FaEyeSlash /> : <FaEye />}
                  </span>
                )}
              </div>
            </fieldset>

            <button type="submit" disabled={!isValid || isSubmitting}>
              {isSubmitting && <LoadingButton />}
              {isSubmitting ? "Verifying..." : "Log In"}
            </button>
          </form>

          <a onClick={() => navigate("/forgot-password")}>Forgot Password?</a>

          <p>
            Don't have an account as an Employee?{" "}
            <span className="create-account-link" onClick={() => navigate("/create-account")}>
              Create account
            </span>
          </p>
        </section>

        <div className="version-info">Version 1.0.0 &copy; 2025 SmartSupport</div>
      </main>
    </>
  );
};

export default SmartSupportLogIn;
