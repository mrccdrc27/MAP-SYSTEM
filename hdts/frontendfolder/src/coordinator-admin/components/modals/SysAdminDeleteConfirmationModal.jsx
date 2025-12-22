import React, { useState } from 'react';
import { FaTrash } from 'react-icons/fa';
import ModalWrapper from '../../../shared/modals/ModalWrapper';
import styles from './SysAdminDeleteConfirmationModal.module.css';

const SysAdminDeleteConfirmationModal = ({ isOpen, title, message, onConfirm, onCancel, isDeleting = false }) => {
  if (!isOpen) return null;

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleDelete = async () => {
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
            <FaTrash className={styles.deleteIcon} />
          </div>
        </div>

        <h2 className={styles.heading}>Delete {title}</h2>
        
        <p className={styles.message}>{message}</p>
        <p className={styles.warning}>This action cannot be undone.</p>

        <div className={styles.actions}>
          <button 
            type="button" 
            onClick={onCancel} 
            disabled={isSubmitting || isDeleting} 
            className={styles.cancel}
          >
            Cancel
          </button>
          <button 
            type="button" 
            onClick={handleDelete} 
            disabled={isSubmitting || isDeleting} 
            className={styles.delete}
          >
            {isSubmitting || isDeleting ? 'Deleting...' : 'Delete Permanently'}
          </button>
        </div>
      </div>
    </ModalWrapper>
  );
};

export default SysAdminDeleteConfirmationModal;
