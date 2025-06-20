// style
import styles from "./notification.module.css";

export default function Notification({ closeNotifAction }) {
  return (
    <div
      className={styles.nOverlayWrapper}
      onClick={() => {
        closeNotifAction(false);
      }}
    >
      <div
        className={styles.notificationModalCont}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={styles.nHeader}>
          <h2>Notifications</h2>
          <button className={styles.nClearButton}>Clear All</button>
        </div>
        <div className={styles.nList}>
          <div className={styles.nItem}>
            <div className={styles.nUserAvatar}>
              <img
                className={styles.userAvatar}
                src="https://i.pinimg.com/736x/e6/50/7f/e6507f42d79520263d8d952633cedcf2.jpg"
                alt="Anime Avatar"
              />
            </div>
            <div className={styles.nContent}>
              <h3>Name</h3>
              <p>Message</p>
              <span className={styles.nTime}>Time</span>
            </div>
            <div className={styles.nDeleteButton}>
              <i className="fa-solid fa-trash"></i>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
