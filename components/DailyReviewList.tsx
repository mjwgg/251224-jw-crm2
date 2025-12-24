
import React, { useState, useMemo, useRef, useEffect } from 'react';
import type { DailyReview, PerformanceRecord, Appointment } from '../types';
import { PencilIcon, TrashIcon, CheckIcon, XIcon, BriefcaseIcon, CalendarIcon, DocumentTextIcon } from './icons';
import ConfirmationModal from './ui/ConfirmationModal';
import BaseModal from './ui/BaseModal';

interface DailyReviewListProps {
    reviews: DailyReview[];
    onSaveDailyReview: (review: DailyReview) => void;
    onDeleteDailyReview: (date: string) => void;
    onDeleteMultipleDailyReviews: (dates: string[]) => void;
    performanceRecords: PerformanceRecord[];
    appointments: Appointment[];
}

const CARD_COLORS = [
    'bg-blue-50/50 border-blue-100',
    'bg-purple-50/50 border-purple-100',
    'bg-emerald-50/50 border-emerald-100',
    'bg-amber-50/50 border-amber-100',
    'bg-rose-50/50 border-rose-100',
    'bg-indigo-50/50 border-indigo-100',
];

interface DetailModalState {
    isOpen: boolean;
    title: string;
    date: string;
    type: 'records' | 'apps';
    items: any[];
}

const DailyReviewList: React.FC<DailyReviewListProps> = ({ 
    reviews, 
    onSaveDailyReview, 
    onDeleteDailyReview, 
    onDeleteMultipleDailyReviews,
    performanceRecords,
    appointments
}) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [dateFilter, setDateFilter] = useState({ start: '', end: '' });
    const [editingReviewDate, setEditingReviewDate] = useState<string | null>(null);
    const [editedContent, setEditedContent] = useState('');
    const [selectedDates, setSelectedDates] = useState<Set<string>>(new Set());
    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
    const [detailModal, setDetailModal] = useState<DetailModalState | null>(null);
    const headerCheckboxRef = useRef<HTMLInputElement>(null);
    
    const sortedReviews = useMemo(() => {
        return [...reviews].sort((a, b) => b.date.localeCompare(a.date));
    }, [reviews]);

    const filteredReviews = useMemo(() => {
        const lowercasedSearch = searchTerm.toLowerCase();
        return sortedReviews.filter(review => {
            if (dateFilter.start && review.date < dateFilter.start) return false;
            if (dateFilter.end && review.date > dateFilter.end) return false;
            if (lowercasedSearch && !review.content.toLowerCase().includes(lowercasedSearch)) return false;
            return true;
        });
    }, [sortedReviews, searchTerm, dateFilter]);
    
    const getStatsForDate = (date: string) => {
        const records = performanceRecords.filter(r => r.applicationDate === date);
        const apps = appointments.filter(a => a.date === date && a.status === 'completed');
        return { 
            recordsCount: records.length, 
            appsCount: apps.length,
            records,
            apps
        };
    };

    const handleOpenDetail = (date: string, type: 'records' | 'apps') => {
        const { records, apps } = getStatsForDate(date);
        const title = type === 'records' ? '그날의 실적 상세' : '그날의 상담 상세';
        const items = type === 'records' ? records : apps;
        
        if (items.length > 0) {
            setDetailModal({ isOpen: true, title, date, type, items });
        }
    };

    useEffect(() => {
        if (headerCheckboxRef.current) {
            const numSelected = selectedDates.size;
            const numTotal = filteredReviews.length;
            headerCheckboxRef.current.checked = numTotal > 0 && numSelected === numTotal;
            headerCheckboxRef.current.indeterminate = numSelected > 0 && numSelected < numTotal;
        }
    }, [selectedDates, filteredReviews]);

    const handleEditSave = () => {
        if (editingReviewDate && editedContent.trim()) {
            onSaveDailyReview({ date: editingReviewDate, content: editedContent.trim() });
            setEditingReviewDate(null);
        }
    };

    const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.checked) setSelectedDates(new Set(filteredReviews.map(r => r.date)));
        else setSelectedDates(new Set());
    };

    const handleSelectOne = (e: React.MouseEvent, date: string) => {
        e.stopPropagation();
        setSelectedDates(prev => {
            const newSet = new Set(prev);
            if (newSet.has(date)) newSet.delete(date); else newSet.add(date);
            return newSet;
        });
    };

    return (
        <div className="animate-fade-in space-y-6">
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-[var(--background-secondary)] p-4 rounded-2xl shadow-sm border border-[var(--border-color)]">
                <div className="flex items-center gap-3 w-full md:w-auto">
                    <div className="flex items-center gap-2 bg-[var(--background-tertiary)] px-3 py-1.5 rounded-lg border border-[var(--border-color-strong)]">
                        <input
                            ref={headerCheckboxRef}
                            type="checkbox"
                            onChange={handleSelectAll}
                            className="h-4 w-4 rounded border-[var(--border-color-strong)] text-[var(--background-accent)] focus:ring-[var(--background-accent)]"
                        />
                        <span className="text-xs font-bold text-[var(--text-secondary)] whitespace-nowrap">전체 선택</span>
                    </div>
                    {selectedDates.size > 0 && (
                        <button onClick={() => setIsConfirmModalOpen(true)} className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500 text-white rounded-lg text-xs font-bold hover:bg-red-600 transition-colors shadow-sm">
                            <TrashIcon className="h-3.5 w-3.5" /> 삭제 ({selectedDates.size})
                        </button>
                    )}
                </div>

                <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-end">
                    <input
                        type="text"
                        placeholder="총평 내용 검색..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="flex-1 md:w-64 p-2 text-sm border border-[var(--border-color-strong)] bg-[var(--background-tertiary)] rounded-lg focus:ring-1 focus:ring-[var(--background-accent)]"
                    />
                    <div className="flex items-center gap-1">
                        <input type="date" name="start" value={dateFilter.start} onChange={e => setDateFilter(p => ({...p, start: e.target.value}))} className="p-2 text-xs border border-[var(--border-color-strong)] rounded-lg bg-[var(--background-tertiary)]"/>
                        <span className="text-[var(--text-muted)]">~</span>
                        <input type="date" name="end" value={dateFilter.end} onChange={e => setDateFilter(p => ({...p, end: e.target.value}))} className="p-2 text-xs border border-[var(--border-color-strong)] rounded-lg bg-[var(--background-tertiary)]"/>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredReviews.length > 0 ? (
                    filteredReviews.map((review, idx) => {
                        const dateObj = new Date(review.date);
                        const day = dateObj.getDate();
                        const month = dateObj.getMonth() + 1;
                        const year = dateObj.getFullYear();
                        const weekDay = dateObj.toLocaleDateString('ko-KR', { weekday: 'short' });
                        const isEditing = editingReviewDate === review.date;
                        const colorClass = CARD_COLORS[idx % CARD_COLORS.length];
                        const { recordsCount, appsCount } = getStatsForDate(review.date);

                        return (
                            <div 
                                key={review.date} 
                                className={`relative group flex flex-col h-[320px] rounded-3xl border-2 transition-all duration-300 hover:shadow-xl hover:-translate-y-1 overflow-hidden ${colorClass} ${selectedDates.has(review.date) ? 'ring-2 ring-[var(--background-accent)]' : ''}`}
                            >
                                <div className="p-5 flex justify-between items-start shrink-0">
                                    <div className="flex items-baseline gap-2">
                                        <span className="text-4xl font-black text-[var(--text-primary)]">{day}</span>
                                        <div className="flex flex-col">
                                            <span className="text-xs font-bold text-[var(--text-accent)] uppercase">{weekDay}</span>
                                            <span className="text-[10px] text-[var(--text-muted)] font-medium">{year}.{String(month).padStart(2, '0')}</span>
                                        </div>
                                    </div>
                                    <div className="flex flex-col items-end gap-2">
                                        <input 
                                            type="checkbox" 
                                            checked={selectedDates.has(review.date)}
                                            onClick={(e) => handleSelectOne(e, review.date)}
                                            onChange={() => {}}
                                            className="h-5 w-5 rounded-full border-[var(--border-color-strong)] text-[var(--background-accent)] focus:ring-[var(--background-accent)] cursor-pointer"
                                        />
                                        <div className="flex gap-1">
                                            {recordsCount > 0 && (
                                                <button 
                                                    onClick={() => handleOpenDetail(review.date, 'records')}
                                                    className="px-2 py-0.5 bg-indigo-500 text-white text-[10px] font-bold rounded-full shadow-sm hover:bg-indigo-600 hover:scale-105 transition-all"
                                                >
                                                    계약 {recordsCount}
                                                </button>
                                            )}
                                            {appsCount > 0 && (
                                                <button 
                                                    onClick={() => handleOpenDetail(review.date, 'apps')}
                                                    className="px-2 py-0.5 bg-emerald-500 text-white text-[10px] font-bold rounded-full shadow-sm hover:bg-emerald-600 hover:scale-105 transition-all"
                                                >
                                                    상담 {appsCount}
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="px-5 flex-1 min-h-0 relative mb-4">
                                    {isEditing ? (
                                        <textarea
                                            value={editedContent}
                                            onChange={(e) => setEditedContent(e.target.value)}
                                            className="w-full h-full p-3 bg-white/80 border border-[var(--background-accent)] rounded-2xl text-sm focus:ring-0 resize-none font-sans leading-relaxed shadow-inner"
                                            autoFocus
                                        />
                                    ) : (
                                        <div className="h-full relative">
                                            {/* 내용 영역 스크롤 적용 */}
                                            <div className="h-full overflow-y-auto custom-scrollbar pr-1">
                                                <p className="text-sm text-[var(--text-secondary)] leading-relaxed whitespace-pre-wrap pb-6">
                                                    {review.content}
                                                </p>
                                            </div>
                                            {/* 하단 페이드 아웃 그라데이션 - 스크롤 유도용 */}
                                            {review.content.length > 100 && (
                                                <div className="absolute bottom-0 left-0 right-0 h-10 bg-gradient-to-t from-white/80 via-white/40 to-transparent pointer-events-none rounded-b-2xl"></div>
                                            )}
                                        </div>
                                    )}
                                </div>

                                <div className="p-4 bg-white/30 backdrop-blur-sm border-t border-black/5 flex justify-between items-center opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                                    {isEditing ? (
                                        <div className="flex w-full gap-2">
                                            <button onClick={() => setEditingReviewDate(null)} className="flex-1 py-1.5 bg-gray-200 text-gray-700 text-xs font-bold rounded-xl hover:bg-gray-300">취소</button>
                                            <button onClick={handleEditSave} className="flex-1 py-1.5 bg-[var(--background-accent)] text-white text-xs font-bold rounded-xl hover:bg-opacity-90">저장</button>
                                        </div>
                                    ) : (
                                        <>
                                            <span className="text-[10px] text-[var(--text-muted)] italic">마지막 수정: {review.date}</span>
                                            <div className="flex gap-1">
                                                <button 
                                                    onClick={() => { setEditingReviewDate(review.date); setEditedContent(review.content); }}
                                                    className="p-2 bg-white/60 text-[var(--text-secondary)] hover:text-[var(--text-accent)] rounded-full transition-colors shadow-sm"
                                                    title="수정"
                                                >
                                                    <PencilIcon className="h-4 w-4" />
                                                </button>
                                                <button 
                                                    onClick={() => onDeleteDailyReview(review.date)}
                                                    className="p-2 bg-white/60 text-[var(--text-secondary)] hover:text-red-500 rounded-full transition-colors shadow-sm"
                                                    title="삭제"
                                                >
                                                    <TrashIcon className="h-4 w-4" />
                                                </button>
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>
                        );
                    })
                ) : (
                    <div className="col-span-full py-20 text-center bg-[var(--background-secondary)] rounded-3xl border-2 border-dashed border-[var(--border-color)]">
                        <CalendarIcon className="h-12 w-12 text-[var(--text-muted)] mx-auto mb-4 opacity-30" />
                        <p className="text-lg font-bold text-[var(--text-primary)]">아직 작성된 총평이 없습니다.</p>
                        <p className="text-sm text-[var(--text-muted)] mt-1">오늘 하루의 소감을 가장 먼저 기록해보세요.</p>
                    </div>
                )}
            </div>

            {detailModal && (
                <BaseModal 
                    isOpen={detailModal.isOpen} 
                    onClose={() => setDetailModal(null)} 
                    className="max-w-md w-full h-[60vh]"
                >
                    <div className="p-4 border-b border-[var(--border-color)] flex justify-between items-center bg-[var(--background-secondary)] rounded-t-lg flex-shrink-0">
                        <div className="flex flex-col">
                            <h2 className="text-lg font-bold text-[var(--text-primary)]">{detailModal.title}</h2>
                            <p className="text-xs text-[var(--text-muted)]">{detailModal.date}</p>
                        </div>
                        <button onClick={() => setDetailModal(null)} className="text-[var(--text-muted)] hover:text-[var(--text-primary)] p-1">
                            <XIcon className="h-5 w-5" />
                        </button>
                    </div>
                    <div className="p-4 flex-1 min-h-0 overflow-y-auto custom-scrollbar bg-[var(--background-primary)]">
                        <div className="space-y-3">
                            {detailModal.type === 'records' ? (
                                (detailModal.items as PerformanceRecord[]).map(record => (
                                    <div key={record.id} className="p-3 bg-[var(--background-secondary)] rounded-xl border border-indigo-100 shadow-sm flex flex-col gap-1 border-l-4 border-l-indigo-500">
                                        <div className="flex justify-between items-start">
                                            <span className="font-bold text-[var(--text-primary)]">{record.contractorName} 고객님</span>
                                            <span className="text-xs font-black text-indigo-600">{record.recognizedPerformance.toLocaleString()}원</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
                                            <BriefcaseIcon className="h-3 w-3" />
                                            <span>{record.insuranceCompany} | {record.productName}</span>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                (detailModal.items as Appointment[]).map(app => (
                                    <div key={app.id} className="p-3 bg-[var(--background-secondary)] rounded-xl border border-emerald-100 shadow-sm flex flex-col gap-1 border-l-4 border-l-emerald-500">
                                        <div className="flex justify-between items-start">
                                            <span className="font-bold text-[var(--text-primary)]">{app.customerName || app.title}</span>
                                            <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">{app.time}</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
                                            <DocumentTextIcon className="h-3 w-3" />
                                            <span className="truncate">{app.notes || '메모 없음'}</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
                                            <span className="px-1.5 py-0.5 bg-gray-100 rounded-md text-[10px]">{app.meetingType}</span>
                                            <span className="text-[10px]">{app.location || '장소 미지정'}</span>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                    <div className="p-3 bg-[var(--background-tertiary)] border-t border-[var(--border-color)] flex justify-end flex-shrink-0">
                        <button onClick={() => setDetailModal(null)} className="px-4 py-1.5 bg-[var(--background-secondary)] border border-[var(--border-color-strong)] rounded-xl text-xs font-bold text-[var(--text-secondary)] hover:bg-gray-100 transition-colors">
                            닫기
                        </button>
                    </div>
                </BaseModal>
            )}

            <ConfirmationModal
                isOpen={isConfirmModalOpen}
                onClose={() => setIsConfirmModalOpen(false)}
                onConfirm={() => {
                    onDeleteMultipleDailyReviews(Array.from(selectedDates));
                    setSelectedDates(new Set());
                    setIsConfirmModalOpen(false);
                }}
                title="총평 삭제 확인"
                message={<p>선택한 <strong>{selectedDates.size}</strong>개의 총평 카드를 정말로 삭제하시겠습니까? 데이터는 복구할 수 없습니다.</p>}
            />
        </div>
    );
};

export default DailyReviewList;
