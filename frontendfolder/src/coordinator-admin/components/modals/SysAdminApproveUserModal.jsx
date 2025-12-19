// CoordinatorAdminApproveUserModal.jsx
import ModalWrapper from "../../../shared/modals/ModalWrapper";
import { authUserService } from "../../../services/auth/userService";

const CoordinatorAdminApproveUserModal = ({ user, onClose }) => {
  const handleApprove = async () => {
    try {
      // Determine HDTS user id from the passed `user` object. The page passes
      // a normalized user which may store the original raw record in `_raw`.
      const hdtsId = user?._raw?.id || user?.companyId || user?.id || user?._raw?.user_id || user?._raw?.employee_id;
      if (!hdtsId) {
        alert('Cannot determine HDTS user id for approval.');
        return;
      }

      // Use the auth service endpoint to approve the pending HDTS user
      await authUserService.approveHdtsUser(hdtsId);
      alert(`User ${user.firstName || ''} ${user.lastName || ''} approved.`);
      onClose(true); // pass true to trigger refresh
    } catch (err) {
      alert("Failed to approve user: " + (err?.message || err));
    }
  };

  return (
    <>
      <h2 className="modal-title">Approve User</h2>
      <p className="modal-message">
        Approve user <strong>{user.firstName} {user.lastName}</strong>?
      </p>
      <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
        <button className="modal-cancel" onClick={onClose}>Cancel</button>
        <button className="modal-approve" onClick={handleApprove}>Approve</button>
      </div>
    </>
  );
};

export default CoordinatorAdminApproveUserModal;
