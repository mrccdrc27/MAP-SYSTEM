import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { changePassword, getProfile, verifyPassword } from '../../../services/userService';
import { useToast, Button, Input, Card, Badge, Modal, Alert } from '../../../components/common';
import Enable2FAModal from '../../../components/Enable2FAModal';
import Disable2FAModal from '../../../components/Disable2FAModal';
import styles from './ChangePassword.module.css';

// Password strength calculation
const calculatePasswordStrength = (password) => {
  if (!password) return { score: 0, label: '', color: '' };
  
  let score = 0;
  const checks = {
    length: password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    number: /[0-9]/.test(password),
    special: /[!@#$%^&*(),.?":{}|<>`~\-_=\\/;\'\[\]]/.test(password),
    longLength: password.length >= 12,
    veryLongLength: password.length >= 16,
  };

  if (checks.length) score += 1;
  if (checks.uppercase) score += 1;
  if (checks.lowercase) score += 1;
  if (checks.number) score += 1;
  if (checks.special) score += 1;
  if (checks.longLength) score += 1;
  if (checks.veryLongLength) score += 1;

  // Determine strength level
  if (score <= 2) return { score, label: 'Weak', color: '#dc2626', checks };
  if (score <= 4) return { score, label: 'Fair', color: '#f59e0b', checks };
  if (score <= 5) return { score, label: 'Good', color: '#10b981', checks };
  return { score, label: 'Strong', color: '#059669', checks };
};

// Get detailed password error message
const getPasswordErrorMessage = (password) => {
  if (!password || password.trim() === "") {
    return "Password must be at least 8 characters long and include uppercase, number, and special character.";
  }
  
  const hasMinLength = password.length >= 8;
  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasDigit = /[0-9]/.test(password);
  const hasSpecial = /[!@#$%^&*(),.?":{}|<>`~\-_=\\/;\'\[\]]/.test(password);

  const missing = {
    upper: !hasUpper,
    lower: !hasLower,
    digit: !hasDigit,
    special: !hasSpecial,
  };

  const missingKeys = Object.entries(missing)
    .filter(([_, isMissing]) => isMissing)
    .map(([key]) => key);

  const descriptors = {
    upper: "uppercase",
    lower: "lowercase",
    digit: "number",
    special: "special character",
  };

  const buildList = (items) => {
    if (items.length === 1) return descriptors[items[0]];
    if (items.length === 2) return `${descriptors[items[0]]} and ${descriptors[items[1]]}`;
    return items.slice(0, -1).map((key) => descriptors[key]).join(", ") + ", and " + descriptors[items[items.length - 1]];
  };

  if (!hasMinLength && missingKeys.length) {
    return `Password must be at least 8 characters long and include ${buildList(missingKeys)}.`;
  } else if (!hasMinLength) {
    return "Password must be at least 8 characters long.";
  } else if (missingKeys.length) {
    return `Password must include ${buildList(missingKeys)}.`;
  }

  return null;
};

const AccountSecurity = () => {
  const navigate = useNavigate();
  const { ToastContainer, success, error } = useToast();

  const [showPasswords, setShowPasswords] = useState({ current: false, new: false, confirm: false });
  const [generalError, setGeneralError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [profileData, setProfileData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showEnable2FA, setShowEnable2FA] = useState(false);
  const [showDisable2FA, setShowDisable2FA] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);

  // Password change state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isPasswordVerified, setIsPasswordVerified] = useState(false);
  const [verifyingPassword, setVerifyingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const verifyTimerRef = useRef(null);

  useEffect(() => {
    fetchProfile();
    return () => {
      if (verifyTimerRef.current) clearTimeout(verifyTimerRef.current);
    };
  }, []);

  const fetchProfile = async () => {
    setIsLoading(true);
    try {
      const response = await getProfile();
      if (response.ok) setProfileData(response.data);
    } catch (err) {
      error('Error', 'Failed to load security settings');
    } finally {
      setIsLoading(false);
    }
  };

  // Verify current password with backend (debounced)
  const verifyCurrentPassword = (pwd) => {
    if (verifyTimerRef.current) clearTimeout(verifyTimerRef.current);
    
    setIsPasswordVerified(false);
    setPasswordError('');
    
    if (!pwd || pwd.length === 0) {
      setVerifyingPassword(false);
      return;
    }
    
    setVerifyingPassword(true);
    
    verifyTimerRef.current = setTimeout(async () => {
      try {
        const result = await verifyPassword(pwd);
        if (result.ok) {
          setIsPasswordVerified(true);
          setPasswordError('');
        } else {
          setIsPasswordVerified(false);
          setPasswordError('Incorrect current password.');
        }
      } catch (err) {
        setIsPasswordVerified(false);
        setPasswordError('Incorrect current password.');
      } finally {
        setVerifyingPassword(false);
      }
    }, 600);
  };

  const handleCurrentPasswordChange = (e) => {
    const v = e.target.value;
    setCurrentPassword(v);
    setNewPassword('');
    setConfirmPassword('');
    setIsPasswordVerified(false);
    setPasswordError('');
    setVerifyingPassword(true);
    verifyCurrentPassword(v);
  };

  const canSaveNewPassword = () => {
    const pwError = getPasswordErrorMessage(newPassword);
    return isPasswordVerified && 
           newPassword.length >= 8 && 
           newPassword === confirmPassword && 
           !verifyingPassword &&
           !pwError;
  };

  const handleClearPasswords = () => {
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setIsPasswordVerified(false);
    setPasswordError('');
    setGeneralError('');
  };

  const handleSaveNewPassword = async () => {
    if (!canSaveNewPassword()) return;
    
    setIsSubmitting(true);
    setGeneralError('');
    
    try {
      const response = await changePassword(currentPassword, newPassword, confirmPassword);
      if (response.ok) {
        setSuccessMsg('Password updated successfully');
        handleClearPasswords();
        setIsPasswordModalOpen(false);
        success('Success', 'Password changed successfully');
      } else {
        const msg = response.data?.detail || response.data?.message || 'Update failed';
        setGeneralError(msg);
      }
    } catch (err) {
      setGeneralError('Something went wrong');
      error('Error', 'Something went wrong');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCloseModal = () => {
    setIsPasswordModalOpen(false);
    handleClearPasswords();
  };

  const passwordStrength = calculatePasswordStrength(newPassword);
  const newPasswordError = newPassword.length > 0 ? getPasswordErrorMessage(newPassword) : null;

  if (isLoading) return <div className={styles.loadingOverlay}><div className={styles.loadingSpinner}></div></div>;

  return (
    <div className={`${styles.page} page-wrapper`}>
      <ToastContainer />
      <header className="page-header">
        <div className="page-title-section">
          <h1>Account Security</h1>
          <p className="page-subtitle">Manage your password, two-factor authentication, and account access.</p>
        </div>
      </header>

      <div className="page-content">
        {successMsg && (
          <Alert type="success" onClose={() => setSuccessMsg('')}>
            {successMsg}
          </Alert>
        )}

        <div className={styles.securityLayout}>
          <Card title="Account Password" flat>
            <div className={styles.securitySection}>
              <div className={styles.securityInfo}>
                <p>Ensure your account remains secure by using a strong password and updating it regularly.</p>
                <div className={styles.statusRow}>
                  <label>Security Status:</label>
                  <Badge variant="success">Secure</Badge>
                </div>
              </div>
              <div className={styles.securityAction}>
                <Button variant="primary" onClick={() => setIsPasswordModalOpen(true)} icon={<i className="fa-solid fa-key"></i>}>
                  Update Password
                </Button>
              </div>
            </div>
          </Card>

          <Card title="Two-Factor Authentication (2FA)" flat>
            <div className={styles.securitySection}>
              <div className={styles.securityInfo}>
                <p>2FA adds an extra layer of protection by requiring a code from your email in addition to your password.</p>
                <div className={styles.statusRow}>
                  <label>Status:</label>
                  <Badge variant={profileData?.otp_enabled ? 'success' : 'secondary'}>
                    {profileData?.otp_enabled ? 'Active' : 'Disabled'}
                  </Badge>
                </div>
              </div>
              <div className={styles.securityAction}>
                {profileData?.otp_enabled ? (
                  <Button variant="danger" onClick={() => setShowDisable2FA(true)}>Disable 2FA</Button>
                ) : (
                  <Button onClick={() => setShowEnable2FA(true)}>Enable 2FA</Button>
                )}
              </div>
            </div>
          </Card>

          <Card title="Account Status" flat>
            <div className={styles.statusGrid}>
              <div className={styles.statusItem}>
                <label>Account State</label>
                {(() => {
                  // Treat employee `status === 'Approved'` as active when `is_active` is missing
                  const isActive = !!profileData?.is_active || profileData?.status === 'Approved';
                  return (
                    <Badge variant={isActive ? 'success' : 'danger'}>
                      {isActive ? 'Active' : 'Deactivated'}
                    </Badge>
                  );
                })()}
              </div>
              <div className={styles.statusItem}>
                <label>Verification</label>
                <Badge variant={profileData?.status === 'Approved' ? 'success' : 'warning'}>
                  {profileData?.status || 'Pending'}
                </Badge>
              </div>
              <div className={styles.statusItem}>
                <label>Access Level</label>
                <div className={styles.badgeList}>
                  {profileData?.is_superuser && <Badge variant="danger">Superuser</Badge>}
                  {profileData?.is_staff && <Badge variant="info">Staff</Badge>}
                  {!profileData?.is_superuser && !profileData?.is_staff && <Badge variant="primary">Standard User</Badge>}
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>

      <Modal 
        isOpen={isPasswordModalOpen} 
        onClose={handleCloseModal}
        title="Update Account Password"
        footer={
          <>
            <Button variant="secondary" onClick={handleCloseModal}>
              Cancel
            </Button>
            <Button onClick={handleSaveNewPassword} isLoading={isSubmitting} disabled={!canSaveNewPassword()}>
              Save New Password
            </Button>
          </>
        }
      >
        <div className={styles.modalInfo}>
          <i className="fa-solid fa-circle-info"></i>
          <p>Enter your current password first. Once verified, you can set a new secure password.</p>
        </div>

        {generalError && (
          <Alert type="error" onClose={() => setGeneralError('')}>
            {generalError}
          </Alert>
        )}

        <div className={styles.modalFormGrid}>
          {/* Current Password with verification indicator */}
          <div className={styles.passwordFieldWrapper}>
            <Input 
              label={
                <span className={styles.passwordLabel}>
                  Current Password <span style={{ color: '#dc2626' }}>*</span>
                  <span className={styles.verificationIndicator}>
                    {verifyingPassword && <i className="fa-solid fa-spinner fa-spin" style={{ color: '#6b7280' }}></i>}
                    {!verifyingPassword && isPasswordVerified && <i className="fa-solid fa-check-circle" style={{ color: '#10b981' }}></i>}
                    {!verifyingPassword && passwordError && <i className="fa-solid fa-times-circle" style={{ color: '#dc2626' }}></i>}
                  </span>
                </span>
              }
              type={showPasswords.current ? 'text' : 'password'} 
              name="currentPassword" 
              value={currentPassword} 
              onChange={handleCurrentPasswordChange}
              error={passwordError}
              icon={currentPassword ? <i className={`fa-solid ${showPasswords.current ? 'fa-eye-slash' : 'fa-eye'}`}></i> : null} 
              onIconClick={() => setShowPasswords(p => ({ ...p, current: !p.current }))} 
              placeholder="Enter your current password"
              autoComplete="off"
            />
          </div>

          {/* New Password with strength indicator */}
          <div className={styles.passwordFieldWrapper}>
            <Input 
              label="New Password" 
              type={showPasswords.new ? 'text' : 'password'} 
              name="newPassword" 
              value={newPassword} 
              onChange={(e) => setNewPassword(e.target.value)}
              disabled={!isPasswordVerified || verifyingPassword}
              icon={newPassword ? <i className={`fa-solid ${showPasswords.new ? 'fa-eye-slash' : 'fa-eye'}`}></i> : null} 
              onIconClick={() => setShowPasswords(p => ({ ...p, new: !p.new }))} 
              required 
              placeholder={isPasswordVerified ? "Enter new password" : "Verify current password first"}
              autoComplete="off"
            />
            
            {/* Password Strength Indicator */}
            {newPassword.length > 0 && (
              <div className={styles.strengthIndicator}>
                <div className={styles.strengthBar}>
                  <div 
                    className={styles.strengthFill} 
                    style={{ 
                      width: `${(passwordStrength.score / 7) * 100}%`,
                      backgroundColor: passwordStrength.color 
                    }}
                  />
                </div>
                <span className={styles.strengthLabel} style={{ color: passwordStrength.color }}>
                  {passwordStrength.label}
                </span>
              </div>
            )}
            
            {/* Password requirements checklist */}
            {newPassword.length > 0 && (
              <div className={styles.requirementsList}>
                <div className={`${styles.requirement} ${passwordStrength.checks?.length ? styles.met : styles.unmet}`}>
                  <i className={`fa-solid ${passwordStrength.checks?.length ? 'fa-check' : 'fa-times'}`}></i>
                  <span>At least 8 characters</span>
                </div>
                <div className={`${styles.requirement} ${passwordStrength.checks?.uppercase ? styles.met : styles.unmet}`}>
                  <i className={`fa-solid ${passwordStrength.checks?.uppercase ? 'fa-check' : 'fa-times'}`}></i>
                  <span>Uppercase letter</span>
                </div>
                <div className={`${styles.requirement} ${passwordStrength.checks?.lowercase ? styles.met : styles.unmet}`}>
                  <i className={`fa-solid ${passwordStrength.checks?.lowercase ? 'fa-check' : 'fa-times'}`}></i>
                  <span>Lowercase letter</span>
                </div>
                <div className={`${styles.requirement} ${passwordStrength.checks?.number ? styles.met : styles.unmet}`}>
                  <i className={`fa-solid ${passwordStrength.checks?.number ? 'fa-check' : 'fa-times'}`}></i>
                  <span>Number</span>
                </div>
                <div className={`${styles.requirement} ${passwordStrength.checks?.special ? styles.met : styles.unmet}`}>
                  <i className={`fa-solid ${passwordStrength.checks?.special ? 'fa-check' : 'fa-times'}`}></i>
                  <span>Special character</span>
                </div>
              </div>
            )}
          </div>

          {/* Confirm Password */}
          <div className={styles.passwordFieldWrapper}>
            <Input 
              label="Confirm New Password" 
              type={showPasswords.confirm ? 'text' : 'password'} 
              name="confirmPassword" 
              value={confirmPassword} 
              onChange={(e) => setConfirmPassword(e.target.value)}
              disabled={!isPasswordVerified || verifyingPassword}
              error={confirmPassword && confirmPassword !== newPassword ? 'Passwords do not match.' : ''}
              icon={confirmPassword ? <i className={`fa-solid ${showPasswords.confirm ? 'fa-eye-slash' : 'fa-eye'}`}></i> : null} 
              onIconClick={() => setShowPasswords(p => ({ ...p, confirm: !p.confirm }))} 
              required 
              placeholder={isPasswordVerified ? "Confirm new password" : ""}
              autoComplete="off"
            />
          </div>
        </div>
      </Modal>

      <Enable2FAModal isOpen={showEnable2FA} onClose={() => setShowEnable2FA(false)} onSuccess={() => { setProfileData(p => ({ ...p, otp_enabled: true })); setSuccessMsg('Two-factor authentication has been enabled!'); }} />
      <Disable2FAModal isOpen={showDisable2FA} onClose={() => setShowDisable2FA(false)} onSuccess={() => { setProfileData(p => ({ ...p, otp_enabled: false })); setSuccessMsg('Two-factor authentication has been disabled.'); }} />
    </div>
  );
};

export default AccountSecurity;
