import "../../styles/custom-colors.css";
import "../../styles/TableButtons.css";

import { useLocation, useNavigate } from "react-router-dom";
import checkinIcon from "../../assets/icons/left.svg";
import checkoutIcon from "../../assets/icons/right-arrow.svg";
import editIcon from "../../assets/icons/edit.svg";
import deleteIcon from "../../assets/icons/delete.svg";
import viewIcon from "../../assets/icons/eye.svg";
import auditIcon from "../../assets/icons/audit-secondary-text-color.svg";

export default function TableButtons({
  type,
  navigatePage,
  previousPage,
  data,
  showModal,
  onClick,
  isDisabled = false,
}) {
  let icon;
  let title;
  const navigate = useNavigate();
  const location = useLocation();

  // Only log if data exists to avoid console spam
  // if (data !== undefined) {
  //   console.log("table button id received:", data);
  // }

  const currentLocation = () => {
    if (location.pathname.startsWith("/accessories")) {
      return "accessory";
    }
  };

  // Assign the correct icon and title based on the type
  switch (type) {
    case "checkout":
      icon = checkoutIcon;
      break;
    case "checkin":
      icon = checkinIcon;
      title = `There are no items of this ${currentLocation()} checked out yet`;
      break;
    case "edit":
      icon = editIcon;
      break;
    case "delete":
      icon = deleteIcon;
      title = "Cannot be deleted";
      break;
    case "view":
      icon = viewIcon;
      break;
    case "audit":
      icon = auditIcon;
      break;
    case "deactivate":
      // No icon needed for deactivate, will use text
      break;
  }

  if (!isDisabled) {
    return (
      <button
        type="button"
        className={`table-buttons-${type}`}
        onClick={
          onClick
            ? onClick
            : navigatePage != null
            ? () => navigate(navigatePage, { state: { data, previousPage } })
            : showModal
        }
        title={type === "audit" ? "Perform Audit" : null}
      >
        {type === "checkin" ? (
          "Check-In"
        ) : type === "checkout" ? (
          "Check-Out"
        ) : type === "deactivate" ? (
          "Deactivate"
        ) : (
          <img src={icon} alt="icon" />
        )}
      </button>
    );
  } else {
    return (
      <button
        type="button"
        className={`table-buttons-${type}-disabled`}
        title={title}
        disabled
      >
        {type === "checkin" ? (
          "Check-In"
        ) : type === "checkout" ? (
          "Check-Out"
        ) : type === "deactivate" ? (
          "Deactivate"
        ) : (
          <img src={icon} alt="icon" />
        )}
      </button>
    );
  }
}
