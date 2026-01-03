import { useForm } from "react-hook-form";
import { useState, useEffect } from "react";
import { toast } from "react-toastify";
import ModalWrapper from "../../../shared/modals/ModalWrapper";
import { backendTicketService } from "../../../services/backend/ticketService";
import styles from "./TransferTicketModal.module.css";
import 'react-toastify/dist/ReactToastify.css';

/**
 * Modal for HDTS Admins to transfer ticket ownership to a specific Ticket Coordinator.
 * Admin can select from a list of available coordinators.
 */
const TransferTicketModal = ({ ticket, onClose, onSuccess }) => {
  const { register, handleSubmit, formState: { errors } } = useForm();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [coordinators, setCoordinators] = useState([]);
  const [isLoadingCoordinators, setIsLoadingCoordinators] = useState(true);

  const ticketNumber = ticket?.ticketNumber || ticket?.ticket_number || ticket?.id || '';
  const ticketSubject = ticket?.subject || ticket?.ticket_subject || 'Unknown';
  const currentOwnerId = ticket?.ticketOwnerId || ticket?.ticket_owner_id || null;
  const currentOwnerName = ticket?.ticketOwnerName || ticket?.ticket_owner_name || 'Unassigned';

  // Fetch available coordinators on mount
  useEffect(() => {
    const fetchCoordinators = async () => {
      try {
        setIsLoadingCoordinators(true);
        const result = await backendTicketService.getAvailableCoordinators(currentOwnerId);
        setCoordinators(result.coordinators || []);
      } catch (err) {
        console.error('Failed to fetch coordinators:', err);
        toast.error('Failed to load coordinators list');
        setCoordinators([]);
      } finally {
        setIsLoadingCoordinators(false);
      }
    };

    fetchCoordinators();
  }, [currentOwnerId]);

  const onSubmit = async (data) => {
    setIsSubmitting(true);
    try {
      const result = await backendTicketService.transferTicketOwnership(
        ticketNumber,
        parseInt(data.newOwnerId, 10),
        data.reason || ''
      );

      toast.success(`Ticket transferred to ${result.new_owner?.name || 'coordinator'}`, {
        position: "top-right",
        autoClose: 3000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
      });

      onSuccess?.(ticketNumber, result);
    } catch (err) {
      console.error('Transfer error:', err);
      toast.error(err.message || "Failed to transfer ticket. Please try again.", {
        position: "top-right",
        autoClose: 3000,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ModalWrapper onClose={onClose} size="md">
      <div className={styles.modalHeader}>
        <h2 className={styles.heading}>Transfer Ticket Ownership</h2>
        <p className={styles.subheading}>
          Transfer <strong>{ticketNumber}</strong> to another Ticket Coordinator
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
          <span className={styles.infoValue}>{currentOwnerName}</span>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className={styles.form}>
        <div className={styles.field}>
          <label htmlFor="newOwnerId">
            Transfer To <span className={styles.required}>*</span>
          </label>
          {isLoadingCoordinators ? (
            <div className={styles.loadingCoordinators}>Loading coordinators...</div>
          ) : coordinators.length === 0 ? (
            <div className={styles.noCoordinators}>
              No other coordinators available for transfer
            </div>
          ) : (
            <select
              id="newOwnerId"
              {...register("newOwnerId", { required: "Please select a coordinator" })}
              className={styles.select}
            >
              <option value="">Select a Ticket Coordinator</option>
              {coordinators.map((coord) => (
                <option key={coord.user_id} value={coord.user_id}>
                  {coord.name} {coord.email ? `(${coord.email})` : ''}
                </option>
              ))}
            </select>
          )}
          {errors.newOwnerId && <p className={styles.error}>{errors.newOwnerId.message}</p>}
        </div>

        <div className={styles.field}>
          <label htmlFor="reason">
            Reason for Transfer <span className={styles.optional}>(Optional)</span>
          </label>
          <textarea
            id="reason"
            {...register("reason")}
            rows={3}
            className={styles.textarea}
            placeholder="Provide a reason for the transfer..."
          />
        </div>

        <div className={styles.infoMessage}>
          <span className={styles.infoIcon}>ℹ️</span>
          <span className={styles.infoText}>
            The new owner will receive a notification about this transfer. 
            The previous owner will also be notified.
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
            disabled={isSubmitting || isLoadingCoordinators || coordinators.length === 0} 
            className={styles.transferBtn}
          >
            {isSubmitting ? "Transferring..." : "Transfer Ticket"}
          </button>
        </div>
      </form>
    </ModalWrapper>
  );
};

export default TransferTicketModal;
