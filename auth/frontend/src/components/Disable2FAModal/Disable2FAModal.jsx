import { useState, useEffect } from 'react';
import { requestOtp, disable2FA } from '../../services/authService';
import { verifyPassword } from '../../services/userService';
import { Modal, Button, Input } from '../common';
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

  const footer = (
    <>
      <Button variant="secondary" onClick={onClose}>
        Cancel
      </Button>
      <Button
        onClick={handleVerifyAndDisable}
        isLoading={isLoading}
      >
        Verify & Disable
      </Button>
    </>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Disable Two-Factor Authentication"
      footer={footer}
    >
      <p className={styles.description}>
        For security purposes, please verify your identity before disabling 2FA.
      </p>

      {otpSent && (
        <div className={styles.infoMessage}>
          <p>📧 An OTP code has been sent to your email. Please check your inbox.</p>
        </div>
      )}

      <Input
        label="Password"
        type="password"
        id="verify-password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Enter your password"
        error={errors.password}
      />

      <Input
        label="OTP Code"
        type="text"
        id="verify-otp"
        value={otpCode}
        onChange={(e) => setOtpCode(e.target.value)}
        placeholder="Enter your OTP code"
        maxLength={6}
        error={errors.otp}
        hint="Enter the 6-digit code sent to your email."
      />

      {generalError && (
        <div className={styles.generalError}>{generalError}</div>
      )}

      <div className={styles.resendSection}>
        <Button
          variant="text"
          className={styles.resendBtn}
          onClick={handleRequestOtp}
          disabled={resendTimer > 0}
        >
          Didn't receive the code? Resend OTP
        </Button>
        {resendTimer > 0 && (
          <span className={styles.timer}>({resendTimer}s)</span>
        )}
      </div>
    </Modal>
  );
};

export default Disable2FAModal;
