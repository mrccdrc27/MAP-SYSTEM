import { useLogin } from "../../api/useLogin";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import styles from "./login.module.css";

const verifyURL = import.meta.env.VITE_VERIFY_API;
const resetPasswordURL = import.meta.env.VITE_USER_SERVER_API;

function Login() {
  const [isLoading, setIsLoading] = useState(false);
  const [forgotMode, setForgotMode] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [resetMessage, setResetMessage] = useState(""); // Generic message for both success and error

  const navigate = useNavigate();

  const {
    email,
    setEmail,
    password,
    setPassword,
    otp,
    setOtp,
    error,
    showOTP,
    handleLogin,
    handleOTPSubmit,
    handleBackToLogin,
  } = useLogin();

  const onLoginSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await handleLogin(e);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordReset = async (e) => {
    e.preventDefault();
    setResetLoading(true);
    setResetMessage(""); // Clear previous messages
    try {
      await axios.post(`${resetPasswordURL}password/reset/`, { email });
    } catch (err) {
      // Do nothing specific for errors to avoid exposing account existence
    } finally {
      setResetMessage(
        "If an account with this email exists, reset instructions have been sent."
      );
      setResetLoading(false);
      setResetSent(true);
    }
  };

  useEffect(() => {
    const checkIfLoggedIn = async () => {
      const accessToken = localStorage.getItem("accessToken");
      if (!accessToken) return;

      try {
        const res = await axios.get(verifyURL, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        });

        if (res.data.is_staff) {
          navigate("/admin/dashboard");
        } else {
          navigate("/agent/dashboard");
        }
      } catch (err) {
        console.error(
          "JWT invalid or expired:",
          err.response?.data || err.message
        );
        localStorage.removeItem("accessToken");
        localStorage.removeItem("refreshToken");
      }
    };

    checkIfLoggedIn();
  }, [navigate]);

  return (
    <main className={styles.loginPage}>
      <section className={styles.leftPanel}>
        <div className={styles.leftImage}>
          <img
            src="./tts_bg.jpeg"
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
        ) : !showOTP ? (
          <form className={styles.lpForm} onSubmit={onLoginSubmit}>
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
              <input
                type="password"
                id="password"
                name="password"
                placeholder="Enter your password"
                className={styles.input}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                aria-label="Password"
              />
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
        ) : (
          <form className={styles.lpForm} onSubmit={handleOTPSubmit}>
            <fieldset>
              <label htmlFor="otp">Enter OTP:</label>
              <input
                type="text"
                id="otp"
                name="otp"
                placeholder="Enter the 6-digit OTP"
                className={styles.input}
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                maxLength={6}
                required
                aria-label="OTP"
              />
              <small style={{ color: "#666", fontSize: "12px" }}>
                OTP sent to {email}
              </small>
            </fieldset>

            {error && <p className={styles.error}>{error}</p>}

            <button type="submit" className={styles.logInButton}>
              Verify OTP
            </button>
            <button
              type="button"
              onClick={handleBackToLogin}
              className={styles.backButton}
            >
              Back to Login
            </button>
          </form>
        )}

        {!showOTP && !forgotMode && (
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
