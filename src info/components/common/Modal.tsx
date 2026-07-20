import React, { useEffect } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
}

export function Modal({ isOpen, onClose, title, children, size = 'md' }: ModalProps) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const sizes = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-2xl',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className={`
        relative w-full ${sizes[size]} bg-(--surface) border border-(--border) rounded-2xl
        shadow-2xl shadow-black/50 animate-in fade-in zoom-in-95 duration-200
      `}>
        {title && (
          <div className="flex items-center justify-between px-6 py-4 border-b border-(--border)">
            <h3 className="text-lg font-semibold text-(--text-primary)">{title}</h3>
            <button
              onClick={onClose}
              className="p-1 rounded-lg hover:bg-(--surface-elevated) text-(--text-secondary) hover:text-(--text-primary) transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        )}
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}
