import { useNavigate, useLocation } from "react-router-dom";
import styles from "./NotFoundPage.module.css";

const NotFoundPage = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const handleRedirect = () => {
    if (window.history.length > 2) {
      navigate(-1); // Try to go back
    } else if (location.pathname.startsWith("/employee")) {
      navigate("/employee/home");
    } else if (location.pathname.startsWith("/admin")) {
      navigate("/admin/dashboard");
    } else {
      navigate("/"); // fallback
    }
  };

  return (
    <div className={styles.wrapper}>
      <h1 className={styles.code}>404</h1>
      <p className={styles.message}>
        Oops! The page you're looking for doesn't exist.
      </p>
      <button className={styles.button} onClick={handleRedirect}>
        Go Back
      </button>
    </div>
  );
};

export default NotFoundPage;
