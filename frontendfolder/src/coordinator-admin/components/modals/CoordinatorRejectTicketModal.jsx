import { useState } from "react";
import { ToastContainer, toast } from "react-toastify";
import ModalWrapper from "../../../shared/modals/ModalWrapper";
import styles from "./CoordinatorRejectTicketModal.module.css";
import 'react-toastify/dist/ReactToastify.css';
import { backendTicketService } from '../../../services/backend/ticketService';

const CoordinatorAdminRejectTicketModal = ({ ticket, onClose, onSuccess }) => {
  const [comment, setComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleReject = async () => {
    if (!comment.trim()) {
      toast.error("Comment is required to reject a ticket.", {
        position: "top-right",
        autoClose: 3000,
      });
      return;
    }

    setIsSubmitting(true);
    try {
  const ticketId = ticket.id || ticket.ticket_id || ticket.ticketId || null;
  if (!ticketId) throw new Error('Ticket id missing');
  // Use the dedicated reject endpoint so the backend can persist rejected_by
  await backendTicketService.rejectTicket(ticketId, comment);

      toast.success(`Ticket #${ticket.ticketNumber} rejected successfully.`, {
        position: "top-right",
        autoClose: 3000,
      });

      onSuccess?.(ticket.ticketNumber, "Rejected"); // ✅ update parent
      // Navigate directly to the ticket tracker page for this ticket so the
      // UI reloads from the backend. We do this without explicitly closing the modal
      // to avoid flashes — the browser will navigate away immediately.
      try {
        const tn = encodeURIComponent(ticket.ticketNumber || ticket.ticket_number || ticket.id || '');
        if (tn) window.location.href = `/admin/ticket-tracker/${tn}`;
        else window.location.reload();
      } catch (e) { /* ignore */ }
    } catch (err) {
      toast.error("Failed to reject ticket. Please try again.", {
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
        {(() => {
          const resolveOwnerName = (t) => {
            if (!t) return '';
            if (t.employee) {
              const e = t.employee;
              const first = e.first_name || e.firstName || e.first;
              const last = e.last_name || e.lastName || e.last;
              if (first || last) return `${first || ''} ${last || ''}`.trim();
              if (e.name) return e.name;
              if (e.user) {
                const uf = e.user.first_name || e.user.firstName || e.user.name;
                const ul = e.user.last_name || e.user.lastName;
                if (uf && ul) return `${uf} ${ul}`.trim();
                if (uf) return uf;
              }
            }

            const person = t.requester || t.requested_by || t.requestedBy || t.user || t.owner || t.requester_user;
            if (person) {
              const first = person.first_name || person.firstName || person.name;
              const last = person.last_name || person.lastName;
              if (first && last) return `${first} ${last}`.trim();
              if (first) return first;
              if (person.name) return person.name;
              if (person.user) {
                const uf = person.user.first_name || person.user.firstName || person.user.name;
                const ul = person.user.last_name || person.user.lastName;
                if (uf && ul) return `${uf} ${ul}`.trim();
                if (uf) return uf;
              }
            }

            return t.employee_name || t.employeeName || t.requester_name || t.requesterName || t.createdBy?.name || t.created_by?.name || t.requested_by_name || t.requestedByName || '';
          };

          const resolveTicketNumber = (t) => t?.ticketNumber || t?.ticket_number || t?.ticket_no || t?.number || t?.id || '';

          const ownerName = resolveOwnerName(ticket);
          const ticketNum = resolveTicketNumber(ticket);
          return ownerName ? `Reject Ticket ${ticketNum} for ${ownerName}` : `Reject Ticket ${ticketNum}`;
        })()}
      </h2>

      <div className={styles.field}>
        <label>
          Comment <span className={styles.required}>*</span>
        </label>
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          rows={4}
          className={styles.textarea}
          placeholder="Provide a reason for rejection"
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
          onClick={handleReject}
          disabled={isSubmitting}
          className={styles.reject}
        >
          {isSubmitting ? "Rejecting..." : "Reject Ticket"}
        </button>
      </div>
    </ModalWrapper>
  );
};

export default CoordinatorAdminRejectTicketModal;
