
import React, { useState, useMemo } from 'react';
import type { Customer } from '../types';
import BaseModal from './ui/BaseModal';
import { 
    XIcon, 
    PhoneIcon, 
    CheckIcon, 
    ClockIcon, 
    PencilIcon, 
    MessageIcon,
    CalendarIcon,
    PlusIcon
} from './icons';

interface RecontactManagerModalProps {
    isOpen: boolean;
    onClose: () => void;
    customers: Customer[];
    onUpdateCustomer: (customer: Customer) => Promise<void>;
    onLogResult: (customer: Customer) => void;
    onOpenAddReminder: () => void;
}

type TabType = 'overdue' | 'today' | 'upcoming';

const RecontactManagerModal: React.FC<RecontactManagerModalProps> = ({ 
    isOpen, 
    onClose, 
    customers,
    onUpdateCustomer,
    onLogResult,
    onOpenAddReminder
}) => {
    const [activeTab, setActiveTab] = useState<TabType>('today');
    const [snoozeTarget, setSnoozeTarget] = useState<Customer | null>(null);

    const todayStr = useMemo(() => {
        const d = new Date();
        return new Date(d.getTime() - (d.getTimezoneOffset() * 60000)).toISOString().split('T')[0];
    }, []);

    // 데이터 분류 로직
    const { overdue, today, upcoming } = useMemo(() => {
        const overdue: Customer[] = [];
        const todayList: Customer[] = [];
        const upcoming: Customer[] = [];

        customers.forEach(c => {
            if (!c.nextFollowUpDate) return;
            
            if (c.nextFollowUpDate < todayStr) {
                overdue.push(c);
            } else if (c.nextFollowUpDate === todayStr) {
                todayList.push(c);
            } else {
                upcoming.push(c);
            }
        });

        // 날짜순 정렬
        overdue.sort((a, b) => (a.nextFollowUpDate || '').localeCompare(b.nextFollowUpDate || ''));
        todayList.sort((a, b) => a.name.localeCompare(b.name)); 
        upcoming.sort((a, b) => (a.nextFollowUpDate || '').localeCompare(b.nextFollowUpDate || ''));

        return { overdue, today: todayList, upcoming };
    }, [customers, todayStr]);

    const currentList = activeTab === 'overdue' ? overdue : activeTab === 'today' ? today : upcoming;

    const getDDayLabel = (dateStr?: string) => {
        if (!dateStr) return { text: '-', color: 'text-gray-500' };
        const today = new Date(todayStr);
        const target = new Date(dateStr);
        const diff = Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

        if (diff === 0) return { text: 'D-Day', color: 'text-blue-600 font-bold' };
        if (diff < 0) return { text: `D+${Math.abs(diff)}`, color: 'text-red-500 font-bold' };
        return { text: `D-${diff}`, color: 'text-gray-500' };
    };

    const getLastNote = (c: Customer) => {
        if (c.rejectionReason && c.rejectionNotes) {
            return `[거절/재접촉] ${c.rejectionReason} - ${c.rejectionNotes}`;
        }
        if (c.callHistory && c.callHistory.length > 0) {
            return `[최근 통화] ${c.callHistory[0].notes || '메모 없음'}`;
        }
        return '특이사항 없음';
    };

    // --- Actions ---

    const handleCall = (customer: Customer) => {
        window.location.href = `tel:${customer.contact}`;
    };

    const handleComplete = async (customer: Customer) => {
        if (window.confirm(`${customer.name}님의 재접촉 건을 완료(삭제)하시겠습니까?`)) {
            await onUpdateCustomer({ ...customer, nextFollowUpDate: undefined });
        }
    };

    const handleSnoozeSave = async (daysToAdd: number | null, specificDate?: string) => {
        if (!snoozeTarget) return;

        let newDate = '';
        if (specificDate) {
            newDate = specificDate;
        } else if (daysToAdd !== null) {
            const target = new Date();
            target.setDate(target.getDate() + daysToAdd);
            newDate = new Date(target.getTime() - (target.getTimezoneOffset() * 60000)).toISOString().split('T')[0];
        }

        if (newDate) {
            await onUpdateCustomer({ ...snoozeTarget, nextFollowUpDate: newDate });
            setSnoozeTarget(null);
        }
    };

    if (!isOpen) return null;

    return (
        <>
        <BaseModal isOpen={isOpen} onClose={onClose} className="max-w-2xl w-full h-[85vh] flex flex-col" zIndex="z-[60]">
            {/* Header */}
            <div className="p-5 border-b border-[var(--border-color)] flex justify-between items-center bg-[var(--background-secondary)] rounded-t-lg flex-shrink-0">
                <h2 className="text-xl font-bold text-[var(--text-primary)] flex items-center gap-2">
                    <ClockIcon className="h-6 w-6 text-yellow-500" />
                    재접촉 집중 관리
                </h2>
                <div className="flex items-center gap-2">
                    <button onClick={onOpenAddReminder} className="flex items-center gap-1 px-3 py-1.5 bg-[var(--background-accent-subtle)] text-[var(--text-accent)] rounded-md text-sm font-medium hover:bg-opacity-80">
                        <PlusIcon className="h-4 w-4" />
                        <span className="hidden sm:inline">리마인더 추가</span>
                        <span className="sm:hidden">추가</span>
                    </button>
                    <button onClick={onClose} className="text-[var(--text-muted)] hover:text-[var(--text-primary)] p-1">
                        <XIcon className="h-6 w-6" />
                    </button>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-[var(--border-color)] bg-[var(--background-secondary)] flex-shrink-0">
                <button 
                    onClick={() => setActiveTab('overdue')}
                    className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors flex justify-center items-center gap-2
                        ${activeTab === 'overdue' ? 'border-red-500 text-red-500' : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]'}`}
                >
                    기한 지남
                    {overdue.length > 0 && (
                        <span className="bg-red-100 text-red-600 text-xs px-2 py-0.5 rounded-full">{overdue.length}</span>
                    )}
                </button>
                <button 
                    onClick={() => setActiveTab('today')}
                    className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors flex justify-center items-center gap-2
                        ${activeTab === 'today' ? 'border-blue-500 text-blue-500' : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]'}`}
                >
                    오늘
                    {today.length > 0 && (
                        <span className="bg-blue-100 text-blue-600 text-xs px-2 py-0.5 rounded-full">{today.length}</span>
                    )}
                </button>
                <button 
                    onClick={() => setActiveTab('upcoming')}
                    className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors flex justify-center items-center gap-2
                        ${activeTab === 'upcoming' ? 'border-gray-500 text-gray-500' : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]'}`}
                >
                    예정
                    {upcoming.length > 0 && (
                        <span className="bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded-full">{upcoming.length}</span>
                    )}
                </button>
            </div>

            {/* List Content */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-4 bg-[var(--background-primary)] space-y-3">
                {currentList.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-[var(--text-muted)] opacity-70">
                        <CalendarIcon className="h-12 w-12 mb-2 text-gray-300" />
                        <p>해당하는 재접촉 고객이 없습니다.</p>
                    </div>
                ) : (
                    currentList.map(customer => {
                        const dDay = getDDayLabel(customer.nextFollowUpDate);
                        const note = getLastNote(customer);

                        return (
                            <div key={customer.id} className="bg-[var(--background-secondary)] p-4 rounded-lg border border-[var(--border-color)] shadow-sm hover:border-[var(--background-accent)] transition-all animate-fade-in-up">
                                <div className="flex justify-between items-start">
                                    <div className="flex-grow min-w-0 mr-4">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className={`text-xs ${dDay.color}`}>{dDay.text}</span>
                                            <h3 className="font-bold text-lg text-[var(--text-primary)] truncate">{customer.name}</h3>
                                            <span className="text-xs text-[var(--text-muted)]">{customer.contact}</span>
                                        </div>
                                        <div className="flex items-center gap-1 text-sm text-[var(--text-secondary)] bg-[var(--background-tertiary)] p-2 rounded-md">
                                            <MessageIcon className="h-4 w-4 text-[var(--text-muted)] flex-shrink-0" />
                                            <p className="truncate">{note}</p>
                                        </div>
                                        {activeTab === 'upcoming' && (
                                            <p className="text-xs text-[var(--text-muted)] mt-1 ml-1">
                                                예정일: {customer.nextFollowUpDate}
                                            </p>
                                        )}
                                    </div>

                                    {/* Action Buttons */}
                                    <div className="flex flex-col gap-2 flex-shrink-0">
                                        <div className="flex gap-2">
                                            <button 
                                                onClick={() => handleCall(customer)}
                                                className="p-2 bg-green-500 text-white rounded-full hover:bg-green-600 shadow-sm transition-transform active:scale-95"
                                                title="전화 걸기"
                                            >
                                                <PhoneIcon className="h-5 w-5" />
                                            </button>
                                            <button 
                                                onClick={() => onLogResult(customer)}
                                                className="p-2 bg-[var(--background-tertiary)] text-[var(--text-primary)] border border-[var(--border-color-strong)] rounded-full hover:bg-[var(--background-primary)] shadow-sm transition-transform active:scale-95"
                                                title="결과 기록"
                                            >
                                                <PencilIcon className="h-5 w-5" />
                                            </button>
                                        </div>
                                        <div className="flex gap-2">
                                            <button 
                                                onClick={() => setSnoozeTarget(customer)}
                                                className="p-2 bg-yellow-50 border border-yellow-200 text-yellow-600 rounded-full hover:bg-yellow-100 shadow-sm transition-transform active:scale-95"
                                                title="미루기"
                                            >
                                                <ClockIcon className="h-5 w-5" />
                                            </button>
                                            <button 
                                                onClick={() => handleComplete(customer)}
                                                className="p-2 bg-blue-50 border border-blue-200 text-blue-600 rounded-full hover:bg-blue-100 shadow-sm transition-transform active:scale-95"
                                                title="완료 처리"
                                            >
                                                <CheckIcon className="h-5 w-5" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
            
            <div className="p-4 bg-[var(--background-tertiary)] border-t border-[var(--border-color)] text-center rounded-b-lg">
                <p className="text-xs text-[var(--text-muted)]">
                    완료하지 않은 항목은 다음 날 '기한 지남'으로 이동합니다.
                </p>
            </div>
        </BaseModal>

        {/* Snooze Popover Modal */}
        {snoozeTarget && (
            <BaseModal isOpen={true} onClose={() => setSnoozeTarget(null)} className="max-w-sm w-full" zIndex="z-[70]">
                <div className="p-4 border-b border-[var(--border-color)] flex justify-between items-center">
                    <h3 className="text-lg font-bold text-[var(--text-primary)]">{snoozeTarget.name}님 재접촉 미루기</h3>
                    <button onClick={() => setSnoozeTarget(null)}><XIcon className="h-5 w-5 text-[var(--text-muted)]" /></button>
                </div>
                <div className="p-4 space-y-3">
                    <button onClick={() => handleSnoozeSave(1)} className="w-full py-3 bg-[var(--background-tertiary)] hover:bg-[var(--background-primary)] border border-[var(--border-color-strong)] rounded-lg text-[var(--text-primary)] font-medium flex justify-between px-4">
                        <span>내일 다시 알림</span>
                        <span className="text-xs text-[var(--text-muted)] self-center">+1일</span>
                    </button>
                    <button onClick={() => handleSnoozeSave(7)} className="w-full py-3 bg-[var(--background-tertiary)] hover:bg-[var(--background-primary)] border border-[var(--border-color-strong)] rounded-lg text-[var(--text-primary)] font-medium flex justify-between px-4">
                        <span>다음 주 다시 알림</span>
                        <span className="text-xs text-[var(--text-muted)] self-center">+7일</span>
                    </button>
                    <div className="pt-2 border-t border-[var(--border-color)]">
                        <label className="text-sm text-[var(--text-muted)] block mb-1">날짜 직접 선택</label>
                        <input 
                            type="date" 
                            className="w-full p-2 border border-[var(--border-color-strong)] rounded-md bg-[var(--background-primary)] text-[var(--text-primary)]"
                            onChange={(e) => handleSnoozeSave(null, e.target.value)}
                        />
                    </div>
                </div>
            </BaseModal>
        )}
        </>
    );
};

export default RecontactManagerModal;
