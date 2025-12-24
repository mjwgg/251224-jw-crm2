import React, { useState, useMemo, useEffect } from 'react';
import type { Customer, CustomerTypeDefinition } from '../types';
import { PencilIcon, TrashIcon, CheckIcon, XIcon, PlusIcon } from './icons';
import BaseModal from './ui/BaseModal';

interface CustomerTypeManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  customers: Customer[];
  customerTypes: CustomerTypeDefinition[];
  onAdd: (newType: {id: string, label: string}) => Promise<void>;
  onUpdate: (updatedType: CustomerTypeDefinition) => Promise<void>;
  onDelete: (typeId: string) => Promise<void>;
}

const CustomerTypeManagementModal: React.FC<CustomerTypeManagementModalProps> = ({
  isOpen,
  onClose,
  customers,
  customerTypes,
  onAdd,
  onUpdate,
  onDelete,
}) => {
  const [newTypeLabel, setNewTypeLabel] = useState('');
  const [editing, setEditing] = useState<{ id: string; label: string } | null>(null);
  const [error, setError] = useState('');

  const typesInUse = useMemo(() => {
    const counts = new Map<string, number>();
    customers.forEach(c => {
        counts.set(c.type, (counts.get(c.type) || 0) + 1);
    });
    return counts;
  }, [customers]);

  useEffect(() => {
    if (!isOpen) {
      setNewTypeLabel('');
      setEditing(null);
      setError('');
    }
  }, [isOpen]);

  const handleAdd = async () => {
    if (!newTypeLabel.trim()) {
      setError('유형 이름을 입력해야 합니다.');
      return;
    }
    
    try {
        const newIdAndLabel = newTypeLabel.trim();
        await onAdd({ id: newIdAndLabel, label: newIdAndLabel });
        setNewTypeLabel('');
        setError('');
    } catch (e) {
        setError((e as Error).message);
    }
  };
  
  const handleEditStart = (type: CustomerTypeDefinition) => {
    setEditing({ id: type.id, label: type.label });
    setError('');
  };

  const handleEditCancel = () => {
    setEditing(null);
  };

  const handleUpdate = async () => {
    if (editing && editing.label.trim()) {
      try {
        const typeToUpdate = customerTypes.find(ct => ct.id === editing.id)!;
        await onUpdate({ ...typeToUpdate, label: editing.label.trim() });
        handleEditCancel();
      } catch (e) {
        setError((e as Error).message);
      }
    }
  };

  const handleDelete = async (typeId: string) => {
    try {
        await onDelete(typeId);
        setError('');
    } catch (e) {
        setError((e as Error).message);
    }
  };

  return (
    <BaseModal isOpen={isOpen} onClose={onClose} className="max-w-lg w-full">
      <div className="p-6 border-b border-[var(--border-color)] flex justify-between items-center">
        <h2 className="text-2xl font-bold text-[var(--text-primary)]">고객 유형 관리</h2>
        <button onClick={onClose} className="text-[var(--text-muted)] hover:text-[var(--text-primary)]">
          <XIcon className="h-6 w-6" />
        </button>
      </div>

      <div className="p-6 flex-1 min-h-0 overflow-y-auto custom-scrollbar">
        {error && <p className="text-sm text-center text-[var(--text-danger)] bg-red-500/10 p-2 rounded-md mb-4">{error}</p>}
        
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-3">유형 목록</h3>
          <div className="space-y-2">
            {customerTypes.map(type => (
                <div key={type.id} className="p-3 flex items-center justify-between bg-[var(--background-tertiary)] rounded-lg">
                    {editing?.id === type.id ? (
                      <>
                        <input 
                            type="text"
                            value={editing.label}
                            onChange={(e) => setEditing({ ...editing, label: e.target.value })}
                            className="flex-grow min-w-0 p-1 border-b bg-transparent focus:border-[var(--background-accent)] outline-none text-[var(--text-primary)] font-medium border-[var(--border-color-strong)]"
                            autoFocus
                        />
                         <div className="flex items-center gap-1 shrink-0 ml-2">
                            <button onClick={handleUpdate} className="p-2 text-green-500 hover:bg-green-500/10 rounded-full" aria-label="저장"><CheckIcon className="h-5 w-5"/></button>
                            <button onClick={handleEditCancel} className="p-2 text-[var(--text-muted)] hover:bg-gray-500/10 rounded-full" aria-label="취소"><XIcon className="h-5 w-5"/></button>
                         </div>
                      </>
                    ) : (
                      <>
                        <div className="flex items-center flex-grow min-w-0 mr-4">
                            <p className="font-medium text-[var(--text-primary)] truncate" title={type.label}>{type.label}</p>
                            {type.isDefault && <span className="ml-2 text-xs bg-[var(--background-accent-subtle)] text-[var(--text-accent)] px-2 py-0.5 rounded-full shrink-0">기본</span>}
                            <span className="ml-2 text-xs text-[var(--text-muted)] shrink-0">({typesInUse.get(type.id) || 0}명)</span>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                            <button onClick={() => handleEditStart(type)} className="p-2 text-[var(--text-muted)] hover:text-[var(--text-accent)] rounded-full" aria-label="수정"><PencilIcon className="h-5 w-5"/></button>
                            {!type.isDefault && (
                                <button 
                                    onClick={() => handleDelete(type.id)}
                                    disabled={!!typesInUse.get(type.id)}
                                    className="p-2 text-[var(--text-muted)] hover:text-[var(--text-danger)] disabled:opacity-30 disabled:cursor-not-allowed rounded-full"
                                    aria-label="삭제"
                                >
                                    <TrashIcon className="h-5 w-5"/>
                                </button>
                            )}
                        </div>
                      </>
                    )}
                </div>
            ))}
          </div>
        </div>

        <div className="pt-6 border-t border-[var(--border-color)]">
          <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-3">새 유형 추가</h3>
          <div className="flex items-end gap-2">
              <div className="flex-grow min-w-0">
                  <label htmlFor="newTypeLabel" className="block text-sm font-medium text-[var(--text-secondary)]">유형 이름</label>
                  <input
                      type="text"
                      id="newTypeLabel"
                      value={newTypeLabel}
                      onChange={(e) => setNewTypeLabel(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleAdd()}
                      placeholder="예: VIP 고객"
                      className="mt-1 block w-full p-2 border border-[var(--border-color-strong)] bg-[var(--background-tertiary)] text-[var(--text-primary)] rounded-md"
                  />
              </div>
              <button
                  onClick={handleAdd}
                  className="flex items-center justify-center px-4 py-2 bg-[var(--background-accent)] text-[var(--text-on-accent)] rounded-md text-sm font-medium hover:bg-[var(--background-accent-hover)] shrink-0"
              >
                  <PlusIcon className="h-5 w-5 mr-1"/>
                  추가
              </button>
          </div>
        </div>
      </div>
      
      <div className="p-4 bg-[var(--background-tertiary)] border-t border-[var(--border-color)] flex justify-end">
          <button onClick={onClose} className="px-4 py-2 bg-[var(--background-secondary)] border border-[var(--border-color-strong)] rounded-md text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--background-primary)]">
              닫기
          </button>
      </div>
    </BaseModal>
  );
};

export default CustomerTypeManagementModal;
