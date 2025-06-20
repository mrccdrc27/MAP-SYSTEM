import { useNavigate } from "react-router-dom";
import styles from "./login.module.css";

function Login() {
  const navigate = useNavigate();

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

        <form className={styles.lpForm}>
          <fieldset>
            <label>Email:</label>
            <input
              type="text"
              name="email"
              placeholder="Enter your email"
              className={styles.input}
            />
          </fieldset>

          <fieldset>
            <label>Password:</label>
            <input
              type="password"
              name="password"
              placeholder="Enter your password"
              className={styles.input}
            />
          </fieldset>

          <button
            type="submit"
            className={styles.logInButton}
            onClick={() => navigate("/agent/dashboard")}
          >
            Log In
          </button>
        </form>

        <a
          onClick={() => navigate("/password-reset")}
          className={styles.forgotPassword}
        >
          Forgot Password?
        </a>
      </section>
    </main>
  );
}

export default Login;
