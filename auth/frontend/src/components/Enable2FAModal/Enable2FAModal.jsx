import { useState, useEffect } from 'react';
import { requestOtp, enable2FA } from '../../services/authService';
import { Modal, Button, Input } from '../common';
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

  const footer = (
    <>
      <Button variant="secondary" onClick={onClose}>
        Cancel
      </Button>
      <Button
        onClick={handleEnable}
        isLoading={isLoading}
      >
        Enable 2FA
      </Button>
    </>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Enable Two-Factor Authentication"
      footer={footer}
    >
      <p className={styles.description}>
        Two-factor authentication adds an extra layer of security to your account.
        Each time you log in, you'll need to enter a code sent to your email.
      </p>

      {otpSent && (
        <div className={styles.infoMessage}>
          <p>📧 A verification code has been sent to your email. Please check your inbox.</p>
        </div>
      )}

      <Input
        label="Verification Code"
        type="text"
        id="enable-otp"
        value={otpCode}
        onChange={(e) => setOtpCode(e.target.value)}
        placeholder="Enter the 6-digit code"
        maxLength={6}
        error={error}
      />

      <div className={styles.resendSection}>
        <Button
          variant="text"
          className={styles.resendBtn}
          onClick={handleRequestOtp}
          disabled={resendTimer > 0}
        >
          Didn't receive the code? Resend
        </Button>
        {resendTimer > 0 && (
          <span className={styles.timer}>({resendTimer}s)</span>
        )}
      </div>
    </Modal>
  );
};

export default Enable2FAModal;
