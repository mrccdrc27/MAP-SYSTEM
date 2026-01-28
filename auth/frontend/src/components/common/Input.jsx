import React from 'react';
import styles from './Input.module.css';

/**
 * Generic Input component
 * @param {string} label - Input label
 * @param {string} name - Input name attribute
 * @param {string} type - HTML input type
 * @param {string} value - Input value
 * @param {string} placeholder - Input placeholder
 * @param {string} error - Error message to display
 * @param {string} hint - Hint text to display below the input
 * @param {Function} onChange - Change handler
 * @param {boolean} required - Whether the input is required
 * @param {React.ReactNode} icon - Icon to display inside the input
 * @param {Function} onIconClick - Handler for icon click
 * @param {string} className - Additional CSS classes
 */
const Input = ({
  label,
  name,
  type = 'text',
  value,
  placeholder,
  error,
  hint,
  onChange,
  required = false,
  icon,
  onIconClick,
  className = '',
  id,
  ...rest
}) => {
  const inputId = id || `input-${name}`;

  return (
    <div className={`${styles.formGroup} ${className}`}>
      {label && (
        <label htmlFor={inputId} className={styles.label}>
          {label} {required && <span className={styles.required}>*</span>}
        </label>
      )}
      <div className={styles.inputContainer}>
        <input
          id={inputId}
          name={name}
          type={type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          required={required}
          className={`${styles.input} ${error ? styles.inputError : ''} ${icon ? styles.hasIcon : ''}`}
          {...rest}
        />
        {icon && (
          <span 
            className={`${styles.icon} ${onIconClick ? styles.clickableIcon : ''}`} 
            onClick={onIconClick}
          >
            {icon}
          </span>
        )}
      </div>
      {error && <small className={styles.errorText}>{error}</small>}
      {hint && !error && <small className={styles.hintText}>{hint}</small>}
    </div>
  );
};

export default Input;
