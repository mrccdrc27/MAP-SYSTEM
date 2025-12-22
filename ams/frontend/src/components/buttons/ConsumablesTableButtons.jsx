import "../../styles/custom-colors.css";
import "../../styles/TableButtons.css";
import "../../styles/ConsumablesButtons.css";

import { useNavigate } from "react-router-dom";
import checkinIcon from "../../assets/icons/left.svg";
import checkoutIcon from "../../assets/icons/right-arrow.svg";
import editIcon from "../../assets/icons/edit.svg";
import deleteIcon from "../../assets/icons/delete.svg";
import viewIcon from "../../assets/icons/eye.svg";

export default function ConsumablesTableButtons({
  type,
  navigatePage,
  previousPage,
  id,
  showModal,
}) {
  let icon;
  const navigate = useNavigate();

  // Assign the correct icon based on the type
  switch (type) {
    case "checkout":
      icon = checkoutIcon;
      break;
    case "checkin":
      icon = checkinIcon;
      break;
    case "edit":
      icon = editIcon;
      break;
    case "delete":
      icon = deleteIcon;
      break;
    case "view":
      icon = viewIcon;
      break;
  }

  return (
    <button
      type="button"
      className={`consumables-table-buttons-${type}`}
      onClick={
        navigatePage != null
          ? () => navigate(navigatePage, { state: { id, previousPage } })
          : showModal
      }
      style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        width: "26px",
        height: "26px",
        padding: "4px",
        margin: "0 auto",
        backgroundColor: "var(--bg-color)",
        border: "1px solid #d3d3d3",
        borderRadius: "4px",
        boxSizing: "content-box"
      }}
    >
      {type === "checkin" ? (
        "Check-In"
      ) : type === "checkout" ? (
        "Check-Out"
      ) : (
        <img 
          src={icon} 
          alt="" 
          style={{
            width: "16px",
            height: "16px",
            objectFit: "contain",
            display: "block",
            margin: "0 auto"
          }}
        />
      )}
    </button>
  );
}
