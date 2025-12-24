
import React, { useState, useMemo, useRef, useEffect } from 'react';
import type { Appointment } from '../types';
import { PencilIcon, TrashIcon, CheckIcon } from './icons';
import Tag from './ui/Tag';
import ConfirmationModal from './ui/ConfirmationModal';

interface MemoListViewProps {
    appointments: Appointment[];
    onEditAppointment: (appointment: Appointment) => void;
    onDeleteAppointment: (appointmentId: string) => void;
    onDeleteMultipleAppointments: (appointmentIds: string[]) => void;
}

const MemoListView: React.FC<MemoListViewProps> = ({ appointments, onEditAppointment, onDeleteAppointment, onDeleteMultipleAppointments }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [dateFilter, setDateFilter] = useState({ start: '', end: '' });
    const [activeKeyword, setActiveKeyword] = useState<string | null>(null);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
    const headerCheckboxRef = useRef<HTMLInputElement>(null);

    const personalMemos = useMemo(() => {
        return appointments
            .filter(app => !app.customerId && app.title && app.notes)
            .sort((a, b) => b.date.localeCompare(a.date) || b.time.localeCompare(a.time));
    }, [appointments]);

    const allKeywords = useMemo(() => {
        const keywordSet = new Set<string>();
        personalMemos.forEach(memo => {
            memo.keywords?.forEach(kw => keywordSet.add(kw));
        });
        return Array.from(keywordSet).sort();
    }, [personalMemos]);

    const filteredMemos = useMemo(() => {
        const lowercasedSearch = searchTerm.toLowerCase();
        return personalMemos.filter(memo => {
            // Date filter
            if (dateFilter.start && memo.date < dateFilter.start) return false;
            if (dateFilter.end && memo.date > dateFilter.end) return false;

            // Keyword filter
            if (activeKeyword && !memo.keywords?.includes(activeKeyword)) return false;

            // Search term filter
            if (lowercasedSearch) {
                const searchInTitle = memo.title?.toLowerCase().includes(lowercasedSearch) || false;
                const searchInNotes = memo.notes?.toLowerCase().includes(lowercasedSearch) || false;
                const searchInSummary = memo.summary?.toLowerCase().includes(lowercasedSearch) || false;
                const searchInKeywords = memo.keywords?.some(kw => kw.toLowerCase().includes(lowercasedSearch)) || false;
                if (!searchInTitle && !searchInNotes && !searchInSummary && !searchInKeywords) {
                    return false;
                }
            }

            return true;
        });
    }, [personalMemos, searchTerm, dateFilter, activeKeyword]);
    
    useEffect(() => {
        if (headerCheckboxRef.current) {
            const numSelected = selectedIds.size;
            const numTotal = filteredMemos.length;
            if (numTotal === 0) {
                headerCheckboxRef.current.checked = false;
                headerCheckboxRef.current.indeterminate = false;
                return;
            }
            headerCheckboxRef.current.checked = numSelected === numTotal;
            headerCheckboxRef.current.indeterminate = numSelected > 0 && numSelected < numTotal;
        }
    }, [selectedIds, filteredMemos]);

    const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setDateFilter(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };
    
    const handleClearFilters = () => {
        setSearchTerm('');
        setDateFilter({ start: '', end: '' });
        setActiveKeyword(null);
    };
    
    const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.checked) {
            setSelectedIds(new Set(filteredMemos.map(m => m.id)));
        } else {
            setSelectedIds(new Set());
        }
    };

    const handleSelectOne = (id: string) => {
        setSelectedIds(prev => {
            const newSet = new Set(prev);
            if (newSet.has(id)) newSet.delete(id); else newSet.add(id);
            return newSet;
        });
    };

    const handleOpenConfirmModal = () => {
        if (selectedIds.size > 0) setIsConfirmModalOpen(true);
    };
    
    const handleConfirmDeletion = () => {
        onDeleteMultipleAppointments(Array.from(selectedIds));
        setSelectedIds(new Set());
        setIsConfirmModalOpen(false);
    };

    return (
        <div className="animate-fade-in">
             {selectedIds.size > 0 && (
                <div className="flex items-center justify-end gap-2 mb-4">
                    <span className="text-sm font-medium text-[var(--text-secondary)]">{selectedIds.size}개 선택됨</span>
                    <button onClick={handleOpenConfirmModal} className="flex items-center justify-center bg-[var(--background-danger)] hover:bg-[var(--background-danger-hover)] text-white font-bold py-2 px-3 rounded-lg transition-colors text-sm">
                        <TrashIcon className="h-5 w-5 mr-2" /> 선택 삭제
                    </button>
                </div>
            )}
            <div className="bg-[var(--background-secondary)] p-4 rounded-lg shadow-md border border-[var(--border-color)] mb-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                    <div className="md:col-span-1">
                        <label htmlFor="search-memo" className="block text-sm font-medium text-[var(--text-secondary)]">검색</label>
                        <input
                            id="search-memo"
                            type="text"
                            placeholder="제목, 내용, 키워드 검색..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="mt-1 w-full p-2 border border-[var(--border-color-strong)] rounded-md shadow-sm focus:ring-[var(--background-accent)] focus:border-[var(--background-accent)] bg-[var(--background-tertiary)] text-[var(--text-primary)]"
                        />
                    </div>
                    <div className="md:col-span-2 grid grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="start-date" className="block text-sm font-medium text-[var(--text-secondary)]">시작일</label>
                            <input
                                id="start-date"
                                type="date"
                                name="start"
                                value={dateFilter.start}
                                onChange={handleDateChange}
                                className="mt-1 w-full p-2 border border-[var(--border-color-strong)] rounded-md shadow-sm focus:ring-[var(--background-accent)] focus:border-[var(--background-accent)] bg-[var(--background-tertiary)] text-[var(--text-primary)]"
                            />
                        </div>
                        <div>
                            <label htmlFor="end-date" className="block text-sm font-medium text-[var(--text-secondary)]">종료일</label>
                            <input
                                id="end-date"
                                type="date"
                                name="end"
                                value={dateFilter.end}
                                onChange={handleDateChange}
                                className="mt-1 w-full p-2 border border-[var(--border-color-strong)] rounded-md shadow-sm focus:ring-[var(--background-accent)] focus:border-[var(--background-accent)] bg-[var(--background-tertiary)] text-[var(--text-primary)]"
                            />
                        </div>
                    </div>
                </div>
                 {allKeywords.length > 0 && (
                    <div className="mt-4 pt-3 border-t border-[var(--border-color)]">
                        <div className="flex flex-wrap items-center gap-2">
                            <span className="text-sm font-medium text-[var(--text-secondary)] mr-2 shrink-0">키워드:</span>
                            <button onClick={() => setActiveKeyword(null)} className={`px-3 py-1 rounded-full text-sm font-medium transition-colors border ${!activeKeyword ? 'bg-[var(--background-accent)] text-[var(--text-on-accent)] border-transparent' : 'bg-[var(--background-tertiary)] text-[var(--text-secondary)] hover:bg-[var(--background-primary)] border-[var(--border-color-strong)]'}`}>
                                전체
                            </button>
                            {allKeywords.map(kw => (
                                <button key={kw} onClick={() => setActiveKeyword(kw)} className={`px-3 py-1 rounded-full text-sm font-medium transition-colors border ${activeKeyword === kw ? 'bg-[var(--background-accent)] text-[var(--text-on-accent)] border-transparent' : 'bg-[var(--background-tertiary)] text-[var(--text-secondary)] hover:bg-[var(--background-primary)] border-[var(--border-color-strong)]'}`}>
                                    {kw}
                                </button>
                            ))}
                        </div>
                    </div>
                 )}
                 <div className="mt-4 pt-4 border-t border-[var(--border-color)] flex items-center justify-between">
                    <div className="flex items-center">
                         <input
                            ref={headerCheckboxRef}
                            type="checkbox"
                            className="h-5 w-5 rounded border-[var(--border-color-strong)] text-[var(--background-accent)] focus:ring-[var(--background-accent)] bg-[var(--background-tertiary)]"
                            onChange={handleSelectAll}
                            aria-label="모든 메모 선택"
                        />
                        <label className="ml-2 text-sm font-medium text-[var(--text-secondary)]">
                            현재 목록 전체 선택 ({filteredMemos.length}개)
                        </label>
                    </div>
                    <button onClick={handleClearFilters} className="text-sm text-[var(--text-accent)] hover:underline">
                        필터 초기화
                    </button>
                 </div>
            </div>

            <div className="space-y-4">
                {filteredMemos.length > 0 ? (
                    filteredMemos.map(memo => (
                        <div key={memo.id} className={`p-4 rounded-lg shadow-md border animate-fade-in-up transition-colors ${selectedIds.has(memo.id) ? 'bg-[var(--background-accent-subtle)] border-[var(--background-accent)]/50' : 'bg-[var(--background-secondary)] border-[var(--border-color)]'}`}>
                            <div className="flex items-start gap-3">
                                <input type="checkbox" className="h-5 w-5 rounded border-[var(--border-color-strong)] text-[var(--background-accent)] focus:ring-[var(--background-accent)] bg-[var(--background-tertiary)] mt-1" checked={selectedIds.has(memo.id)} onChange={() => handleSelectOne(memo.id)} aria-label={`${memo.title} 메모 선택`} />
                                <div className="flex-grow">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <h3 className="text-lg font-bold text-[var(--text-primary)]">{memo.title}</h3>
                                            <p className="text-sm text-[var(--text-muted)]">{memo.date} {memo.time}</p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button onClick={() => onEditAppointment(memo)} className="p-2 text-[var(--text-muted)] hover:text-[var(--text-accent)]"><PencilIcon className="h-5 w-5" /></button>
                                            <button onClick={() => onDeleteAppointment(memo.id)} className="p-2 text-[var(--text-muted)] hover:text-[var(--text-danger)]"><TrashIcon className="h-5 w-5" /></button>
                                        </div>
                                    </div>
                                    <div className="mt-3 pt-3 border-t border-[var(--border-color)] space-y-3">
                                        {memo.notes && (
                                            <div>
                                                <h4 className="text-xs font-bold uppercase text-[var(--text-muted)] mb-1">원본 메모</h4>
                                                <pre className="whitespace-pre-wrap font-sans text-sm text-[var(--text-secondary)] bg-[var(--background-primary)] p-3 rounded-md border border-[var(--border-color-strong)]">
                                                    {memo.notes}
                                                </pre>
                                            </div>
                                        )}
                                        
                                        {(memo.summary || (memo.keywords && memo.keywords.length > 0) || (memo.actionItems && memo.actionItems.length > 0)) && (
                                            <div>
                                                <h4 className="text-xs font-bold uppercase text-[var(--text-muted)] mb-1">AI 분석</h4>
                                                <div className="space-y-2 p-3 bg-[var(--background-primary)] rounded-md border border-[var(--border-color-strong)]">
                                                    {memo.summary && (
                                                        <p className="text-sm text-[var(--text-secondary)] italic">"{memo.summary}"</p>
                                                    )}
                                                    {memo.keywords && memo.keywords.length > 0 && (
                                                        <div className="flex flex-wrap items-center gap-2">
                                                            {memo.keywords.map(kw => <Tag key={kw} label={kw} />)}
                                                        </div>
                                                    )}
                                                    {memo.actionItems && memo.actionItems.length > 0 && (
                                                        <ul className="mt-1 space-y-1">
                                                            {memo.actionItems.map((item, index) => (
                                                                <li key={index} className="flex items-start text-sm text-[var(--text-secondary)]">
                                                                    <CheckIcon className="h-4 w-4 text-green-500 mr-2 mt-0.5 shrink-0" />
                                                                    <span>{item}</span>
                                                                </li>
                                                            ))}
                                                        </ul>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="text-center py-12 text-[var(--text-muted)] bg-[var(--background-secondary)] rounded-lg shadow-md border border-[var(--border-color)]">
                        <p className="text-lg">해당 조건에 맞는 메모가 없습니다.</p>
                        <p className="text-sm mt-2">검색어나 필터를 변경해보세요.</p>
                    </div>
                )}
            </div>
             <ConfirmationModal
                isOpen={isConfirmModalOpen}
                onClose={() => setIsConfirmModalOpen(false)}
                onConfirm={handleConfirmDeletion}
                title="메모 삭제 확인"
                message={<p>선택한 {selectedIds.size}개의 메모를 정말로 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.</p>}
            />
        </div>
    );
};

export default MemoListView;
