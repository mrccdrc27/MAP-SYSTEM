import { IoCheckmarkCircleSharp, IoCloseCircleSharp } from "react-icons/io5";
import "./Alert.css";

function Alert({ message, type }) {
  const icon =
    type === "success" ? (
      <IoCheckmarkCircleSharp className="alert-icon success" />
    ) : (
      <IoCloseCircleSharp className="alert-icon error" />
    );

  return (
    <div className={`alert alert-${type}`}>
      {icon}
      <p>{message}</p>
    </div>
  );
}

export default Alert;
