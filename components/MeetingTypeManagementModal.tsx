import React, { useState, useEffect } from 'react';
import BaseModal from './ui/BaseModal';
import { XIcon, PlusIcon, PencilIcon, TrashIcon, CheckIcon } from './icons';
import { getItem, setItem } from '../services/storageService';

// LocalStorage Keys
const CUSTOMER_MEETING_TYPES_KEY = 'customer_meeting_types';
const PERSONAL_MEETING_TYPES_KEY = 'personal_meeting_types';

// Default Values (Fallback)
const DEFAULT_CUSTOMER_TYPES = ['AP', 'PC', '기타', '증권전달'];
const DEFAULT_PERSONAL_TYPES = ['교육', '회의', '업무', '개인', '운동'];

interface MeetingTypeManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const MeetingTypeManagementModal: React.FC<MeetingTypeManagementModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'customer' | 'personal'>('customer');
  const [customerTypes, setCustomerTypes] = useState<string[]>([]);
  const [personalTypes, setPersonalTypes] = useState<string[]>([]);
  
  const [newType, setNewType] = useState('');
  const [editingType, setEditingType] = useState<{ original: string; current: string } | null>(null);
  const [error, setError] = useState('');

  // Load data from localStorage on open
  useEffect(() => {
    if (isOpen) {
      const loadedCustomerTypes = getItem<string[]>(CUSTOMER_MEETING_TYPES_KEY) || DEFAULT_CUSTOMER_TYPES;
      const loadedPersonalTypes = getItem<string[]>(PERSONAL_MEETING_TYPES_KEY) || DEFAULT_PERSONAL_TYPES;
      
      setCustomerTypes(loadedCustomerTypes);
      setPersonalTypes(loadedPersonalTypes);
      
      // Reset states
      setNewType('');
      setEditingType(null);
      setError('');
      setActiveTab('customer');
    }
  }, [isOpen]);

  const getCurrentList = () => activeTab === 'customer' ? customerTypes : personalTypes;
  const setCurrentList = (list: string[]) => activeTab === 'customer' ? setCustomerTypes(list) : setPersonalTypes(list);
  const getStorageKey = () => activeTab === 'customer' ? CUSTOMER_MEETING_TYPES_KEY : PERSONAL_MEETING_TYPES_KEY;

  const saveToStorage = (list: string[]) => {
    setItem(getStorageKey(), list);
    // Dispatch event to notify other components (e.g., App.tsx) to reload types
    window.dispatchEvent(new CustomEvent('meeting-types-updated'));
  };

  const handleAdd = () => {
    const trimmed = newType.trim();
    if (!trimmed) {
        setError('유형 이름을 입력해주세요.');
        return;
    }
    
    const currentList = getCurrentList();
    if (currentList.includes(trimmed)) {
      setError('이미 존재하는 유형입니다.');
      return;
    }

    const newList = [...currentList, trimmed];
    setCurrentList(newList);
    saveToStorage(newList);
    setNewType('');
    setError('');
  };

  const handleDelete = (typeToDelete: string) => {
    if (!window.confirm(`'${typeToDelete}' 유형을 삭제하시겠습니까?\n해당 유형을 사용하는 기존 일정은 유지되지만, 목록에서는 사라집니다.`)) {
      return;
    }

    const newList = getCurrentList().filter(t => t !== typeToDelete);
    setCurrentList(newList);
    saveToStorage(newList);
  };

  const handleStartEdit = (type: string) => {
    setEditingType({ original: type, current: type });
    setError('');
  };

  const handleCancelEdit = () => {
      setEditingType(null);
      setError('');
  };

  const handleSaveEdit = () => {
    if (!editingType) return;
    const trimmed = editingType.current.trim();
    
    if (!trimmed) {
        setError('유형 이름을 입력해주세요.');
        return;
    }

    const currentList = getCurrentList();
    // Check duplicate if name changed (exclude itself)
    if (trimmed !== editingType.original && currentList.includes(trimmed)) {
      setError('이미 존재하는 유형입니다.');
      return;
    }

    const newList = currentList.map(t => t === editingType.original ? trimmed : t);
    setCurrentList(newList);
    saveToStorage(newList);
    setEditingType(null);
    setError('');
  };

  const handleKeyDown = (e: React.KeyboardEvent, action: 'add' | 'edit') => {
    if (e.key === 'Enter') {
        e.preventDefault();
        if (action === 'add') handleAdd();
        else handleSaveEdit();
    }
  };

  return (
    <BaseModal isOpen={isOpen} onClose={onClose} className="max-w-md w-full">
      <div className="p-4 border-b border-[var(--border-color)] flex justify-between items-center flex-shrink-0">
        <h2 className="text-xl font-bold text-[var(--text-primary)]">미팅 유형 관리</h2>
        <button onClick={onClose} className="text-[var(--text-muted)] hover:text-[var(--text-primary)]">
          <XIcon className="h-6 w-6" />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-[var(--border-color)] flex-shrink-0">
          <button
              onClick={() => { setActiveTab('customer'); setEditingType(null); setError(''); }}
              className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'customer'
                      ? 'border-[var(--background-accent)] text-[var(--text-accent)]'
                      : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]'
              }`}
          >
              고객 일정
          </button>
          <button
              onClick={() => { setActiveTab('personal'); setEditingType(null); setError(''); }}
              className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'personal'
                      ? 'border-[var(--background-accent)] text-[var(--text-accent)]'
                      : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]'
              }`}
          >
              개인 일정
          </button>
      </div>

      <div className="p-4 flex-1 min-h-0 flex flex-col overflow-hidden">
        {error && (
            <div className="mb-3 p-2 bg-red-500/10 text-[var(--text-danger)] text-sm rounded-md text-center">
                {error}
            </div>
        )}

        <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2 pr-1">
            {getCurrentList().map((type) => (
                <div key={type} className="flex items-center justify-between p-3 bg-[var(--background-tertiary)] rounded-lg border border-[var(--border-color-strong)]">
                    {editingType?.original === type ? (
                        <>
                             <input
                                type="text"
                                value={editingType.current}
                                onChange={(e) => setEditingType({ ...editingType, current: e.target.value })}
                                onKeyDown={(e) => handleKeyDown(e, 'edit')}
                                className="flex-grow p-1 text-sm bg-[var(--background-primary)] border border-[var(--background-accent)] rounded-md outline-none text-[var(--text-primary)] mr-2"
                                autoFocus
                            />
                            <div className="flex items-center gap-1">
                                <button onClick={handleSaveEdit} className="p-1.5 text-green-500 hover:bg-green-500/10 rounded-full"><CheckIcon className="h-4 w-4"/></button>
                                <button onClick={handleCancelEdit} className="p-1.5 text-[var(--text-muted)] hover:bg-gray-500/10 rounded-full"><XIcon className="h-4 w-4"/></button>
                            </div>
                        </>
                    ) : (
                        <>
                            <span className="text-sm font-medium text-[var(--text-primary)]">{type}</span>
                            <div className="flex items-center gap-1">
                                <button onClick={() => handleStartEdit(type)} className="p-1.5 text-[var(--text-muted)] hover:text-[var(--text-accent)] rounded-full hover:bg-[var(--background-secondary)]">
                                    <PencilIcon className="h-4 w-4"/>
                                </button>
                                <button onClick={() => handleDelete(type)} className="p-1.5 text-[var(--text-muted)] hover:text-[var(--text-danger)] rounded-full hover:bg-[var(--background-secondary)]">
                                    <TrashIcon className="h-4 w-4"/>
                                </button>
                            </div>
                        </>
                    )}
                </div>
            ))}
             {getCurrentList().length === 0 && (
                <div className="text-center py-8 text-[var(--text-muted)] text-sm">
                    등록된 유형이 없습니다.
                </div>
            )}
        </div>
      </div>

      <div className="p-4 bg-[var(--background-tertiary)] border-t border-[var(--border-color)] flex-shrink-0">
          <div className="flex gap-2">
              <input
                  type="text"
                  value={newType}
                  onChange={(e) => setNewType(e.target.value)}
                  onKeyDown={(e) => handleKeyDown(e, 'add')}
                  placeholder={activeTab === 'customer' ? "새 고객 일정 유형 (예: 증권전달)" : "새 개인 일정 유형 (예: 독서)"}
                  className="flex-grow p-2 text-sm bg-[var(--background-secondary)] border border-[var(--border-color-strong)] rounded-md focus:ring-[var(--background-accent)] focus:border-[var(--background-accent)] outline-none text-[var(--text-primary)]"
              />
              <button
                  onClick={handleAdd}
                  className="px-4 py-2 bg-[var(--background-accent)] text-[var(--text-on-accent)] rounded-md text-sm font-medium hover:bg-[var(--background-accent-hover)] flex items-center gap-1 flex-shrink-0"
              >
                  <PlusIcon className="h-4 w-4" /> 추가
              </button>
          </div>
      </div>
    </BaseModal>
  );
};

export default MeetingTypeManagementModal;