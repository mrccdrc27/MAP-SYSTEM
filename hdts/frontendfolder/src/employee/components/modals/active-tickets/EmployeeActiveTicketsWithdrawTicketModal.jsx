import { useState } from "react";
import { ToastContainer, toast } from "react-toastify";
import ModalWrapper from "../../../../shared/modals/ModalWrapper";
import styles from "./EmployeeActiveTicketsWithdrawTicketModal.module.css";
import 'react-toastify/dist/ReactToastify.css';
import { backendTicketService } from "../../../../services/backend/ticketService";

const EmployeeActiveTicketsWithdrawTicketModal = ({ ticket, onClose, onSuccess }) => {
  const [comment, setComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleWithdraw = async () => {
    if (!comment.trim()) {
      toast.error("Please provide a reason for withdrawal.", {
        position: "top-right",
        autoClose: 3000,
      });
      return;
    }

    setIsSubmitting(true);
    try {
      // Call backend API to withdraw ticket
      await backendTicketService.withdrawTicket(ticket.id, comment.trim());

      toast.success(`Ticket #${ticket.ticket_number || ticket.ticketNumber} withdrawn successfully.`, {
        position: "top-right",
        autoClose: 3000,
      });

      // Notify parent. If parent provided onSuccess, assume it will update UI
      // and skip the hard reload. Otherwise, close and reload as a fallback.
      const hadHandler = typeof onSuccess === 'function';
      if (hadHandler) {
        try { onSuccess(ticket.ticket_number || ticket.ticketNumber, "Withdrawn"); } catch (_) {}
        onClose();
      } else {
        onClose();
        setTimeout(() => {
          try {
            window.location.reload();
          } catch (e) {
            // eslint-disable-next-line no-console
            console.error('Failed to reload after withdraw:', e);
          }
        }, 250);
      }
    } catch (err) {
      toast.error(err.message || "Failed to withdraw ticket. Please try again.", {
        position: "top-right",
        autoClose: 3000,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ModalWrapper onClose={onClose}>
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
          onClick={handleWithdraw}
          disabled={isSubmitting}
          className={styles.confirm}
        >
          {isSubmitting ? "Withdrawing..." : "Withdraw Ticket"}
        </button>
      </div>
    </ModalWrapper>
  );
};

export default EmployeeActiveTicketsWithdrawTicketModal;
