// CoordinatorAdminRejectUserModal.jsx
import ModalWrapper from "../../../shared/modals/ModalWrapper";

const CoordinatorAdminRejectUserModal = ({ user, onClose }) => {
  const handleReject = async () => {
    try {
      const { backendEmployeeService } = await import("../../../services/backend/employeeService");
      // Try PATCH to /api/employees/<id>/, fallback to /api/employee/profile/ if 404
      const { API_CONFIG } = await import("../../../config/environment.js");
      const BASE_URL = API_CONFIG.BACKEND.BASE_URL;
      const token = localStorage.getItem('access_token');
      // Use the new deny endpoint
      let response = await fetch(`${BASE_URL}/api/employees/${user.id}/deny/`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
      });
      if (!response.ok) {
        const err = await response.text();
        throw new Error(err || 'Failed to reject user');
      }
      alert(`User ${user.firstName} ${user.lastName} rejected.`);
      onClose(true); // pass true to trigger refresh
    } catch (err) {
      alert("Failed to reject user: " + (err?.message || err));
    }
  };

  return (
    <>
      <h2 className="modal-title">Reject User</h2>
      <p className="modal-message">
        Reject user <strong>{user.firstName} {user.lastName}</strong>?
      </p>
      <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
        <button className="modal-cancel" onClick={onClose}>Cancel</button>
        <button className="modal-reject" onClick={handleReject}>Reject</button>
      </div>
    </>
  );
};

export default CoordinatorAdminRejectUserModal;
