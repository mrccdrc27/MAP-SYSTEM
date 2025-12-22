import "../../styles/custom-colors.css";
import "../../styles/UploadButton.css";
import uploadIcon from "../../assets/icons/plus.svg";

export default function UploadButton({
  onClick = null,
  label = "Upload",
  disabled = false,
}) {
  const handleClick = () => {
    if (onClick && !disabled) {
      onClick();
    }
  };

  return (
    <button
      type="button"
      className="upload-button"
      onClick={handleClick}
      disabled={disabled}
      title={label}
    >
      <img src={uploadIcon} alt={label} className="upload-icon" />
      <span className="upload-label">{label}</span>
    </button>
  );
}

