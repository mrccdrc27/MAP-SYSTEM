import React from 'react';
import styles from './SelectField.module.css';

const SelectField = ({ 
  label,
  value,
  onChange,
  onBlur,
  onFocus,
  required = false,
  disabled = false,
  error = '',
  options = [],
  placeholder = 'Select an option',
  multiple = false, // Enable multi-select only when explicitly set to true
  size = 1, // Size for multi-select display (number of visible options)
  style = {},
  ...props
}) => {
  // Handle multi-select change
  const handleMultiSelectChange = (e) => {
    if (multiple) {
      const selectedOptions = Array.from(e.target.selectedOptions, option => option.value);
      // Create a synthetic event with selected values array
      const syntheticEvent = {
        target: {
          name: e.target.name,
          value: selectedOptions
        }
      };
      onChange(syntheticEvent);
    } else {
      onChange(e);
    }
  };

  return (
    <div className={styles.selectFieldContainer} style={style}>
      {label && (
        <label className={styles.label}>
          {label}
          {required && <span className={styles.required}> *</span>}
          {multiple && <span className={styles.multiSelectHint}> (Hold Ctrl/Cmd to select multiple)</span>}
        </label>
      )}
      <select
        className={`${styles.select} ${error ? styles.selectError : ''} ${disabled ? styles.selectDisabled : ''} ${multiple ? styles.multiSelect : ''}`}
        value={value}
        onChange={handleMultiSelectChange}
        onBlur={onBlur}
        onFocus={onFocus}
        disabled={disabled}
        multiple={multiple}
        size={multiple ? size : undefined}
        {...props}
      >
        {!multiple && <option value="">{placeholder}</option>}
        {options.map((option, index) => (
          <option 
            key={index} 
            value={option.value || option}
          >
            {option.label || option}
          </option>
        ))}
      </select>
      {error && (
        <div className={styles.errorMessage}>
          {error}
        </div>
      )}
    </div>
  );
};

export default SelectField;
