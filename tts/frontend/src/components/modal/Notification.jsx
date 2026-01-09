// react
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

// Notification context (shared WebSocket connection)
import { useNotificationContext } from "../../context/NotificationContext";

// styles
import styles from "./notification.module.css";

import { formatDistanceToNow, parseISO } from "date-fns";

export default function Notification({
  closeNotifAction,
}) {
  const navigate = useNavigate();
  
  // Use shared notification context (single WebSocket, shared state)
  const {
    notifications,
    loading,
    error,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    wsConnected,
  } = useNotificationContext();

  // Active tab: show 'unread' by default
  const [activeTab, setActiveTab] = useState("unread");

  // Fetch all lists on mount so counts are available and tabs are responsive
  useEffect(() => {
    fetchNotifications("unread");
    fetchNotifications("read");
    fetchNotifications("all");
  }, [fetchNotifications]);

  const handleMarkAsRead = async (id) => {
    await markAsRead(id);
    // Context state is shared across all consumers, no need to refresh parent
  };

  const handleClearAll = async () => {
    await markAllAsRead();
    // Context state is shared across all consumers, no need to refresh parent
  };

  // Handle notification click - mark as read and navigate if possible
  const handleNotificationClick = async (notification) => {
    // Check if unread using robust logic
    const isUnread =
      notification?.is_read === false ||
      notification?.is_read === 0 ||
      notification?.read === false ||
      notification?.read === 0;

    // Mark as read first
    if (isUnread) {
      await handleMarkAsRead(notification.id);
    }
    
    // Navigate to ticket detail if related_ticket_number exists
    if (notification.related_ticket_number) {
      closeNotifAction(false);
      navigate(`/ticket/${notification.related_ticket_number}`);
    }
  };

  // Normalize list to ensure it's always an array before mapping
  const rawList = notifications?.[activeTab] || [];
  const list = Array.isArray(rawList) ? rawList : [];
  if (rawList && !Array.isArray(rawList)) {
    // eslint-disable-next-line no-console
    console.warn(
      "Notifications list is not an array, falling back to empty array",
      rawList
    );
  }

  const unreadCount = Array.isArray(notifications?.unread)
    ? notifications.unread.length
    : 0;
  const readCount = Array.isArray(notifications?.read)
    ? notifications.read.length
    : 0;
  const allCount = Array.isArray(notifications?.all)
    ? notifications.all.length
    : 0;

  // Function to format date
  const formatDate = (dateString) => {
    const date = parseISO(dateString); // Parse the ISO date string to Date object
    return formatDistanceToNow(date, { addSuffix: true }); // e.g. "2 hours ago"
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
          <div className={styles.nHeaderRight}>
            <div className={styles.tabGroup}>
              <button
                className={
                  activeTab === "unread" ? styles.activeTab : styles.tab
                }
                onClick={() => setActiveTab("unread")}
                title="Unread"
              >
                <i className="fa-solid fa-envelope"></i> ({unreadCount})
              </button>

              <button
                className={activeTab === "read" ? styles.activeTab : styles.tab}
                onClick={() => setActiveTab("read")}
                title="Read"
              >
                <i className="fa-solid fa-envelope-open"></i> ({readCount})
              </button>

              <button
                className={activeTab === "all" ? styles.activeTab : styles.tab}
                onClick={() => setActiveTab("all")}
                title="All"
              >
                <i className="fa-solid fa-bell"></i> ({allCount})
              </button>
            </div>

            {activeTab === "unread" && unreadCount > 0 && (
              <button className={styles.nClearButton} onClick={handleClearAll}>
                Mark All Read
              </button>
            )}
          </div>
        </div>

        {loading && <div className={styles.emptyState}>Loading...</div>}
        {error && <div className={styles.emptyState}>{error}</div>}

        <div className={styles.nList}>
          {!loading && !error && list.length === 0 ? (
            <p className={styles.emptyState}>No notifications.</p>
          ) : (
            list.map((n, index) => {
              const isUnread =
                n?.is_read === false ||
                n?.is_read === 0 ||
                n?.read === false ||
                n?.read === 0 ||
                // some backends use `is_read` being undefined for unread
                (typeof n?.is_read === "undefined" && activeTab === "unread");

              return (
                <div 
                  key={n.id || `notif-${index}`} 
                  className={`${styles.nItem} ${styles.nItemClickable}`}
                  onClick={() => handleNotificationClick(n)}
                  style={{ cursor: 'pointer' }}
                >
                  <div className={styles.nUserAvatar}>
                    <img
                      className={styles.userAvatar}
                      src="/map-logo.png"
                      alt="User Avatar"
                    />
                  </div>
                  <div className={styles.nContent}>
                    <h3>{n.subject || "no subject"}</h3>
                    <p>{n.message}</p>
                    <span className={styles.nTime}>
                      {n.created_at ? formatDate(n.created_at) : "Just now"}
                    </span>
                  </div>
                  {/* show a small blue unread dot for notifications that are not read */}
                  {isUnread && <span className={styles.nUnreadDot} />}

                  <div
                    className={styles.nDeleteButton}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleMarkAsRead(n.id);
                    }}
                  >
                    <i className="fa-solid fa-trash"></i>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
