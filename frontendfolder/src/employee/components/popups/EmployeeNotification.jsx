import React, { useEffect, useState } from 'react';
import Notification from '../../../shared/notification/NotificationContent';
import { HiOutlineDocumentAdd } from 'react-icons/hi';
import { MdUpdate } from 'react-icons/md';

const EmployeeNotification = ({ show, onClose, onCountChange }) => {
  const [notifications, setNotifications] = useState([
    {
      id: 'n1',
      icon: <HiOutlineDocumentAdd size={20} />,
      title: 'New ticket submitted',
      message: 'Your request has been received.',
      time: '2 minutes ago',
    },
    {
      id: 'n2',
      icon: <MdUpdate size={20} />,
      title: 'Ticket updated',
      message: 'Status changed to "In Progress".',
      time: '1 hour ago',
    },
  ]);

  // Notify parent about the count
  useEffect(() => {
    if (onCountChange) onCountChange(notifications.length);
  }, [notifications, onCountChange]);

  const handleDelete = (id) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  const handleClearAll = () => setNotifications([]);

  // keep previous behavior: close when clicking outside handled by Notification
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

export default EmployeeNotification;