import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { FaEye, FaEyeSlash } from "react-icons/fa";
import Alert from "../../../shared/alert/Alert";
import LoadingButton from "../../../shared/buttons/LoadingButton";
import Logo from "../../../shared/assets/MapLogo.png";
import SmartSupportImage from "../../assets/SmartSupportImage.jpg";
import styles from "./SmartSupportResetPassword.module.css";

function removeEmojis(str) {
  return str.replace(/[\p{Emoji_Presentation}\u200d]/gu, "");
}

export default function SmartSupportResetPassword() {
  const { uidb64, token } = useParams();
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [confirmError, setConfirmError] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const getPasswordErrorMessage = (password) => {
    const requirements = [];
    if (!password || password.trim() === "") {
      return "Please fill in the required field.";
    }
    if (/[\p{Emoji_Presentation}\u200d]/u.test(password)) {
      return "Invalid character.";
    }
    if (password.length < 8) {
      requirements.push("at least 8 characters");
    }
    if (!/[A-Z]/.test(password)) {
      requirements.push("an uppercase letter");
    }
    if (!/[0-9]/.test(password)) {
      requirements.push("a number");
    }
    if (!/[!@#$%^&*(),.?":{}|<>_\\[\]\\/~`+=;'-]/.test(password)) {
      requirements.push("a special character");
    }
    if (requirements.length > 0) {
      if (requirements.length === 1) {
        return `Password must contain ${requirements[0]}.`;
      }
      const last = requirements.pop();
      return `Password must contain ${requirements.join(", ")}, and ${last}.`;
    }
    return "";
  };

  const handlePasswordChange = (value) => {
    const filtered = removeEmojis(value);
    setPassword(filtered);
    const error = getPasswordErrorMessage(filtered);
    setPasswordError(error);
    if (confirm && filtered !== confirm) {
      setConfirmError("Passwords do not match.");
    } else {
      setConfirmError("");
    }
  };

  const handleConfirmChange = (value) => {
    const filtered = removeEmojis(value);
    setConfirm(filtered);
    if (password !== filtered) {
      setConfirmError("Passwords do not match.");
    } else {
      setConfirmError("");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setSubmitting(true);

    // Validate before sending
    if (!password || !confirm || passwordError || confirmError) {
      setError("Please fix the errors above.");
      setSubmitting(false);
      return;
    }

    try {
      const response = await fetch(
        "http://localhost:8000/api/employee/reset-password/",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            uidb64,
            token,
            new_password: password,
          }),
        }
      );
      const data = await response.json();
      if (response.ok) {
        setSuccess("Password has been reset successfully!");
        setTimeout(() => navigate("/"), 2000);
      } else {
        setError(data.detail || "Failed to reset password.");
      }
    } catch (err) {
      setError("Network error. Please try again.");
    }
    setSubmitting(false);
  };

  return (
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
          <h2>Set a New Password</h2>
          <p>Enter your new password below.</p>
        </header>

        <form className={styles.form} onSubmit={handleSubmit}>
          {error && <span className={styles.errorMsg}>{error}</span>}
          {success && <span className={styles.successMsg}>{success}</span>}

          <fieldset className={styles.fieldset}>
            <label htmlFor="new-password">New Password:</label>
            <div style={{ position: "relative", width: "100%" }}>
              <input
                id="new-password"
                type={showNew ? "text" : "password"}
                placeholder="New password"
                value={password}
                onChange={e => handlePasswordChange(e.target.value)}
                style={{ width: "100%", paddingRight: "40px" }}
                onPaste={e => {
                  e.preventDefault();
                  const text = removeEmojis(e.clipboardData.getData("text"));
                  setPassword(text);
                  const error = getPasswordErrorMessage(text);
                  setPasswordError(error);
                }}
              />
              {password && (
                <span
                  style={{
                    position: "absolute",
                    right: "18px",
                    top: "50%",
                    transform: "translateY(-40%)",
                    cursor: "pointer"
                  }}
                  onClick={() => setShowNew((prev) => !prev)}
                >
                  {showNew ? <FaEyeSlash /> : <FaEye />}
                </span>
              )}
            </div>
            {passwordError && <span className={styles.errorMsg}>{passwordError}</span>}
          </fieldset>

          <fieldset className={styles.fieldset}>
            <label htmlFor="confirm-password">Confirm Password:</label>
            <div style={{ position: "relative", width: "100%" }}>
              <input
                id="confirm-password"
                type={showConfirm ? "text" : "password"}
                placeholder="Confirm new password"
                value={confirm}
                onChange={e => handleConfirmChange(e.target.value)}
                style={{ width: "100%", paddingRight: "40px" }}
                onPaste={e => e.preventDefault()} // Prevent pasting anything
              />
              {confirm && (
                <span
                  style={{
                    position: "absolute",
                    right: "18px",
                    top: "50%",
                    transform: "translateY(-40%)",
                    cursor: "pointer"
                  }}
                  onClick={() => setShowConfirm((prev) => !prev)}
                >
                  {showConfirm ? <FaEyeSlash /> : <FaEye />}
                </span>
              )}
            </div>
            {confirmError && <span className={styles.errorMsg}>{confirmError}</span>}
          </fieldset>

          <button
            type="submit"
            className={styles.button}
            disabled={
              submitting ||
              !password ||
              !confirm ||
              !!passwordError ||
              !!confirmError
            }
          >
            {submitting ? <LoadingButton /> : "Change Password"}
          </button>
        </form>
      </section>
    </main>
  );
}