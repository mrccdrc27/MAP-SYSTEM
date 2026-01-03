import { useForm } from "react-hook-form";
import { useState } from "react";
import { toast } from "react-toastify";
import ModalWrapper from "../../../shared/modals/ModalWrapper";
import { backendTicketService } from "../../../services/backend/ticketService";
import styles from "./EscalateTicketModal.module.css";
import 'react-toastify/dist/ReactToastify.css';

/**
 * Modal for Ticket Coordinators to escalate ticket ownership to another coordinator.
 * Escalation uses round-robin assignment to select the next available coordinator.
 */
const EscalateTicketModal = ({ ticket, onClose, onSuccess }) => {
  const { register, handleSubmit, formState: { errors } } = useForm();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const ticketNumber = ticket?.ticketNumber || ticket?.ticket_number || ticket?.id || '';
  const ticketSubject = ticket?.subject || ticket?.ticket_subject || 'Unknown';
  const currentOwner = ticket?.ticketOwnerName || ticket?.ticket_owner_name || 'You';

  const onSubmit = async (data) => {
    setIsSubmitting(true);
    try {
      const result = await backendTicketService.escalateTicketOwnership(
        ticketNumber,
        data.reason
      );

      toast.success(`Ticket escalated to ${result.new_owner?.name || 'another coordinator'}`, {
        position: "top-right",
        autoClose: 3000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
      });

      onSuccess?.(ticketNumber, result);
    } catch (err) {
      console.error('Escalation error:', err);
      toast.error(err.message || "Failed to escalate ticket. Please try again.", {
        position: "top-right",
        autoClose: 3000,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ModalWrapper onClose={onClose} size="sm">
      <div className={styles.modalHeader}>
        <h2 className={styles.heading}>Escalate Ticket Ownership</h2>
        <p className={styles.subheading}>
          Escalate <strong>{ticketNumber}</strong> to another Ticket Coordinator
        </p>
      </div>

      <div className={styles.infoBox}>
        <div className={styles.infoRow}>
          <span className={styles.infoLabel}>Ticket:</span>
          <span className={styles.infoValue}>{ticketNumber}</span>
        </div>
        <div className={styles.infoRow}>
          <span className={styles.infoLabel}>Subject:</span>
          <span className={styles.infoValue}>{ticketSubject}</span>
        </div>
        <div className={styles.infoRow}>
          <span className={styles.infoLabel}>Current Owner:</span>
          <span className={styles.infoValue}>{currentOwner}</span>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className={styles.form}>
        <div className={styles.field}>
          <label htmlFor="reason">
            Reason for Escalation <span className={styles.required}>*</span>
          </label>
          <textarea
            id="reason"
            {...register("reason", { 
              required: "Reason is required",
              minLength: { value: 10, message: "Reason must be at least 10 characters" }
            })}
            rows={4}
            className={styles.textarea}
            placeholder="Explain why this ticket needs to be escalated..."
          />
          {errors.reason && <p className={styles.error}>{errors.reason.message}</p>}
        </div>

        <div className={styles.warningBox}>
          <span className={styles.warningIcon}>⚠️</span>
          <span className={styles.warningText}>
            This ticket will be assigned to another Ticket Coordinator via round-robin. 
            You will no longer be the owner.
          </span>
        </div>

        <div className={styles.actions}>
          <button 
            type="button" 
            onClick={onClose} 
            disabled={isSubmitting} 
            className={styles.cancelBtn}
          >
            Cancel
          </button>
          <button 
            type="submit" 
            disabled={isSubmitting} 
            className={styles.escalateBtn}
          >
            {isSubmitting ? "Escalating..." : "Escalate Ticket"}
          </button>
        </div>
      </form>
    </ModalWrapper>
  );
};

export default EscalateTicketModal;
