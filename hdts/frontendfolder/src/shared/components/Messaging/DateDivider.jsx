import React from 'react';
import styles from './DateDivider.module.css';

const DateDivider = ({ date }) => {
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined
      });
    }
  };

  return (
    <div className={styles.dateDivider}>
      <span className={styles.dateLine}></span>
      <span className={styles.dateText}>{formatDate(date)}</span>
      <span className={styles.dateLine}></span>
    </div>
  );
};

export default DateDivider;
