import { useLogin } from "../../api/useLogin";
import styles from "./login.module.css";


function Login() {
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

  return (
    <main className={styles.loginPage}>
      <section className={styles.leftPanel}>
        <div className={styles.leftImage}>
          <img
            src="./tts_bg.jpeg"
            alt="login-illustration"
            className={styles.assetImage}
          />
        </div>
      </section>

      <section className={styles.rightPanel}>
        <header className={styles.formHeader}>
          <section className={styles.logo}>
            <img src="./map-logo.png" alt="logo" />
            <h1 className={styles.logoText}>TicketFlow</h1>
          </section>
          <p>Welcome! Please provide your credentials to log in.</p>
        </header>

        {!showOTP ? (
          <form className={styles.lpForm} onSubmit={handleLogin}>
            <fieldset>
              <label>Email:</label>
              <input
                type="text"
                name="email"
                placeholder="Enter your email"
                className={styles.input}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </fieldset>

            <fieldset>
              <label>Password:</label>
              <input
                type="password"
                name="password"
                placeholder="Enter your password"
                className={styles.input}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </fieldset>

            {error && <p className={styles.error}>{error}</p>}

            <button type="submit" className={styles.logInButton}>
              Log In
            </button>
          </form>
        ) : (
          <form className={styles.lpForm} onSubmit={handleOTPSubmit}>
            <fieldset>
              <label>Enter OTP:</label>
              <input
                type="text"
                name="otp"
                placeholder="Enter the 6-digit OTP"
                className={styles.input}
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                maxLength={6}
                required
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

        {!showOTP && (
          <a
            onClick={() => handleBackToLogin()} // or navigate("/password-reset")
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
