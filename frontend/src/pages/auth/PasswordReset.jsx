// style
import styles from "./password-reset.module.css";

export default function PasswordReset() {
  return (
    <main className={styles.passwordResetPage}>
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
          <h1>Reset Password</h1>
          <p>Enter your email to receive a password reset link.</p>
        </header>

        <form>
          <fieldset>
            <label>Email:</label>
            <input
              type="text"
              name="email"
              placeholder="Enter your email"
              className={styles.input}
            />
          </fieldset>

          <button type="submit" className={styles.logInButton}>
            Submit
          </button>
        </form>

        <a
          onClick={() => navigate("/")}
          className={styles.forgotPassword}
        >
          Login
        </a>
      </section>
    </main>
  );
}
