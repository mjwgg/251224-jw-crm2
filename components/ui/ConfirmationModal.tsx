
import React from 'react';
import BaseModal from './BaseModal';

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: React.ReactNode;
  zIndex?: string;
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({ isOpen, onClose, onConfirm, title, message, zIndex = 'z-[60]' }) => {
  return (
    <BaseModal isOpen={isOpen} onClose={onClose} className="max-w-md w-full" zIndex={zIndex}>
        <div className="p-4 border-b border-[var(--border-color)]">
            <h3 className="text-lg leading-6 font-medium text-[var(--text-primary)]" id="modal-title">
                {title}
            </h3>
        </div>
        <div className="p-6 flex-1 min-h-0 overflow-y-auto">
          <div className="flex items-start">
            <div className="mx-auto flex-shrink-0 flex items-center justify-center h-10 w-10 rounded-full bg-red-500/10 sm:mx-0">
              <svg className="h-6 w-6 text-[var(--text-danger)]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div className="mt-0 ml-4 text-left">
              <div className="text-sm text-[var(--text-muted)]">
                {message}
              </div>
            </div>
          </div>
        </div>
        <div className="bg-[var(--background-tertiary)] p-4 flex flex-row-reverse rounded-b-lg">
          <button
            type="button"
            className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-[var(--background-danger)] text-base font-medium text-white hover:bg-[var(--background-danger-hover)] sm:ml-3 sm:w-auto sm:text-sm"
            onClick={onConfirm}
          >
            삭제
          </button>
          <button
            type="button"
            className="mt-3 w-full inline-flex justify-center rounded-md border border-[var(--border-color-strong)] shadow-sm px-4 py-2 bg-[var(--background-secondary)] text-base font-medium text-[var(--text-secondary)] hover:bg-[var(--background-primary)] sm:mt-0 sm:w-auto sm:text-sm"
            onClick={onClose}
          >
            취소
          </button>
        </div>
    </BaseModal>
  );
};

export default ConfirmationModal;