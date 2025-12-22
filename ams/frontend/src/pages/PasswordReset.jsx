import "../styles/custom-colors.css";
import "../styles/Login.css";
import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useForm, Controller } from "react-hook-form";
import loginImage from "../assets/img/login.png";
import Alert from "../components/Alert.jsx";
import AxiosInstance from "../components/AxiosInstance.jsx";

function PasswordReset() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const {
    control,
    handleSubmit,
    watch,
    getValues,
    formState: { errors },
  } = useForm();

  const password = watch("password", "");

  const passwordRequirements = [
    {
      test: password.length >= 8,
      message: "Password must be at least 8 characters long",
    },
    {
      test: /[a-z]/.test(password),
      message: "Password must contain at least one lowercase letter",
    },
    {
      test: /[A-Z]/.test(password),
      message: "Password must contain at least one uppercase letter",
    },
    {
      test: /[!@#$%^&*(),.?":{}|<>]/.test(password),
      message: "Password must contain at least one special character",
    },
  ];

  const submitNewPassword = async (data) => {
    if (data.password !== data.confirmPassword) {
      setErrorMessage("Passwords do not match!");
      return;
    }

    try {
      const response = await AxiosInstance.post("api/password_reset/confirm/", {
        password: data.confirmPassword,
        token: token,
      });

      setSuccessMessage("Password reset was successful! You can now log in to your account with your new password.");
      setErrorMessage("");

      setTimeout(() => navigate("/login"), 3000);
    } catch (error) {
      console.error("Error response:", error.response?.data || error);
      setErrorMessage("Failed to reset password. Please try again.");
      setSuccessMessage("");

      setTimeout(() => {
        setErrorMessage("");
        setSuccessMessage("");
      }, 3000);
    }
  };

  return (
    <main className="login-page">
      <section className="left-panel">
        <img src={loginImage} alt="login-illustration" />
      </section>

      <section className="right-panel">
        <h2>Set New Password</h2>

        {errorMessage && <Alert message={errorMessage} type="danger" />}
        {successMessage && <Alert message={successMessage} type="success" />}

        <form onSubmit={handleSubmit(submitNewPassword)}>
          <fieldset>
            <label>Password:</label>
            <Controller
              name="password"
              control={control}
              rules={{ required: "Password is required" }}
              render={({ field }) => (
                <input
                  type="password"
                  placeholder="Enter your password"
                  {...field}
                />
              )}
            />
            {errors.password && <span className="error-msg">{errors.password.message}</span>}
            {password && (
              <div className="password-requirements">
                {passwordRequirements.map((req, index) =>
                  !req.test ? (
                    <div key={index} className="error-msg">{req.message}</div>
                  ) : null
                )}
              </div>
            )}
          </fieldset>

          <fieldset>
            <label>Confirm Password:</label>
            <Controller
              name="confirmPassword"
              control={control}
              rules={{
                required: "Please confirm your password",
                validate: value => value === getValues("password") || "Passwords do not match",
              }}
              render={({ field }) => (
                <input
                  type="password"
                  placeholder="Confirm your password"
                  {...field}
                />
              )}
            />
            {errors.confirmPassword && (
              <span className="error-msg">{errors.confirmPassword.message}</span>
            )}
          </fieldset>

          <button type="submit">Reset Password</button>
        </form>
        <a onClick={() => navigate("/login")}>Login</a>
      </section>
    </main>
  );
}

export default PasswordReset;
