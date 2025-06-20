// style
import styles from "./profile-modal.module.css";

// react
import { useNavigate } from "react-router-dom";

export default function ProfileModal({ closeProfileAction }) {
  // navigate
  const navigate = useNavigate();
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
              src="https://i.pinimg.com/736x/e6/50/7f/e6507f42d79520263d8d952633cedcf2.jpg"
              alt="Anime Avatar"
            />
          </div>
          <div className={styles.pmProfileInfo}>
            <h3>Mary Grace Piattos</h3>
            <span className={styles.pmRoleBadge}>Admin</span>
          </div>
        </div>
        <div className={styles.pmBody}>
          <button
            className={styles.pmButton}
            onClick={() => navigate("/profile")}
          >
            Account Settings
          </button>
          {/* <button onClick={() => navigate("/settings")}>Settings</button> */}
          <button className={styles.pmButtonLogOut}>Log Out</button>
        </div>
      </div>
    </div>
  );
}
