import { FaEdit, FaTimes, FaEye, FaUndoAlt } from "react-icons/fa";
import styles from "./TicketActions.module.css";

// === Permission Helpers ===
const isWithdrawAllowed = (status = "") => {
  const allowed = ["new", "pending", "submitted", "open", "in progress", "on hold"];
  return allowed.includes(status.toLowerCase());
};

const isCloseAllowed = (status = "") => {
  const disallowed = ["submitted", "open", "in progress", "on hold", "pending"];
  return !disallowed.includes(status.toLowerCase());
};

const isEditAllowed = (status = "") => {
  const allowed = ["new", "pending", "submitted", "open"];
  return allowed.includes(status.toLowerCase());
};

// === Action Configuration ===
const actionMap = {
  edit: {
    icon: FaEdit,
    style: styles.edit,
    handlerKey: "onEdit",
    isAllowed: isEditAllowed,
  },
  delete: {
    icon: FaTimes,
    style: styles.delete,
    handlerKey: "onDelete",
    isAllowed: isCloseAllowed,
  },
  view: {
    icon: FaEye,
    style: styles.view,
    handlerKey: "onView",
    isAllowed: () => true,
  },
  withdraw: {
    icon: FaUndoAlt,
    style: styles.withdraw,
    handlerKey: "onWithdraw",
    isAllowed: isWithdrawAllowed,
  },
};

// === Main Button Generator ===
const getTicketActions = (type, row, handlers = {}) => {
  const config = actionMap[type];
  if (!config) return null;

  const { icon: Icon, style, handlerKey, isAllowed } = config;
  const disabled = !isAllowed(row.status);

  return (
    <button
      type="button"
      className={`${styles.btn} ${style}`}
      disabled={disabled}
      onClick={() => !disabled && handlers[handlerKey]?.(row)}
      title={type.charAt(0).toUpperCase() + type.slice(1)}
    >
      <Icon className={styles.icon} />
    </button>
  );
};

export default getTicketActions;
