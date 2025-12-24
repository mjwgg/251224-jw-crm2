
import React, { useState, useMemo, useEffect, useRef } from 'react';
import type { Customer } from '../types';
import BaseModal from './ui/BaseModal';
import { XIcon, PencilIcon, TrashIcon, CheckIcon, PlusIcon } from './icons';
import ConfirmationModal from './ui/ConfirmationModal';

interface RecontactModalProps {
  isOpen: boolean;
  onClose: () => void;
  customers: Customer[];
  onUpdateCustomer: (customer: Customer) => Promise<void>;
  onClearMultipleFollowUpDates: (customerIds: string[]) => Promise<void>;
  onOpenAddReminder: () => void;
}

export const RecontactModal: React.FC<RecontactModalProps> = ({ isOpen, onClose, customers, onUpdateCustomer, onClearMultipleFollowUpDates, onOpenAddReminder }) => {
    const [activeTab, setActiveTab] = useState<'overdue' | 'today' | 'tomorrow' | 'thisWeek' | 'future'>('today');
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [editingState, setEditingState] = useState<{ id: string; date: string } | null>(null);
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);
    const [confirmAction, setConfirmAction] = useState<(() => void) | null>(null);
    const [confirmMessage, setConfirmMessage] = useState<React.ReactNode>('');

    const headerCheckboxRef = useRef<HTMLInputElement>(null);
    
    // 날짜 계산 및 데이터 분류
    const categorizedCustomers = useMemo(() => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayStr = new Date(today.getTime() - (today.getTimezoneOffset() * 60000)).toISOString().split('T')[0];

        const tomorrow = new Date(today);
        tomorrow.setDate(today.getDate() + 1);
        const tomorrowStr = new Date(tomorrow.getTime() - (tomorrow.getTimezoneOffset() * 60000)).toISOString().split('T')[0];

        const dayOfWeek = today.getDay(); // 0 = Sunday
        const offset = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Monday based start
        const endOfWeek = new Date(today);
        endOfWeek.setDate(today.getDate() - offset + 6);
        endOfWeek.setHours(23, 59, 59, 999);
        const endOfWeekStr = new Date(endOfWeek.getTime() - (endOfWeek.getTimezoneOffset() * 60000)).toISOString().split('T')[0];

        const groups = {
            overdue: [] as Customer[],
            today: [] as Customer[],
            tomorrow: [] as Customer[],
            thisWeek: [] as Customer[],
            future: [] as Customer[]
        };

        customers.forEach(c => {
            if (!c.nextFollowUpDate) return;
            const d = c.nextFollowUpDate;

            if (d < todayStr) {
                groups.overdue.push(c);
            } else if (d === todayStr) {
                groups.today.push(c);
            } else if (d === tomorrowStr) {
                groups.tomorrow.push(c);
            } else if (d > tomorrowStr && d <= endOfWeekStr) {
                groups.thisWeek.push(c);
            } else if (d > endOfWeekStr) {
                groups.future.push(c);
            }
        });

        // Sort by date
        const sortByDate = (a: Customer, b: Customer) => (a.nextFollowUpDate || '').localeCompare(b.nextFollowUpDate || '');
        
        groups.overdue.sort(sortByDate);
        groups.today.sort((a, b) => a.name.localeCompare(b.name));
        groups.tomorrow.sort((a, b) => a.name.localeCompare(b.name));
        groups.thisWeek.sort(sortByDate);
        groups.future.sort(sortByDate);

        return groups;
    }, [customers]);

    const currentList = categorizedCustomers[activeTab];

    useEffect(() => {
        if (!isOpen) {
            setSelectedIds(new Set());
            setEditingState(null);
            setActiveTab('today');
        }
    }, [isOpen]);

    // Update header checkbox when selection changes or tab changes
    useEffect(() => {
        if (headerCheckboxRef.current) {
            const numSelected = selectedIds.size;
            const numTotal = currentList.length;
            
            // Only count selected IDs that are actually in the current view
            const currentIds = new Set(currentList.map(c => c.id));
            const selectedInView = Array.from(selectedIds).filter(id => currentIds.has(id)).length;

            if (numTotal === 0) {
              headerCheckboxRef.current.checked = false;
              headerCheckboxRef.current.indeterminate = false;
            } else {
              headerCheckboxRef.current.checked = selectedInView > 0 && selectedInView === numTotal;
              headerCheckboxRef.current.indeterminate = selectedInView > 0 && selectedInView < numTotal;
            }
        }
    }, [selectedIds, currentList]);
    
    const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.checked) {
            // Add all current list items to selection
            const newSelected = new Set(selectedIds);
            currentList.forEach(c => newSelected.add(c.id));
            setSelectedIds(newSelected);
        } else {
            // Remove all current list items from selection
            const newSelected = new Set(selectedIds);
            currentList.forEach(c => newSelected.delete(c.id));
            setSelectedIds(newSelected);
        }
    };

    const handleSelectOne = (id: string) => {
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
    
    const handleEditStart = (customer: Customer) => {
        setEditingState({ id: customer.id, date: customer.nextFollowUpDate || '' });
    };

    const handleSaveEdit = async () => {
        if (editingState) {
            const customer = customers.find(c => c.id === editingState.id);
            if (customer) {
                await onUpdateCustomer({ ...customer, nextFollowUpDate: editingState.date });
            }
            setEditingState(null);
        }
    };
    
    const handleDeleteSingle = (customerId: string) => {
        setConfirmMessage(<>선택한 고객의 리마인더를 삭제하시겠습니까?</>);
        setConfirmAction(() => () => onClearMultipleFollowUpDates([customerId]));
        setIsConfirmOpen(true);
    };

    const handleDeleteSelected = () => {
        setConfirmMessage(<>선택한 <strong>{selectedIds.size}</strong>명의 고객 리마인더를 삭제하시겠습니까?</>);
        setConfirmAction(() => () => {
            onClearMultipleFollowUpDates(Array.from(selectedIds));
            setSelectedIds(new Set());
        });
        setIsConfirmOpen(true);
    };

    const getDDay = (dateStr?: string) => {
        if (!dateStr) return '';
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const target = new Date(dateStr);
        target.setHours(0, 0, 0, 0);
        const diff = Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        if (diff === 0) return 'D-Day';
        if (diff < 0) return `D+${Math.abs(diff)}`;
        return `D-${diff}`;
    };

    const tabs: { key: typeof activeTab; label: string; count: number; color: string }[] = [
        { key: 'overdue', label: '기한 지남', count: categorizedCustomers.overdue.length, color: 'text-red-500 border-red-500' },
        { key: 'today', label: '오늘', count: categorizedCustomers.today.length, color: 'text-green-500 border-green-500' },
        { key: 'tomorrow', label: '내일', count: categorizedCustomers.tomorrow.length, color: 'text-blue-500 border-blue-500' },
        { key: 'thisWeek', label: '이번 주', count: categorizedCustomers.thisWeek.length, color: 'text-indigo-500 border-indigo-500' },
        { key: 'future', label: '향후 일정', count: categorizedCustomers.future.length, color: 'text-gray-500 border-gray-500' },
    ];

    return (
        <>
        <BaseModal isOpen={isOpen} onClose={onClose} className="max-w-2xl w-full h-[80vh] flex flex-col">
            <div className="p-5 border-b border-[var(--border-color)] flex justify-between items-center bg-[var(--background-secondary)] rounded-t-lg flex-shrink-0">
                <h2 className="text-xl font-bold text-[var(--text-primary)]">재접촉 리마인더 관리</h2>
                <div className="flex items-center gap-2">
                    <button onClick={onOpenAddReminder} className="flex items-center gap-1 px-3 py-1.5 bg-[var(--background-accent-subtle)] text-[var(--text-accent)] rounded-md text-sm font-medium hover:bg-opacity-80">
                        <PlusIcon className="h-4 w-4" />
                        <span className="hidden sm:inline">리마인더 추가</span>
                        <span className="sm:hidden">추가</span>
                    </button>
                    <button onClick={onClose} className="text-[var(--text-muted)] hover:text-[var(--text-primary)]"><XIcon className="h-6 w-6" /></button>
                </div>
            </div>
            
            {/* Tabs */}
            <div className="flex overflow-x-auto border-b border-[var(--border-color)] bg-[var(--background-secondary)] flex-shrink-0 custom-scrollbar">
                {tabs.map(tab => (
                    <button
                        key={tab.key}
                        onClick={() => setActiveTab(tab.key)}
                        className={`flex-1 min-w-[80px] py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap flex flex-col items-center justify-center gap-1
                            ${activeTab === tab.key ? tab.color : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]'}`}
                    >
                        <span>{tab.label}</span>
                        {tab.count > 0 && <span className="text-xs bg-[var(--background-tertiary)] px-1.5 rounded-full">{tab.count}</span>}
                    </button>
                ))}
            </div>

            <div className="p-6 flex-1 min-h-0 overflow-y-auto custom-scrollbar bg-[var(--background-primary)]">
                <div className="flex items-center justify-between p-2 mb-2 bg-[var(--background-secondary)] rounded-lg border border-[var(--border-color)]">
                    <div className="flex items-center gap-3">
                        <input
                            ref={headerCheckboxRef}
                            type="checkbox"
                            onChange={handleSelectAll}
                            className="h-5 w-5 rounded border-[var(--border-color-strong)] bg-[var(--background-tertiary)] text-[var(--background-accent)] focus:ring-[var(--background-accent)]"
                            aria-label="모든 리마인더 선택"
                        />
                        <label className="text-sm font-medium text-[var(--text-secondary)]">전체 선택 ({currentList.length}건)</label>
                    </div>
                    {selectedIds.size > 0 && (
                        <button onClick={handleDeleteSelected} className="flex items-center gap-1 text-sm text-[var(--text-danger)] font-medium hover:text-[var(--text-danger)]/80">
                            <TrashIcon className="h-4 w-4" /> 선택 삭제 ({selectedIds.size})
                        </button>
                    )}
                </div>

                <div className="space-y-2">
                    {currentList.length === 0 ? (
                        <div className="text-center py-10 text-[var(--text-muted)]">
                            해당 기간에 예정된 리마인더가 없습니다.
                        </div>
                    ) : (
                        currentList.map(customer => {
                            const dDay = getDDay(customer.nextFollowUpDate);
                            return (
                                <div key={customer.id} className={`p-3 rounded-lg border flex items-center gap-3 transition-colors ${selectedIds.has(customer.id) ? 'bg-[var(--background-accent-subtle)] border-[var(--background-accent)]/50' : 'bg-[var(--background-secondary)] border-[var(--border-color)]'}`}>
                                    <input
                                        type="checkbox"
                                        checked={selectedIds.has(customer.id)}
                                        onChange={() => handleSelectOne(customer.id)}
                                        className="h-5 w-5 rounded border-[var(--border-color-strong)] bg-[var(--background-tertiary)] text-[var(--background-accent)] focus:ring-[var(--background-accent)]"
                                    />
                                    <div className="flex-grow min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className={`text-xs font-bold ${dDay.includes('+') ? 'text-red-500' : dDay === 'D-Day' ? 'text-green-600' : 'text-gray-500'}`}>{dDay}</span>
                                            <p className="font-semibold text-[var(--text-primary)] truncate">{customer.name}</p>
                                        </div>
                                        {editingState?.id === customer.id ? (
                                            <input 
                                                type="date" 
                                                value={editingState.date}
                                                onChange={(e) => setEditingState({ ...editingState, date: e.target.value })}
                                                className="text-sm bg-[var(--background-tertiary)] border border-[var(--border-color-strong)] rounded p-1 focus:outline-none focus:border-[var(--background-accent)]"
                                                autoFocus
                                            />
                                        ) : (
                                            <p className="text-sm text-[var(--text-muted)]">{customer.nextFollowUpDate}</p>
                                        )}
                                        
                                        {(customer.rejectionDate || customer.rejectionReason) ? (
                                            <p className="text-xs text-[var(--text-danger)] mt-1 truncate font-medium" title={`거절사유: ${customer.rejectionReason} / 메모: ${customer.rejectionNotes}`}>
                                                🛑 [거절/재접촉] {customer.rejectionReason || '사유 미기입'} {customer.rejectionNotes ? `- ${customer.rejectionNotes}` : ''}
                                            </p>
                                        ) : (
                                            (customer.callHistory?.[0]?.notes) && (
                                                <p className="text-xs text-[var(--text-secondary)] mt-1 truncate" title={customer.callHistory[0].notes}>
                                                    📝 {customer.callHistory[0].notes}
                                                </p>
                                            )
                                        )}
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0">
                                        {editingState?.id === customer.id ? (
                                            <>
                                                <button onClick={handleSaveEdit} className="p-1.5 text-green-500 hover:bg-green-500/10 rounded-full"><CheckIcon className="h-5 w-5"/></button>
                                                <button onClick={() => setEditingState(null)} className="p-1.5 text-[var(--text-muted)] hover:bg-gray-500/10 rounded-full"><XIcon className="h-5 w-5"/></button>
                                            </>
                                        ) : (
                                            <>
                                                <button onClick={() => handleEditStart(customer)} className="p-1.5 text-[var(--text-muted)] hover:text-[var(--text-accent)]"><PencilIcon className="h-4 w-4" /></button>
                                                <button onClick={() => handleDeleteSingle(customer.id)} className="p-1.5 text-[var(--text-muted)] hover:text-[var(--text-danger)]"><TrashIcon className="h-4 w-4" /></button>
                                            </>
                                        )}
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>
            <div className="p-4 bg-[var(--background-secondary)] border-t border-[var(--border-color)] flex justify-end rounded-b-lg flex-shrink-0">
                <button onClick={onClose} className="px-4 py-2 bg-[var(--background-tertiary)] border border-[var(--border-color-strong)] rounded-md text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--background-primary)]/80">
                    닫기
                </button>
            </div>
        </BaseModal>
        <ConfirmationModal
            isOpen={isConfirmOpen}
            onClose={() => setIsConfirmOpen(false)}
            onConfirm={() => {
                if(confirmAction) confirmAction();
                setIsConfirmOpen(false);
            }}
            title="리마인더 삭제 확인"
            message={confirmMessage}
        />
        </>
    );
};
