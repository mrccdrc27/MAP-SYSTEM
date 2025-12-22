import { useNavigate } from "react-router-dom";
import "../styles/ActionButtons.css";
import { useAuth } from "../context/AuthContext";

export default function ActionButtons({
  showView = false,
  showEdit = false,
  showDelete = false,
  showRecover = false,
  showCheckout = false,
  showCheckin = false,

  disableCheckout = false,
  disableCheckin = false,

  onViewClick = null,
  editPath = "",
  editState = {},
  onDeleteClick = null,
  onRecoverClick = null,
  onCheckoutClick = null,
  onCheckinClick = null,
}) {
  const navigate = useNavigate();
  const { isAdmin } = useAuth();

  return (
    <section className="action-button-section">
      {showView && (
        <button title="View" className="action-button" onClick={onViewClick}>
          <i className="fas fa-eye"></i>
        </button>
      )}

      {showEdit && isAdmin() && (
        <button
          title="Edit"
          className="action-button"
          onClick={() => navigate(editPath, { state: editState })}
        >
          <i className="fas fa-edit"></i>
        </button>
      )}

      {showDelete && isAdmin() && (
        <button
          title="Delete"
          className="action-button"
          onClick={onDeleteClick}
        >
          <i className="fas fa-trash-alt"></i>
        </button>
      )}

      {showRecover && (
        <button
          title="Recover"
          className="action-button action-button-recover"
          onClick={onRecoverClick}
        >
          <i className="fas fa-undo"></i>
        </button>
      )}

      {showCheckout && (
        <button
          title="Check Out"
          className="action-button action-button-checkout"
          onClick={() => !disableCheckout && onCheckoutClick?.()}
          disabled={disableCheckout}
        >
          <i className="fas fa-sign-out-alt"></i>
          <span>Check-Out</span>
        </button>
      )}

      {showCheckin && (
        <button
          title="Check In"
          className="action-button action-button-checkin"
          onClick={() => !disableCheckin && onCheckinClick?.()}
          disabled={disableCheckin}
        >
          <i className="fas fa-sign-in-alt"></i>
          <span>Check-In</span>
        </button>
      )}
    </section>
  );
}
