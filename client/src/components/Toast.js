import React, { createContext, useContext, useState, useCallback } from 'react';
import { Check, X, AlertTriangle, Info } from 'lucide-react';
import './Toast.css';

const ToastContext = createContext(null);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return context;
};

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = 'info', duration = 3000) => {
    const id = Date.now() + Math.random();
    const toast = { id, message, type, duration };
    
    setToasts((prev) => [...prev, toast]);

    if (duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, duration);
    }

    return id;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const success = useCallback((message, duration) => {
    return addToast(message, 'success', duration);
  }, [addToast]);

  const error = useCallback((message, duration) => {
    return addToast(message, 'error', duration);
  }, [addToast]);

  const warning = useCallback((message, duration) => {
    return addToast(message, 'warning', duration);
  }, [addToast]);

  const info = useCallback((message, duration) => {
    return addToast(message, 'info', duration);
  }, [addToast]);

  return (
    <ToastContext.Provider value={{ success, error, warning, info, addToast, removeToast }}>
      {children}
      <div className="toast-container">
        {toasts.map((toast) => (
          <Toast key={toast.id} {...toast} onClose={() => removeToast(toast.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
};

const TOAST_ICONS = {
  success: <Check     size={14} strokeWidth={2.5} aria-hidden="true" />,
  error:   <X         size={14} strokeWidth={2.5} aria-hidden="true" />,
  warning: <AlertTriangle size={14} strokeWidth={2} aria-hidden="true" />,
  info:    <Info      size={14} strokeWidth={2}   aria-hidden="true" />,
};

const Toast = ({ id, message, type, onClose }) => (
  <div className={`toast toast-${type}`}>
    <div className="toast-icon">{TOAST_ICONS[type]}</div>
    <div className="toast-message">{message}</div>
    <button className="toast-close" onClick={onClose} aria-label="Close">
      <X size={12} strokeWidth={2.5} aria-hidden="true" />
    </button>
  </div>
);

export default ToastProvider;
