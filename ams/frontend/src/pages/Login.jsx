import { useNavigate, useLocation } from "react-router-dom";
import "../styles/custom-colors.css";
import "../styles/Login.css";
import "../styles/LoadingButton.css";
import Alert from "../components/Alert";
import { useForm } from "react-hook-form";
import { useEffect, useState } from "react";
import { useDispatch } from "react-redux";
import { setUser } from "../features/counter/userSlice";
import { useAuth } from "../context/AuthContext";
import LoadingButton from "../components/LoadingButton";
import eyeOpen from "../assets/icons/eye-open.svg";
import eyeClose from "../assets/icons/eye-close.svg";
import Logo from "../assets/icons/Map-LogoNew.svg";
import AssetImage from "../assets/img/pageimg6.png";

function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const [errorMessage, setErrorMessage] = useState(null);
  const [isSubmitting, setSubmitting] = useState(false);
  const [isShowPassword, setShowPassword] = useState(false);

  const dispatch = useDispatch();
  const { login, isAuthenticated, getAmsRole } = useAuth();

  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
    watch,
  } = useForm({
    mode: "all",
  });

  const password = watch("password", "");

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      const from = location.state?.from?.pathname || "/dashboard";
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, navigate, location]);

  const submission = async (data) => {
    const { email, password } = data;
    setSubmitting(true);
    setErrorMessage(null);

    try {
      const result = await login({ email, password });

      if (result.success) {
        // Also update Redux store for backwards compatibility
        const user = result.user;
        if (user) {
          dispatch(
            setUser({
              firstName: user.first_name || user.full_name?.split(' ')[0] || '',
              lastName: user.last_name || user.full_name?.split(' ').slice(1).join(' ') || '',
              role: getAmsRole() || 'operator',
              loggedIn: true,
            })
          );
        }
        navigate("/dashboard");
      } else {
        setErrorMessage(result.error || "Invalid credentials.");
      }
    } catch (error) {
      console.error("Login failed:", error);
      setErrorMessage("An unexpected error occurred. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    if (errorMessage) {
      const timer = setTimeout(() => {
        setErrorMessage(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [errorMessage]);

  // Reset the value of isShowPassword state when the password input is empty.
  useEffect(() => {
    if (password.length === 0) {
      setShowPassword(false);
    }
  }, [password]);

  return (
    <>
      {errorMessage && (
        <Alert message={errorMessage} type="danger" />
      )}

      <main className="login-page">
        <section className="left-panel">
          <img
            src={AssetImage}
            alt="login-illustration"
            className="asset-image"
          />
        </section>
        <section className="right-panel">
          <header className="form-header">
            <section className="logo">
              <img src={Logo} alt="logo" />
              <h1 className="logo-text">MapAMS</h1>
            </section>
            <p>Welcome! Please provide your credentials to log in.</p>
          </header>

          <form onSubmit={handleSubmit(submission)}>
            <fieldset>
              <label>Email:</label>

              {errors.email && <span>{errors.email.message}</span>}

              <input
                type="text"
                name="email"
                placeholder="Enter your email"
                {...register("email", {
                  required: "Must not empty",
                  pattern: {
                    value: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
                    message: "Invalid email format",
                  },
                })}
              />
            </fieldset>

            <fieldset>
              <label>Password:</label>

              {errors.password && <span>{errors.password.message}</span>}

              <div className="password-container">
                <input
                  type={isShowPassword ? "text" : "password"}
                  name="password"
                  placeholder="Enter your password"
                  {...register("password", { required: "Must not empty" })}
                />

                {password.length > 0 && (
                  <img
                    src={isShowPassword ? eyeClose : eyeOpen}
                    className="show-password"
                    alt="Toggle password visibility"
                    onClick={() => setShowPassword(!isShowPassword)}
                  />
                )}
              </div>
            </fieldset>

            <button
              type="submit"
              disabled={!isValid || isSubmitting}
              className="log-in-button"
            >
              {isSubmitting && <LoadingButton />}
              {!isSubmitting ? "Log In" : "Verifying..."}
            </button>
          </form>

          <a onClick={() => navigate("/request/password_reset")}>
            Forgot Password?
          </a>
        </section>
      </main>
    </>
  );
}

export default Login;
