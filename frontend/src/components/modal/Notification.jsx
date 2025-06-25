// style
import styles from "./notification.module.css";
import { useEffect, useState } from "react";
import { useAuthFetch } from "../../api/useAuthFetch"; // adjust if needed

const BASE_URL = import.meta.env.VITE_USER_SERVER_API;
const NOTIF_URL = `${BASE_URL}api/notifications/`;

export default function Notification({ closeNotifAction }) {
  const authFetch = useAuthFetch();
  const [notifications, setNotifications] = useState([]);

  // Load notifications
  useEffect(() => {
    authFetch(NOTIF_URL)
      .then((res) => res.json())
      .then((data) => setNotifications(data))
      .catch((err) => console.error("Failed to fetch notifications", err));
  }, []);

  // Mark one notification as read
  const markAsRead = (id) => {
    authFetch(`${NOTIF_URL}${id}/read/`, {
      method: "PATCH",
      body: JSON.stringify({ is_read: true }),
    })
      .then((res) => {
        if (res.ok) {
          setNotifications((prev) => prev.filter((n) => n.id !== id));
        }
      })
      .catch((err) => console.error("Failed to mark as read", err));
  };

  // Mark all notifications as read
  const clearAll = () => {
    Promise.all(
      notifications.map((n) =>
        authFetch(`${NOTIF_URL}${n.id}/read/`, {
          method: "PATCH",
          body: JSON.stringify({ is_read: true }),
        })
      )
    )
      .then(() => setNotifications([]))
      .catch((err) => console.error("Failed to clear all", err));
  };

  return (
    <div
      className={styles.nOverlayWrapper}
      onClick={() => closeNotifAction(false)}
    >
      <div
        className={styles.notificationModalCont}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={styles.nHeader}>
          <h2>Notifications</h2>
          <button className={styles.nClearButton} onClick={clearAll}>
            Clear All
          </button>
        </div>
        <div className={styles.nList}>
          {notifications.length === 0 ? (
            <p className={styles.emptyState}>No notifications.</p>
          ) : (
            notifications.map((n) => (
              <div key={n.id} className={styles.nItem}>
                <div className={styles.nUserAvatar}>
                  <img
                    className={styles.userAvatar}
                    src={
                      n.avatar ||
                      "https://i.pinimg.com/736x/e6/50/7f/e6507f42d79520263d8d952633cedcf2.jpg"
                    }
                    alt="User Avatar"
                  />
                </div>
                <div className={styles.nContent}>
                  <h3>{n.type || "No Type"}</h3>
                  <p>{n.message}</p>
                  <span className={styles.nTime}>
                    {n.created_at || "Just now"}
                  </span>
                </div>
                <div
                  className={styles.nDeleteButton}
                  onClick={() => markAsRead(n.id)}
                >
                  <i className="fa-solid fa-trash"></i>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
