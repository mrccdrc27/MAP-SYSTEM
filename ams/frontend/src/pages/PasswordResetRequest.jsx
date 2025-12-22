import "../styles/custom-colors.css";
import "../styles/Login.css";
import loginImage from "../assets/img/pageimg6.png";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm, Controller } from "react-hook-form";
import AxiosInstance from "../components/AxiosInstance.jsx";
import Alert from "../components/Alert.jsx";

function PasswordResetRequest() {
  const navigate = useNavigate();
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const { control, handleSubmit, formState: { errors } } = useForm({
    defaultValues: {
      email: "",
    },
  });

  const onSubmit = async (data) => {
    try {
      const response = await AxiosInstance.post("api/password_reset/", {
        email: data.email,
      });

      console.log("Response:", response);
      console.log("Response status:", response.status);
      console.log("Response data:", response.data);

      setSuccessMessage("Password reset link has been sent. Please check your inbox.");
      setErrorMessage("");

      setTimeout(() => {
        navigate("/login")}, 3000);
    } catch (error) {
      console.error("Error response:", error.response?.data || error);
      console.log("Error status:", error.response?.status);
      console.log("Error data:", error.response?.data);

      setErrorMessage("Failed to send reset password link. Please try again.");
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
        {errorMessage && <Alert message={errorMessage} type="danger" />}
        {successMessage && <Alert message={successMessage} type="success" />}

        <div className="form-header">
          <h1>Reset Password</h1>
          <p>Enter your email to receive a password reset link.</p>
        </div>
        <form onSubmit={handleSubmit(onSubmit)}>
          <fieldset>
            <label>Email:</label>
            <Controller
              name="email"
              control={control}
              rules={{ required: "Email is required" }}
              render={({ field }) => (
                <input
                  type="email"
                  placeholder="Enter your email"
                  {...field}
                />
              )}
            />
            {errors.email && <span className="error-msg">{errors.email.message}</span>}
          </fieldset>

          <button type="submit">Submit</button>
        </form>
        <a onClick={() => navigate("/login")}>Login</a>
      </section>
    </main>
  );
}

export default PasswordResetRequest;
