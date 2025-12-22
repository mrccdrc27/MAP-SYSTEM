import ModalWrapper from "../../../../shared/modals/ModalWrapper";
import Button from '../../../../shared/components/Button';
import { useNavigate } from 'react-router-dom';
import styles from "./CoordinatorAdminCSATViewModal.module.css";
import ticketStyles from '../../../../employee/pages/ticket-tracker/EmployeeTicketTracker.module.css';

const getRatingColor = (rating) => {
  switch (rating) {
    case 5:
      return 'var(--csat-excellent)';
    case 4:
      return 'var(--csat-good)';
    case 3:
      return 'var(--csat-neutral)';
    case 2:
      return 'var(--csat-poor)';
    case 1:
      return 'var(--csat-very-poor)';
    default:
      return 'var(--csat-default)';
  }
};

const getRatingText = (rating) => {
  switch (rating) {
    case 5:
      return 'Excellent';
    case 4:
      return 'Good';
    case 3:
      return 'Neutral';
    case 2:
      return 'Poor';
    case 1:
      return 'Very Poor';
    default:
      return 'N/A';
  }
};

const formatDate = (iso) => {
  try {
    const d = new Date(iso);
    return d.toLocaleString();
  } catch (e) {
    return iso;
  }
};

const CoordinatorAdminCSATViewModal = ({ csat, onClose }) => {
  const navigate = useNavigate();
  if (!csat) return null;
  const attachments = csat.attachments || csat.files || csat.fileAttachments || csat.fileUploaded || null;
  const normalizeFiles = (f) => {
    if (!f) return [];
    return Array.isArray(f) ? f : [f];
  };

  return (
    <ModalWrapper size="lg" onClose={onClose}>
        <h2 className={styles.heading}>CSAT Feedback Details</h2>

        <div className={styles.profileSection}>
          <img
            src={csat.profilePic || ''}
            alt={csat.employeeName}
            className={styles.profileImage}
            onError={(e) => {
              e.target.src = 'https://via.placeholder.com/80?text=User';
            }}
          />
          <div className={styles.profileInfo}>
            <h3>{csat.employeeName}</h3>
            <p className={styles.subtext}>{csat.ticketNumber}</p>
          </div>
        </div>

        <div className={styles.detailsGrid}>
          <div className={styles.leftCol}>
            <div className={styles.leftColCard}>
              <h4 className={styles.columnTitle}>CSAT Rating and Feedback</h4>
              <div className={ticketStyles.detailItem}>
              <div className={ticketStyles.detailLabel}>Rating</div>
              <div className={ticketStyles.detailValue}>
                <div className={styles.ratingDisplay}>
                  <span className={styles.ratingBadge} style={{ backgroundColor: getRatingColor(csat.rating), color: '#fff' }}>
                    {csat.rating} ★ {getRatingText(csat.rating)}
                  </span>
                </div>
              </div>
            </div>

              <div className={ticketStyles.singleColumnGroup}>
                <div className={ticketStyles.detailItem}>
                  <div className={ticketStyles.detailLabel}>Feedback</div>
                  <div className={ticketStyles.detailValue}>
                    {csat.comment || 'No feedback provided.'}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className={styles.rightCol}>
            <div className={styles.rightColCard}>
              <h4 className={styles.columnTitle}>Ticket Details</h4>
              <div className={`${styles.detailField} ${styles.fullWidth}`}>
                <label>Subject</label>
                <p className={styles.fieldValue}>{csat.subject}</p>
              </div>

              <div className={styles.detailField}>
                <label>Date Rated</label>
                <p className={styles.fieldValue}>{formatDate(csat.date)}</p>
              </div>

              {csat.category && (
                <div className={styles.detailField}>
                  <label>Category</label>
                  <p className={styles.fieldValue}>{csat.category}</p>
                </div>
              )}

              {(attachments && normalizeFiles(attachments).length > 0) && (
                <div className={styles.detailField}>
                  <label>Attachments</label>
                  <div className={styles.attachmentList}>
                    {normalizeFiles(attachments).map((f, idx) => (
                      <div key={idx} className={styles.attachmentRow}>{f?.name || f?.filename || `Attachment ${idx + 1}`}</div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className={styles.actions}>
          <Button onClick={onClose} className={styles.closeButton} variant="outline">
            Close
          </Button>
          <Button
            onClick={() => {
              onClose?.();
              const target = csat.ticketNumber
                ? `/admin/ticket-tracker/${encodeURIComponent(csat.ticketNumber)}`
                : (csat.ticketId ? `/admin/ticket-tracker/${csat.ticketId}` : '/admin/ticket-tracker');
              navigate(target);
            }}
            className={styles.openTicketButton}
            variant="primary"
          >
            See Ticket
          </Button>
        </div>
    </ModalWrapper>
  );
};

export default CoordinatorAdminCSATViewModal;
