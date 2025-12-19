import { FaCheck, FaTimes, FaEye } from "react-icons/fa";
import styles from "./UserActions.module.css";

const isUserActionAllowed = (status) => status?.toLowerCase() === "pending";

const getUserActions = (type, row, { onApprove, onReject, onView } = {}) => {
  const isAllowed = isUserActionAllowed(row.status);

  const commonProps = {
    className: styles["action-btn"],
    disabled: !isAllowed && type !== "view",
  };

  switch (type) {
    case "approve":
      return (
        <button
          {...commonProps}
          onClick={() => isAllowed && onApprove?.(row)}
          data-type="approve"
        >
          <FaCheck className={styles["action-icon"]} />
        </button>
      );

    case "reject":
      return (
        <button
          {...commonProps}
          onClick={() => isAllowed && onReject?.(row)}
          data-type="reject"
        >
          <FaTimes className={styles["action-icon"]} />
        </button>
      );

    case "view":
      return (
        <button
          className={`${styles["action-btn"]} ${styles["action-btn-view"]}`}
          onClick={() => onView?.(row)}
        >
          <FaEye className={styles["action-icon"]} />
        </button>
      );

    default:
      return null;
  }
};

export default getUserActions;
