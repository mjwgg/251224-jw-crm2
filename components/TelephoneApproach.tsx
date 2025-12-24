
import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import type { Customer, CustomerType, Script, CallRecord, CallResult, Appointment } from '../types';
import { customerTypeLabels, callResultLabels } from '../types';
import { XIcon, PencilIcon, TrashIcon, PlusIcon, PhoneIcon, CheckIcon, MessageIcon, SparklesIcon } from './icons';
import BaseModal from './ui/BaseModal';
import { getFieldsForCustomerType, type FieldConfig } from '../config/customerFields';

interface ScriptEditModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (script: Script) => void;
    script: Script | null;
}

const formatRelativeDate = (dateString: string): string => {
    if (!dateString) return '';
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const callDate = new Date(dateString);
    callDate.setHours(0, 0, 0, 0);

    const diffTime = today.getTime() - callDate.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return '오늘';
    if (diffDays === 1) return '어제';
    if (diffDays > 1) return `${diffDays}일 전`;
    
    return callDate.toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric' });
};


const ScriptEditModal: React.FC<ScriptEditModalProps> = ({ isOpen, onClose, onSave, script }) => {
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');

    useEffect(() => {
        if (isOpen) {
            setTitle(script?.title || '');
            setContent(script?.content || '');
        }
    }, [isOpen, script]);

    if (!isOpen) return null;

    const handleSave = () => {
        if (!title.trim()) {
            alert("제목을 입력해주세요.");
            return;
        }
        const newScript: Script = {
            id: script?.id || `script-${Date.now()}`,
            title,
            content
        };
        onSave(newScript);
        onClose();
    };

    return (
        <BaseModal isOpen={isOpen} onClose={onClose} className="max-w-2xl w-full">
            <div className="p-4 border-b border-[var(--border-color)] flex justify-between items-center flex-shrink-0">
                <h2 className="text-xl font-bold text-[var(--text-primary)]">{script ? '스크립트 수정' : '새 스크립트 추가'}</h2>
                <button onClick={onClose} className="text-[var(--text-muted)] hover:text-[var(--text-primary)]"><XIcon className="h-6 w-6" /></button>
            </div>
            <div className="p-6 space-y-4 overflow-y-auto custom-scrollbar flex-1 min-h-0">
                <div>
                    <label htmlFor="scriptTitle" className="block text-sm font-medium text-[var(--text-secondary)]">제목</label>
                    <input type="text" id="scriptTitle" value={title} onChange={e => setTitle(e.target.value)} className="mt-1 block w-full border border-[var(--border-color-strong)] bg-[var(--background-tertiary)] text-[var(--text-primary)] rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-[var(--background-accent)] focus:border-[var(--background-accent)]" />
                </div>
                <div>
                    <label htmlFor="scriptContent" className="block text-sm font-medium text-[var(--text-secondary)]">내용</label>
                    <textarea id="scriptContent" value={content} onChange={e => setContent(e.target.value)} rows={10} className="mt-1 block w-full border border-[var(--border-color-strong)] bg-[var(--background-tertiary)] text-[var(--text-primary)] rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-[var(--background-accent)] focus:border-[var(--background-accent)] font-sans"></textarea>
                </div>
            </div>
            <div className="p-4 bg-[var(--background-tertiary)] border-t border-[var(--border-color)] flex justify-end space-x-4 flex-shrink-0">
                <button onClick={onClose} className="px-4 py-2 bg-[var(--background-secondary)] border border-[var(--border-color-strong)] rounded-md text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--background-primary)]">취소</button>
                <button onClick={handleSave} className="px-6 py-2 bg-[var(--background-accent)] text-[var(--text-on-accent)] rounded-md text-sm font-medium hover:bg-[var(--background-accent-hover)]">저장</button>
            </div>
        </BaseModal>
    );
};

const CustomerInfoCard: React.FC<{ customer: Customer; onLogCall: (customer: Customer) => void; isCompleted?: boolean; }> = ({ customer, onLogCall, isCompleted = false }) => {
    const latestCall = useMemo(() => {
        if (customer.callHistory && customer.callHistory.length > 0) {
            return customer.callHistory[0];
        }
        return null;
    }, [customer.callHistory]);

    return (
        <div className={`p-4 flex justify-between items-center ${isCompleted ? 'opacity-50' : ''}`}>
            <div className="flex items-center">
                {isCompleted && <CheckIcon className="h-5 w-5 text-green-500 mr-2 shrink-0" />}
                <div>
                    <p className="font-semibold text-[var(--text-primary)] cursor-pointer hover:underline">
                        {customer.name}
                    </p>
                    <a href={`tel:${customer.contact.replace(/\D/g, '')}`} className="text-sm text-[var(--text-muted)] hover:underline" onClick={(e) => e.stopPropagation()}>
                        {customer.contact}
                    </a>
                    {latestCall && (
                        <p className="text-xs text-[var(--text-muted)] mt-1">
                            {formatRelativeDate(latestCall.date)} - {callResultLabels[latestCall.result]}
                        </p>
                    )}
                </div>
            </div>
            <button onClick={(e) => { e.stopPropagation(); onLogCall(customer); }} className="flex-shrink-0 flex items-center px-3 py-1 bg-[var(--background-tertiary)] text-[var(--text-secondary)] text-xs font-medium rounded-md hover:bg-[var(--background-primary)] border border-[var(--border-color-strong)]">
                <PhoneIcon className="h-4 w-4 mr-1.5" />
                통화기록
            </button>
        </div>
    );
};

const SelectedCustomerDetails: React.FC<{ customer: Customer }> = ({ customer }) => {
    const renderDetailField = (field: FieldConfig) => {
        const value = customer[field.key as keyof Customer] as any;
        
        let displayValue: React.ReactNode = <p className="mt-1 text-sm text-[var(--text-muted)] italic">미입력</p>;

        if (value !== undefined && value !== null && value !== '' && (!Array.isArray(value) || value.length > 0)) {
            displayValue = (
                <p className="mt-1 text-sm text-[var(--text-primary)] font-medium whitespace-pre-wrap">
                    {Array.isArray(value) ? value.join(', ') : String(value)}
                </p>
            );
        }

        return (
            <div key={field.key}>
                <label className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">{field.label}</label>
                {displayValue}
            </div>
        );
    };
    
    const allFields = getFieldsForCustomerType(customer.type, 'all');

    return (
        <div className="mb-6 bg-[var(--background-secondary)] p-4 rounded-lg shadow-lg border border-[var(--border-color)] animate-fade-in-up">
            <h2 className="text-xl font-bold text-[var(--text-primary)] mb-2">{customer.name}님 상세 정보</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3">
                {allFields.map(renderDetailField)}
            </div>
        </div>
    );
};

interface TelephoneApproachProps {
    scripts: Script[];
    customers: Customer[];
    appointments: Appointment[];
    onSaveScript: (script: Script) => void;
    onDeleteScript: (scriptId: string) => void;
    onSelectCustomer: (customer: Customer) => void;
    onLogCall: (customer: Customer) => void;
    callingListCustomerIds: string[] | null;
    completedInCallingList: Set<string>;
    endCallingList: () => void;
    onAddAppointment: (appointment: Omit<Appointment, 'id' | 'status'>, consultationData?: any, recurrence?: any, rescheduledFromId?: string, completedOriginalId?: string, status?: Appointment['status']) => Promise<void>;
}

const callResultBorderColors: Record<CallResult, string> = {
  meeting_scheduled: 'border-l-4 border-green-500',
  rejected: 'border-l-4 border-red-500',
  no_answer: 'border-l-4 border-gray-500',
  recall: 'border-l-4 border-yellow-500',
  other: 'border-l-4 border-blue-500',
};

const TelephoneApproach: React.FC<TelephoneApproachProps> = ({
    scripts,
    customers,
    appointments,
    onSaveScript,
    onDeleteScript,
    onSelectCustomer,
    onLogCall,
    callingListCustomerIds,
    completedInCallingList,
    endCallingList,
    onAddAppointment,
}) => {
    const [activeTab, setActiveTab] = useState<'ta' | 'history'>('ta');
    const [historySearchTerm, setHistorySearchTerm] = useState('');
    const [customerTypeFilter, setCustomerTypeFilter] = useState<CustomerType | 'all'>('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [listSource, setListSource] = useState<'interested' | 'all'>('interested');
    
    const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
    const [selectedScript, setSelectedScript] = useState<Script | null>(null);
    const [isScriptModalOpen, setIsScriptModalOpen] = useState(false);
    const [editingScript, setEditingScript] = useState<Script | null>(null);
    const detailsRef = useRef<HTMLDivElement>(null);

    // 퀵 카운터 상태
    const [quickTaInput, setQuickTaInput] = useState('');
    const [isQuickTaSaving, setIsQuickTaSaving] = useState(false);
    
    const isCallingListMode = callingListCustomerIds !== null;

    const todayStr = useMemo(() => {
        const today = new Date();
        return new Date(today.getTime() - (today.getTimezoneOffset() * 60000)).toISOString().split('T')[0];
    }, []);

    // 오늘 누적 통화수 계산 (등록 고객 TA + 비회원 TA 중 완료된 것)
    const todayTotalTaCount = useMemo(() => {
        return appointments.filter(app => 
            app.date === todayStr && 
            app.meetingType === 'TA' && 
            app.status === 'completed'
        ).length;
    }, [appointments, todayStr]);

    const allCallRecords = useMemo(() => {
        const records: Array<{ customerId: string; customerName: string; call: CallRecord }> = [];
        customers.forEach(customer => {
          (customer.callHistory || []).forEach(call => {
            records.push({
              customerId: customer.id,
              customerName: customer.name,
              call,
            });
          });
        });
        return records.sort((a, b) => new Date(b.call.date).getTime() - new Date(a.call.date).getTime());
    }, [customers]);

    const filteredCallRecords = useMemo(() => {
        const lowercasedTerm = historySearchTerm.toLowerCase();
        if (!lowercasedTerm) return allCallRecords;
        return allCallRecords.filter(({ customerName, call }) => 
          customerName.toLowerCase().includes(lowercasedTerm) ||
          new Date(call.date).toLocaleString('ko-KR').includes(lowercasedTerm) ||
          callResultLabels[call.result].toLowerCase().includes(lowercasedTerm) ||
          (call.notes || '').toLowerCase().includes(lowercasedTerm)
        );
    }, [allCallRecords, historySearchTerm]);

    const handleCustomerClick = (customerId: string) => {
        const customer = customers.find(c => c.id === customerId);
        if (customer) {
          onSelectCustomer(customer);
        }
    };

    const callingListCustomers = useMemo(() => {
        if (!callingListCustomerIds) return [];
        const customerMap = new Map(customers.map(c => [c.id, c]));
        return callingListCustomerIds.map(id => customerMap.get(id)).filter((c): c is Customer => c !== undefined);
    }, [customers, callingListCustomerIds]);

    const pendingCustomers = useMemo(() => {
        if (!isCallingListMode) return [];
        return callingListCustomers.filter(c => !completedInCallingList.has(c.id));
    }, [isCallingListMode, callingListCustomers, completedInCallingList]);
    
    const completedCustomers = useMemo(() => {
        if (!isCallingListMode) return [];
        return callingListCustomers.filter(c => completedInCallingList.has(c.id));
    }, [isCallingListMode, callingListCustomers, completedInCallingList]);
    
    useEffect(() => {
        if (isCallingListMode) {
            setSelectedCustomer(pendingCustomers[0] || completedCustomers[0] || null);
        } else {
             if (!selectedCustomer && customers.length > 0) {
                setSelectedCustomer(customers[0]);
            }
        }
    }, [isCallingListMode, pendingCustomers, completedCustomers, customers]);
    
    useEffect(() => {
        if (selectedScript) {
            const updatedScriptInList = scripts.find(s => s.id === selectedScript.id);
            if (!updatedScriptInList) {
                setSelectedScript(scripts.length > 0 ? scripts[0] : null);
            } else {
                if (JSON.stringify(selectedScript) !== JSON.stringify(updatedScriptInList)) {
                    setSelectedScript(updatedScriptInList);
                }
            }
        } else {
            if (scripts.length > 0) {
                setSelectedScript(scripts[0]);
            }
        }
    }, [scripts]);
    
    const filteredCustomers = useMemo(() => {
        if (isCallingListMode) return [];
        
        let sourceCustomers = customers;
        if (listSource === 'interested') {
            sourceCustomers = customers.filter(c => c.tags.includes('관심고객'));
        }
        
        return sourceCustomers.filter(customer => {
            const typeMatch = customerTypeFilter === 'all' || customer.type === customerTypeFilter;
            const searchMatch = customer.name.toLowerCase().includes(searchTerm.toLowerCase()) || customer.contact.includes(searchTerm);
            return typeMatch && searchMatch;
        }).sort((a, b) => a.name.localeCompare(b.name));
    }, [customers, customerTypeFilter, searchTerm, isCallingListMode, listSource]);

    const handleOpenScriptModal = (script: Script | null) => {
        setEditingScript(script);
        setIsScriptModalOpen(true);
    };

    const handleSelectAndScroll = useCallback((customer: Customer) => {
        setSelectedCustomer(customer);
        setTimeout(() => {
            detailsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 100);
    }, []);

    const formattedScriptContent = useMemo(() => {
        if (!selectedScript || !selectedCustomer) return selectedScript?.content || '';
        return selectedScript.content.replace(/{customerName}/g, selectedCustomer.name);
    }, [selectedScript, selectedCustomer]);

    const handleQuickTaSubmit = async () => {
        setIsQuickTaSaving(true);
        const today = new Date();
        const todayStr = new Date(today.getTime() - (today.getTimezoneOffset() * 60000)).toISOString().split('T')[0];
        const timeStr = today.toTimeString().slice(0, 5);

        const newTA: Omit<Appointment, 'id' | 'status'> = {
            customerId: `unregistered-ta-${Date.now()}`,
            customerName: quickTaInput.trim() || '비회원 TA',
            date: todayStr,
            time: timeStr,
            meetingType: 'TA',
            notes: quickTaInput.trim() ? `[퀵 기록] ${quickTaInput.trim()}` : '비회원 활동 기록 (카운트용)',
        };

        try {
            await onAddAppointment(newTA, undefined, undefined, undefined, undefined, 'completed');
            setQuickTaInput('');
        } catch (e) {
            console.error("Failed to record quick TA", e);
        } finally {
            setIsQuickTaSaving(false);
        }
    };

    const customerTypesForFilter: (CustomerType | 'all')[] = ['all', 'potential', 'existing', 'doctor_potential', 'nurse_potential', 'db_potential'];
    
    const renderCustomerCard = useCallback((customer: Customer, isCompleted = false) => {
        const getBorderColorClass = (c: Customer) => {
            if (!c.callHistory || c.callHistory.length === 0) {
                return '';
            }
            
            const todaysCalls = c.callHistory
                .filter(call => new Date(call.date).toISOString().split('T')[0] === todayStr)
                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    
            if (todaysCalls.length > 0) {
                return callResultBorderColors[todaysCalls[0].result] || '';
            }
    
            return '';
        };

        const borderColorClass = getBorderColorClass(customer);

        return (
            <div key={customer.id} className={`rounded-lg cursor-pointer transition-colors ${borderColorClass} ${selectedCustomer?.id === customer.id ? 'bg-[var(--background-accent-subtle)] ring-2 ring-[var(--background-accent)]' : 'hover:bg-[var(--background-tertiary)]'}`} onClick={() => handleSelectAndScroll(customer)}>
                <CustomerInfoCard customer={customer} onLogCall={onLogCall} isCompleted={isCompleted} />
            </div>
        );
    }, [todayStr, selectedCustomer, handleSelectAndScroll, onLogCall]);

    return (
        <div className="md:grid md:grid-cols-3 md:gap-6 md:h-full">
            {/* Customer List Section */}
            <div className="md:col-span-1 md:flex md:flex-col">
                <div className="flex border-b border-[var(--border-color)] mb-4">
                    <button onClick={() => setActiveTab('ta')} className={`w-1/2 py-2 text-sm font-medium ${activeTab === 'ta' ? 'text-[var(--text-accent)] border-b-2 border-[var(--background-accent)]' : 'text-[var(--text-muted)]'}`}>TA 대상</button>
                    <button onClick={() => setActiveTab('history')} className={`w-1/2 py-2 text-sm font-medium ${activeTab === 'history' ? 'text-[var(--text-accent)] border-b-2 border-[var(--background-accent)]' : 'text-[var(--text-muted)]'}`}>전체 통화기록</button>
                </div>

                {activeTab === 'ta' ? (
                    <>
                        {/* 비회원 퀵 기록바 */}
                        <div className="bg-[var(--background-secondary)] p-3 rounded-lg border-2 border-[var(--background-accent-subtle)] mb-4 animate-fade-in shadow-sm">
                            <div className="flex justify-between items-center mb-2">
                                <p className="text-[11px] font-bold text-[var(--text-accent)] flex items-center gap-1">
                                    <SparklesIcon className="w-3 h-3" /> 비회원 활동 퀵 카운터
                                </p>
                                <p className="text-[10px] font-bold text-[var(--text-muted)]">
                                    오늘 누적: <span className="text-[var(--text-accent)]">{todayTotalTaCount}콜</span>
                                </p>
                            </div>
                            <div className="flex gap-2">
                                <input 
                                    type="text" 
                                    value={quickTaInput}
                                    onChange={(e) => setQuickTaInput(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleQuickTaSubmit()}
                                    placeholder="이름/내용 입력 (생략가능)"
                                    className="flex-1 px-3 py-1.5 text-xs bg-[var(--background-tertiary)] border border-[var(--border-color-strong)] rounded-md focus:ring-1 focus:ring-[var(--background-accent)] outline-none"
                                />
                                <button 
                                    onClick={handleQuickTaSubmit}
                                    disabled={isQuickTaSaving}
                                    className="px-3 py-1.5 bg-[var(--background-accent)] text-white text-xs font-bold rounded-md hover:bg-[var(--background-accent-hover)] transition-colors flex items-center justify-center min-w-[50px]"
                                >
                                    {isQuickTaSaving ? '...' : '+1'}
                                </button>
                            </div>
                        </div>

                        {isCallingListMode ? (
                             <>
                                <div className="flex justify-between items-center mb-4">
                                    <h2 className="text-xl font-bold text-[var(--text-primary)]">콜링 리스트 진행 중</h2>
                                    <button onClick={endCallingList} className="text-sm text-[var(--text-accent)] hover:underline">종료</button>
                                </div>
                                <div className="bg-[var(--background-secondary)] p-4 rounded-lg shadow-lg border border-[var(--border-color)] mb-4 text-center">
                                    <p className="text-[var(--text-muted)]">남은 고객 <span className="font-bold text-lg text-[var(--text-primary)]">{pendingCustomers.length}</span> / {callingListCustomerIds.length}</p>
                                </div>
                            </>
                        ) : (
                            <>
                                <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-4">🎯 TA 대상 고객</h2>
                                <div className="bg-[var(--background-secondary)] p-4 rounded-lg shadow-lg border border-[var(--border-color)] mb-4 space-y-3">
                                    <div className="flex items-center gap-2 p-1 bg-[var(--background-tertiary)] rounded-lg">
                                        <button
                                            onClick={() => setListSource('interested')}
                                            className={`w-full py-2 text-sm font-medium rounded-md transition-colors ${listSource === 'interested' ? 'bg-[var(--background-secondary)] text-[var(--text-accent)] shadow' : 'text-[var(--text-secondary)]'}`}
                                        >
                                            관심 고객
                                        </button>
                                        <button
                                            onClick={() => setListSource('all')}
                                            className={`w-full py-2 text-sm font-medium rounded-md transition-colors ${listSource === 'all' ? 'bg-[var(--background-secondary)] text-[var(--text-accent)] shadow' : 'text-[var(--text-secondary)]'}`}
                                        >
                                            전체 고객
                                        </button>
                                    </div>
                                    <input
                                        type="text"
                                        placeholder="이름 또는 연락처로 검색..."
                                        value={searchTerm}
                                        onChange={e => setSearchTerm(e.target.value)}
                                        className="w-full p-2 border border-[var(--border-color-strong)] bg-[var(--background-tertiary)] text-[var(--text-primary)] rounded-md shadow-sm focus:ring-[var(--background-accent)] focus:border-[var(--background-accent)]"
                                    />
                                    <div className="flex flex-wrap gap-2">
                                        {customerTypesForFilter.map(type => (
                                            <button
                                                key={type}
                                                onClick={() => setCustomerTypeFilter(type)}
                                                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors border ${customerTypeFilter === type ? 'bg-[var(--background-accent)] text-[var(--text-on-accent)] border-transparent' : 'bg-[var(--background-tertiary)] text-[var(--text-secondary)] hover:bg-[var(--background-primary)] border-[var(--border-color-strong)]'}`}
                                            >
                                                {type === 'all' ? '전체' : customerTypeLabels[type]}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </>
                        )}
                        <div className="bg-[var(--background-secondary)] p-2 rounded-lg shadow-lg border border-[var(--border-color)] md:flex-1 md:overflow-y-auto custom-scrollbar">
                             {isCallingListMode ? (
                                <>
                                    <h3 className="text-sm font-semibold text-[var(--text-muted)] px-2 py-1">통화 대상</h3>
                                    {pendingCustomers.length > 0 ? (
                                        pendingCustomers.map(customer => renderCustomerCard(customer, false))
                                    ) : (
                                        <p className="text-center text-[var(--text-muted)] p-4">모든 고객에게 통화를 완료했습니다!</p>
                                    )}

                                    {completedCustomers.length > 0 && (
                                        <>
                                            <hr className="my-2 border-[var(--border-color)]" />
                                            <h3 className="text-sm font-semibold text-[var(--text-muted)] px-2 py-1">완료</h3>
                                            {completedCustomers.map(customer => renderCustomerCard(customer, true))}
                                        </>
                                    )}
                                </>
                            ) : (
                                filteredCustomers.length > 0 ? (
                                    filteredCustomers.map(customer => renderCustomerCard(customer, false))
                                ) : (
                                    <p className="text-center text-[var(--text-muted)] p-8">해당하는 고객이 없습니다.</p>
                                )
                            )}
                        </div>
                    </>
                ) : (
                     <div className="animate-fade-in md:flex md:flex-col md:h-full">
                        <input
                            type="text"
                            placeholder="고객명, 날짜, 결과, 메모로 검색..."
                            value={historySearchTerm}
                            onChange={e => setHistorySearchTerm(e.target.value)}
                            className="w-full p-2 border border-[var(--border-color-strong)] bg-[var(--background-tertiary)] text-[var(--text-primary)] rounded-md shadow-sm focus:ring-[var(--background-accent)] focus:border-[var(--background-accent)] mb-4"
                        />
                        <div className="bg-[var(--background-secondary)] p-2 rounded-lg shadow-lg border border-[var(--border-color)] md:flex-1 md:overflow-y-auto custom-scrollbar">
                            {filteredCallRecords.length > 0 ? (
                            <table className="w-full text-sm text-left">
                                <thead className="text-xs text-[var(--text-muted)] uppercase bg-[var(--background-tertiary)]">
                                <tr>
                                    <th scope="col" className="p-2">고객명</th>
                                    <th scope="col" className="p-2">통화일자</th>
                                    <th scope="col" className="p-2">결과</th>
                                </tr>
                                </thead>
                                <tbody className="divide-y divide-[var(--border-color)]">
                                {filteredCallRecords.map(({ customerId, customerName, call }) => (
                                    <tr key={call.id} className="border-b border-[var(--border-color)]">
                                        <td className="p-2 font-medium text-[var(--text-primary)]">
                                            <button onClick={() => handleCustomerClick(customerId)} className="hover:underline">{customerName}</button>
                                        </td>
                                        <td className="p-2 text-[var(--text-secondary)] whitespace-nowrap">{new Date(call.date).toLocaleDateString()}</td>
                                        <td className="p-2 text-[var(--text-accent)] font-semibold">{callResultLabels[call.result]}</td>
                                    </tr>
                                ))}
                                </tbody>
                            </table>
                            ) : (
                            <p className="text-center text-[var(--text-muted)] p-8">통화 기록이 없습니다.</p>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Details and Scripts Section */}
            <div className="mt-6 md:mt-0 md:col-span-2 md:overflow-y-auto custom-scrollbar md:pr-2">
                
                <div className="bg-[var(--background-secondary)] p-3 rounded-lg shadow-lg border border-[var(--border-color)] mb-6 flex items-center justify-between gap-4 animate-fade-in-up cursor-pointer hover:bg-[var(--background-tertiary)] transition-colors" onClick={() => window.location.href='tel:01022163426'}>
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-[var(--background-accent-subtle)] rounded-full flex items-center justify-center flex-shrink-0">
                            <MessageIcon className="h-5 w-5 text-[var(--text-accent)]" />
                        </div>
                        <div className="flex flex-col">
                            <span className="text-xs text-[var(--text-muted)] font-medium">광고문의 / 입사문의</span>
                            <span className="text-lg font-bold text-[var(--text-primary)]">010-2216-3426</span>
                        </div>
                    </div>
                    <div className="hidden sm:block">
                        <span className="text-xs text-[var(--text-accent)] border border-[var(--border-color)] px-2 py-1 rounded-full">전화걸기</span>
                    </div>
                </div>

                <div ref={detailsRef} className="scroll-mt-4 md:scroll-mt-0">
                    {selectedCustomer && <SelectedCustomerDetails customer={selectedCustomer} />}
                </div>
                
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-2xl font-bold text-[var(--text-primary)]">📝 TA 스크립트</h2>
                     <button 
                        onClick={() => handleOpenScriptModal(null)} 
                        className="flex items-center justify-center bg-[var(--background-tertiary)] hover:bg-[var(--background-primary)] text-[var(--text-secondary)] border border-[var(--border-color-strong)] font-bold py-2 px-3 rounded-lg transition-colors text-sm"
                    >
                        <PlusIcon className="h-5 w-5 mr-2" />
                        <span>새 스크립트 추가</span>
                    </button>
                </div>

                <div className="bg-[var(--background-secondary)] p-4 rounded-lg shadow-lg border border-[var(--border-color)]">
                    <div className="flex flex-wrap gap-2">
                        {scripts.map(script => (
                            <button
                                key={script.id}
                                onClick={() => setSelectedScript(script)}
                                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors border ${
                                    selectedScript?.id === script.id 
                                    ? 'bg-[var(--background-accent)] text-[var(--text-on-accent)] border-transparent' 
                                    : 'bg-[var(--background-tertiary)] text-[var(--text-secondary)] hover:bg-[var(--background-primary)] border border-[var(--border-color-strong)]'
                                }`}
                            >
                                {script.title}
                            </button>
                        ))}
                    </div>
                </div>

                {selectedScript && (
                    <div className="mt-4 bg-[var(--background-secondary)] p-4 rounded-lg shadow-lg border border-[var(--border-color)] animate-fade-in">
                        <div className="flex justify-between items-center mb-2 flex-wrap gap-2">
                            <div className="flex items-center gap-4">
                                <h3 className="text-lg font-bold text-[var(--text-accent)]">{selectedScript.title} {selectedCustomer ? `- ${selectedCustomer.name}님` : ''}</h3>
                                {selectedCustomer && (
                                    <div className="flex items-center gap-2">
                                        <a
                                            href={`tel:${selectedCustomer.contact.replace(/\D/g, '')}`}
                                            className="flex-shrink-0 flex items-center px-3 py-1 bg-green-500 text-white text-xs font-medium rounded-md hover:bg-green-600"
                                        >
                                            <PhoneIcon className="h-4 w-4 mr-1.5" />
                                            통화
                                        </a>
                                        <button
                                            onClick={() => onLogCall(selectedCustomer)}
                                            className="flex-shrink-0 flex items-center px-3 py-1 bg-[var(--background-tertiary)] text-[var(--text-secondary)] text-xs font-medium rounded-md hover:bg-[var(--background-primary)] border border-[var(--border-color-strong)]"
                                        >
                                            <PhoneIcon className="h-4 w-4 mr-1.5" />
                                            통화기록
                                        </button>
                                    </div>
                                )}
                            </div>
                            <div className="flex items-center gap-2">
                                <button onClick={() => handleOpenScriptModal(selectedScript)} className="p-1 text-[var(--text-muted)] hover:text-[var(--text-accent)]" aria-label="스크립트 수정"><PencilIcon className="h-5 w-5"/></button>
                                <button onClick={() => onDeleteScript(selectedScript.id)} className="p-1 text-[var(--text-muted)] hover:text-[var(--text-danger)]" aria-label="스크립트 삭제"><TrashIcon className="h-5 w-5"/></button>
                            </div>
                        </div>
                        <pre className="whitespace-pre-wrap font-sans text-[var(--text-primary)] text-base leading-relaxed bg-[var(--background-primary)] p-4 rounded-md">
                            {formattedScriptContent}
                        </pre>
                    </div>
                )}
            </div>

            <ScriptEditModal
                isOpen={isScriptModalOpen}
                onClose={() => setIsScriptModalOpen(false)}
                onSave={onSaveScript}
                script={editingScript}
            />
        </div>
    );
};

export default TelephoneApproach;
