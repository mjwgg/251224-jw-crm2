
import React, { useState, useMemo, useEffect, useRef } from 'react';
import type { Customer, CustomerType, AppView, CustomerTypeDefinition, Appointment, Script, FilterCriteria } from '../types';
import { callResultLabels, customerTypeLabels } from '../types';
import Tag from './ui/Tag';
import { TrashIcon, UserAddIcon, ChevronUpIcon, ChevronDownIcon, PhoneIcon, CogIcon, SearchIcon, MessageIcon, TagIcon, UsersIcon, ListBulletIcon, XIcon, DragHandleIcon, ArrowsPointingOutIcon, ArrowsPointingInIcon, FilterIcon, SparklesIcon, PlusIcon, PencilIcon, ChevronLeftIcon, ChevronRightIcon } from './icons';
import ConfirmationModal from './ui/ConfirmationModal';
import { getItem, setItem } from '../services/storageService';
import BaseModal from './ui/BaseModal';
import CustomerFilterModal from './CustomerFilterModal';
import { useLunarCalendar } from '../hooks/useData';

// ... (Previous helper functions: calculateInsuranceAgeInfo, parsePremium, CustomerStatusIcons)

const calculateInsuranceAgeInfo = (birthday: string) => {
    if (!birthday) return { age: '미입력', insAge: '?', sangRyeong: '' };
    
    try {
        const birthDate = new Date(birthday);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        // 1. 만 나이 계산
        let age = today.getFullYear() - birthDate.getFullYear();
        const m = today.getMonth() - birthDate.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
            age--;
        }

        // 2. 상령일 D-Day 계산
        // 기준 상령일 (생일 + 6개월)의 월/일 추출
        const baseSangRyeong = new Date(birthDate);
        baseSangRyeong.setMonth(baseSangRyeong.getMonth() + 6);
        
        // 올해의 상령일 구하기
        let nextSangRyeong = new Date(today.getFullYear(), baseSangRyeong.getMonth(), baseSangRyeong.getDate());
        
        // 만약 올해 상령일이 이미 지났다면 내년 상령일로 설정
        if (nextSangRyeong < today) {
            nextSangRyeong.setFullYear(today.getFullYear() + 1);
        }
        
        const diffTime = nextSangRyeong.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        const sangRyeongString = diffDays === 0 ? 'D-Day' : `D-${diffDays}`;

        // 3. 보험나이 계산
        let lastBirthday = new Date(today.getFullYear(), birthDate.getMonth(), birthDate.getDate());
        if (today < lastBirthday) {
            lastBirthday.setFullYear(lastBirthday.getFullYear() - 1);
        }
        
        let currentSangRyeongThreshold = new Date(lastBirthday);
        currentSangRyeongThreshold.setMonth(currentSangRyeongThreshold.getMonth() + 6);

        let insAge = age;
        if (today >= currentSangRyeongThreshold) {
            insAge = age + 1;
        }

        return { age, insAge, sangRyeong: sangRyeongString };
    } catch {
        return { age: 'error', insAge: '?', sangRyeong: '' };
    }
};

const CustomerStatusIcons: React.FC<{ customer: Customer }> = ({ customer }) => {
    const icons = [];

    // 🔥 Hot List
    const isHot = customer.tags.includes('VIP') || customer.recontactProbability === '상';
    if (isHot) {
        icons.push(<span key="hot" title="핫 리스트 (VIP 또는 재접촉확률 '상')" className="text-base">🔥</span>);
    }

    // ⏰ Recontact Imminent
    if (customer.nextFollowUpDate) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const followUpDate = new Date(customer.nextFollowUpDate + 'T00:00:00');
        if (!isNaN(followUpDate.getTime())) {
          followUpDate.setHours(0, 0, 0, 0);
          const diffTime = followUpDate.getTime() - today.getTime();
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
          if (diffDays >= 0 && diffDays <= 3) {
              icons.push(<span key="recontact" title={`재접촉 임박 (D-${diffDays === 0 ? 'DAY' : diffDays})`} className="text-base">⏰</span>);
          }
        }
    }

    // 💧 Relationship Neglected
    if (customer.type === 'existing') {
        const allContacts = [
            ...(customer.callHistory || []).map(c => new Date(c.date).getTime()),
            ...(customer.consultations || []).map(c => new Date(c.date).getTime())
        ].filter(t => !isNaN(t));

        if (allContacts.length > 0) {
            const lastContactTime = Math.max(...allContacts);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const diffTime = today.getTime() - lastContactTime;
            const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

            if (diffDays > 90) {
                icons.push(<span key="neglected" title={`관계 소홀 (${diffDays}일 이상 미접촉)`} className="text-base">💧</span>);
            }
        }
    }

    if (icons.length === 0) {
        return null;
    }

    return <div className="flex items-center gap-1 ml-2 flex-shrink-0">{icons}</div>;
};

const TagCell = ({ tags }: { tags: string[] }) => {
    const [expanded, setExpanded] = useState(false);
    
    const VISIBLE_COUNT = 2;
    const visibleTags = expanded ? tags : tags.slice(0, VISIBLE_COUNT);
    const hiddenCount = tags.length - VISIBLE_COUNT;

    if (!tags || tags.length === 0) return null;

    return (
        <div className={`flex gap-1 items-center ${expanded ? 'flex-wrap' : 'flex-nowrap'}`}>
            {visibleTags.map(t => <Tag key={t} label={t} />)}
            
            {!expanded && hiddenCount > 0 && (
                <button
                    onClick={(e) => { e.stopPropagation(); setExpanded(true); }}
                    className="flex-shrink-0 text-xs bg-[var(--background-tertiary)] text-[var(--text-secondary)] border border-[var(--border-color-strong)] px-2 py-0.5 rounded-full hover:bg-[var(--background-primary)] whitespace-nowrap font-medium"
                >
                    +{hiddenCount}
                </button>
            )}
            
            {expanded && tags.length > VISIBLE_COUNT && (
                 <button
                    onClick={(e) => { e.stopPropagation(); setExpanded(false); }}
                    className="text-[11px] text-[var(--text-muted)] hover:text-[var(--text-accent)] ml-1 whitespace-nowrap flex items-center underline"
                >
                    접기
                </button>
            )}
        </div>
    );
};

const SummaryCard: React.FC<{ label: string; count: number; active: boolean; onClick: () => void; color?: string; icon?: React.ReactNode }> = ({ label, count, active, onClick, color = 'text-[var(--text-primary)]', icon }) => (
    <div 
        onClick={onClick}
        className={`p-2 rounded-lg border cursor-pointer transition-all flex flex-col items-center justify-center text-center h-full
            ${active 
                ? 'bg-[var(--background-accent-subtle)] border-[var(--background-accent)] ring-1 ring-[var(--background-accent)]' 
                : 'bg-[var(--background-secondary)] border-[var(--border-color)] hover:bg-[var(--background-tertiary)]'
            }`}
    >
        <span className={`text-lg md:text-xl font-bold ${color}`}>{count}</span>
        <div className="flex items-center gap-1 justify-center">
            <span className="text-[11px] md:text-xs text-[var(--text-secondary)] leading-tight mt-0.5 break-keep">{label}</span>
            {icon && <span className={`hidden md:inline ${color}`}>{icon}</span>}
        </div>
    </div>
);

// ... (BulkTagAddModal, BulkTypeUpdateModal, ColumnSettingsModal, ScriptEditModal components remain unchanged)
const BulkTagAddModal: React.FC<{ isOpen: boolean; onClose: () => void; onSave: (tags: string[]) => void; selectedCount: number }> = ({ isOpen, onClose, onSave, selectedCount }) => {
    const [input, setInput] = useState('');
    if (!isOpen) return null;
    return (
        <BaseModal isOpen={isOpen} onClose={onClose} className="max-w-sm w-full" zIndex="z-[70]">
            <div className="p-4 border-b"><h3 className="font-bold">{selectedCount}명에게 태그 추가</h3></div>
            <div className="p-4">
                <input type="text" value={input} onChange={e => setInput(e.target.value)} className="w-full p-2 border rounded" placeholder="태그 입력 (쉼표로 구분)" />
                <p className="text-xs text-gray-500 mt-2">여러 태그는 쉼표(,)로 구분하여 입력하세요.</p>
            </div>
            <div className="p-4 border-t flex justify-end gap-2">
                <button onClick={onClose} className="px-3 py-1 bg-gray-200 rounded">취소</button>
                <button onClick={() => onSave(input.split(',').map(t => t.trim()).filter(Boolean))} className="px-3 py-1 bg-blue-500 text-white rounded">추가</button>
            </div>
        </BaseModal>
    );
};

const BulkTypeUpdateModal: React.FC<{ isOpen: boolean; onClose: () => void; onSave: (type: CustomerType) => void; customerTypes: CustomerTypeDefinition[]; selectedCount: number }> = ({ isOpen, onClose, onSave, customerTypes, selectedCount }) => {
    const [selected, setSelected] = useState(customerTypes[0]?.id || 'potential');
    if (!isOpen) return null;
    return (
        <BaseModal isOpen={isOpen} onClose={onClose} className="max-w-sm w-full" zIndex="z-[70]">
            <div className="p-4 border-b"><h3 className="font-bold">{selectedCount}명의 유형 변경</h3></div>
            <div className="p-4">
                <select value={selected} onChange={e => setSelected(e.target.value)} className="w-full p-2 border rounded">
                    {customerTypes.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
                </select>
            </div>
            <div className="p-4 border-t flex justify-end gap-2">
                <button onClick={onClose} className="px-3 py-1 bg-gray-200 rounded">취소</button>
                <button onClick={() => onSave(selected)} className="px-3 py-1 bg-blue-500 text-white rounded">변경</button>
            </div>
        </BaseModal>
    );
};

const ColumnSettingsModal: React.FC<{ isOpen: boolean; onClose: () => void; columns: ColumnConfig[]; setColumns: (cols: ColumnConfig[]) => void }> = ({ isOpen, onClose, columns, setColumns }) => {
    const [localCols, setLocalCols] = useState(columns);
    const [draggedItemIndex, setDraggedItemIndex] = useState<number | null>(null);

    useEffect(() => {
        setLocalCols(columns);
    }, [columns]);

    const handleSave = () => { setColumns(localCols); onClose(); };

    const handleDragStart = (e: React.DragEvent<HTMLLIElement>, index: number) => {
        setDraggedItemIndex(index);
        e.dataTransfer.effectAllowed = "move";
    };

    const handleDragOver = (e: React.DragEvent<HTMLLIElement>, index: number) => {
        e.preventDefault();
        if (draggedItemIndex === null) return;
        if (draggedItemIndex === index) return;

        const newCols = [...localCols];
        const draggedItem = newCols[draggedItemIndex];
        newCols.splice(draggedItemIndex, 1);
        newCols.splice(index, 0, draggedItem);
        
        setLocalCols(newCols);
        setDraggedItemIndex(index);
    };

    const handleDragEnd = () => {
        setDraggedItemIndex(null);
    };

    if(!isOpen) return null;
    return (
        <BaseModal isOpen={isOpen} onClose={onClose} className="max-w-md w-full" zIndex="z-[70]">
            <div className="p-4 border-b"><h3 className="font-bold text-lg">보기 설정 (순서 및 표시)</h3></div>
            <div className="p-4">
                <p className="text-xs text-[var(--text-muted)] mb-3 bg-[var(--background-primary)] p-2 rounded">
                    <span className="font-bold">Tip:</span> 항목을 드래그하여 순서를 변경하고, 체크박스로 표시 여부를 설정하세요.
                </p>
                <ul className="space-y-2 max-h-[60vh] overflow-y-auto custom-scrollbar pr-1">
                    {localCols.map((col, idx) => (
                        <li 
                            key={col.key}
                            draggable
                            onDragStart={(e) => handleDragStart(e, idx)}
                            onDragOver={(e) => handleDragOver(e, idx)}
                            onDragEnd={handleDragEnd}
                            className={`flex items-center justify-between p-3 bg-[var(--background-tertiary)] rounded-md border border-[var(--border-color-strong)] cursor-grab active:cursor-grabbing transition-opacity ${draggedItemIndex === idx ? 'opacity-50' : 'hover:bg-[var(--background-primary)]'}`}
                        >
                            <div className="flex items-center gap-3">
                                <span className="text-[var(--text-muted)] cursor-move">
                                    <DragHandleIcon className="h-5 w-5" />
                                </span>
                                <span className="font-medium text-[var(--text-primary)]">{col.label}</span>
                            </div>
                            <label className="flex items-center cursor-pointer">
                                <input 
                                    type="checkbox" 
                                    checked={col.visible} 
                                    onChange={() => {
                                        const newCols = [...localCols];
                                        newCols[idx] = { ...col, visible: !col.visible };
                                        setLocalCols(newCols);
                                    }} 
                                    className="h-5 w-5 rounded border-[var(--border-color-strong)] text-[var(--background-accent)] focus:ring-[var(--background-accent)] cursor-pointer"
                                />
                            </label>
                        </li>
                    ))}
                </ul>
            </div>
            <div className="p-4 border-t flex justify-end gap-2 bg-[var(--background-tertiary)]">
                <button onClick={onClose} className="px-4 py-2 bg-[var(--background-secondary)] border border-[var(--border-color-strong)] rounded-md text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--background-primary)]">취소</button>
                <button onClick={handleSave} className="px-4 py-2 bg-[var(--background-accent)] text-[var(--text-on-accent)] rounded-md text-sm font-medium hover:bg-[var(--background-accent-hover)]">저장</button>
            </div>
        </BaseModal>
    );
};

const ScriptEditModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onSave: (script: Script) => void;
    script: Script | null;
}> = ({ isOpen, onClose, onSave, script }) => {
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
        <BaseModal isOpen={isOpen} onClose={onClose} className="max-w-2xl w-full" zIndex="z-[80]">
            <div className="p-4 border-b border-[var(--border-color)] flex justify-between items-center flex-shrink-0">
                <h2 className="text-xl font-bold text-[var(--text-primary)]">{script ? '스크립트 수정' : '새 스크립트 추가'}</h2>
                <button onClick={onClose} className="text-[var(--text-muted)] hover:text-[var(--text-primary)]"><XIcon className="h-6 w-6" /></button>
            </div>
            <div className="p-6 space-y-4 overflow-y-auto custom-scrollbar flex-1 min-h-0">
                <div>
                    <label className="block text-sm font-medium text-[var(--text-secondary)]">제목</label>
                    <input type="text" value={title} onChange={e => setTitle(e.target.value)} className="mt-1 block w-full border border-[var(--border-color-strong)] bg-[var(--background-tertiary)] text-[var(--text-primary)] rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-[var(--background-accent)] focus:border-[var(--background-accent)]" />
                </div>
                <div>
                    <label className="block text-sm font-medium text-[var(--text-secondary)]">내용</label>
                    <textarea value={content} onChange={e => setContent(e.target.value)} rows={10} className="mt-1 block w-full border border-[var(--border-color-strong)] bg-[var(--background-tertiary)] text-[var(--text-primary)] rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-[var(--background-accent)] focus:border-[var(--background-accent)] font-sans"></textarea>
                </div>
            </div>
            <div className="p-4 bg-[var(--background-tertiary)] border-t border-[var(--border-color)] flex justify-end space-x-4 flex-shrink-0">
                <button onClick={onClose} className="px-4 py-2 bg-[var(--background-secondary)] border border-[var(--border-color-strong)] rounded-md text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--background-primary)]">취소</button>
                <button onClick={handleSave} className="px-6 py-2 bg-[var(--background-accent)] text-[var(--text-on-accent)] rounded-md text-sm font-medium hover:bg-[var(--background-accent-hover)]">저장</button>
            </div>
        </BaseModal>
    );
};


interface CustomerListProps {
  customers: Customer[];
  appointments: Appointment[];
  customerTypes: CustomerTypeDefinition[];
  onSelectCustomer: (customer: Customer, initialTab?: 'details' | 'consultations' | 'contracts' | 'callHistory') => void;
  onAddCustomerClick: () => void;
  onDeleteMultiple: (customerIds: string[]) => void;
  onDeleteMultipleAppointments: (appointmentIds: string[]) => void;
  onLogCall: (customer: Customer) => void;
  onLogTouch: (customer: Customer) => void;
  onBulkLogTouch: (customerIds: string[]) => void;
  onBulkUpdateTags: (customerIds: string[], tagsToAdd: string[], tagsToRemove: string[]) => void;
  onBulkUpdateType: (customerIds: string[], newType: CustomerType) => Promise<void>;
  onNavigate: (view: AppView) => void;
  onOpenCustomerTypeModal: () => void;
  startCallingList: (customerIds: string[]) => void;
  onOpenTagManagementModal: () => void;
  onEditUnregisteredAppointment: (appointment: Appointment) => void;
  scripts: Script[];
  onSaveScript: (script: Script) => void;
  onDeleteScript: (scriptId: string) => void;
}

type SortableKeys = keyof Customer | 'age' | 'lastConsultationDate' | 'introductionCount' | 'sangRyeong';

interface ColumnConfig {
  key: SortableKeys;
  label: string;
  width?: number; 
  numeric?: boolean;
  visible: boolean;
}

const ALL_COLUMNS_CONFIG: ColumnConfig[] = [
  { key: 'name', label: '이름', width: 120, visible: true },
  { key: 'introductionCount', label: '소개', numeric: true, width: 60, visible: true },
  { key: 'age', label: '나이(보험나이)', numeric: true, width: 110, visible: true },
  { key: 'birthday', label: '생년월일(상령일)', width: 160, visible: true },
  { key: 'contact', label: '연락처', width: 130, visible: true },
  { key: 'occupation', label: '직업', width: 100, visible: true },
  { key: 'homeAddress', label: '집주소', width: 200, visible: true },
  { key: 'lastConsultationDate', label: '최근상담일', width: 100, visible: true },
  { key: 'callHistory', label: '통화기록내역 (최근)', width: 200, visible: true },
  { key: 'registrationDate', label: '고객등록일', width: 100, visible: false },
  { key: 'sangRyeong', label: '상령일 D-Day', width: 80, visible: false },
  { key: 'tags', label: '태그', width: 200, visible: false },
  { key: 'type', label: '고객유형', width: 100, visible: false },
  { key: 'notes', label: '비고', width: 200, visible: true },
];

const COLUMN_SETTINGS_KEY = 'customer-list-column-settings';
const COLUMN_WIDTHS_KEY = 'customer-list-column-widths';

export const CustomerList: React.FC<CustomerListProps> = ({ customers, appointments, customerTypes, onSelectCustomer, onAddCustomerClick, onDeleteMultiple, onDeleteMultipleAppointments, onLogCall, onLogTouch, onBulkLogTouch, onBulkUpdateTags, onBulkUpdateType, onNavigate, onOpenCustomerTypeModal, startCallingList, onOpenTagManagementModal, onEditUnregisteredAppointment, scripts, onSaveScript, onDeleteScript }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [activeTag, setActiveTag] = useState<string | null>(null);
    const [summaryFilter, setSummaryFilter] = useState<'all' | 'interested' | 'insuranceAge' | 'expiry' | 'anniversary'>('all');
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [sortConfig, setSortConfig] = useState<{ key: SortableKeys; direction: 'ascending' | 'descending' } | null>(null);
    const [isSummaryExpanded, setIsSummaryExpanded] = useState(true); // New state for summary toggle
    const [quickTypeFilter, setQuickTypeFilter] = useState<string>('all'); // State for one-click type filter

    const [isManageMenuOpen, setIsManageMenuOpen] = useState(false);
    const manageMenuRef = useRef<HTMLDivElement>(null);
    
    // Modals state
    const [isBulkTagModalOpen, setIsBulkTagModalOpen] = useState(false);
    const [isBulkTypeModalOpen, setIsBulkTypeModalOpen] = useState(false);
    const [isColumnSettingsModalOpen, setIsColumnSettingsModalOpen] = useState(false);
    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
    
    // Script Panel State
    const [isScriptPanelOpen, setIsScriptPanelOpen] = useState(false);
    const [selectedScriptId, setSelectedScriptId] = useState<string>('');
    
    // Script Edit Modal State
    const [isScriptEditModalOpen, setIsScriptEditModalOpen] = useState(false);
    const [editingScript, setEditingScript] = useState<Script | null>(null);
    
    const selectedScript = useMemo(() => scripts.find(s => s.id === selectedScriptId), [scripts, selectedScriptId]);
    
    // Advanced Filter State
    const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
    const [filterCriteria, setFilterCriteria] = useState<FilterCriteria>({});

    // Pagination State
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(50);
    const tableContainerRef = useRef<HTMLDivElement>(null);

    const [columns, setColumns] = useState<ColumnConfig[]>(ALL_COLUMNS_CONFIG);
    
    const calendar = useLunarCalendar();

    // Column Resizing State
    const [columnWidths, setColumnWidths] = useState<Record<string, number>>(() => {
        const saved = getItem<Record<string, number>>(COLUMN_WIDTHS_KEY);
        const defaults = ALL_COLUMNS_CONFIG.reduce((acc, col) => {
            acc[col.key] = col.width || 150;
            return acc;
        }, {} as Record<string, number>);
        return { ...defaults, ...saved };
    });
    const resizingRef = useRef<{ key: string; startX: number; startWidth: number } | null>(null);

    // ... (useEffect hooks for outside click, loading settings, saving settings, resizing handlers remain unchanged)
    // Close menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (manageMenuRef.current && !manageMenuRef.current.contains(event.target as Node)) {
                setIsManageMenuOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Load column settings
    useEffect(() => {
        const saved = getItem<ColumnConfig[]>(COLUMN_SETTINGS_KEY);
        if(saved) {
             const savedKeys = new Set(saved.map(c => c.key));
             const missingCols = ALL_COLUMNS_CONFIG.filter(c => !savedKeys.has(c.key));
             
             const merged = [...saved, ...missingCols].map(col => {
                 const def = ALL_COLUMNS_CONFIG.find(c => c.key === col.key);
                 return def ? { ...def, visible: col.visible } : col;
             });

             setColumns(merged);
        }
    }, []);
    
    useEffect(() => { setItem(COLUMN_SETTINGS_KEY, columns); }, [columns]);
    useEffect(() => { setItem(COLUMN_WIDTHS_KEY, columnWidths); }, [columnWidths]);

    // Resizing Handlers
    const handleResizeStart = (key: string, e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation(); 
        resizingRef.current = {
            key,
            startX: e.pageX,
            startWidth: columnWidths[key] || 100
        };
        document.body.style.cursor = 'col-resize';
        document.body.style.userSelect = 'none';
    };

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (!resizingRef.current) return;
            const { key, startX, startWidth } = resizingRef.current;
            const diff = e.pageX - startX;
            const newWidth = Math.max(50, startWidth + diff); 
            setColumnWidths(prev => ({ ...prev, [key]: newWidth }));
        };

        const handleMouseUp = () => {
            if (resizingRef.current) {
                resizingRef.current = null;
                document.body.style.cursor = '';
                document.body.style.userSelect = '';
            }
        };

        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, []);
    
    const handleAddScript = () => {
        setEditingScript(null);
        setIsScriptEditModalOpen(true);
    };

    const handleEditScript = () => {
        if (selectedScript) {
            setEditingScript(selectedScript);
            setIsScriptEditModalOpen(true);
        }
    };

    const handleDeleteScript = () => {
        if (selectedScript && window.confirm('이 스크립트를 삭제하시겠습니까?')) {
            onDeleteScript(selectedScript.id);
            setSelectedScriptId('');
        }
    };
    
    const handleSaveScript = (script: Script) => {
        onSaveScript(script);
        if (!editingScript) {
        }
    };

    const allTags = useMemo(() => {
        const tags = new Set<string>();
        customers.forEach(c => c.tags.forEach(t => tags.add(t)));
        return Array.from(tags).sort();
    }, [customers]);

    const introductionCountMap = useMemo(() => {
        const counts = new Map<string, number>();
        customers.forEach(c => {
            if (c.introducerId) counts.set(c.introducerId, (counts.get(c.introducerId) || 0) + 1);
        });
        return counts;
    }, [customers]);

    const summaryCounts = useMemo(() => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const currentMonth = today.getMonth() + 1;
        const currentYear = today.getFullYear();
        
        const insuranceAgeLimit = new Date(today);
        insuranceAgeLimit.setDate(insuranceAgeLimit.getDate() + 45);
        
        const expiryLimit = new Date(today);
        expiryLimit.setDate(expiryLimit.getDate() + 60);

        let ageCount = 0;
        let expiryCount = 0;
        let anniversaryCount = 0;
        let interestedCount = 0;

        customers.forEach(c => {
            if (c.birthday) {
                // Insurance Age Count Logic (Same as before - rough estimate for now or needs calendar)
                // For simplicity and consistency, if it's lunar, we should convert but let's keep existing logic 
                // for insurance age unless user complains, or fix it too.
                const birthDate = new Date(c.birthday);
                // Note: new Date() on lunar string is technically wrong for solar calc, 
                // but SangRyeong logic is complex. Focusing on Anniversary count first as requested.
                
                const baseSangRyeong = new Date(birthDate);
                baseSangRyeong.setMonth(baseSangRyeong.getMonth() + 6);
                let nextSangRyeong = new Date(today.getFullYear(), baseSangRyeong.getMonth(), baseSangRyeong.getDate());
                if (nextSangRyeong < today) nextSangRyeong.setFullYear(today.getFullYear() + 1);
                
                if (nextSangRyeong >= today && nextSangRyeong <= insuranceAgeLimit) {
                    ageCount++;
                }
            }
            
            // Expiry Count
            const hasExpiry = c.contracts?.some(cnt => {
                if (!cnt.expiryDate) return false;
                const exp = new Date(cnt.expiryDate);
                return exp >= today && exp <= expiryLimit;
            });
            if (hasExpiry) expiryCount++;

            // Anniversary Count - Enhanced with Lunar Support
            let isAnniversary = false;
            if (c.birthday) {
                if (c.isBirthdayLunar && calendar) {
                     try {
                         const digits = c.birthday.replace(/\D/g, '');
                         let bMonth = 0;
                         let bDay = 0;
                         if (digits.length === 8) {
                             bMonth = parseInt(digits.substring(4, 6), 10);
                             bDay = parseInt(digits.substring(6, 8), 10);
                         } else if (digits.length === 6) {
                             bMonth = parseInt(digits.substring(2, 4), 10);
                             bDay = parseInt(digits.substring(4, 6), 10);
                         } else if (c.birthday.includes('-')) {
                             const parts = c.birthday.split('-');
                             if (parts.length === 3) {
                                 bMonth = parseInt(parts[1], 10);
                                 bDay = parseInt(parts[2], 10);
                             }
                         }

                         if (bMonth && bDay) {
                             const solar = calendar.lunarToSolar(currentYear, bMonth, bDay, c.isBirthdayLeap || false);
                             if (solar && solar.month === currentMonth) {
                                 isAnniversary = true;
                             }
                         }
                    } catch (e) {}
                } else {
                    // Solar Birthday
                    const bMonth = parseInt(c.birthday.split('-')[1]);
                    if (bMonth === currentMonth) isAnniversary = true;
                }
            }
            
            // Named Anniversaries
            if (!isAnniversary && c.namedAnniversaries) {
                isAnniversary = c.namedAnniversaries.some(a => {
                     if(!a.date) return false;
                     if (a.isLunar && calendar) {
                         const [y, m, d] = a.date.split('-').map(Number);
                         if (m && d) {
                             const solar = calendar.lunarToSolar(currentYear, m, d, a.isLeap || false);
                             return solar && solar.month === currentMonth;
                         }
                         return false;
                     } else {
                         const aMonth = parseInt(a.date.split('-')[1]);
                         return aMonth === currentMonth;
                     }
                });
            }
            
            if (isAnniversary) anniversaryCount++;
            
            if (c.tags.includes('관심고객')) {
                interestedCount++;
            }
        });

        return {
            all: customers.length,
            insuranceAge: ageCount,
            expiry: expiryCount,
            anniversary: anniversaryCount,
            interested: interestedCount
        };
    }, [customers, calendar]);
    
    const isFilterActive = Object.keys(filterCriteria).length > 0;

    const filteredCustomers = useMemo(() => {
        const lowerTerm = searchTerm.toLowerCase();
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const currentMonth = today.getMonth() + 1;
        const currentYear = today.getFullYear();

        return customers.filter(c => {
            // New Quick Type Filter Logic
            if (quickTypeFilter !== 'all' && c.type !== quickTypeFilter) return false;

            if (summaryFilter === 'interested') {
                if (!c.tags.includes('관심고객')) return false;
            } else if (summaryFilter === 'insuranceAge') {
                 if (!c.birthday) return false;
                 const insuranceAgeLimit = new Date(today);
                 insuranceAgeLimit.setDate(insuranceAgeLimit.getDate() + 45);
                 const birthDate = new Date(c.birthday);
                 const baseSangRyeong = new Date(birthDate);
                 baseSangRyeong.setMonth(baseSangRyeong.getMonth() + 6);
                 let nextSangRyeong = new Date(today.getFullYear(), baseSangRyeong.getMonth(), baseSangRyeong.getDate());
                 if (nextSangRyeong < today) nextSangRyeong.setFullYear(today.getFullYear() + 1);
                 if (!(nextSangRyeong >= today && nextSangRyeong <= insuranceAgeLimit)) return false;
            } else if (summaryFilter === 'expiry') {
                 const expiryLimit = new Date(today);
                 expiryLimit.setDate(expiryLimit.getDate() + 60);
                 const hasExpiry = c.contracts?.some(cnt => {
                    if (!cnt.expiryDate) return false;
                    const exp = new Date(cnt.expiryDate);
                    return exp >= today && exp <= expiryLimit;
                });
                if (!hasExpiry) return false;
            } else if (summaryFilter === 'anniversary') {
                let isAnniversary = false;
                // Check Birthday
                if (c.birthday) {
                    if (c.isBirthdayLunar && calendar) {
                        try {
                             const digits = c.birthday.replace(/\D/g, '');
                             let bMonth = 0;
                             let bDay = 0;
                             if (digits.length === 8) {
                                 bMonth = parseInt(digits.substring(4, 6), 10);
                                 bDay = parseInt(digits.substring(6, 8), 10);
                             } else if (digits.length === 6) {
                                 bMonth = parseInt(digits.substring(2, 4), 10);
                                 bDay = parseInt(digits.substring(4, 6), 10);
                             } else if (c.birthday.includes('-')) {
                                 const parts = c.birthday.split('-');
                                 if (parts.length === 3) {
                                     bMonth = parseInt(parts[1], 10);
                                     bDay = parseInt(parts[2], 10);
                                 }
                             }

                             if (bMonth && bDay) {
                                 const solar = calendar.lunarToSolar(currentYear, bMonth, bDay, c.isBirthdayLeap || false);
                                 if (solar && solar.month === currentMonth) {
                                     isAnniversary = true;
                                 }
                             }
                        } catch (e) {}
                    } else {
                        const bMonth = parseInt(c.birthday.split('-')[1]);
                        if (bMonth === currentMonth) isAnniversary = true;
                    }
                }
                // Check Named Anniversaries
                if (!isAnniversary && c.namedAnniversaries) {
                    isAnniversary = c.namedAnniversaries.some(a => {
                         if(!a.date) return false;
                         if (a.isLunar && calendar) {
                             const [y, m, d] = a.date.split('-').map(Number);
                             if (m && d) {
                                 const solar = calendar.lunarToSolar(currentYear, m, d, a.isLeap || false);
                                 return solar && solar.month === currentMonth;
                             }
                             return false;
                         } else {
                             const aMonth = parseInt(a.date.split('-')[1]);
                             return aMonth === currentMonth;
                         }
                    });
                }
                if (!isAnniversary) return false;
            }
            
            const matchesSearch = !lowerTerm || c.name.toLowerCase().includes(lowerTerm) || c.contact.includes(lowerTerm) || (c.occupation || '').toLowerCase().includes(lowerTerm);
            const matchesTag = !activeTag || c.tags.includes(activeTag);
            
            if (isFilterActive) {
                // ... (Filter logic remains same)
                if (filterCriteria.gender && c.gender !== filterCriteria.gender) return false;
                if (filterCriteria.ageMin || filterCriteria.ageMax) {
                    const { age } = calculateInsuranceAgeInfo(c.birthday);
                    const ageNum = typeof age === 'number' ? age : -1;
                    if (ageNum === -1) return false;
                    if (filterCriteria.ageMin && ageNum < Number(filterCriteria.ageMin)) return false;
                    if (filterCriteria.ageMax && ageNum > Number(filterCriteria.ageMax)) return false;
                }
                if (filterCriteria.region) {
                    const regionTerm = filterCriteria.region.toLowerCase();
                    const homeMatch = (c.homeAddress || '').toLowerCase().includes(regionTerm);
                    const workMatch = (c.workAddress || '').toLowerCase().includes(regionTerm);
                    if (!homeMatch && !workMatch) return false;
                }
                if (filterCriteria.types && filterCriteria.types.length > 0) {
                    if (!filterCriteria.types.includes(c.type)) return false;
                }
                if (filterCriteria.tags && filterCriteria.tags.length > 0) {
                     const hasAllTags = filterCriteria.tags.every(tag => c.tags.includes(tag));
                     if (!hasAllTags) return false;
                }
                if (filterCriteria.minPremium || filterCriteria.maxPremium) {
                    let totalPremium = 0;
                    if (c.contracts && c.contracts.length > 0) {
                        totalPremium = c.contracts
                            .filter(ct => ct.status === 'active')
                            .reduce((sum, ct) => sum + (ct.monthlyPremium || 0), 0);
                    }
                    if (filterCriteria.minPremium && totalPremium < Number(filterCriteria.minPremium) * 10000) return false;
                    if (filterCriteria.maxPremium && totalPremium > Number(filterCriteria.maxPremium) * 10000) return false;
                }
                if (filterCriteria.missingCoverage) {
                    const hasCoverage = c.contracts?.some(ct => 
                        ct.status === 'active' && ct.coverageCategory === filterCriteria.missingCoverage
                    );
                    if (hasCoverage) return false; 
                }
                if (filterCriteria.minNonContactPeriod) {
                    const minMonths = Number(filterCriteria.minNonContactPeriod);
                    const lastContactDates = [
                        ...(c.callHistory || []).map(call => new Date(call.date).getTime()),
                        ...(c.consultations || []).map(consult => new Date(consult.date).getTime())
                    ];
                    const lastContactTime = lastContactDates.length > 0 ? Math.max(...lastContactDates) : 0;
                    if (lastContactTime === 0) {
                        const regTime = new Date(c.registrationDate).getTime();
                        const monthsSinceReg = (today.getTime() - regTime) / (1000 * 60 * 60 * 24 * 30);
                        if (monthsSinceReg < minMonths) return false;
                    } else {
                        const monthsSinceContact = (today.getTime() - lastContactTime) / (1000 * 60 * 60 * 24 * 30);
                        if (monthsSinceContact < minMonths) return false;
                    }
                }
                if (filterCriteria.registrationDateStart && c.registrationDate < filterCriteria.registrationDateStart) return false;
                if (filterCriteria.registrationDateEnd && c.registrationDate > filterCriteria.registrationDateEnd) return false;
                if (filterCriteria.rejectionReason) {
                    if ((filterCriteria.rejectionReason as string) === 'ALL') {
                         if (!c.rejectionReason) return false;
                    } else if (c.rejectionReason !== filterCriteria.rejectionReason) {
                         return false;
                    }
                }
                if (filterCriteria.recontactProbability && c.recontactProbability !== filterCriteria.recontactProbability) return false;
            }
            return matchesSearch && matchesTag;
        });
    }, [customers, searchTerm, activeTag, summaryFilter, filterCriteria, isFilterActive, calendar, quickTypeFilter]);

    // Reset pagination when filters change
    useEffect(() => {
        setCurrentPage(1);
        if (tableContainerRef.current) {
            tableContainerRef.current.scrollTop = 0;
        }
    }, [searchTerm, activeTag, summaryFilter, filterCriteria, quickTypeFilter]);

    const sortedCustomers = useMemo(() => {
        let sortable = [...filteredCustomers];
        if(sortConfig) {
            sortable.sort((a, b) => {
                let aVal: any = a[sortConfig.key as keyof Customer];
                let bVal: any = b[sortConfig.key as keyof Customer];
                if (sortConfig.key === 'age') {
                    const infoA = calculateInsuranceAgeInfo(a.birthday);
                    const infoB = calculateInsuranceAgeInfo(b.birthday);
                    aVal = typeof infoA.age === 'number' ? infoA.age : -1;
                    bVal = typeof infoB.age === 'number' ? infoB.age : -1;
                } else if (sortConfig.key === 'introductionCount') {
                    aVal = introductionCountMap.get(a.id) || 0; bVal = introductionCountMap.get(b.id) || 0;
                } else if (sortConfig.key === 'lastConsultationDate') {
                    aVal = a.consultations?.[0]?.date || ''; bVal = b.consultations?.[0]?.date || '';
                } else if (sortConfig.key === 'sangRyeong') {
                     const infoA = calculateInsuranceAgeInfo(a.birthday);
                     const infoB = calculateInsuranceAgeInfo(b.birthday);
                     aVal = infoA.sangRyeong;
                     bVal = infoB.sangRyeong;
                } else if (sortConfig.key === 'tags') {
                     aVal = a.tags.join('');
                     bVal = b.tags.join('');
                }
                if (aVal < bVal) return sortConfig.direction === 'ascending' ? -1 : 1;
                if (aVal > bVal) return sortConfig.direction === 'ascending' ? 1 : -1;
                return 0;
            });
        }
        return sortable;
    }, [filteredCustomers, sortConfig, introductionCountMap]);

    // Pagination Logic
    const totalPages = Math.ceil(sortedCustomers.length / itemsPerPage);
    const paginatedCustomers = sortedCustomers.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    const goToPage = (page: number) => {
        const targetPage = Math.min(Math.max(1, page), totalPages);
        setCurrentPage(targetPage);
        if (tableContainerRef.current) {
            tableContainerRef.current.scrollTop = 0;
        }
    };

    // ... (Rest of the component - handleSelectAll, handleSelectOne, etc. remains unchanged)

    const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
        if(e.target.checked) setSelectedIds(new Set(sortedCustomers.map(c => c.id)));
        else setSelectedIds(new Set());
    };

    const handleSelectOne = (id: string) => {
        const newSet = new Set(selectedIds);
        if(newSet.has(id)) newSet.delete(id); else newSet.add(id);
        setSelectedIds(newSet);
    };

    const requestSort = (key: SortableKeys) => {
        let direction: 'ascending' | 'descending' = 'ascending';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') direction = 'descending';
        setSortConfig({ key, direction });
    };

    const handleBulkDelete = () => {
        onDeleteMultiple(Array.from(selectedIds));
        setSelectedIds(new Set());
        setIsConfirmModalOpen(false);
    };

    const renderCellContent = (col: ColumnConfig, customer: Customer) => {
        let content: React.ReactNode = '-';
        if (col.key === 'introductionCount') {
            const count = introductionCountMap.get(customer.id) || 0;
            content = count > 0 ? <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">{count}명</span> : '-';
        } else if (col.key === 'age') {
            const info = calculateInsuranceAgeInfo(customer.birthday);
            content = info.age === 'error' ? '오류' : `${info.age}세(${info.insAge}세)`;
        } else if (col.key === 'birthday') {
            const info = calculateInsuranceAgeInfo(customer.birthday);
            let sangRyeongColor = 'text-[var(--text-muted)]';
            if (info.sangRyeong === 'D-Day') {
                sangRyeongColor = 'text-red-600 font-bold';
            } else if (info.sangRyeong.startsWith('D-')) {
                const daysLeft = parseInt(info.sangRyeong.replace('D-', ''));
                if (!isNaN(daysLeft) && daysLeft <= 45) {
                    sangRyeongColor = 'text-orange-500 font-semibold';
                }
            }
            let birthdayColor = '';
            const today = new Date();
            const birthDate = new Date(customer.birthday);
            if (!isNaN(birthDate.getTime()) && birthDate.getMonth() === today.getMonth()) {
                birthdayColor = 'text-pink-500 font-semibold';
            }
            const shortBirthday = customer.birthday && customer.birthday.length >= 4 ? customer.birthday.slice(2) : customer.birthday;
            content = (
                <div className="flex items-center">
                    <span className={birthdayColor}>{shortBirthday}</span>
                    <span className={`text-xs ${sangRyeongColor} ml-0.5`}>({info.sangRyeong})</span>
                </div>
            );
        } else if (col.key === 'lastConsultationDate') {
            const lastDate = customer.consultations?.[0]?.date;
            content = lastDate ? new Date(lastDate).toLocaleDateString() : '-';
        } else if (col.key === 'callHistory') {
            const recentCalls = customer.callHistory?.slice(0, 3) || [];
            if (recentCalls.length === 0) {
                content = '-';
            } else {
                content = (
                    <div className="flex flex-col gap-0.5">
                        {recentCalls.map((call, idx) => (
                            <div key={call.id || idx} className="text-xs text-[var(--text-secondary)] truncate" title={call.notes}>
                               <span className="text-[var(--text-muted)] mr-1">{new Date(call.date).toLocaleDateString().slice(2)}</span>
                               <span className="font-medium">{callResultLabels[call.result]}</span>
                               {call.notes ? <span className="text-[var(--text-muted)] ml-1 text-[10px]">- {call.notes}</span> : ''}
                            </div>
                        ))}
                    </div>
                );
            }
        } else if (col.key === 'sangRyeong') {
                const info = calculateInsuranceAgeInfo(customer.birthday);
                content = info.sangRyeong || '-';
        } else if (col.key === 'tags') {
            content = customer.tags && customer.tags.length > 0 
                ? <TagCell tags={customer.tags} /> 
                : '-';
        } else if (col.key === 'type') {
            content = customerTypeLabels[customer.type] || customer.type;
        } else if (col.key === 'notes') {
            content = <span className="truncate block max-w-xs" title={customer.notes}>{customer.notes || '-'}</span>;
        } else {
            content = (customer as any)[col.key] || '-';
        }
        return content;
    }

    const PaginationControls = () => (
        <div className="flex items-center gap-2">
            <button
                onClick={() => goToPage(currentPage - 1)}
                disabled={currentPage === 1}
                className="p-1 rounded-md hover:bg-[var(--background-accent-subtle)] disabled:opacity-30 disabled:hover:bg-transparent"
            >
                <ChevronLeftIcon className="h-4 w-4 text-[var(--text-secondary)]" />
            </button>
            
            <span className="text-xs text-[var(--text-secondary)]">
                <span className="font-medium text-[var(--text-primary)]">{currentPage}</span> / {totalPages}
            </span>

            <button
                onClick={() => goToPage(currentPage + 1)}
                disabled={currentPage === totalPages || totalPages === 0}
                className="p-1 rounded-md hover:bg-[var(--background-accent-subtle)] disabled:opacity-30 disabled:hover:bg-transparent"
            >
                <ChevronRightIcon className="h-4 w-4 text-[var(--text-secondary)]" />
            </button>

            <select
                value={itemsPerPage}
                onChange={(e) => {
                    setItemsPerPage(Number(e.target.value));
                    setCurrentPage(1);
                    if (tableContainerRef.current) {
                         tableContainerRef.current.scrollTop = 0;
                    }
                }}
                className="ml-2 bg-transparent text-xs border border-[var(--border-color-strong)] rounded px-1 py-0.5 text-[var(--text-secondary)] focus:outline-none"
            >
                <option value={10}>10개</option>
                <option value={30}>30개</option>
                <option value={50}>50개</option>
                <option value={100}>100개</option>
            </select>
        </div>
    );

    return (
        <div className="flex h-full animate-fade-in">
            {/* Left Side: Customer List */}
            <div className="flex-1 flex flex-col min-h-0 overflow-hidden space-y-2 pr-0 md:pr-2">
                {/* Header with Toggle */}
                <div className="flex items-center justify-between mb-1 px-1 shrink-0">
                    <h3 className="text-sm font-bold text-[var(--text-primary)]">
                        고객 현황 요약
                    </h3>
                    <button
                        onClick={() => setIsSummaryExpanded(!isSummaryExpanded)}
                        className="flex items-center gap-1 text-xs text-[var(--text-muted)] hover:text-[var(--text-accent)] transition-colors"
                    >
                        {isSummaryExpanded ? (
                            <>접기 <ChevronUpIcon className="h-3 w-3" /></>
                        ) : (
                            <>펼치기 <ChevronDownIcon className="h-3 w-3" /></>
                        )}
                    </button>
                </div>

                {/* Summary Widgets (Collapsible) */}
                {isSummaryExpanded && (
                    <div className="grid grid-cols-5 gap-2 mb-2 shrink-0 animate-fade-in">
                        <SummaryCard label="총고객" count={summaryCounts.all} active={summaryFilter === 'all'} onClick={() => setSummaryFilter('all')} />
                        <SummaryCard label="관심고객" count={summaryCounts.interested} active={summaryFilter === 'interested'} onClick={() => setSummaryFilter('interested')} color="text-yellow-500" icon={<SparklesIcon className="w-3 h-3 md:w-4 md:h-4" />} />
                        <SummaryCard label="상령일" count={summaryCounts.insuranceAge} active={summaryFilter === 'insuranceAge'} onClick={() => setSummaryFilter('insuranceAge')} color="text-orange-500" />
                        <SummaryCard label="계약만기" count={summaryCounts.expiry} active={summaryFilter === 'expiry'} onClick={() => setSummaryFilter('expiry')} color="text-red-500" />
                        <SummaryCard label="기념일" count={summaryCounts.anniversary} active={summaryFilter === 'anniversary'} onClick={() => setSummaryFilter('anniversary')} color="text-pink-500" />
                    </div>
                )}

                {/* Combined Toolbar: Search + Actions */}
                <div className="bg-[var(--background-secondary)] p-2 rounded-lg border border-[var(--border-color)] min-h-[56px] flex items-center shrink-0 gap-2">
                     {selectedIds.size > 0 ? (
                        /* Bulk Actions Mode */
                        <div className="flex items-center gap-2 w-full overflow-x-auto animate-fade-in px-1 custom-scrollbar">
                            <span className="text-sm font-semibold text-[var(--text-primary)] whitespace-nowrap mr-2 px-2 bg-[var(--background-accent-subtle)] rounded-md py-1">
                                {selectedIds.size}명
                            </span>
                            <button 
                                onClick={() => setIsConfirmModalOpen(true)} 
                                className="flex items-center gap-1 px-3 py-2 bg-[var(--background-danger)] text-white rounded-md text-sm font-medium hover:bg-[var(--background-danger-hover)] whitespace-nowrap"
                            >
                                <TrashIcon className="h-4 w-4" /> <span className="hidden sm:inline">삭제</span>
                            </button>
                            <button 
                                onClick={() => setIsBulkTagModalOpen(true)} 
                                className="flex items-center gap-1 px-3 py-2 bg-[var(--background-tertiary)] text-[var(--text-primary)] rounded-md text-sm font-medium hover:bg-[var(--background-primary)] border border-[var(--border-color-strong)] whitespace-nowrap"
                            >
                                <TagIcon className="h-4 w-4" /> <span className="hidden sm:inline">태그</span>
                            </button>
                            <button 
                                onClick={() => setIsBulkTypeModalOpen(true)} 
                                className="flex items-center gap-1 px-3 py-2 bg-[var(--background-tertiary)] text-[var(--text-primary)] rounded-md text-sm font-medium hover:bg-[var(--background-primary)] border border-[var(--border-color-strong)] whitespace-nowrap"
                            >
                                <UsersIcon className="h-4 w-4" /> <span className="hidden sm:inline">유형</span>
                            </button>
                            <button 
                                onClick={() => { onBulkLogTouch(Array.from(selectedIds)); setSelectedIds(new Set()); }} 
                                className="flex items-center gap-1 px-3 py-2 bg-[var(--background-tertiary)] text-[var(--text-primary)] rounded-md text-sm font-medium hover:bg-[var(--background-primary)] border border-[var(--border-color-strong)] whitespace-nowrap"
                            >
                                <MessageIcon className="h-4 w-4" /> <span className="hidden sm:inline">터치</span>
                            </button>
                            {selectedIds.size > 0 && (
                                <button 
                                    onClick={() => startCallingList(Array.from(selectedIds))}
                                    className="flex items-center gap-1 px-3 py-2 bg-yellow-100 text-yellow-800 border border-yellow-200 rounded-md text-sm font-medium hover:bg-yellow-200 whitespace-nowrap"
                                >
                                    <PhoneIcon className="h-4 w-4" /> <span className="hidden sm:inline">콜링</span>
                                </button>
                            )}
                            <div className="flex-grow"></div>
                            <button 
                                onClick={() => setSelectedIds(new Set())} 
                                className="p-2 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                                title="선택 해제"
                            >
                                <XIcon className="h-5 w-5" />
                            </button>
                        </div>
                     ) : (
                        /* Standard Mode - Merged Search & Buttons */
                        <>
                            <div className="relative flex-1 min-w-0">
                                <input 
                                    type="text" 
                                    value={searchTerm} 
                                    onChange={e => setSearchTerm(e.target.value)} 
                                    placeholder="이름, 연락처, 직업..." 
                                    className="w-full pl-9 pr-3 py-2 border border-[var(--border-color-strong)] rounded-md bg-[var(--background-tertiary)] text-[var(--text-primary)] focus:ring-1 focus:ring-[var(--background-accent)] outline-none text-sm transition-all"
                                />
                                <SearchIcon className="absolute left-2.5 top-2.5 h-4 w-4 text-[var(--text-muted)]" />
                            </div>

                            <button
                                onClick={() => setIsFilterModalOpen(true)}
                                className={`flex items-center justify-center px-2 md:px-3 py-2 rounded-md border transition-colors shrink-0 ${
                                    isFilterActive 
                                    ? 'bg-[var(--background-accent-subtle)] border-[var(--background-accent)] text-[var(--text-accent)]' 
                                    : 'bg-[var(--background-tertiary)] border-[var(--border-color-strong)] text-[var(--text-secondary)] hover:bg-[var(--background-primary)]'
                                }`}
                                title="상세 검색"
                            >
                                 <FilterIcon className="h-5 w-5" />
                                 <span className="hidden md:inline ml-1 text-sm font-medium">상세</span>
                                 {isFilterActive && <div className="w-2 h-2 rounded-full bg-[var(--background-accent)] absolute top-2 right-2"></div>}
                            </button>
                            
                            <div className="flex items-center gap-1.5 shrink-0">
                                <div className="relative" ref={manageMenuRef}>
                                    <button 
                                        onClick={() => setIsManageMenuOpen(!isManageMenuOpen)}
                                        className="flex items-center gap-1 px-2 md:px-3 py-2 bg-[var(--background-tertiary)] text-[var(--text-primary)] rounded-md text-sm font-medium hover:bg-[var(--background-primary)] border border-[var(--border-color-strong)]"
                                        title="관리 메뉴"
                                    >
                                        <CogIcon className="h-5 w-5" />
                                        <span className="hidden md:inline">관리</span>
                                        <ChevronDownIcon className="h-3 w-3 hidden md:block" />
                                    </button>
                                    {isManageMenuOpen && (
                                        <div className="absolute top-full right-0 mt-1 w-48 bg-[var(--background-secondary)] border border-[var(--border-color)] rounded-md shadow-lg z-50 py-1 animate-fade-in">
                                            <div className="px-3 py-2 text-xs font-semibold text-[var(--text-muted)]">설정</div>
                                            <button onClick={() => { onOpenCustomerTypeModal(); setIsManageMenuOpen(false); }} className="w-full text-left px-4 py-2 text-sm hover:bg-[var(--background-tertiary)]">고객 유형 관리</button>
                                            <button onClick={() => { onOpenTagManagementModal(); setIsManageMenuOpen(false); }} className="w-full text-left px-4 py-2 text-sm hover:bg-[var(--background-tertiary)]">태그 관리</button>
                                            <button onClick={() => { setIsColumnSettingsModalOpen(true); setIsManageMenuOpen(false); }} className="w-full text-left px-4 py-2 text-sm hover:bg-[var(--background-tertiary)]">보기 설정 (컬럼)</button>
                                        </div>
                                    )}
                                </div>

                                <button 
                                    onClick={() => setIsScriptPanelOpen(!isScriptPanelOpen)} 
                                    className={`flex items-center gap-1 px-2 md:px-3 py-2 rounded-md text-sm font-medium border border-[var(--border-color-strong)] transition-colors ${
                                        isScriptPanelOpen 
                                        ? 'bg-[var(--background-accent)] text-[var(--text-on-accent)]' 
                                        : 'bg-[var(--background-tertiary)] text-[var(--text-primary)] hover:bg-[var(--background-primary)]'
                                    }`}
                                    title="TA 스크립트"
                                >
                                    <ListBulletIcon className="h-5 w-5" />
                                    <span className="hidden md:inline">스크립트</span>
                                </button>

                                <button onClick={onAddCustomerClick} className="flex items-center gap-1 px-2 md:px-3 py-2 bg-[var(--background-accent)] text-[var(--text-on-accent)] rounded-md text-sm font-medium hover:bg-[var(--background-accent-hover)]" title="고객 추가">
                                    <UserAddIcon className="h-5 w-5" />
                                    <span className="hidden md:inline">추가</span>
                                </button>
                            </div>
                        </>
                     )}
                </div>

                {/* Customer Types Tabs (New) */}
                <div className="flex items-center gap-6 overflow-x-auto px-2 pb-2 mb-2 border-b border-[var(--border-color)] shrink-0 custom-scrollbar">
                    <button 
                        onClick={() => setQuickTypeFilter('all')}
                        className={`pb-2 text-sm font-bold whitespace-nowrap transition-colors border-b-2 ${quickTypeFilter === 'all' ? 'border-[var(--background-accent)] text-[var(--text-accent)]' : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]'}`}
                    >
                        전체보기
                    </button>
                    {customerTypes.map(type => (
                        <button 
                            key={type.id}
                            onClick={() => setQuickTypeFilter(type.id)}
                            className={`pb-2 text-sm font-bold whitespace-nowrap transition-colors border-b-2 ${quickTypeFilter === type.id ? 'border-[var(--background-accent)] text-[var(--text-accent)]' : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]'}`}
                        >
                            {type.label}
                        </button>
                    ))}
                </div>

                {/* Tags */}
                <div className="flex items-center gap-2 overflow-x-auto pb-2 custom-scrollbar shrink-0">
                    <button 
                        onClick={() => setActiveTag(null)} 
                        className={`px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${!activeTag ? 'bg-[var(--background-accent)] text-white' : 'bg-[var(--background-tertiary)] text-[var(--text-secondary)] hover:bg-[var(--background-primary)]'}`}
                    >
                        전체
                    </button>
                    {allTags.map(tag => (
                        <button 
                            key={tag} 
                            onClick={() => setActiveTag(activeTag === tag ? null : tag)} 
                            className={`px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${activeTag === tag ? 'bg-[var(--background-accent)] text-white' : 'bg-[var(--background-tertiary)] text-[var(--text-secondary)] hover:bg-[var(--background-primary)]'}`}
                        >
                            #{tag}
                        </button>
                    ))}
                </div>

                {/* Customer Table */}
                <div className="flex-1 flex flex-col min-h-0 bg-[var(--background-secondary)] rounded-lg border border-[var(--border-color)] overflow-hidden">
                    <div className="flex-1 overflow-auto custom-scrollbar relative hidden md:block" ref={tableContainerRef}>
                        <table className="divide-y divide-[var(--border-color)] table-fixed" style={{ minWidth: '100%' }}>
                            <thead className="bg-[var(--background-tertiary)] sticky top-0 z-40 shadow-sm">
                                <tr>
                                    <th scope="col" className="px-4 py-3 w-10 sticky left-0 bg-[var(--background-tertiary)] z-50">
                                        <input 
                                            type="checkbox" 
                                            onChange={handleSelectAll} 
                                            checked={sortedCustomers.length > 0 && selectedIds.size === sortedCustomers.length}
                                            className="h-4 w-4 rounded border-[var(--border-color-strong)] bg-[var(--background-primary)] text-[var(--background-accent)] focus:ring-[var(--background-accent)]" 
                                        />
                                    </th>
                                    {columns.filter(c => c.visible).map(col => (
                                        <th 
                                            key={col.key} 
                                            scope="col" 
                                            className="px-4 py-3 text-left text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider whitespace-nowrap relative group select-none bg-[var(--background-tertiary)]" 
                                            style={{ width: columnWidths[col.key], minWidth: columnWidths[col.key], maxWidth: columnWidths[col.key], boxSizing: 'border-box' }}
                                        >
                                            <div className="flex items-center justify-between w-full overflow-hidden">
                                                <button onClick={() => requestSort(col.key)} className="flex items-center gap-1 hover:text-[var(--text-primary)] truncate w-full text-left">
                                                    {col.label}
                                                    {sortConfig?.key === col.key && (sortConfig.direction === 'ascending' ? <ChevronUpIcon className="h-3 w-3 flex-shrink-0"/> : <ChevronDownIcon className="h-3 w-3 flex-shrink-0"/>)}
                                                </button>
                                            </div>
                                            <div
                                                className="absolute right-0 top-0 h-full w-2 cursor-col-resize hover:bg-[var(--background-accent)] z-50 opacity-0 group-hover:opacity-100 transition-opacity"
                                                onMouseDown={(e) => handleResizeStart(col.key, e)}
                                                onClick={(e) => e.stopPropagation()}
                                            />
                                        </th>
                                    ))}
                                    <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider sticky right-0 bg-[var(--background-tertiary)] z-50 w-24 shadow-[-1px_0_2px_rgba(0,0,0,0.1)]">기능</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[var(--border-color)] bg-[var(--background-secondary)]">
                                {paginatedCustomers.length > 0 ? paginatedCustomers.map(customer => (
                                    <tr key={customer.id} className={`hover:bg-[var(--background-tertiary)] transition-colors ${selectedIds.has(customer.id) ? 'bg-[var(--background-accent-subtle)]' : ''}`} onClick={() => onSelectCustomer(customer, 'details')}>
                                        <td className="px-4 py-3 sticky left-0 bg-[var(--background-secondary)] z-30" onClick={e => e.stopPropagation()}>
                                            <input 
                                                type="checkbox" 
                                                checked={selectedIds.has(customer.id)}
                                                onChange={() => handleSelectOne(customer.id)}
                                                className="h-4 w-4 rounded border-[var(--border-color-strong)] bg-[var(--background-primary)] text-[var(--background-accent)] focus:ring-[var(--background-accent)]" 
                                            />
                                        </td>
                                        {columns.filter(c => c.visible).map(col => (
                                            <td 
                                                key={col.key} 
                                                className={`px-4 py-3 text-sm text-[var(--text-secondary)] overflow-hidden text-overflow-ellipsis ${col.key === 'tags' ? 'whitespace-normal' : 'whitespace-nowrap'}`}
                                                style={{ width: columnWidths[col.key], minWidth: columnWidths[col.key], maxWidth: columnWidths[col.key], boxSizing: 'border-box' }}
                                            >
                                                {col.key === 'name' ? (
                                                    <div className="flex items-center"><span className="font-medium text-[var(--text-primary)]">{customer.name}</span><CustomerStatusIcons customer={customer}/></div>
                                                ) : renderCellContent(col, customer)}
                                            </td>
                                        ))}
                                        <td className="px-4 py-3 text-right whitespace-nowrap text-sm font-medium sticky right-0 bg-[var(--background-secondary)] group-hover:bg-[var(--background-tertiary)] z-30 w-24 shadow-[-1px_0_2px_rgba(0,0,0,0.1)]" onClick={e => e.stopPropagation()}>
                                            <div className="flex items-center justify-end gap-2">
                                                <button onClick={() => onLogTouch(customer)} className="p-1 text-[var(--text-muted)] hover:text-[var(--text-accent)]" title="터치 기록">
                                                    <MessageIcon className="h-4 w-4" />
                                                </button>
                                                <button onClick={() => onLogCall(customer)} className="p-1 text-[var(--text-muted)] hover:text-[var(--text-accent)]" title="통화 기록">
                                                    <PhoneIcon className="h-4 w-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                )) : (
                                    <tr>
                                        <td colSpan={columns.filter(c => c.visible).length + 2} className="px-6 py-12 text-center text-[var(--text-muted)]">
                                            등록된 고객이 없습니다.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Mobile View - Card List */}
                    <div className="md:hidden p-2 space-y-2 overflow-y-auto custom-scrollbar flex-1 min-h-0">
                         {paginatedCustomers.length > 0 ? paginatedCustomers.map(customer => (
                            <div 
                                key={customer.id} 
                                className={`p-3 rounded-lg border ${selectedIds.has(customer.id) ? 'bg-[var(--background-accent-subtle)] border-[var(--background-accent)]' : 'bg-[var(--background-tertiary)] border-[var(--border-color)]'} shadow-sm transition-colors`}
                                onClick={() => onSelectCustomer(customer, 'details')}
                            >
                                <div className="flex justify-between items-center mb-2">
                                    <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                                        <input 
                                            type="checkbox" 
                                            checked={selectedIds.has(customer.id)}
                                            onChange={() => handleSelectOne(customer.id)}
                                            className="h-4 w-4 rounded border-[var(--border-color-strong)] bg-[var(--background-primary)] text-[var(--background-accent)] focus:ring-[var(--background-accent)]" 
                                        />
                                        <div className="flex items-center">
                                            <span className="font-bold text-[var(--text-primary)] text-sm mr-1">{customer.name}</span>
                                            <CustomerStatusIcons customer={customer}/>
                                        </div>
                                    </div>
                                    <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                                        <button onClick={() => onLogTouch(customer)} className="p-1.5 bg-[var(--background-primary)] rounded-full border border-[var(--border-color-strong)] text-[var(--text-muted)] hover:text-[var(--text-accent)]">
                                            <MessageIcon className="h-3.5 w-3.5" />
                                        </button>
                                        <a href={`tel:${customer.contact}`} className="p-1.5 bg-[var(--background-primary)] rounded-full border border-[var(--border-color-strong)] text-[var(--text-muted)] hover:text-[var(--text-accent)]">
                                            <PhoneIcon className="h-3.5 w-3.5" />
                                        </a>
                                    </div>
                                </div>
                                
                                <div className="space-y-1 border-t border-[var(--border-color)]/30 pt-2">
                                    {columns.filter(c => c.visible && !['name', 'introductionCount', 'age', 'notes'].includes(c.key)).map(col => (
                                        <div key={col.key} className="flex justify-between items-start text-xs">
                                            <span className="text-[var(--text-muted)] min-w-[60px]">{col.label}</span>
                                            <div className="text-[var(--text-secondary)] text-right flex-1 truncate">
                                                {renderCellContent(col, customer)}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                         )) : (
                             <div className="text-center py-12 text-[var(--text-muted)]">
                                등록된 고객이 없습니다.
                            </div>
                         )}
                    </div>

                    <div className="p-2 border-t border-[var(--border-color)] text-xs text-[var(--text-muted)] flex justify-between items-center bg-[var(--background-tertiary)] shrink-0 rounded-b-lg">
                         <div className="flex items-center gap-4">
                             <span>총 {sortedCustomers.length}명</span>
                             <span className="hidden md:inline">{selectedIds.size > 0 ? `${selectedIds.size}명 선택됨` : ''}</span>
                         </div>
                         <PaginationControls />
                    </div>
                </div>
            </div>

            {/* Right Side: Script Panel */}
            {isScriptPanelOpen && (
                <div className="w-[350px] border-l border-[var(--border-color)] bg-[var(--background-secondary)] flex flex-col shrink-0 transition-all">
                    {/* ... (Script Panel content remains unchanged) */}
                    <div className="p-4 border-b border-[var(--border-color)] flex justify-between items-center bg-[var(--background-tertiary)]">
                        <div className="flex items-center gap-2">
                            <h3 className="font-bold text-[var(--text-primary)]">TA 스크립트</h3>
                            <button onClick={handleAddScript} className="p-1 text-[var(--text-accent)] hover:bg-[var(--background-primary)] rounded" title="새 스크립트 추가">
                                <PlusIcon className="h-5 w-5" />
                            </button>
                        </div>
                        <button onClick={() => setIsScriptPanelOpen(false)} className="p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)]" title="닫기">
                            <XIcon className="h-5 w-5"/>
                        </button>
                    </div>
                    <div className="p-4 flex-1 flex flex-col min-h-0 overflow-hidden">
                        <div className="mb-4">
                            <select
                                value={selectedScriptId}
                                onChange={(e) => setSelectedScriptId(e.target.value)}
                                className="w-full p-2 border border-[var(--border-color-strong)] rounded-md bg-[var(--background-tertiary)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--background-accent)]"
                            >
                                <option value="">스크립트 선택</option>
                                {scripts.map(script => (
                                    <option key={script.id} value={script.id}>{script.title}</option>
                                ))}
                            </select>
                        </div>
                        <div className="flex-1 overflow-y-auto custom-scrollbar bg-[var(--background-tertiary)]/30 border border-[var(--border-color)] rounded-md p-4 relative group">
                            {selectedScript ? (
                                <>
                                    <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                         <button onClick={handleEditScript} className="p-1.5 bg-[var(--background-secondary)] border border-[var(--border-color-strong)] rounded-md hover:text-[var(--text-accent)]" title="수정">
                                            <PencilIcon className="h-4 w-4" />
                                         </button>
                                         <button onClick={handleDeleteScript} className="p-1.5 bg-[var(--background-secondary)] border border-[var(--border-color-strong)] rounded-md hover:text-[var(--text-danger)]" title="삭제">
                                            <TrashIcon className="h-4 w-4" />
                                         </button>
                                    </div>
                                    <pre className="whitespace-pre-wrap font-sans text-sm text-[var(--text-primary)] leading-relaxed pt-2">
                                        {selectedScript.content}
                                    </pre>
                                </>
                            ) : (
                                <div className="h-full flex flex-col items-center justify-center text-[var(--text-muted)] text-sm text-center">
                                    <p>{scripts.length === 0 ? '등록된 스크립트가 없습니다.\n+ 버튼을 눌러 추가해보세요.' : '목록에서 스크립트를 선택해주세요.'}</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Modals */}
            <CustomerFilterModal 
                isOpen={isFilterModalOpen} 
                onClose={() => setIsFilterModalOpen(false)} 
                onApply={(criteria) => { setFilterCriteria(criteria); setIsFilterModalOpen(false); }} 
                onReset={() => setFilterCriteria({})}
                currentFilters={filterCriteria}
                customerTypes={customerTypes}
                allTags={allTags}
            />
            <ConfirmationModal isOpen={isConfirmModalOpen} onClose={() => setIsConfirmModalOpen(false)} onConfirm={handleBulkDelete} title="고객 삭제" message={`선택한 ${selectedIds.size}명의 고객을 삭제하시겠습니까?`} />
            <BulkTagAddModal isOpen={isBulkTagModalOpen} onClose={() => setIsBulkTagModalOpen(false)} onSave={(tags) => { onBulkUpdateTags(Array.from(selectedIds), tags, []); setSelectedIds(new Set()); setIsBulkTagModalOpen(false); }} selectedCount={selectedIds.size} />
            <BulkTypeUpdateModal isOpen={isBulkTypeModalOpen} onClose={() => setIsBulkTypeModalOpen(false)} onSave={(type) => { onBulkUpdateType(Array.from(selectedIds), type); setSelectedIds(new Set()); setIsBulkTypeModalOpen(false); }} customerTypes={customerTypes} selectedCount={selectedIds.size} />
            <ColumnSettingsModal isOpen={isColumnSettingsModalOpen} onClose={() => setIsColumnSettingsModalOpen(false)} columns={columns} setColumns={setColumns} />
            <ScriptEditModal 
                isOpen={isScriptEditModalOpen}
                onClose={() => setIsScriptEditModalOpen(false)}
                onSave={handleSaveScript}
                script={editingScript}
            />
        </div>
    );
};
