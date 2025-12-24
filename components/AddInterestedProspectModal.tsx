
import React, { useState, useMemo } from 'react';
import type { Customer, Appointment } from '../types';
import BaseModal from './ui/BaseModal';
import { XIcon } from './icons';

interface AddInterestedProspectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (customerIds: string[]) => void;
  customers: Customer[];
  appointments: Appointment[];
}

const calculateAge = (birthday: string): number | string => {
    if (!birthday) return '미입력';
    try {
        const birthDate = new Date(birthday);
        if (isNaN(birthDate.getTime())) return '미입력';
        const today = new Date();
        let age = today.getFullYear() - birthDate.getFullYear();
        const m = today.getMonth() - birthDate.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
            age--;
        }
        return age >= 0 ? age : '미입력';
    } catch {
        return '미입력';
    }
};

const AddInterestedProspectModal: React.FC<AddInterestedProspectModalProps> = ({ isOpen, onClose, onAdd, customers, appointments }) => {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');

  const availableCustomers = useMemo(() => {
    const today = new Date();
    const todayStr = new Date(today.getTime() - (today.getTimezoneOffset() * 60000)).toISOString().split('T')[0];

    const customerIdsOnBoard = new Set<string>();
    appointments.forEach(app => {
      if (app.customerId && app.date >= todayStr && app.status === 'scheduled' && ['AP', 'PC'].includes(app.meetingType)) {
        customerIdsOnBoard.add(app.customerId);
      }
    });

    return customers.filter(c =>
      c.status !== 'archived' &&
      !customerIdsOnBoard.has(c.id) &&
      !c.tags.includes('관심고객') &&
      !c.tags.includes('거절고객') &&
      c.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [customers, appointments, searchTerm]);

  const handleToggle = (id: string) => {
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const handleAddClick = () => {
    if (selectedIds.size > 0) {
      onAdd(Array.from(selectedIds));
      onClose();
    }
  };

  return (
    <BaseModal isOpen={isOpen} onClose={onClose} className="max-w-xl w-full h-[70vh]">
      <div className="p-4 border-b border-[var(--border-color)] flex justify-between items-center flex-shrink-0">
        <h2 className="text-xl font-bold text-[var(--text-primary)]">관심 고객 추가</h2>
        <button onClick={onClose} className="text-[var(--text-muted)] hover:text-[var(--text-primary)]"><XIcon className="h-6 w-6" /></button>
      </div>
      <div className="p-4 flex-1 min-h-0 flex flex-col">
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="고객 이름으로 검색..."
          className="w-full p-2 border border-[var(--border-color-strong)] rounded-md bg-[var(--background-tertiary)] text-[var(--text-primary)] mb-4 flex-shrink-0"
        />
        <div className="flex-1 min-h-0 overflow-y-auto space-y-2 border border-[var(--border-color)] rounded-lg p-2">
          {availableCustomers.map(customer => (
            <div
              key={customer.id}
              onClick={() => handleToggle(customer.id)}
              className={`flex items-start p-2 rounded-md cursor-pointer ${selectedIds.has(customer.id) ? 'bg-[var(--background-accent-subtle)]' : 'hover:bg-[var(--background-tertiary)]'}`}
            >
              <input
                type="checkbox"
                checked={selectedIds.has(customer.id)}
                readOnly
                className="h-5 w-5 rounded border-[var(--border-color-strong)] bg-[var(--background-secondary)] text-[var(--background-accent)] focus:ring-[var(--background-accent)] mr-3 mt-1"
              />
              <div>
                <div className="flex items-baseline gap-2">
                    <p className="font-semibold text-[var(--text-primary)]">{customer.name}</p>
                    <p className="text-sm text-[var(--text-muted)]">({calculateAge(customer.birthday)}세)</p>
                </div>
                <p className="text-sm text-[var(--text-muted)]">{customer.contact}</p>
                {customer.homeAddress && customer.homeAddress !== '미확인' && (
                  <p className="text-xs text-[var(--text-muted)] mt-1 truncate" title={customer.homeAddress}>
                    <span className="font-semibold">집:</span> {customer.homeAddress}
                  </p>
                )}
                {customer.workAddress && customer.workAddress !== '미확인' && (
                  <p className="text-xs text-[var(--text-muted)] mt-1 truncate" title={customer.workAddress}>
                    <span className="font-semibold">근무처:</span> {customer.workAddress}
                  </p>
                )}
              </div>
            </div>
          ))}
          {availableCustomers.length === 0 && (
            <p className="text-center text-[var(--text-muted)] py-4">추가할 수 있는 고객이 없습니다.</p>
          )}
        </div>
      </div>
      <div className="p-4 bg-[var(--background-tertiary)] border-t border-[var(--border-color)] flex justify-end gap-4 flex-shrink-0">
        <button onClick={onClose} className="px-4 py-2 bg-[var(--background-secondary)] border border-[var(--border-color-strong)] rounded-md text-sm font-medium text-[var(--text-secondary)]">취소</button>
        <button onClick={handleAddClick} disabled={selectedIds.size === 0} className="px-6 py-2 bg-[var(--background-accent)] text-[var(--text-on-accent)] rounded-md text-sm font-medium disabled:opacity-50">
          선택 추가 ({selectedIds.size})
        </button>
      </div>
    </BaseModal>
  );
};

export default AddInterestedProspectModal;
