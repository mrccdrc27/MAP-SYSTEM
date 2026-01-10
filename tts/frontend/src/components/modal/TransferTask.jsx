import { useState, useEffect } from "react";
import useTransferTask from "../../api/useTransferTask";
import useUsersApi from "../../api/useUsersApi";
import { useAuth } from "../../context/AuthContext";
import styles from "./transfer-task.module.css";

export default function TransferTask({
  closeTransferModal,
  ticket,
  taskItemId,
  currentOwner,
}) {
  const [selectedUserId, setSelectedUserId] = useState("");
  const [notes, setNotes] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [errors, setErrors] = useState({});

  const { user: currentUser } = useAuth();
  const { users, loading: usersLoading, error: usersError } = useUsersApi();
  const { transferTask, loading: transferLoading, error: transferError, success } =
    useTransferTask();

  // Prevent body scroll when modal is open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  // Handle successful transfer
  useEffect(() => {
    if (success && !transferLoading) {
      console.log("Task transferred successfully");
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    }
  }, [success, transferLoading]);

  // Filter users based on search term (include all users, even current user)
  const filteredUsers = (users || []).filter(
    (user) =>
      (user?.first_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (user?.last_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (user?.role || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleProceed = () => {
    const newErrors = {};

    if (!selectedUserId) {
      newErrors.user = "Please select a user to transfer to.";
    }
    if (!notes.trim()) {
      newErrors.notes = "Please provide a reason for transfer.";
    }

    setErrors(newErrors);

    if (Object.keys(newErrors).length === 0) {
      setShowConfirmation(true);
    }
  };

  const handleConfirmTransfer = async () => {
    try {
      await transferTask(parseInt(selectedUserId), taskItemId, notes);
    } catch (err) {
      console.error("Transfer failed:", err);
    }
  };

  const handleCancel = () => {
    closeTransferModal(false);
  };

  // Get initials for avatar
  const getInitials = (firstName, lastName) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  // Get avatar color based on user ID
  const getAvatarColor = (userId) => {
    const colors = [
      styles["bg-blue-500"],
      styles["bg-purple-500"],
      styles["bg-pink-500"],
      styles["bg-green-500"],
      styles["bg-red-500"],
      styles["bg-cyan-500"],
    ];
    return colors[userId % colors.length];
  };

  // Find selected user object for display
  const selectedUser = (users || []).find((u) => u.id === parseInt(selectedUserId));
  const currentTicketOwner = ticket?.user_assignment;

  if (!showConfirmation) {
    return (
      <div
        className={styles.ttOverlayWrapper}
        onClick={handleCancel}
      >
        <div
          className={styles.transferTaskModal}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Modal Header */}
          <div className={styles.ttModalHeader}>
            <div>
              <h2 className={styles.ttHeaderTitle}>Transfer Task</h2>
              <p className={styles.ttHeaderSubtitle}>
                {ticket?.ticket_id} - {ticket?.ticket_subject}
              </p>
            </div>
            <button
              onClick={handleCancel}
              className={styles.ttCloseButton}
              aria-label="Close modal"
            >
              <i className="fa-solid fa-xmark"></i>
            </button>
          </div>

          {/* Modal Body */}
          <div className={styles.ttModalBody}>
            {/* Error Messages */}
            {(usersError || transferError) && (
              <div className={styles.ttErrorMessage}>
                <i className="fa-solid fa-circle-exclamation"></i>
                <p>{usersError || transferError}</p>
              </div>
            )}

            {/* Search Bar */}
            <div className={styles.ttSearchContainer}>
              <label className={styles.ttLabel}>
                Search Team Members
              </label>
              <div className={styles.ttSearchWrapper}>
                <i className="fa-solid fa-magnifying-glass"></i>
                <input
                  type="text"
                  placeholder="Search by name or role..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className={styles.ttSearchInput}
                />
              </div>
            </div>

            {/* User List */}
            <div className={styles.ttUserListContainer}>
              <label className={styles.ttLabel}>
                Select Assignee <span className={styles.ttRequired}>*</span>
              </label>
              {usersLoading ? (
                <div className={styles.ttLoadingState}>
                  <i className="fa-solid fa-spinner fa-spin"></i>
                  <p>Loading team members...</p>
                </div>
              ) : filteredUsers.length === 0 ? (
                <div className={styles.ttEmptyState}>
                  <i className="fa-solid fa-users"></i>
                  <p>
                    {searchTerm
                      ? "No matching team members found"
                      : "No other team members available"}
                  </p>
                </div>
              ) : (
                <div className={styles.ttUserList}>
                  {filteredUsers.map((user) => (
                    <div
                      key={user.id}
                      onClick={() => setSelectedUserId(user.id)}
                      className={`${styles.ttUserItem} ${
                        parseInt(selectedUserId) === user.id
                          ? styles.ttUserItemSelected
                          : ""
                      }`}
                    >
                      <div className={styles.ttUserAvatar}>
                        <div className={`${styles.ttAvatarCircle} ${getAvatarColor(user.id)}`}>
                          {getInitials(user.first_name, user.last_name)}
                        </div>
                      </div>
                    <div className={styles.ttUserInfo}>
                        <div className={styles.ttUserName}>
                          {user.first_name} {user.last_name}
                          {user.id === currentUser?.user_id && (
                            <span className={styles.ttYouLabel}>(you)</span>
                          )}
                        </div>
                        <div className={styles.ttUserRole}>{user.role}</div>
                      </div>
                      {parseInt(selectedUserId) === user.id && (
                        <div className={styles.ttCheckmark}>
                          <i className="fa-solid fa-check"></i>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
              {errors.user && (
                <p className={styles.ttErrorText}>{errors.user}</p>
              )}
            </div>

            {/* Notes Section */}
            <div className={styles.ttNotesContainer}>
              <label className={styles.ttLabel}>
                Reason for Transfer <span className={styles.ttRequired}>*</span>
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Provide a reason for transferring this task..."
                rows="4"
                className={styles.ttTextarea}
              />
              <p className={styles.ttCharCount}>{notes.length} characters</p>
              {errors.notes && (
                <p className={styles.ttErrorText}>{errors.notes}</p>
              )}
            </div>

            {/* Warning Message */}
            {selectedUser && (
              <div className={styles.ttWarningMessage}>
                <i className="fa-solid fa-triangle-exclamation"></i>
                <p>
                  {currentOwner?.user_full_name
                    ? `${currentOwner.user_full_name} will be notified of this transfer and will no longer have primary responsibility for this ticket.`
                    : "The current assignee will be notified of this transfer and will no longer have primary responsibility for this ticket."}
                </p>
              </div>
            )}
          </div>

          {/* Modal Footer */}
          <div className={styles.ttModalFooter}>
            <button
              onClick={handleCancel}
              className={styles.ttCancelButton}
            >
              Cancel
            </button>
            <button
              onClick={handleProceed}
              disabled={!selectedUserId || !notes.trim() || transferLoading}
              className={styles.ttSubmitButton}
            >
              {transferLoading ? (
                <>
                  <i className="fa-solid fa-spinner fa-spin"></i>
                  <span>Transferring...</span>
                </>
              ) : (
                "Transfer Task"
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Confirmation View
  return (
    <div
      className={styles.ttOverlayWrapper}
      onClick={handleCancel}
    >
      <div
        className={styles.transferTaskModal}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className={styles.ttModalHeader}>
          <div>
            <h2 className={styles.ttHeaderTitle}>Confirm Transfer</h2>
            <p className={styles.ttHeaderSubtitle}>Please review the details</p>
          </div>
          <button
            onClick={handleCancel}
            className={styles.ttCloseButton}
            aria-label="Close modal"
          >
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>

        {/* Modal Body */}
        <div className={styles.ttModalBody}>
          {/* Warning Message */}
          <div className={styles.ttWarningMessage}>
            <i className="fa-solid fa-triangle-exclamation"></i>
            <div>
              <h3 className={styles.ttWarningTitle}>Confirm Task Transfer</h3>
              <p>
                Are you sure you want to transfer this task? This action will
                notify the new assignee and the current owner.
              </p>
            </div>
          </div>

          {/* Confirmation Details */}
          <div className={styles.ttConfirmationDetails}>
            <div className={styles.ttDetailRow}>
              <span className={styles.ttDetailLabel}>Ticket:</span>
              <div className={styles.ttDetailValue}>
                <div className={styles.ttDetailValueMain}>
                  {ticket?.ticket_id}
                </div>
                <div className={styles.ttDetailValueSub}>
                  {ticket?.ticket_subject}
                </div>
              </div>
            </div>

            <hr className={styles.ttDetailDivider} />

            <div className={styles.ttDetailRow}>
              <span className={styles.ttDetailLabel}>From:</span>
              {currentOwner && (
                <div className={styles.ttDetailValue}>
                  <div className={styles.ttDetailValueMain}>
                    {currentOwner.user_full_name}
                  </div>
                  <div className={styles.ttDetailValueSub}>
                    {currentOwner.role}
                  </div>
                </div>
              )}
            </div>

            <hr className={styles.ttDetailDivider} />

            <div className={styles.ttDetailRow}>
              <span className={styles.ttDetailLabel}>Transfer To:</span>
              {selectedUser && (
                <div className={styles.ttDetailValue}>
                  <div className={styles.ttDetailValueMain}>
                    {selectedUser.first_name} {selectedUser.last_name}
                  </div>
                  <div className={styles.ttDetailValueSub}>
                    {selectedUser.role}
                  </div>
                </div>
              )}
            </div>

            <hr className={styles.ttDetailDivider} />

            <div className={styles.ttDetailRow}>
              <span className={styles.ttDetailLabel}>Reason:</span>
              <p className={styles.ttDetailValue}>{notes}</p>
            </div>
          </div>

          {/* Error Messages */}
          {transferError && (
            <div className={styles.ttErrorMessage}>
              <i className="fa-solid fa-circle-exclamation"></i>
              <p>{transferError}</p>
            </div>
          )}

          {success && (
            <div className={styles.ttSuccessMessage}>
              <i className="fa-solid fa-circle-check"></i>
              <p>Task transferred successfully!</p>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className={styles.ttModalFooter}>
          <button
            onClick={() => setShowConfirmation(false)}
            disabled={transferLoading}
            className={styles.ttCancelButton}
          >
            Back
          </button>
          <button
            onClick={handleConfirmTransfer}
            disabled={transferLoading}
            className={styles.ttSubmitButton}
          >
            {transferLoading ? (
              <>
                <i className="fa-solid fa-spinner fa-spin"></i>
                <span>Confirming...</span>
              </>
            ) : (
              "Confirm Transfer"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
