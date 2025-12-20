// CoordinatorAdminRejectUserModal.jsx
import { useState } from 'react';
import { FaTimesCircle } from 'react-icons/fa';
import styles from './UserActionModal.module.css';

const CoordinatorAdminRejectUserModal = ({ user, onClose }) => {
  const [isLoading, setIsLoading] = useState(false);

  const handleReject = async () => {
    try {
      setIsLoading(true);
      const { authUserService } = await import("../../../services/auth/userService");
      
      // Determine HDTS user id from the passed `user` object. The page passes
      // a normalized user which may store the original raw record in `_raw`.
      const hdtsId = user?._raw?.id || user?.companyId || user?.id || user?._raw?.user_id || user?._raw?.employee_id;
      if (!hdtsId) {
        alert('Cannot determine HDTS user id for rejection.');
        setIsLoading(false);
        return;
      }

      // Use the auth service endpoint to reject the pending HDTS user
      await authUserService.rejectHdtsUser(hdtsId);
      alert(`User ${user.firstName || ''} ${user.lastName || ''} rejected successfully.`);
      onClose(true); // pass true to trigger refresh
    } catch (err) {
      alert("Failed to reject user: " + (err?.message || err));
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.modalContent}>
      <div className={styles.headerSection}>
        <div className={`${styles.iconWrapper} ${styles.rejectIcon}`}>
          <FaTimesCircle />
        </div>
        <div className={styles.headerText}>
          <h2>Reject User</h2>
          <p>Deny account access</p>
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
          Are you sure you want to <strong>reject</strong> this user? This action cannot be undone and they will not be able to access the system.
        </p>

        <div className={styles.warning}>
          <p>⚠️ This will deny access to this user permanently.</p>
        </div>
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
          className={`${styles.button} ${styles.buttonDanger} ${isLoading ? styles.buttonDisabled : ''}`}
          onClick={handleReject}
          disabled={isLoading}
        >
          {isLoading && <span className={styles.loadingSpinner} />}
          {isLoading ? 'Rejecting...' : 'Reject User'}
        </button>
      </div>
    </div>
  );
};

export default CoordinatorAdminRejectUserModal;
