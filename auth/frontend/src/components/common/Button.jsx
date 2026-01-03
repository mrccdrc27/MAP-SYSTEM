import React from 'react';
import styles from './Button.module.css';

/**
 * Generic Button component
 * @param {string} type - HTML button type (button, submit, reset)
 * @param {string} variant - Button style variant (primary, secondary, danger, success, outline)
 * @param {string} size - Button size (small, medium, large)
 * @param {boolean} isLoading - Whether the button is in a loading state
 * @param {boolean} disabled - Whether the button is disabled
 * @param {React.ReactNode} children - Button content
 * @param {Function} onClick - Click handler
 * @param {string} className - Additional CSS classes
 * @param {Object} rest - Other HTML button attributes
 */
const Button = ({
  type = 'button',
  variant = 'primary',
  size = 'medium',
  isLoading = false,
  disabled = false,
  fullWidth = false,
  children,
  onClick,
  className = '',
  icon,
  ...rest
}) => {
  const buttonClasses = [
    styles.button,
    styles[variant],
    styles[size],
    fullWidth ? styles.fullWidth : '',
    className,
  ].join(' ');

  return (
    <button
      type={type}
      className={buttonClasses}
      disabled={disabled || isLoading}
      onClick={onClick}
      {...rest}
    >
      {isLoading ? (
        <>
          <span className={styles.spinner}></span>
          <span className={styles.loadingText}>Loading...</span>
        </>
      ) : (
        <>
          {icon && <span className={styles.icon}>{icon}</span>}
          {children}
        </>
      )}
    </button>
  );
};

export default Button;
