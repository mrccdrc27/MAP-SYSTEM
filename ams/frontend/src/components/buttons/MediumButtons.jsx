import "../../styles/custom-colors.css";
import "../../styles/MediumButtons.css";

import { useNavigate } from "react-router-dom";
import plusIcon from "../../assets/icons/plus.svg";
import deleteIcon from "../../assets/icons/delete-white.svg";
import recoverIcon from "../../assets/icons/undo-icon.svg";

export default function MediumButtons({
  type,
  navigatePage = null,
  previousPage,
  onClick = null,
  deleteModalOpen = null,
}) {
  console.log("MediumButtons RENDER - type:", type, "| onClick exists:", !!onClick);

  /* List of Button Type:
    - new
    - export
    - schedule-audits
    - perform-audits
    - delete
    - sort
    - filter
    - recover
   */
  let icon;
  const navigate = useNavigate();

  // Assign the correct icon based on the type
  switch (type.toLowerCase()) {
    case "new":
      icon = plusIcon;
      break;
    case "delete":
      icon = deleteIcon;
      break;
    case "recover":
      icon = recoverIcon;
      break;
    default:
      icon = null;
  }

  // Function to get the correct button text
  const getButtonText = (buttonType) => {
    switch (buttonType) {
      case "schedule-audits":
        return "Schedule Audit";
      case "perform-audits":
        return "Perform Audit";
      case "bulk":
        return "Bulk Checkin";
      default:
        return buttonType.replace("-", " ");
    }
  };

  const handleClick = () => {
    console.log("🎯 handleClick CALLED - type:", type, "| onClick exists:", !!onClick);

    if (type.toLowerCase() === "export" && onClick) {
      console.log("📤 Executing EXPORT onClick");
      onClick();
    }

    if (type.toLowerCase() === "delete") {
      if (deleteModalOpen) {
        console.log("Executing DELETE deleteModalOpen");
        deleteModalOpen();
      } else if (onClick) {
        console.log("Executing DELETE onClick");
        onClick();
      }
    }

    if (type.toLowerCase() === "recover" && onClick) {
      console.log("Executing RECOVER onClick");
      onClick();
    }

    if (type.toLowerCase() === "edit" && onClick) {
      console.log("Executing EDIT onClick");
      onClick();
    }

    if (type.toLowerCase() === "clone" && onClick) {
      console.log("Executing CLONE onClick");
      onClick();
    }

    if (type.toLowerCase() === "filter" && onClick) {
      console.log("Executing FILTER onClick");
      onClick();
      console.log("FILTER onClick executed");
    }

    if (type.toLowerCase() === "new" && onClick) {
      console.log("Executing NEW onClick");
      onClick();
    }

    if (navigatePage) {
      console.log("Navigating to:", navigatePage);
      navigate(navigatePage, { state: { previousPage } });
    }
  };

  console.log("About to render button - type:", type, "className:", `medium-button-${type}`);

  return (
    <button
      type="button"
      className={`medium-button-${type}`}
      onClick={(e) => {
        console.log("BUTTON CLICKED - type:", type);
        console.log("Event target:", e.target);
        console.log("Current target:", e.currentTarget);
        e.preventDefault();
        e.stopPropagation();
        handleClick();
      }}
      style={{
        pointerEvents: 'auto',
        cursor: 'pointer',
        position: 'relative',
        zIndex: 10
      }}
    >
      {/* The img tag will be rendered when the icon is not null*/}
      {icon && <img src={icon} alt="" />}
      {getButtonText(type)}
    </button>
  );
}
