import React, { useEffect, useRef, useState } from 'react';
import styles from './NotificationContent.module.css';
import PropTypes from 'prop-types';
import { MdDeleteOutline, MdKeyboardArrowUp } from 'react-icons/md';

const Notification = ({ items = [], open, onClose, onDelete, onClear, onReadAll, className, loading, error }) => {
  const listRef = useRef(null);
  const [showScrollTop, setShowScrollTop] = useState(false);

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

  // Handle scroll to show/hide scroll-to-top button
  useEffect(() => {
    const listEl = listRef.current;
    if (!listEl) return;

    const handleScroll = () => {
      setShowScrollTop(listEl.scrollTop > 100);
    };

    listEl.addEventListener('scroll', handleScroll);
    return () => listEl.removeEventListener('scroll', handleScroll);
  }, [open]);

  const scrollToTop = () => {
    listRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (!open) return null;

  const unreadCount = items.filter(it => !it.isRead).length;

  const renderContent = () => {
    if (loading) {
      return <div className={styles['no-notifications']}>Loading notifications...</div>;
    }

    if (error) {
      return <div className={styles['no-notifications']} style={{ color: '#dc3545' }}>{error}</div>;
    }

    if (items.length === 0) {
      return <div className={styles['no-notifications']}>No new notifications</div>;
    }

    return items.map((it) => (
      <div
        key={it.id}
        className={`${styles['notification-item']} ${it.onClick ? styles['notification-item-clickable'] : ''} ${it.isRead ? styles['notification-item-read'] : styles['notification-item-unread']}`}
        role="listitem"
        onClick={(e) => {
          // Only trigger onClick if not clicking on delete button
          if (it.onClick && !e.target.closest('button')) {
            it.onClick();
          }
        }}
        style={it.onClick ? { cursor: 'pointer' } : {}}
      >
        {!it.isRead && <div className={styles['unread-indicator']} />}
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
    ));
  };

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
          <div className={styles['header-actions']}>
            <button
              className={styles['read-all-btn']}
              onClick={(e) => { e.stopPropagation(); onReadAll?.(); }}
              disabled={unreadCount === 0 || loading}
            >
              Read All
            </button>
            <button
              className={styles['clear-all-btn']}
              onClick={(e) => { e.stopPropagation(); onClear?.(); }}
              disabled={items.length === 0 || loading}
            >
              Clear All
            </button>
          </div>
        </div>

        <div className={styles['notification-list-wrapper']}>
          <div className={styles['notification-list']} role="list" ref={listRef}>
            {renderContent()}
          </div>
          {showScrollTop && (
            <button
              className={styles['scroll-top-btn']}
              onClick={scrollToTop}
              aria-label="Scroll to top"
            >
              <MdKeyboardArrowUp size={24} />
            </button>
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
  onReadAll: PropTypes.func,
  className: PropTypes.string,
  loading: PropTypes.bool,
  error: PropTypes.string,
};

export default Notification;
