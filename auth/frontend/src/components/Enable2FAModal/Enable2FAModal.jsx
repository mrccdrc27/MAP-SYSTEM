import { useState, useEffect } from 'react';
import { requestOtp, enable2FA } from '../../api/auth';
import styles from './Enable2FAModal.module.css';

const Enable2FAModal = ({ isOpen, onClose, onSuccess }) => {
  const [otpCode, setOtpCode] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);

  useEffect(() => {
    if (isOpen) {
      handleRequestOtp();
    } else {
      setOtpCode('');
      setError('');
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
        setError(response.data.message || 'Failed to send OTP');
      }
    } catch (err) {
      console.error('Request OTP error:', err);
      setError('Failed to send OTP');
    }
  };

  const handleEnable = async () => {
    setError('');

    if (!otpCode) {
      setError('OTP code is required');
      return;
    }

    setIsLoading(true);

    try {
      const response = await enable2FA(otpCode);
      if (response.ok) {
        onSuccess?.();
        onClose();
      } else {
        setError(response.data.message || 'Invalid OTP code');
      }
    } catch (err) {
      console.error('Enable 2FA error:', err);
      setError('An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <div className={styles.header}>
          <h3>Enable Two-Factor Authentication</h3>
          <button type="button" className={styles.closeBtn} onClick={onClose}>
            &times;
          </button>
        </div>

        <div className={styles.body}>
          <p className={styles.description}>
            Two-factor authentication adds an extra layer of security to your account.
            Each time you log in, you'll need to enter a code sent to your email.
          </p>

          {otpSent && (
            <div className={styles.infoMessage}>
              <p>📧 A verification code has been sent to your email. Please check your inbox.</p>
            </div>
          )}

          <div className={styles.formGroup}>
            <label htmlFor="enable-otp">Verification Code</label>
            <input
              type="text"
              id="enable-otp"
              value={otpCode}
              onChange={(e) => setOtpCode(e.target.value)}
              placeholder="Enter the 6-digit code"
              maxLength={6}
            />
            {error && <small className={styles.error}>{error}</small>}
          </div>

          <div className={styles.resendSection}>
            <button
              type="button"
              className={styles.resendBtn}
              onClick={handleRequestOtp}
              disabled={resendTimer > 0}
            >
              Didn't receive the code? Resend
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
            className={styles.enableBtn}
            onClick={handleEnable}
            disabled={isLoading}
          >
            {isLoading ? 'Enabling...' : 'Enable 2FA'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Enable2FAModal;
