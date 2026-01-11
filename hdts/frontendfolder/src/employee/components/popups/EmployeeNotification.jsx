import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Notification from '../../../shared/notification/NotificationContent';
import { HiOutlineDocumentAdd } from 'react-icons/hi';
import { MdUpdate, MdCheckCircle, MdCancel, MdAccessTime, MdPause, MdChat, MdArchive } from 'react-icons/md';
import { getNotifications, deleteNotification, clearAllNotifications, markAsRead, markAllAsRead, getUnreadCount } from '../../../services/notificationService';

/**
 * Map notification icon string to React icon component
 */
const getIconComponent = (iconType, notificationType) => {
  const iconMap = {
    'document-add': <HiOutlineDocumentAdd size={20} />,
    'check-circle': <MdCheckCircle size={20} color="#28a745" />,
    'x-circle': <MdCancel size={20} color="#dc3545" />,
    'clock': <MdAccessTime size={20} color="#007bff" />,
    'pause': <MdPause size={20} color="#ffc107" />,
    'check': <MdCheckCircle size={20} color="#28a745" />,
    'archive': <MdArchive size={20} />,
    'arrow-left': <MdUpdate size={20} />,
    'chat': <MdChat size={20} color="#17a2b8" />,
    'bell': <MdUpdate size={20} />,
  };

  // Fallback based on notification type
  const typeIconMap = {
    'ticket_submitted': <HiOutlineDocumentAdd size={20} />,
    'ticket_approved': <MdCheckCircle size={20} color="#28a745" />,
    'ticket_rejected': <MdCancel size={20} color="#dc3545" />,
    'ticket_in_progress': <MdAccessTime size={20} color="#007bff" />,
    'ticket_on_hold': <MdPause size={20} color="#ffc107" />,
    'ticket_resolved': <MdCheckCircle size={20} color="#28a745" />,
    'ticket_closed': <MdArchive size={20} />,
    'ticket_withdrawn': <MdUpdate size={20} />,
    'new_reply': <MdChat size={20} color="#17a2b8" />,
    'owner_reply': <MdChat size={20} color="#17a2b8" />,
  };

  return iconMap[iconType] || typeIconMap[notificationType] || <MdUpdate size={20} />;
};

const EmployeeNotification = ({ show, onClose, onCountChange }) => {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch notifications from API
  const fetchNotifications = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getNotifications({ limit: 50 });
      
      // Transform API data to component format
      const transformedNotifications = (data.notifications || []).map(n => ({
        id: n.id,
        icon: getIconComponent(n.icon, n.type),
        title: n.title,
        message: n.message,
        time: n.time,
        ticketId: n.ticket_id,
        ticketNumber: n.ticket_number,
        linkType: n.link_type,
        isRead: n.is_read,
        type: n.type,
      }));
      
      setNotifications(transformedNotifications);
      if (onCountChange) {
        onCountChange(data.unread_count || transformedNotifications.filter(n => !n.isRead).length);
      }
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
      setError('Failed to load notifications');
      // Fallback to empty array
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  }, [onCountChange]);

  // Fetch notifications when component mounts or show changes
  useEffect(() => {
    if (show) {
      fetchNotifications();
    }
  }, [show, fetchNotifications]);

  // Fetch unread count on mount (for badge display before panel is opened)
  useEffect(() => {
    const fetchUnreadCount = async () => {
      try {
        const data = await getUnreadCount();
        if (onCountChange) {
          onCountChange(data.unread_count || 0);
        }
      } catch (err) {
        console.error('Failed to fetch unread count:', err);
      }
    };
    fetchUnreadCount();
  }, [onCountChange]);

  // Notify parent about the count
  useEffect(() => {
    if (onCountChange) {
      const unreadCount = notifications.filter(n => !n.isRead).length;
      onCountChange(unreadCount);
    }
  }, [notifications, onCountChange]);

  const handleDelete = async (id) => {
    try {
      await deleteNotification(id);
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    } catch (err) {
      console.error('Failed to delete notification:', err);
    }
  };

  const handleClearAll = async () => {
    try {
      await clearAllNotifications();
      setNotifications([]);
    } catch (err) {
      console.error('Failed to clear notifications:', err);
    }
  };

  const handleReadAll = async () => {
    try {
      await markAllAsRead();
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, isRead: true }))
      );
    } catch (err) {
      console.error('Failed to mark all notifications as read:', err);
    }
  };

  const handleNotificationClick = async (notification) => {
    // Mark as read
    try {
      if (!notification.isRead) {
        await markAsRead(notification.id);
        setNotifications((prev) =>
          prev.map((n) =>
            n.id === notification.id ? { ...n, isRead: true } : n
          )
        );
      }
    } catch (err) {
      console.error('Failed to mark notification as read:', err);
    }

    // Navigate to the appropriate page
    if (notification.ticketNumber) {
      if (notification.linkType === 'message') {
        // Navigate to ticket messaging
        navigate(`/employee/ticket/${notification.ticketNumber}/messages`);
      } else {
        // Navigate to ticket tracker with the specific ticket
        navigate(`/employee/ticket-tracker/${notification.ticketNumber}`);
      }
    }

    // Close the notification panel
    onClose?.();
  };

  // Enhanced items with click handler
  const enhancedItems = notifications.map((n) => ({
    ...n,
    onClick: () => handleNotificationClick(n),
  }));

  return (
    <Notification
      items={enhancedItems}
      open={show}
      onClose={onClose}
      onDelete={handleDelete}
      onClear={handleClearAll}
      onReadAll={handleReadAll}
      loading={loading}
      error={error}
    />
  );
};

export default EmployeeNotification;