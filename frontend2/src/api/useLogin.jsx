import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

const ticketURL = import.meta.env.VITE_LOGIN_API;
const verifyOTPURL = import.meta.env.VITE_VERIFY_OTP_API;

export function useLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [error, setError] = useState(null);
  const [showOTP, setShowOTP] = useState(false);
  const [tempToken, setTempToken] = useState("");
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post(ticketURL, { email, password });
      if (response.data.temp_token) {
        setTempToken(response.data.temp_token);
        localStorage.setItem("tempToken", response.data.temp_token);
        setShowOTP(true);
        setError(null);
      } else {
        localStorage.setItem("accessToken", response.data.tokens.access);
        localStorage.setItem("refreshToken", response.data.tokens.refresh);
        if (response.data.is_staff) {
          navigate("/admin");
        } else {
          navigate("/agent/dashboard");
        }
      }
    } catch (err) {
      setError("Invalid email or password.");
      console.error(err);
    }
  };

  const handleOTPSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post(verifyOTPURL, {
        temp_token: tempToken,
        otp,
      });
      console.timeEnd("OTPSubmit");
      localStorage.setItem("accessToken", response.data.access);
      localStorage.setItem("refreshToken", response.data.refresh);
      localStorage.removeItem("tempToken");

      if (response.data.is_staff) {
        navigate("/admin");
      } else {
        navigate("/agent/dashboard");
        console.timeEnd("OTPSubmit");
      }
    } catch (err) {
      setError("Invalid or expired OTP.");
      console.error(err);
    }
  };

  const handleBackToLogin = () => {
    setShowOTP(false);
    setOtp("");
    setTempToken("");
    setError(null);
    localStorage.removeItem("tempToken");
  };

  return {
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
  };
}
