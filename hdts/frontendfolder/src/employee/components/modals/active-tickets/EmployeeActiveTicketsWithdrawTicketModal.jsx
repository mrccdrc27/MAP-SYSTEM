import { useState, useEffect } from "react";
import { ToastContainer, toast } from "react-toastify";
import ModalWrapper from "../../../../shared/modals/ModalWrapper";
import styles from "./EmployeeActiveTicketsWithdrawTicketModal.module.css";
import 'react-toastify/dist/ReactToastify.css';
import { backendTicketService } from "../../../../services/backend/ticketService";
import { MdCheckCircle } from "react-icons/md";

const EmployeeActiveTicketsWithdrawTicketModal = ({ ticket, onClose, onSuccess }) => {
  const [comment, setComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [step, setStep] = useState('form'); // 'form' | 'confirm' | 'success'

  const handleWithdrawClick = () => {
    if (!comment.trim()) {
      toast.error("Please provide a reason for withdrawal.", {
        position: "top-right",
        autoClose: 3000,
      });
      return;
    }
    // Show confirmation step
    setStep('confirm');
  };

  const handleConfirmWithdraw = async () => {
    setIsSubmitting(true);
    try {
      // Call backend API to withdraw ticket
      await backendTicketService.withdrawTicket(ticket.id, comment.trim());

      // Show success step
      setStep('success');
    } catch (err) {
      toast.error(err.message || "Failed to withdraw ticket. Please try again.", {
        position: "top-right",
        autoClose: 3000,
      });
      setStep('form'); // Go back to form on error
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSuccessClose = () => {
    // Notify parent and reload
    const hadHandler = typeof onSuccess === 'function';
    if (hadHandler) {
      try { onSuccess(ticket.ticket_number || ticket.ticketNumber, "Withdrawn"); } catch (_) {}
    }
    onClose();
    // Always reload to show updated status
    setTimeout(() => {
      window.location.reload();
    }, 100);
  };

  // Auto-close and reload when success step is shown; keep modal visible until reload starts
  useEffect(() => {
    if (step === 'success') {
      const t = setTimeout(() => {
        try { handleSuccessClose(); } catch (_) {}
      }, 900);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [step]);

  // Success modal
  if (step === 'success') {
    return (
      <ModalWrapper onClose={handleSuccessClose} hideCloseButton={true}>
        <div className={styles.successModal}>
          <div className={styles.successIcon}>
            <MdCheckCircle size={64} color="#28a745" className={styles.successCheck} />
          </div>
          <h2 className={styles.successHeading}>Ticket Withdrawn Successfully</h2>
          <p className={styles.successMessage}>
            Ticket #{ticket.ticket_number || ticket.ticketNumber} has been withdrawn.
          </p>
        </div>
      </ModalWrapper>
    );
  }

  // Confirmation modal
  if (step === 'confirm') {
    return (
      <ModalWrapper onClose={() => setStep('form')} hideCloseButton={true}>
        <ToastContainer />
        <h2 className={styles.heading}>Confirm Withdrawal</h2>
        <p className={styles.confirmMessage}>
          Are you sure you want to withdraw ticket <strong>#{ticket.ticket_number || ticket.ticketNumber}</strong>?
        </p>
        <p className={styles.confirmNote}>
          This action cannot be undone.
        </p>
        <div className={styles.actions}>
          <button
            type="button"
            onClick={() => setStep('form')}
            disabled={isSubmitting}
            className={styles.cancel}
          >
            Go Back
          </button>
          <button
            type="button"
            onClick={handleConfirmWithdraw}
            disabled={isSubmitting}
            className={styles.confirm}
          >
            {isSubmitting ? "Withdrawing..." : "Confirm"}
          </button>
        </div>
      </ModalWrapper>
    );
  }

  // Form modal (default)
  return (
    <ModalWrapper onClose={onClose} hideCloseButton={true}>
      <ToastContainer />
      <h2 className={styles.heading}>
        Withdraw Ticket {ticket.ticket_number || ticket.ticketNumber}
      </h2>

      <div className={styles.field}>
        <label>
          Reason for Withdrawal <span className={styles.required}>*</span>
        </label>
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          rows={4}
          className={styles.textarea}
          placeholder="Provide your reason here..."
        />
      </div>

      <div className={styles.actions}>
        <button
          type="button"
          onClick={onClose}
          disabled={isSubmitting}
          className={styles.cancel}
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleWithdrawClick}
          disabled={isSubmitting}
          className={styles.confirm}
        >
          Withdraw Ticket
        </button>
      </div>
    </ModalWrapper>
  );
};

export default EmployeeActiveTicketsWithdrawTicketModal;
