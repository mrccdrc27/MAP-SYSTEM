// style
import { useAuth } from "../../context/AuthContext";
import styles from "./profile-modal.module.css";

// react
import { useNavigate } from "react-router-dom";

export default function AdminProfileModal({ closeProfileAction }) {
  // navigate
  const navigate = useNavigate();
  const { user, loading, logout } = useAuth();
  // console.log(user);

  if (loading) return <p>Loading...</p>;
  return (
    <div
      className={styles.pmOverlayWrapper}
      onClick={() => {
        closeProfileAction(false);
      }}
    >
      <div className={styles.pmContainer} onClick={(e) => e.stopPropagation()}>
        <div className={styles.pmHeader}>
          <div className={styles.pmImage}>
            <img
              src={
                user.profile_picture ||
                "https://i.pinimg.com/1200x/a9/a8/c8/a9a8c8258957c8c7d6fcd320e9973203.jpg"
              }
              alt="Anime Avatar"
            />
          </div>
          <div className={styles.pmProfileInfo}>
            <h3>
              {user.first_name} {user.last_name}
            </h3>
            <span className={styles.pmRoleBadge}>Admin</span>
          </div>
        </div>
        <div className={styles.pmBody}>
          <button
            className={styles.pmButton}
            onClick={() => {
              closeProfileAction(false);

              const base = import.meta.env.VITE_AUTH_NEW_URL || "http://localhost:3001";
              const url = `${base.replace(/\/$/, "")}/profile/`;

              window.open(url, "_blank", "noopener,noreferrer");
            }}
          >
            Account Settings
          </button>

          <button
            className={styles.pmButton}
            onClick={() => {
              closeProfileAction(false);

              const base = import.meta.env.VITE_AUTH_NEW_URL || "http://localhost:3001";
              const url = `${base.replace(/\/$/, "")}/agents`;

              window.open(url, "_blank", "noopener,noreferrer");
            }}
          >
            Agent Management
          </button>

          {/* <button onClick={() => navigate("/settings")}>Settings</button> */}
          <button
            className={styles.pmButton}
            onClick={() => navigate("/report")}
          >
            Reporting and Analytics
          </button>
          <button
            className={styles.pmButtonLogOut}
            onClick={() => {
              closeProfileAction(false); // close modal first
              logout(); // perform logout
            }}
          >
            Log Out
          </button>
        </div>
      </div>
    </div>
  );
}
