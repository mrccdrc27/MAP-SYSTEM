import React, { useState } from 'react';
import { FaArchive } from 'react-icons/fa';
import ModalWrapper from '../../../shared/modals/ModalWrapper';
import styles from './SysAdminArchiveConfirmationModal.module.css';

const SysAdminArchiveConfirmationModal = ({ isOpen, title, message, onConfirm, onCancel, isArchiving = false }) => {
  if (!isOpen) return null;

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleArchive = async () => {
    setIsSubmitting(true);
    try {
      await onConfirm();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ModalWrapper onClose={onCancel}>
      <div className={styles.container}>
        <div className={styles.iconSection}>
          <div className={styles.iconWrapper}>
            <FaArchive className={styles.archiveIcon} />
          </div>
        </div>

        <h2 className={styles.heading}>Archive {title}</h2>
        
        <p className={styles.message}>{message}</p>
        <p className={styles.info}>You can restore archived items later if needed.</p>

        <div className={styles.actions}>
          <button 
            type="button" 
            onClick={onCancel} 
            disabled={isSubmitting || isArchiving} 
            className={styles.cancel}
          >
            Cancel
          </button>
          <button 
            type="button" 
            onClick={handleArchive} 
            disabled={isSubmitting || isArchiving} 
            className={styles.archive}
          >
            {isSubmitting || isArchiving ? 'Archiving...' : 'Archive'}
          </button>
        </div>
      </div>
    </ModalWrapper>
  );
};

export default SysAdminArchiveConfirmationModal;
