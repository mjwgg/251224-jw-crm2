
import React, { useState, useEffect, useRef } from 'react';
import type { Customer } from '../types';
import BaseModal from './ui/BaseModal';
import { XIcon } from './icons';

interface AddReminderModalProps {
  isOpen: boolean;
  onClose: () => void;
  customers: Customer[];
  onSave: (data: { customerId?: string; name: string; date: string; notes: string }) => Promise<void>;
  reminderToEdit?: Customer | null;
}

const AddReminderModal: React.FC<AddReminderModalProps> = ({ isOpen, onClose, customers, onSave, reminderToEdit }) => {
  const [name, setName] = useState('');
  const [date, setDate] = useState('');
  const [notes, setNotes] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [suggestions, setSuggestions] = useState<Customer[]>([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
        if (reminderToEdit) {
            setName(reminderToEdit.name);
            setDate(reminderToEdit.nextFollowUpDate || '');
            const latestOtherNote = reminderToEdit.callHistory
                ?.filter(h => h.result === 'other')
                ?.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0]?.notes || '';
            setNotes(latestOtherNote);
            setSelectedCustomer(reminderToEdit);
        } else {
            setName('');
            const today = new Date();
            today.setDate(today.getDate() + 1); // Default to tomorrow
            setDate(new Date(today.getTime() - (today.getTimezoneOffset() * 60000)).toISOString().split('T')[0]);
            setNotes('');
            setSelectedCustomer(null);
        }
        setError('');
    }
  }, [isOpen, reminderToEdit]);

  useEffect(() => {
    if (name && !reminderToEdit) {
      const filtered = customers.filter(c => 
        c.name.toLowerCase().includes(name.toLowerCase())
      );
      setSuggestions(filtered);
      setIsDropdownOpen(filtered.length > 0 && !selectedCustomer);
    } else {
      setSuggestions([]);
      setIsDropdownOpen(false);
    }
  }, [name, customers, selectedCustomer, reminderToEdit]);
  
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!reminderToEdit) {
        setSelectedCustomer(null);
    }
    setName(e.target.value);
  };

  const handleSelectCustomer = (customer: Customer) => {
    setSelectedCustomer(customer);
    setName(customer.name);
    setIsDropdownOpen(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!date) {
        setError('재접촉 시점은 필수입니다.');
        return;
    }
    if (!name.trim() && !notes.trim()) {
        setError('제목(또는 고객명)이나 메모 중 하나는 입력해야 합니다.');
        return;
    }
    setError('');
    await onSave({
      customerId: reminderToEdit ? reminderToEdit.id : selectedCustomer?.id,
      name: name.trim(),
      date,
      notes,
    });
  };

  return (
    <BaseModal isOpen={isOpen} onClose={onClose} className="max-w-lg w-full" zIndex="z-[70]">
      <form onSubmit={handleSubmit}>
        <div className="p-6 border-b border-[var(--border-color)] flex justify-between items-center">
          <h2 className="text-2xl font-bold text-[var(--text-primary)]">{reminderToEdit ? '리마인더 수정' : '리마인더 추가'}</h2>
          <button type="button" onClick={onClose} className="text-[var(--text-muted)] hover:text-[var(--text-primary)]"><XIcon className="h-6 w-6" /></button>
        </div>
        <div className="p-6 space-y-4">
          {error && <p className="text-sm text-center text-[var(--text-danger)] bg-red-500/10 p-2 rounded-md">{error}</p>}
          <div className="relative">
            <label htmlFor="customerName" className="block text-sm font-medium text-[var(--text-secondary)]">제목 / 고객명</label>
            <input
              ref={inputRef}
              type="text"
              id="customerName"
              value={name}
              onChange={handleNameChange}
              onBlur={() => setTimeout(() => setIsDropdownOpen(false), 200)}
              onFocus={() => name && suggestions.length > 0 && setIsDropdownOpen(true)}
              className="mt-1 block w-full bg-[var(--background-tertiary)] border border-[var(--border-color-strong)] rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-[var(--background-accent)] focus:border-[var(--background-accent)]"
              placeholder="리마인더 제목 또는 기존 고객 검색"
              autoComplete="off"
            />
            {isDropdownOpen && (
              <ul className="absolute z-10 w-full mt-1 bg-[var(--background-secondary)] border border-[var(--border-color-strong)] rounded-md shadow-lg max-h-40 overflow-y-auto">
                {suggestions.map(customer => (
                  <li
                    key={customer.id}
                    onClick={() => handleSelectCustomer(customer)}
                    className="p-2 hover:bg-[var(--background-accent-subtle)] cursor-pointer"
                  >
                    {customer.name} <span className="text-xs text-[var(--text-muted)]">{customer.contact}</span>
                  </li>
                ))}
              </ul>
            )}
            {!reminderToEdit && (
                <p className="text-xs text-[var(--text-muted)] mt-1">
                {selectedCustomer ? `기존 고객: ${selectedCustomer.name}` : '새 리마인더로 등록됩니다.'}
                </p>
            )}
          </div>
          <div>
            <label htmlFor="recontactDate" className="block text-sm font-medium text-[var(--text-secondary)]">재접촉 시점</label>
            <input
              type="date"
              id="recontactDate"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="mt-1 block w-full bg-[var(--background-tertiary)] border border-[var(--border-color-strong)] rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-[var(--background-accent)] focus:border-[var(--background-accent)]"
            />
          </div>
          <div>
            <label htmlFor="notes" className="block text-sm font-medium text-[var(--text-secondary)]">메모</label>
            <textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="mt-1 block w-full bg-[var(--background-tertiary)] border border-[var(--border-color-strong)] rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-[var(--background-accent)] focus:border-[var(--background-accent)]"
              placeholder="재접촉 시 참고할 내용을 기록하세요."
            />
          </div>
        </div>
        <div className="p-6 bg-[var(--background-tertiary)] border-t border-[var(--border-color)] flex justify-end items-center space-x-4">
          <button type="button" onClick={onClose} className="px-4 py-2 bg-[var(--background-secondary)] border border-[var(--border-color-strong)] rounded-md text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--background-primary)]">취소</button>
          <button type="submit" className="px-6 py-2 bg-[var(--background-accent)] text-[var(--text-on-accent)] rounded-md text-sm font-medium hover:bg-[var(--background-accent-hover)]">저장</button>
        </div>
      </form>
    </BaseModal>
  );
};

export default AddReminderModal;
