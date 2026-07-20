import React, { createContext, useCallback, useContext, useState } from 'react';

type ToastVariant = 'success' | 'error' | 'info';

interface ToastItem {
  id: string;
  title: string;
  description?: string;
  variant?: ToastVariant;
  linkUrl?: string;
  linkLabel?: string;
}

interface ToastContextValue {
  showToast: (toast: Omit<ToastItem, 'id'>) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismissToast = useCallback((id: string) => {
    setToasts(current => current.filter(toast => toast.id !== id));
  }, []);

  const showToast = useCallback((toast: Omit<ToastItem, 'id'>) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    const newToast: ToastItem = {
      id,
      variant: 'success',
      ...toast,
    };

    setToasts(current => [...current, newToast]);
    window.setTimeout(() => dismissToast(id), 5000);
  }, [dismissToast]);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed right-4 bottom-4 z-50 flex flex-col gap-3 max-w-sm">
        {toasts.map(toast => (
          <div
            key={toast.id}
            className={`rounded-2xl border px-4 py-3 shadow-xl backdrop-blur-lg transition-all duration-200 ${
              toast.variant === 'success'
                ? 'border-[#10b981]/20 bg-[#10b981]/10 text-[#047857]'
                : toast.variant === 'error'
                ? 'border-[#ef4444]/20 bg-[#ef4444]/10 text-[#991b1b]'
                : 'border-[#2563eb]/20 bg-[#2563eb]/10 text-[#1d4ed8]'
            }`}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1">
                <p className="text-sm font-semibold leading-snug">{toast.title}</p>
                {toast.description && <p className="text-xs leading-relaxed text-(--text-dim)">{toast.description}</p>}
              </div>
              <button
                type="button"
                onClick={() => dismissToast(toast.id)}
                className="text-xs font-medium text-(--text-dim) hover:text-(--text-primary)"
              >
                Close
              </button>
            </div>
            {toast.linkUrl && (
              <div className="mt-3">
                <a
                  href={toast.linkUrl}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-(--text-primary) transition hover:bg-white/15"
                >
                  {toast.linkLabel || 'View on BscScan'}
                </a>
              </div>
            )}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
