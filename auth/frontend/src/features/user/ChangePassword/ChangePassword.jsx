import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { changePassword, getProfile } from '../../../services/userService';
import { useToast, Button, Input, Card, Badge, Modal, Alert } from '../../../components/common';
import Enable2FAModal from '../../../components/Enable2FAModal';
import Disable2FAModal from '../../../components/Disable2FAModal';
import useForm from '../../../hooks/useForm';
import styles from './ChangePassword.module.css';

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

  useEffect(() => {
    fetchProfile();
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

  const validate = (values) => {
    const newErrors = {};
    if (!values.currentPassword) newErrors.currentPassword = 'Required';
    if (!values.newPassword) newErrors.newPassword = 'Required';
    else if (values.newPassword.length < 8) newErrors.newPassword = 'Min 8 chars';
    if (values.newPassword !== values.confirmPassword) newErrors.confirmPassword = 'Mismatch';
    return newErrors;
  };

  const onSubmit = async (values) => {
    setGeneralError('');
    setSuccessMsg('');
    try {
      const response = await changePassword(values.currentPassword, values.newPassword, values.confirmPassword);
      if (response.ok) {
        setSuccessMsg('Password updated successfully');
        resetForm();
        setIsPasswordModalOpen(false);
      } else {
        setGeneralError(response.data?.detail || 'Update failed');
      }
    } catch (err) {
      error('Error', 'Something went wrong');
    }
  };

  const { values, errors, isSubmitting, handleChange, handleSubmit, resetForm } = useForm(
    { currentPassword: '', newPassword: '', confirmPassword: '' }, validate, onSubmit
  );

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
                <Badge variant={profileData?.is_active ? 'success' : 'danger'}>
                  {profileData?.is_active ? 'Active' : 'Deactivated'}
                </Badge>
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
        onClose={() => { setIsPasswordModalOpen(false); resetForm(); setGeneralError(''); }}
        title="Update Account Password"
        footer={
          <>
            <Button variant="secondary" onClick={() => { setIsPasswordModalOpen(false); resetForm(); setGeneralError(''); }}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} isLoading={isSubmitting}>
              Save New Password
            </Button>
          </>
        }
      >
        <div className={styles.modalInfo}>
          <i className="fa-solid fa-circle-info"></i>
          <p>Please enter your current password and choose a new secure password.</p>
        </div>

        {generalError && (
          <Alert type="error" onClose={() => setGeneralError('')}>
            {generalError}
          </Alert>
        )}

        <div className={styles.modalFormGrid}>
          <Input label="Current Password" type={showPasswords.current ? 'text' : 'password'} name="currentPassword" value={values.currentPassword} onChange={handleChange} error={errors.currentPassword} icon={values.currentPassword ? <i className={`fa-solid ${showPasswords.current ? 'fa-eye-slash' : 'fa-eye'}`}></i> : null} onIconClick={() => setShowPasswords(p => ({ ...p, current: !p.current }))} required />
          <Input label="New Password" type={showPasswords.new ? 'text' : 'password'} name="newPassword" value={values.newPassword} onChange={handleChange} error={errors.newPassword} icon={values.newPassword ? <i className={`fa-solid ${showPasswords.new ? 'fa-eye-slash' : 'fa-eye'}`}></i> : null} onIconClick={() => setShowPasswords(p => ({ ...p, new: !p.new }))} required />
          <Input label="Confirm New Password" type={showPasswords.confirm ? 'text' : 'password'} name="confirmPassword" value={values.confirmPassword} onChange={handleChange} error={errors.confirmPassword} icon={values.confirmPassword ? <i className={`fa-solid ${showPasswords.confirm ? 'fa-eye-slash' : 'fa-eye'}`}></i> : null} onIconClick={() => setShowPasswords(p => ({ ...p, confirm: !p.confirm }))} required />
        </div>
      </Modal>

      <Enable2FAModal isOpen={showEnable2FA} onClose={() => setShowEnable2FA(false)} onSuccess={() => { setProfileData(p => ({ ...p, otp_enabled: true })); setSuccessMsg('Two-factor authentication has been enabled!'); }} />
      <Disable2FAModal isOpen={showDisable2FA} onClose={() => setShowDisable2FA(false)} onSuccess={() => { setProfileData(p => ({ ...p, otp_enabled: false })); setSuccessMsg('Two-factor authentication has been disabled.'); }} />
    </div>
  );
};

export default AccountSecurity;