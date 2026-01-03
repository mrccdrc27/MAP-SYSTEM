import React from 'react';
import styles from './Badge.module.css';

/**
 * Standardized Badge/Tag component for statuses
 * @param {string} variant - primary, success, danger, warning, info, secondary
 * @param {React.ReactNode} children - Badge content
 * @param {string} className - Additional CSS classes
 */
const Badge = ({ variant = 'primary', children, className = '', ...rest }) => {
  const badgeClasses = [
    styles.badge,
    styles[variant] || styles.primary,
    className
  ].join(' ');

  return (
    <span className={badgeClasses} {...rest}>
      {children}
    </span>
  );
};

export default Badge;
