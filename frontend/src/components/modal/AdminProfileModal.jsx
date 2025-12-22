// style
import { useAuth } from "../../context/AuthContext";
import { useLogout } from "../../api/Authentication/useLogout";
import styles from "./profile-modal.module.css";

// react
import { useNavigate } from "react-router-dom";

export default function AdminProfileModal({ closeProfileAction }) {
  // navigate
  const navigate = useNavigate();
  const { logout } = useLogout();
  const { user, loading } = useAuth();
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
                "https://i.pinimg.com/736x/01/c2/09/01c209e18fd7a17c9c5dcc7a4e03db0e.jpg"
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
              // close modal first
              closeProfileAction(false);
              // construct external URL from Vite env var and endpoint
              const base = import.meta.env.VITE_AUTH_URL || '';
              const url = `${base.replace(/\/$/, '')}/staff/settings/profile/`;
              // open in a new browser window/tab safely
              window.open(url, '_blank', 'noopener,noreferrer');
            }}
          >
            Account Settings
          </button>
          <button
            className={styles.pmButton}
            onClick={() => {
              // close modal first
              closeProfileAction(false);
              // construct external URL from Vite env var and endpoint
              const base = import.meta.env.VITE_AUTH_URL || '';
              const url = `${base.replace(/\/$/, '')}/agent-management/`;  
                // open in a new browser window/tab safely
              window.open(url, '_blank', 'noopener,noreferrer');
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
