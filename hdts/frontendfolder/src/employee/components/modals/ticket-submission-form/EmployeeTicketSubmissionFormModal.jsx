import React from 'react';
import Button from '../../../../shared/components/Button';
import ModalWrapper from '../../../../shared/modals/ModalWrapper';
import styles from './EmployeeTicketSubmissionFormModal.module.css';

export default function EmployeeTicketSubmissionFormModalClean({ submittedTicketNumber, onCreateNew, onView }) {
  return (
    <ModalWrapper
      onClose={onCreateNew}
      className={styles.modal}
      size="sm"
      contentProps={{ role: 'dialog', 'aria-labelledby': 'ticket-modal-title', 'aria-describedby': 'ticket-modal-desc' }}
    >
      <div className={styles.successIcon}><span className={styles.check}>✓</span></div>
      <div className={styles.modalTitle} id="ticket-modal-title">Ticket Submitted Successfully!</div>
      {submittedTicketNumber && (
        <p className={styles.modalSubtitle} id="ticket-modal-desc">Your ticket #{submittedTicketNumber} has been created. We'll get back to you soon.</p>
      )}

      <div className={styles.modalActions}>
        <Button variant="primary" onClick={onCreateNew}>Create New Ticket</Button>
        <Button variant="primary" onClick={onView}>View Ticket</Button>
      </div>
    </ModalWrapper>
  );
}
