import React from 'react';
import styles from './Card.module.css';

/**
 * Generic Card component
 * @param {string} title - Card title
 * @param {React.ReactNode} children - Card content
 * @param {React.ReactNode} footer - Card footer content
 * @param {React.ReactNode} extra - Extra content in header (e.g. actions)
 * @param {string} className - Additional CSS classes
 * @param {boolean} flat - Whether the card should have no shadow
 * @param {boolean} interactive - Whether the card should have hover effects
 * @param {Function} onClick - Click handler
 */
const Card = ({
  title,
  children,
  footer,
  extra,
  className = '',
  flat = false,
  interactive = false,
  onClick,
  ...rest
}) => {
  const cardClasses = [
    styles.card,
    flat ? styles.flat : '',
    interactive ? styles.interactive : '',
    className,
  ].join(' ');

  return (
    <div className={cardClasses} onClick={onClick} {...rest}>
      {(title || extra) && (
        <div className={styles.header}>
          {title && <h3 className={styles.title}>{title}</h3>}
          {extra && <div className={styles.extra}>{extra}</div>}
        </div>
      )}
      <div className={styles.body}>{children}</div>
      {footer && <div className={styles.footer}>{footer}</div>}
    </div>
  );
};

export default Card;
