// CoordinatorAdminApproveUserModal.jsx
import { useState } from 'react';
import { FaCheckCircle } from 'react-icons/fa';
import styles from './UserActionModal.module.css';

const CoordinatorAdminApproveUserModal = ({ user, onClose }) => {
  const [isLoading, setIsLoading] = useState(false);

  const handleApprove = async () => {
    try {
      setIsLoading(true);
      const { authUserService } = await import("../../../services/auth/userService");
      
      // Determine HDTS user id from the passed `user` object. The page passes
      // a normalized user which may store the original raw record in `_raw`.
      const hdtsId = user?._raw?.id || user?.companyId || user?.id || user?._raw?.user_id || user?._raw?.employee_id;
      if (!hdtsId) {
        alert('Cannot determine HDTS user id for approval.');
        setIsLoading(false);
        return;
      }

      // Use the auth service endpoint to approve the pending HDTS user
      await authUserService.approveHdtsUser(hdtsId);
      alert(`User ${user.firstName || ''} ${user.lastName || ''} approved successfully.`);
      onClose(true); // pass true to trigger refresh
    } catch (err) {
      alert("Failed to approve user: " + (err?.message || err));
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.modalContent}>
      <div className={styles.headerSection}>
        <div className={`${styles.iconWrapper} ${styles.approveIcon}`}>
          <FaCheckCircle />
        </div>
        <div className={styles.headerText}>
          <h2>Approve User</h2>
          <p>Grant account access</p>
        </div>
      </div>

      <div className={styles.bodySection}>
        <div className={styles.userInfo}>
          <h3>User Information</h3>
          <div className={styles.userDetails}>
            <div className={styles.userDetail}>
              <span className={styles.detailLabel}>Name:</span>
              <span className={styles.detailValue}>{user.firstName} {user.lastName}</span>
            </div>
            <div className={styles.userDetail}>
              <span className={styles.detailLabel}>Company ID:</span>
              <span className={styles.detailValue}>{user.companyId || '—'}</span>
            </div>
            <div className={styles.userDetail}>
              <span className={styles.detailLabel}>Department:</span>
              <span className={styles.detailValue}>{user.department || '—'}</span>
            </div>
            {user.status && (
              <div className={styles.userDetail}>
                <span className={styles.detailLabel}>Current Status:</span>
                <span className={styles.detailValue}>{user.status}</span>
              </div>
            )}
          </div>
        </div>

        <p className={styles.message}>
          Are you sure you want to <strong>approve</strong> this user? They will be granted access to the system.
        </p>
      </div>

      <div className={styles.footerSection}>
        <button 
          className={styles.button}
          onClick={onClose}
          disabled={isLoading}
        >
          Cancel
        </button>
        <button 
          className={`${styles.button} ${styles.buttonPrimary} ${isLoading ? styles.buttonDisabled : ''}`}
          onClick={handleApprove}
          disabled={isLoading}
        >
          {isLoading && <span className={styles.loadingSpinner} />}
          {isLoading ? 'Approving...' : 'Approve User'}
        </button>
      </div>
    </div>
  );
};

export default CoordinatorAdminApproveUserModal;
