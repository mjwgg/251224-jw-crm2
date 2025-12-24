import React, { useEffect, useRef } from 'react';

interface BaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  className?: string;
  zIndex?: string;
}

const BaseModal: React.FC<BaseModalProps> = ({ isOpen, onClose, children, className, zIndex = 'z-50' }) => {
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    if (isOpen) {
      document.addEventListener('keydown', handleEsc);
    }
    return () => {
      document.removeEventListener('keydown', handleEsc);
    };
  }, [isOpen, onClose]);

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className={`fixed inset-0 bg-[var(--background-overlay)] flex items-center justify-center p-4 animate-fade-in ${zIndex}`}
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
    >
      <div
        ref={modalRef}
        className={`bg-[var(--background-secondary)] border border-[var(--border-color)] text-[var(--text-secondary)] rounded-lg shadow-2xl max-h-[90vh] flex flex-col ${className}`}
      >
        {children}
      </div>
    </div>
  );
};

export default BaseModal;