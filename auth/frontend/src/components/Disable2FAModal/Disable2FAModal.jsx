import { useState, useEffect } from 'react';
import { verifyPassword, requestOtp, disable2FA } from '../../api/auth';
import styles from './Disable2FAModal.module.css';

const Disable2FAModal = ({ isOpen, onClose, onSuccess }) => {
  const [password, setPassword] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [errors, setErrors] = useState({});
  const [generalError, setGeneralError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);

  useEffect(() => {
    if (isOpen) {
      // Request OTP when modal opens
      handleRequestOtp();
    } else {
      // Reset state when modal closes
      setPassword('');
      setOtpCode('');
      setErrors({});
      setGeneralError('');
      setOtpSent(false);
      setResendTimer(0);
    }
  }, [isOpen]);

  useEffect(() => {
    let interval;
    if (resendTimer > 0) {
      interval = setInterval(() => {
        setResendTimer(prev => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [resendTimer]);

  const handleRequestOtp = async () => {
    try {
      const response = await requestOtp();
      if (response.ok) {
        setOtpSent(true);
        setResendTimer(60);
      } else {
        setGeneralError(response.data.message || 'Failed to send OTP');
      }
    } catch (err) {
      console.error('Request OTP error:', err);
      setGeneralError('Failed to send OTP');
    }
  };

  const handleVerifyAndDisable = async () => {
    setErrors({});
    setGeneralError('');

    if (!password) {
      setErrors(prev => ({ ...prev, password: 'Password is required' }));
      return;
    }
    if (!otpCode) {
      setErrors(prev => ({ ...prev, otp: 'OTP code is required' }));
      return;
    }

    setIsLoading(true);

    try {
      // First verify password
      const passwordResponse = await verifyPassword(password);
      if (!passwordResponse.ok) {
        setErrors(prev => ({ ...prev, password: 'Incorrect password' }));
        setIsLoading(false);
        return;
      }

      // Then disable 2FA with OTP
      const disableResponse = await disable2FA(otpCode);
      if (disableResponse.ok) {
        onSuccess?.();
        onClose();
      } else {
        setErrors(prev => ({ ...prev, otp: disableResponse.data.message || 'Invalid OTP code' }));
      }
    } catch (err) {
      console.error('Disable 2FA error:', err);
      setGeneralError('An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <div className={styles.header}>
          <h3>Disable Two-Factor Authentication</h3>
          <button type="button" className={styles.closeBtn} onClick={onClose}>
            &times;
          </button>
        </div>

        <div className={styles.body}>
          <p className={styles.description}>
            For security purposes, please verify your identity before disabling 2FA.
          </p>

          {otpSent && (
            <div className={styles.infoMessage}>
              <p>📧 An OTP code has been sent to your email. Please check your inbox.</p>
            </div>
          )}

          <div className={styles.formGroup}>
            <label htmlFor="verify-password">Password</label>
            <input
              type="password"
              id="verify-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
            />
            {errors.password && <small className={styles.error}>{errors.password}</small>}
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="verify-otp">OTP Code</label>
            <input
              type="text"
              id="verify-otp"
              value={otpCode}
              onChange={(e) => setOtpCode(e.target.value)}
              placeholder="Enter your OTP code"
              maxLength={6}
            />
            {errors.otp && <small className={styles.error}>{errors.otp}</small>}
            <small className={styles.hint}>Enter the 6-digit code sent to your email.</small>
          </div>

          {generalError && (
            <div className={styles.generalError}>{generalError}</div>
          )}

          <div className={styles.resendSection}>
            <button
              type="button"
              className={styles.resendBtn}
              onClick={handleRequestOtp}
              disabled={resendTimer > 0}
            >
              Didn't receive the code? Resend OTP
            </button>
            {resendTimer > 0 && (
              <span className={styles.timer}>({resendTimer}s)</span>
            )}
          </div>
        </div>

        <div className={styles.footer}>
          <button type="button" className={styles.cancelBtn} onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className={styles.verifyBtn}
            onClick={handleVerifyAndDisable}
            disabled={isLoading}
          >
            {isLoading ? 'Verifying...' : 'Verify & Disable'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Disable2FAModal;
