import React, { useEffect } from 'react';
import styles from './NotificationContent.module.css';
import PropTypes from 'prop-types';
import { MdDeleteOutline } from 'react-icons/md';

const Notification = ({ items = [], open, onClose, onDelete, onClear, className }) => {
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose?.(); };
    if (open) {
      window.addEventListener('keydown', onKey);
      // prevent background scroll
      document.body.style.overflow = 'hidden';
    }
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className={styles['notification-overlay']} onClick={onClose}>
      <div
        className={`${styles['notification-container']} ${className || ''}`}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label="Notifications"
      >
        <div className={styles['notification-header']}>
          <h2>Notifications</h2>
          <button
            className={styles['clear-all-btn']}
            onClick={(e) => { e.stopPropagation(); onClear?.(); }}
            disabled={items.length === 0}
          >
            Clear All
          </button>
        </div>

        <div className={styles['notification-list']} role="list">
          {items.length === 0 ? (
            <div className={styles['no-notifications']}>No new notifications</div>
          ) : (
            items.map((it) => (
              <div key={it.id} className={styles['notification-item']} role="listitem">
                <div className={styles['notification-icon']}>{it.icon}</div>
                <div className={styles['notification-content']}>
                  <h3>{it.title}</h3>
                  <p>{it.message}</p>
                  <span className={styles['notification-time']}>{it.time}</span>
                </div>
                <button
                  className={styles['delete-notification-btn']}
                  aria-label="Delete notification"
                  onClick={(e) => { e.stopPropagation(); onDelete?.(it.id); }}
                >
                  <MdDeleteOutline size={18} />
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

Notification.propTypes = {
  items: PropTypes.array,
  open: PropTypes.bool,
  onClose: PropTypes.func,
  onDelete: PropTypes.func,
  onClear: PropTypes.func,
  className: PropTypes.string,
};

export default Notification;
