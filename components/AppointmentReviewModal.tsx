
import React, { useState, useEffect } from 'react';
import type { Appointment } from '../types';
import { XIcon } from './icons';
import BaseModal from './ui/BaseModal';

interface AppointmentReviewModalProps {
  appointments: Appointment[];
  onClose: () => void;
  onSave: (updatedAppointments: Appointment[]) => void;
}

const AppointmentReviewModal: React.FC<AppointmentReviewModalProps> = ({ appointments, onClose, onSave }) => {
  const [reviewedAppointments, setReviewedAppointments] = useState<Appointment[]>([]);

  useEffect(() => {
    setReviewedAppointments([...appointments]);
  }, [appointments]);

  const handleStatusChange = (appointmentId: string, status: Appointment['status']) => {
    setReviewedAppointments(prev =>
      prev.map(app => (app.id === appointmentId ? { ...app, status } : app))
    );
  };

  const handleSave = () => {
    onSave(reviewedAppointments);
    onClose();
  };

  return (
    <BaseModal isOpen={true} onClose={onClose} className="max-w-2xl w-full">
        <div className="p-4 border-b border-[var(--border-color)] flex justify-between items-center flex-shrink-0">
          <h2 className="text-xl font-bold text-[var(--text-primary)]">지난 일정 결과 확인</h2>
          <button onClick={onClose} className="text-[var(--text-muted)] hover:text-[var(--text-primary)]">
            <XIcon className="h-6 w-6" />
          </button>
        </div>
        <div className="p-6 overflow-y-auto flex-1 min-h-0 custom-scrollbar">
          <p className="text-[var(--text-secondary)] mb-4">
            결과가 입력되지 않은 지난 일정들이 있습니다. 각 일정의 결과를 선택해주세요.
          </p>
          <div className="space-y-4">
            {reviewedAppointments.map(app => (
              <div key={app.id} className="p-4 border border-[var(--border-color-strong)] rounded-lg bg-[var(--background-tertiary)]">
                <div className="mb-2">
                  <p className="font-semibold text-[var(--text-primary)]">{app.customerName}</p>
                  <p className="text-sm text-[var(--text-secondary)]">{app.date} {app.time} - {app.meetingType}</p>
                  {app.notes && <p className="text-sm text-[var(--text-muted)] mt-1">메모: {app.notes}</p>}
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-medium text-[var(--text-secondary)] mr-2">결과:</span>
                  <button
                    onClick={() => handleStatusChange(app.id, 'completed')}
                    className={`px-3 py-1 rounded-full text-xs font-medium border ${app.status === 'completed' ? 'bg-[var(--background-success)] text-[var(--text-on-accent)] border-transparent' : 'bg-[var(--background-secondary)] text-[var(--text-secondary)] hover:bg-[var(--background-primary)] border-[var(--border-color-strong)]'}`}
                  >
                    이행
                  </button>
                  <button
                    onClick={() => handleStatusChange(app.id, 'postponed')}
                    className={`px-3 py-1 rounded-full text-xs font-medium border ${app.status === 'postponed' ? 'bg-yellow-500 text-white border-transparent' : 'bg-[var(--background-secondary)] text-[var(--text-secondary)] hover:bg-[var(--background-primary)] border-[var(--border-color-strong)]'}`}
                  >
                    연기
                  </button>
                  <button
                    onClick={() => handleStatusChange(app.id, 'cancelled')}
                    className={`px-3 py-1 rounded-full text-xs font-medium border ${app.status === 'cancelled' ? 'bg-[var(--background-danger)] text-white border-transparent' : 'bg-[var(--background-secondary)] text-[var(--text-secondary)] hover:bg-[var(--background-primary)] border-[var(--border-color-strong)]'}`}
                  >
                    취소
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="p-4 bg-[var(--background-tertiary)] border-t border-[var(--border-color)] flex justify-end items-center space-x-4 flex-shrink-0">
          <button onClick={onClose} className="px-4 py-2 bg-[var(--background-secondary)] border border-[var(--border-color-strong)] rounded-md text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--background-tertiary)]">나중에 하기</button>
          <button onClick={handleSave} className="px-6 py-2 bg-[var(--background-accent)] text-[var(--text-on-accent)] rounded-md text-sm font-medium hover:bg-[var(--background-accent-hover)]">
            결과 저장
          </button>
        </div>
    </BaseModal>
  );
};

export default AppointmentReviewModal;