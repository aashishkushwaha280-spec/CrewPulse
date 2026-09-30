import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertTriangle, AlertCircle, Info, X } from 'lucide-react';

const ToastContext = createContext(null);

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback((messageOrObj, type = 'info', title = '') => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
    let toastItem = {};

    if (typeof messageOrObj === 'string') {
      toastItem = {
        id,
        message: messageOrObj,
        type,
        title: title || (type === 'success' ? 'Success' : type === 'error' ? 'Notice' : type === 'warning' ? 'Warning' : 'Information'),
        duration: 4000
      };
    } else {
      toastItem = {
        id,
        message: messageOrObj.message,
        type: messageOrObj.type || 'info',
        title: messageOrObj.title || '',
        duration: messageOrObj.duration || 4000
      };
    }

    setToasts((prev) => [...prev, toastItem]);

    if (toastItem.duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, toastItem.duration);
    }

    return id;
  }, [removeToast]);

  const getIcon = (type) => {
    switch (type) {
      case 'success':
        return <CheckCircle2 size={18} color="#10B981" />;
      case 'error':
        return <AlertCircle size={18} color="#EF4444" />;
      case 'warning':
        return <AlertTriangle size={18} color="#F59E0B" />;
      case 'info':
      default:
        return <Info size={18} color="#6366F1" />;
    }
  };

  const getBorderColor = (type) => {
    switch (type) {
      case 'success':
        return 'rgba(16, 185, 129, 0.35)';
      case 'error':
        return 'rgba(239, 68, 68, 0.35)';
      case 'warning':
        return 'rgba(245, 158, 11, 0.35)';
      case 'info':
      default:
        return 'rgba(99, 102, 241, 0.35)';
    }
  };

  return (
    <ToastContext.Provider value={{ showToast, removeToast }}>
      {children}
      {/* Toast Notification Container */}
      <div
        style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          zIndex: 999999,
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
          maxWidth: '420px',
          width: 'calc(100vw - 40px)',
          pointerEvents: 'none'
        }}
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            style={{
              pointerEvents: 'auto',
              background: 'rgba(15, 22, 38, 0.94)',
              backdropFilter: 'blur(16px)',
              border: `1px solid ${getBorderColor(toast.type)}`,
              borderRadius: '12px',
              padding: '14px 16px',
              color: '#F8FAFC',
              boxShadow: '0 12px 36px rgba(0, 0, 0, 0.55), 0 0 20px rgba(99, 102, 241, 0.1)',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '12px',
              animation: 'toastSlideIn 0.28s cubic-bezier(0.16, 1, 0.3, 1)',
              transition: 'all 0.2s ease'
            }}
          >
            <div style={{ marginTop: '2px', flexShrink: 0 }}>
              {getIcon(toast.type)}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              {toast.title && (
                <div
                  style={{
                    fontWeight: 700,
                    fontSize: '0.86rem',
                    color: '#FFF',
                    marginBottom: '2px'
                  }}
                >
                  {toast.title}
                </div>
              )}
              <div
                style={{
                  fontSize: '0.8rem',
                  color: '#CBD5E1',
                  lineHeight: '1.4',
                  wordBreak: 'break-word'
                }}
              >
                {toast.message}
              </div>
            </div>
            <button
              onClick={() => removeToast(toast.id)}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#64748B',
                cursor: 'pointer',
                padding: '2px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '4px',
                flexShrink: 0,
                marginTop: '1px'
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = '#FFF')}
              onMouseLeave={(e) => (e.currentTarget.style.color = '#64748B')}
              aria-label="Close notification"
            >
              <X size={15} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    // Graceful fallback if invoked outside ToastProvider
    return {
      showToast: (msg) => console.log('Toast:', msg),
      removeToast: () => {}
    };
  }
  return context;
};
