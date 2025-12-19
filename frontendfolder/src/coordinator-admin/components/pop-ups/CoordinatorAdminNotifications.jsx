import React, { useEffect, useState } from 'react';
import Notification from '../../../shared/notification/NotificationContent';
import { HiOutlineDocumentAdd } from 'react-icons/hi';
import { MdUpdate } from 'react-icons/md';

const initialNotifications = [
  {
    id: 'c1',
    icon: <HiOutlineDocumentAdd size={20} />,
    title: 'New Ticket Submitted',
    message: 'A new support ticket was submitted by an employee.',
    time: '2 minutes ago',
  },
  {
    id: 'c2',
    icon: <MdUpdate size={20} />,
    title: 'User Approval Needed',
    message: 'You have pending user requests that need review.',
    time: '1 hour ago',
  },
  {
    id: 'c3',
    icon: <HiOutlineDocumentAdd size={20} />,
    title: 'System Maintenance',
    message: 'Scheduled maintenance will begin tonight at 10 PM.',
    time: '3 hours ago',
  },
];

const CoordinatorAdminNotifications = ({ show, onClose, onCountChange }) => {
  const [notifications, setNotifications] = useState(initialNotifications);

  useEffect(() => {
    if (onCountChange) onCountChange(notifications.length);
  }, [notifications, onCountChange]);

  const handleDelete = (id) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  const handleClearAll = () => setNotifications([]);

  return (
    <Notification
      items={notifications}
      open={show}
      onClose={onClose}
      onDelete={handleDelete}
      onClear={handleClearAll}
    />
  );
};

export default CoordinatorAdminNotifications;
