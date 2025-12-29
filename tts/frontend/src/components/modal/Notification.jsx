// react
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

// hook
import { useNotifications } from "../../api/useNotification";

// styles
import styles from "./notification.module.css";

import { formatDistanceToNow, parseISO } from "date-fns";

export default function Notification({
  closeNotifAction,
  parentFetchNotifications,
}) {
  const navigate = useNavigate();
  const {
    notifications,
    loading,
    error,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
  } = useNotifications();

  // Active tab: show 'unread' by default
  const [activeTab, setActiveTab] = useState("unread");

  // Prefetch all lists on mount so counts are available and tabs are responsive
  useEffect(() => {
    fetchNotifications("unread");
    fetchNotifications("read");
    fetchNotifications("all");
  }, [fetchNotifications]);

  const handleMarkAsRead = async (id) => {
    await markAsRead(id);
    // hook already refreshes lists after marking; no extra fetch needed here
    // But the parent (nav) uses its own hook instance -> ask parent to refresh
    if (typeof parentFetchNotifications === "function") {
      try {
        parentFetchNotifications("unread");
      } catch (e) {
        // swallow - best-effort
        // eslint-disable-next-line no-console
        console.warn("parentFetchNotifications failed:", e);
      }
    }
  };

  const handleClearAll = async () => {
    await markAllAsRead();
    // hook already refreshes lists after marking all; no extra fetch needed here
    // Tell parent nav to refresh its unread count too (best-effort)
    if (typeof parentFetchNotifications === "function") {
      try {
        parentFetchNotifications("unread");
      } catch (e) {
        // eslint-disable-next-line no-console
        console.warn("parentFetchNotifications failed:", e);
      }
    }
  };

  // Handle notification click - navigate to task if related_ticket_number exists
  const handleNotificationClick = async (notification) => {
    // Mark as read first
    if (!notification.is_read) {
      await handleMarkAsRead(notification.id);
    }
    
    // Navigate to ticket detail if related_ticket_number exists
    if (notification.related_ticket_number) {
      closeNotifAction(false);
      navigate(`/ticket/${notification.related_ticket_number}`);
    } else if (notification.related_task_item_id) {
      closeNotifAction(false);
      
      // Handle special format for ticket owner: "task_<task_id>_owner"
      // For owners, we need to navigate differently since they don't have a task_item_id
      const taskItemId = notification.related_task_item_id;
      if (taskItemId.startsWith('task_') && taskItemId.endsWith('_owner')) {
        // Extract task_id from "task_<task_id>_owner" format
        const taskId = taskItemId.replace('task_', '').replace('_owner', '');
        // Navigate to the task overview page instead of task item detail
        navigate(`/ticket?task=${taskId}`);
      } else {
        // Fallback - use task_item_id directly (old behavior for legacy notifications)
        // This should rarely happen if related_ticket_number is properly set
        console.warn('Notification missing related_ticket_number, using task_item_id fallback');
        navigate(`/ticket/${taskItemId}`);
      }
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
            list.map((n) => (
              <div 
                key={n.id} 
                className={`${styles.nItem} ${n.related_task_item_id ? styles.nItemClickable : ''}`}
                onClick={() => n.related_task_item_id && handleNotificationClick(n)}
                style={{ cursor: n.related_task_item_id ? 'pointer' : 'default' }}
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
                {(() => {
                  const isUnread =
                    n?.is_read === false ||
                    n?.is_read === 0 ||
                    n?.read === false ||
                    n?.read === 0 ||
                    // some backends use `is_read` being undefined for unread
                    (typeof n?.is_read === "undefined" && activeTab === "unread");
                  return isUnread ? <span className={styles.nUnreadDot} /> : null;
                })()}

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
            ))
          )}
        </div>
      </div>
    </div>
  );
}
