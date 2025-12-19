import React from 'react';
import styles from './InputField.module.css';

const InputField = ({ 
  type = 'text',
  label,
  placeholder,
  value,
  onChange,
  onBlur,
  onFocus,
  required = false,
  disabled = false,
  error = '',
  style = {},
  inputStyle = {},
  // Accept container class and input-specific class names
  className = '',
  inputClassName = '',
  ...props
}) => {
  // Avoid passing className/inputClassName through to the input via {...props}
  const otherProps = { ...props };
  delete otherProps.className;
  delete otherProps.inputClassName;

  return (
    <div className={`${styles.inputFieldContainer} ${className || ''}`} style={style}>
      {label && (
        <label className={styles.label}>
          {label}
          {required && <span className={styles.required}> *</span>}
        </label>
      )}
      <input
        type={type}
        className={`${styles.input} ${inputClassName || ''} ${error ? styles.inputError : ''} ${disabled ? styles.inputDisabled : ''}`}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        onBlur={onBlur}
        onFocus={onFocus}
        disabled={disabled}
        style={inputStyle}
        {...otherProps}
      />
      {error && (
        <div className={styles.errorMessage}>
          {error}
        </div>
      )}
    </div>
  );
};

export default InputField;
