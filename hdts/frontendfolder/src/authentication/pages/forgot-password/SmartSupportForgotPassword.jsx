import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";

import Alert from "../../../shared/alert/Alert";
import LoadingButton from "../../../shared/buttons/LoadingButton";

import Logo from "../../../shared/assets/MapLogo.png";
import SmartSupportImage from "../../assets/SmartSupportImage.jpg";

import styles from "./SmartSupportForgotPassword.module.css";

const SmartSupportForgotPassword = () => {
  const navigate = useNavigate();
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isSubmitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
  } = useForm({ mode: "all" });

  const handleForgotPassword = async ({ email }) => {
    setSubmitting(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const mockUserExists = email.endsWith("@gmail.com");

      if (!mockUserExists) {
        setErrorMessage("Email not found. Please try again.");
      } else {
        setSuccessMessage("Password reset link has been sent to your email.");
        setTimeout(() => navigate("/"), 3000); // Navigate to login after 3 seconds
      }
    } catch (err) {
      console.error("Reset error:", err);
      setErrorMessage("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      setErrorMessage("");
      setSuccessMessage("");
    }, 5000);
    return () => clearTimeout(timer);
  }, [errorMessage, successMessage]);

  return (
    <>
      {errorMessage && <Alert message={errorMessage} type="danger" />}
      {successMessage && <Alert message={successMessage} type="success" />}

      <main className={styles.loginPage}>
        <section className={styles.leftPanel}>
          <img
            src={SmartSupportImage}
            alt="Reset password illustration"
            className={styles.assetImage}
          />
        </section>

        <section className={styles.rightPanel}>
          <header className={styles.formHeader}>
            <div className={styles.logo}>
              <img src={Logo} alt="SmartSupport logo" />
              <h1 className={styles.logoText}>SmartSupport</h1>
            </div>
            <h2>Reset Password</h2>
            <p>Enter your email to receive a password link</p>
          </header>

          <form onSubmit={handleSubmit(handleForgotPassword)} className={styles.form}>
            <fieldset className={styles.fieldset}>
              <label htmlFor="email">Enter:</label>
              <input
                id="email"
                type="text"
                placeholder="Enter email"
                {...register("email", {
                  required: "Please fill in the required field",
                  pattern: {
                    value: /^[a-zA-Z0-9._%+-]+@gmail\.com$/,
                    message: "Invalid email format",
                  },
                })}
              />
              {errors.email && <span className={styles.errorMsg}>{errors.email.message}</span>}
            </fieldset>

            <button type="submit" disabled={!isValid || isSubmitting} className={styles.button}>
              {isSubmitting && <LoadingButton />}
              {isSubmitting ? "Sending..." : "Submit"}
            </button>
          </form>

          <p className={styles.backToLogin}>
            <span className={styles.createAccountLink} onClick={() => navigate("/")}>
              Login
            </span>
          </p>
        </section>
      </main>
    </>
  );
};

export default SmartSupportForgotPassword;
