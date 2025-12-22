import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import axios from "axios";
import styles from "./login.module.css";

const resetPasswordURL = import.meta.env.VITE_AUTH_URL || "/api/v1";

// Create auth request instance for password reset
const createAuthRequest = () => {
  return axios.create({
    baseURL: resetPasswordURL,
    headers: {
      "Content-Type": "application/json",
    },
    withCredentials: true,
  });
};

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [forgotMode, setForgotMode] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [resetMessage, setResetMessage] = useState("");

  const { login, user, isAdmin, hasTtsAccess } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // console.log("AUTH USER:", user);

  // Check if user is already logged in and redirect accordingly
  useEffect(() => {
    if (user) {
      // IMPORTANT: wait until profile fields exist
      if (!user.first_name && !user.username) return;
      
      // Get redirect destination from location state or default based on role
      const from = location.state?.from?.pathname;

      if (from) {
        // Redirect to original destination if available
        navigate(from, { replace: true });
      } else if (isAdmin()) {
        // Redirect to admin dashboard if user has admin role
        navigate("/dashboard", { replace: true });
      } else if (hasTtsAccess()) {
        // Redirect to agent dashboard if user has TTS access
        navigate("/dashboard", { replace: true });
      } else {
        // Redirect to unauthorized page if user doesn't have appropriate role
        navigate("/unauthorized", { replace: true });
      }
    }
  }, [user, isAdmin, hasTtsAccess, navigate, location.state?.from?.pathname]);

  // Handle login form submission
  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const result = await login({ email, password });

      if (!result.success) {
        setError(
          result.error || "Login failed. Please check your credentials."
        );
      }
    } catch (err) {
      setError("An unexpected error occurred. Please try again.");
      console.error("Login error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle password reset request
  const handlePasswordReset = async (e) => {
    e.preventDefault();
    setResetLoading(true);
    setResetMessage("");

    try {
      // Use the local auth request instance for password reset
      const authRequest = createAuthRequest();
      await authRequest.post(`${resetPasswordURL}/password/reset/`, { email });
      setResetMessage(
        "If an account with this email exists, reset instructions have been sent."
      );
      setResetSent(true);
    } catch (err) {
      // Security best practice: don't expose if account exists or not
      setResetMessage(
        "If an account with this email exists, reset instructions have been sent."
      );
      setResetSent(true);
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <main className={styles.loginPage}>
      <section className={styles.leftPanel}>
        <div className={styles.leftImage}>
          <img
            src="./TTS_MAP_BG.png"
            alt="Login illustration"
            className={styles.assetImage}
          />
        </div>
      </section>

      <section className={styles.rightPanel}>
        <header className={styles.formHeader}>
          <section className={styles.logo}>
            <img src="./map-logo.png" alt="TicketFlow logo" />
            <h1 className={styles.logoText}>TicketFlow</h1>
          </section>
          <p>Welcome! Please provide your credentials to log in.</p>
        </header>

        {forgotMode ? (
          <form className={styles.lpForm} onSubmit={handlePasswordReset}>
            <fieldset>
              <label htmlFor="reset-email">Email:</label>
              <input
                type="email"
                id="reset-email"
                name="reset-email"
                placeholder="Enter your email"
                className={styles.input}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                aria-label="Reset Email"
              />
            </fieldset>

            {resetMessage && <p className={styles.info}>{resetMessage}</p>}

            <button
              type="submit"
              className={styles.logInButton}
              disabled={resetLoading}
            >
              {resetLoading ? (
                <>
                  <span className={styles.spinner}></span>
                  Sending...
                </>
              ) : (
                "Send Reset Link"
              )}
            </button>
            <button
              type="button"
              onClick={() => {
                setForgotMode(false);
                setResetMessage("");
                setResetSent(false);
              }}
              className={styles.backButton}
            >
              Back to Login
            </button>
          </form>
        ) : (
          <form className={styles.lpForm} onSubmit={handleLoginSubmit}>
            <fieldset>
              <label htmlFor="email">Email:</label>
              <input
                type="text"
                id="email"
                name="email"
                placeholder="Enter your email"
                className={styles.input}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                aria-label="Email"
              />
            </fieldset>

            <fieldset>
              <label htmlFor="password">Password:</label>
              <div className={styles.passwordContainer}>
                <input
                  type={showPassword ? "text" : "password"}
                  id="password"
                  name="password"
                  placeholder="Enter your password"
                  className={styles.input}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  aria-label="Password"
                />
                <span
                  className={styles.showPassword}
                  onClick={() => setShowPassword(!showPassword)}
                  title={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <div>
                      <i className="fa-solid fa-eye-slash"></i>
                    </div>
                  ) : (
                    <div>
                      <i className="fa-solid fa-eye"></i>
                    </div>
                  )}
                </span>
              </div>
            </fieldset>

            {error && <p className={styles.error}>{error}</p>}

            <button
              type="submit"
              className={styles.logInButton}
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <span className={styles.spinner}></span>
                  Logging in...
                </>
              ) : (
                "Log In"
              )}
            </button>
          </form>
        )}

        {!forgotMode && (
          <a
            onClick={() => setForgotMode(true)}
            className={styles.forgotPassword}
          >
            Forgot Password?
          </a>
        )}
      </section>
    </main>
  );
}

export default Login;
