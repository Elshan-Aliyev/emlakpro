import React from 'react';
import './Input.css';

const Input = ({
  label,
  type = 'text',
  placeholder,
  value,
  onChange,
  onBlur,
  error,
  disabled = false,
  required = false,
  name,
  id,
  leftIcon,
  rightIcon,
  helperText,
  className = '',
  ...props
}) => {
  const inputId = id || name;
  const hasError = !!error;

  return (
    <div className={`input-wrapper ${className}`}>
      {label && (
        <label htmlFor={inputId} className="input-label">
          {label}
          {required && <span className="input-required">*</span>}
        </label>
      )}
      
      <div className={`input-container ${hasError ? 'input-error' : ''} ${disabled ? 'input-disabled' : ''}`}>
        {leftIcon && <span className="input-icon-left">{leftIcon}</span>}
        
        <input
          type={type}
          id={inputId}
          name={name}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          onBlur={onBlur}
          disabled={disabled}
          required={required}
          className={`input-field ${leftIcon ? 'has-left-icon' : ''} ${rightIcon ? 'has-right-icon' : ''}`}
          {...props}
        />
        
        {rightIcon && <span className="input-icon-right">{rightIcon}</span>}
      </div>
      
      {error && <p className="input-error-text">{error}</p>}
      {helperText && !error && <p className="input-helper-text">{helperText}</p>}
    </div>
  );
};

export default Input;
