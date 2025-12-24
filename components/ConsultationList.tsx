
import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import type { Customer, Consultation, MeetingType } from '../types';
import { PencilIcon, TrashIcon, XIcon } from './icons';
import Tag from './ui/Tag';
import ConfirmationModal from './ui/ConfirmationModal';

interface ConsultationRecord {
    customerId: string;
    customerName: string;
    consultation: Consultation;
}

interface ConsultationListProps {
    customers: Customer[];
    onSelectCustomer: (customer: Customer, initialTab?: 'details' | 'consultations' | 'contracts' | 'callHistory') => void;
    onEdit: (customerId: string, customerName: string, consultation: Consultation) => void;
    onDelete: (customerId: string, consultationId: string) => void;
    onDeleteMultiple: (consultations: Array<{ customerId: string; consultationId: string }>) => void;
    meetingTypeOptions?: string[];
}

const ConsultationList: React.FC<ConsultationListProps> = ({ customers, onSelectCustomer, onEdit, onDelete, onDeleteMultiple, meetingTypeOptions }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedMeetingTypes, setSelectedMeetingTypes] = useState<Set<string>>(new Set());
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
    const headerCheckboxRef = useRef<HTMLInputElement>(null);


    const { allConsultations, availableMeetingTypes } = useMemo(() => {
        const consultations: ConsultationRecord[] = [];
        const dataMeetingTypes = new Set<string>();
        
        customers.forEach(customer => {
            customer.consultations.forEach(consultation => {
                consultations.push({
                    customerId: customer.id,
                    customerName: customer.name,
                    consultation,
                });
                dataMeetingTypes.add(consultation.meetingType);
            });
        });

        consultations.sort((a, b) => new Date(b.consultation.date).getTime() - new Date(a.consultation.date).getTime());
        
        // Merge configured options with types existing in data (to handle legacy types)
        const mergedTypes = new Set(meetingTypeOptions || []);
        dataMeetingTypes.forEach(t => mergedTypes.add(t));

        return { 
            allConsultations: consultations, 
            availableMeetingTypes: Array.from(mergedTypes).sort() 
        };
    }, [customers, meetingTypeOptions]);

    const filteredConsultations = useMemo(() => {
        const lowercasedSearch = searchTerm.toLowerCase();

        return allConsultations.filter(({ customerName, consultation }) => {
            if (selectedMeetingTypes.size > 0 && !selectedMeetingTypes.has(consultation.meetingType)) {
                return false;
            }

            if (lowercasedSearch) {
                const inCustomerName = customerName.toLowerCase().includes(lowercasedSearch);
                const inNotes = consultation.notes.toLowerCase().includes(lowercasedSearch);
                if (!inCustomerName && !inNotes) {
                    return false;
                }
            }
            return true;
        });
    }, [allConsultations, searchTerm, selectedMeetingTypes]);

    useEffect(() => {
        if (headerCheckboxRef.current) {
            const numSelected = selectedIds.size;
            const numTotal = filteredConsultations.length;
            if (numTotal === 0) {
                headerCheckboxRef.current.checked = false;
                headerCheckboxRef.current.indeterminate = false;
                return;
            }
            headerCheckboxRef.current.checked = numSelected === numTotal;
            headerCheckboxRef.current.indeterminate = numSelected > 0 && numSelected < numTotal;
        }
    }, [selectedIds, filteredConsultations]);
    
    const toggleMeetingTypeFilter = (type: string) => {
        setSelectedMeetingTypes(prev => {
            const newSet = new Set(prev);
            if (newSet.has(type)) {
                newSet.delete(type);
            } else {
                newSet.add(type);
            }
            return newSet;
        });
    };
    
    const handleSelectCustomer = (customerId: string) => {
        const customer = customers.find(c => c.id === customerId);
        if (customer) {
            onSelectCustomer(customer, 'consultations');
        }
    };

    const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.checked) {
            setSelectedIds(new Set(filteredConsultations.map(c => c.consultation.id)));
        } else {
            setSelectedIds(new Set());
        }
    };

    const handleSelectOne = (consultationId: string) => {
        setSelectedIds(prev => {
            const newSet = new Set(prev);
            if (newSet.has(consultationId)) {
                newSet.delete(consultationId);
            } else {
                newSet.add(consultationId);
            }
            return newSet;
        });
    };

    const handleOpenConfirmModal = () => {
        if (selectedIds.size > 0) {
            setIsConfirmModalOpen(true);
        }
    };

    const handleConfirmDeletion = () => {
        const consultationsToDelete = allConsultations
            .filter(c => selectedIds.has(c.consultation.id))
            .map(c => ({ customerId: c.customerId, consultationId: c.consultation.id }));
        
        onDeleteMultiple(consultationsToDelete);
        setSelectedIds(new Set());
        setIsConfirmModalOpen(false);
    };

    return (
        <div className="animate-fade-in">
             <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-[var(--text-primary)]">전체 상담 기록</h1>
                {selectedIds.size > 0 && (
                    <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-[var(--text-secondary)]">{selectedIds.size}개 선택됨</span>
                        <button onClick={handleOpenConfirmModal} className="flex items-center justify-center bg-[var(--background-danger)] hover:bg-[var(--background-danger-hover)] text-white font-bold py-2 px-3 rounded-lg transition-colors text-sm">
                            <TrashIcon className="h-5 w-5 mr-2" /> 선택 삭제
                        </button>
                    </div>
                )}
            </div>
            
            <div className="bg-[var(--background-secondary)] p-4 rounded-lg shadow-md border border-[var(--border-color)] mb-6 space-y-4">
                <div>
                    <label htmlFor="search-consultation" className="block text-sm font-medium text-[var(--text-secondary)]">검색</label>
                    <input
                        id="search-consultation"
                        type="text"
                        placeholder="고객명, 상담 내용, 키워드 검색..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="mt-1 w-full p-2 border border-[var(--border-color-strong)] bg-[var(--background-tertiary)] text-[var(--text-primary)] rounded-md shadow-sm focus:ring-[var(--background-accent)] focus:border-[var(--background-accent)]"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-[var(--text-secondary)]">상담 유형 필터</label>
                    <div className="mt-2 flex flex-wrap gap-2">
                        {availableMeetingTypes.map(type => (
                            <button
                                key={type}
                                onClick={() => toggleMeetingTypeFilter(type)}
                                className={`px-3 py-1 rounded-full text-sm font-medium transition-colors border ${
                                    selectedMeetingTypes.has(type)
                                    ? 'bg-[var(--background-accent)] text-[var(--text-on-accent)] border-transparent'
                                    : 'bg-[var(--background-tertiary)] text-[var(--text-secondary)] hover:bg-[var(--background-primary)] border-[var(--border-color-strong)]'
                                }`}
                            >
                                {type}
                            </button>
                        ))}
                    </div>
                </div>
                <div className="mt-4 pt-4 border-t border-[var(--border-color)] flex items-center">
                     <input
                        ref={headerCheckboxRef}
                        type="checkbox"
                        className="h-5 w-5 rounded border-[var(--border-color-strong)] bg-[var(--background-tertiary)] text-[var(--background-accent)] focus:ring-[var(--background-accent)]"
                        onChange={handleSelectAll}
                        aria-label="모든 상담 기록 선택"
                    />
                    <label htmlFor="selectAll" className="ml-2 text-sm font-medium text-[var(--text-secondary)]">
                        현재 목록 전체 선택 ({filteredConsultations.length}개)
                    </label>
                </div>
            </div>

            <div className="space-y-4">
                {filteredConsultations.length > 0 ? (
                    filteredConsultations.map(({ customerId, customerName, consultation }) => (
                        <div key={consultation.id} className={`p-4 rounded-lg shadow-md border animate-fade-in-up transition-colors ${selectedIds.has(consultation.id) ? 'bg-[var(--background-accent-subtle)] border-[var(--background-accent)]/50' : 'bg-[var(--background-secondary)] border-[var(--border-color)]'}`}>
                            <div className="flex items-start gap-3">
                                <input type="checkbox" className="h-5 w-5 rounded border-[var(--border-color-strong)] bg-[var(--background-tertiary)] text-[var(--background-accent)] focus:ring-[var(--background-accent)] mt-1" checked={selectedIds.has(consultation.id)} onChange={() => handleSelectOne(consultation.id)} aria-label={`${customerName}의 상담기록 선택`} />
                                <div className="flex-grow">
                                    <div className="flex justify-between items-start mb-2">
                                        <div>
                                            <button 
                                                onClick={() => handleSelectCustomer(customerId)}
                                                className="text-lg font-bold text-[var(--text-primary)] hover:underline text-left"
                                            >
                                                {customerName}
                                            </button>
                                            <p className="text-sm text-[var(--text-muted)]">
                                                {new Date(consultation.date).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })}
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="px-2 py-1 text-xs font-semibold rounded-full bg-blue-500/20 text-blue-300 shrink-0">
                                                {consultation.meetingType}
                                            </span>
                                            <button onClick={() => onEdit(customerId, customerName, consultation)} className="p-1 text-[var(--text-muted)] hover:text-[var(--text-accent)]" aria-label="상담 기록 수정">
                                                <PencilIcon className="h-5 w-5" />
                                            </button>
                                             <button onClick={() => onDelete(customerId, consultation.id)} className="p-1 text-[var(--text-muted)] hover:text-[var(--text-danger)]" aria-label="상담 기록 삭제">
                                                <TrashIcon className="h-5 w-5" />
                                            </button>
                                        </div>
                                    </div>
                                    <div className="mt-3 pt-3 border-t border-[var(--border-color)]">
                                        <pre className="whitespace-pre-wrap font-sans text-sm text-[var(--text-secondary)] bg-[var(--background-primary)] p-3 rounded-md border border-[var(--border-color-strong)]">
                                            {consultation.notes}
                                        </pre>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="text-center py-12 text-[var(--text-muted)] bg-[var(--background-secondary)] rounded-lg shadow-md border border-[var(--border-color)]">
                        <p className="text-lg">해당 조건에 맞는 상담 기록이 없습니다.</p>
                        <p className="text-sm mt-2">검색어나 필터를 변경해보세요.</p>
                    </div>
                )}
            </div>
            <ConfirmationModal
                isOpen={isConfirmModalOpen}
                onClose={() => setIsConfirmModalOpen(false)}
                onConfirm={handleConfirmDeletion}
                title="상담 기록 삭제 확인"
                message={<p>선택한 {selectedIds.size}개의 상담 기록을 정말로 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.</p>}
            />
        </div>
    );
};

export default ConsultationList;
