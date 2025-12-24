
import React, { useState, useEffect, useRef } from 'react';
import type { FilterCriteria, CustomerTypeDefinition } from '../types';
import BaseModal from './ui/BaseModal';
import { XIcon, FilterIcon, CycleIcon, PlusIcon, TrashIcon, ChevronDownIcon } from './icons';

interface CustomerFilterModalProps {
    isOpen: boolean;
    onClose: () => void;
    onApply: (criteria: FilterCriteria) => void;
    onReset: () => void;
    currentFilters: FilterCriteria;
    customerTypes: CustomerTypeDefinition[];
    allTags: string[];
}

type FilterKey = 
    | 'gender' 
    | 'age' 
    | 'region' 
    | 'types' 
    | 'tags' 
    | 'premium'
    | 'missingCoverage' // New
    | 'nonContact' 
    | 'regDate' 
    | 'rejection' 
    | 'probability';

interface FilterOption {
    key: FilterKey;
    label: string;
    group: string;
}

const FILTER_OPTIONS: FilterOption[] = [
    { key: 'gender', label: '성별', group: '기본 정보' },
    { key: 'age', label: '나이', group: '기본 정보' },
    { key: 'region', label: '지역 (주소)', group: '기본 정보' },
    { key: 'types', label: '고객 유형', group: '고객 정보' },
    { key: 'tags', label: '태그', group: '고객 정보' },
    { key: 'premium', label: '월 보험료 (계약합산)', group: '계약 정보' },
    { key: 'missingCoverage', label: '미가입 보장', group: '계약 정보' },
    { key: 'nonContact', label: '미접촉 기간', group: '활동 정보' },
    { key: 'regDate', label: '등록일', group: '활동 정보' },
    { key: 'rejection', label: '거절 사유', group: '상태 정보' },
    { key: 'probability', label: '재접촉 가능성', group: '상태 정보' },
];

const COVERAGE_CATEGORIES = ['종합건강', '치매재가간병', '태아어린이', '운전자상해', '종신정기', '단기납', '연금', '경영인정기', '달러', '기타'];

const CustomerFilterModal: React.FC<CustomerFilterModalProps> = ({
    isOpen,
    onClose,
    onApply,
    onReset,
    currentFilters,
    customerTypes,
    allTags,
}) => {
    const [localFilters, setLocalFilters] = useState<FilterCriteria>(currentFilters);
    const [activeFilters, setActiveFilters] = useState<FilterKey[]>([]);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    // Initialize active filters based on current filters
    useEffect(() => {
        if (isOpen) {
            setLocalFilters(currentFilters);
            const active: FilterKey[] = [];
            if (currentFilters.gender) active.push('gender');
            if (currentFilters.ageMin || currentFilters.ageMax) active.push('age');
            if (currentFilters.region) active.push('region');
            if (currentFilters.types && currentFilters.types.length > 0) active.push('types');
            if (currentFilters.tags && currentFilters.tags.length > 0) active.push('tags');
            if (currentFilters.minPremium || currentFilters.maxPremium) active.push('premium');
            if (currentFilters.missingCoverage) active.push('missingCoverage');
            if (currentFilters.minNonContactPeriod) active.push('nonContact');
            if (currentFilters.registrationDateStart || currentFilters.registrationDateEnd) active.push('regDate');
            if (currentFilters.rejectionReason) active.push('rejection');
            if (currentFilters.recontactProbability) active.push('probability');
            
            // Deduplicate and set
            setActiveFilters(Array.from(new Set(active)));
        }
    }, [isOpen, currentFilters]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsMenuOpen(false);
            }
        };
        if (isMenuOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isMenuOpen]);

    const handleChange = (field: keyof FilterCriteria, value: any) => {
        setLocalFilters(prev => ({ ...prev, [field]: value }));
    };

    const handleArrayChange = (field: 'types' | 'tags', item: string) => {
        setLocalFilters(prev => {
            const currentList = prev[field] || [];
            if (currentList.includes(item)) {
                return { ...prev, [field]: currentList.filter(i => i !== item) };
            } else {
                return { ...prev, [field]: [...currentList, item] };
            }
        });
    };

    const handleAddFilter = (key: FilterKey) => {
        if (!activeFilters.includes(key)) {
            setActiveFilters([...activeFilters, key]);
        }
        setIsMenuOpen(false);
    };

    const handleRemoveFilter = (key: FilterKey) => {
        setActiveFilters(activeFilters.filter(k => k !== key));
        
        // Reset corresponding values in localFilters
        const resetUpdates: Partial<FilterCriteria> = {};
        switch (key) {
            case 'gender': resetUpdates.gender = undefined; break;
            case 'age': resetUpdates.ageMin = undefined; resetUpdates.ageMax = undefined; break;
            case 'region': resetUpdates.region = undefined; break;
            case 'types': resetUpdates.types = undefined; break;
            case 'tags': resetUpdates.tags = undefined; break;
            case 'premium': resetUpdates.minPremium = undefined; resetUpdates.maxPremium = undefined; break;
            case 'missingCoverage': resetUpdates.missingCoverage = undefined; break;
            case 'nonContact': resetUpdates.minNonContactPeriod = undefined; break;
            case 'regDate': resetUpdates.registrationDateStart = undefined; resetUpdates.registrationDateEnd = undefined; break;
            case 'rejection': resetUpdates.rejectionReason = undefined; break;
            case 'probability': resetUpdates.recontactProbability = undefined; break;
        }
        setLocalFilters(prev => ({ ...prev, ...resetUpdates }));
    };

    const handleApply = () => {
        onApply(localFilters);
        onClose();
    };

    const handleResetClick = () => {
        setLocalFilters({});
        setActiveFilters([]);
        onReset();
        onClose();
    };

    // Render functions for each filter input
    const renderFilterInput = (key: FilterKey) => {
        switch (key) {
            case 'gender':
                return (
                    <div className="flex gap-2">
                        {['남성', '여성'].map(g => (
                            <button
                                key={g}
                                type="button"
                                onClick={() => handleChange('gender', localFilters.gender === g ? undefined : g)}
                                className={`px-3 py-1.5 text-sm border rounded-md transition-colors ${
                                    localFilters.gender === g
                                        ? 'bg-[var(--background-accent)] text-[var(--text-on-accent)] border-transparent'
                                        : 'bg-[var(--background-tertiary)] text-[var(--text-secondary)] border-[var(--border-color-strong)] hover:bg-[var(--background-secondary)]'
                                }`}
                            >
                                {g}
                            </button>
                        ))}
                    </div>
                );
            case 'age':
                return (
                    <div className="flex items-center gap-2">
                        <input
                            type="number"
                            placeholder="최소"
                            value={localFilters.ageMin || ''}
                            onChange={(e) => handleChange('ageMin', e.target.value)}
                            className="w-20 p-1.5 border border-[var(--border-color-strong)] rounded-md bg-[var(--background-tertiary)] text-[var(--text-primary)] text-sm"
                        />
                        <span className="text-[var(--text-muted)]">~</span>
                        <input
                            type="number"
                            placeholder="최대"
                            value={localFilters.ageMax || ''}
                            onChange={(e) => handleChange('ageMax', e.target.value)}
                            className="w-20 p-1.5 border border-[var(--border-color-strong)] rounded-md bg-[var(--background-tertiary)] text-[var(--text-primary)] text-sm"
                        />
                        <span className="text-sm text-[var(--text-muted)]">세</span>
                    </div>
                );
            case 'region':
                return (
                    <input
                        type="text"
                        placeholder="예: 서울시 강남구"
                        value={localFilters.region || ''}
                        onChange={(e) => handleChange('region', e.target.value)}
                        className="w-full p-1.5 border border-[var(--border-color-strong)] rounded-md bg-[var(--background-tertiary)] text-[var(--text-primary)] text-sm"
                    />
                );
            case 'types':
                return (
                    <div className="flex flex-wrap gap-2">
                        {customerTypes.map(type => (
                            <button
                                key={type.id}
                                type="button"
                                onClick={() => handleArrayChange('types', type.id)}
                                className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                                    (localFilters.types || []).includes(type.id)
                                        ? 'bg-[var(--background-accent)] text-[var(--text-on-accent)] border-transparent'
                                        : 'bg-[var(--background-tertiary)] text-[var(--text-secondary)] border-[var(--border-color-strong)] hover:bg-[var(--background-secondary)]'
                                }`}
                            >
                                {type.label}
                            </button>
                        ))}
                    </div>
                );
            case 'tags':
                return (
                    <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto custom-scrollbar p-1">
                        {allTags.length > 0 ? allTags.map(tag => (
                            <button
                                key={tag}
                                type="button"
                                onClick={() => handleArrayChange('tags', tag)}
                                className={`px-2 py-1 rounded text-xs font-medium border transition-colors ${
                                    (localFilters.tags || []).includes(tag)
                                        ? 'bg-blue-100 text-blue-800 border-blue-200'
                                        : 'bg-[var(--background-tertiary)] text-[var(--text-secondary)] border-[var(--border-color-strong)]'
                                }`}
                            >
                                #{tag}
                            </button>
                        )) : <span className="text-xs text-[var(--text-muted)]">등록된 태그가 없습니다.</span>}
                    </div>
                );
            case 'premium':
                return (
                    <div className="flex items-center gap-2">
                        <input
                            type="number"
                            placeholder="최소 (만원)"
                            value={localFilters.minPremium || ''}
                            onChange={(e) => handleChange('minPremium', e.target.value)}
                            className="w-24 p-1.5 border border-[var(--border-color-strong)] rounded-md bg-[var(--background-tertiary)] text-[var(--text-primary)] text-sm"
                        />
                        <span className="text-[var(--text-muted)]">~</span>
                        <input
                            type="number"
                            placeholder="최대 (만원)"
                            value={localFilters.maxPremium || ''}
                            onChange={(e) => handleChange('maxPremium', e.target.value)}
                            className="w-24 p-1.5 border border-[var(--border-color-strong)] rounded-md bg-[var(--background-tertiary)] text-[var(--text-primary)] text-sm"
                        />
                    </div>
                );
            case 'missingCoverage':
                return (
                    <select
                        value={localFilters.missingCoverage || ''}
                        onChange={(e) => handleChange('missingCoverage', e.target.value)}
                        className="w-full p-1.5 border border-[var(--border-color-strong)] rounded-md bg-[var(--background-tertiary)] text-[var(--text-primary)] text-sm"
                    >
                        <option value="">선택 안함 (전체)</option>
                        {COVERAGE_CATEGORIES.map(cat => (
                            <option key={cat} value={cat}>{cat}</option>
                        ))}
                    </select>
                );
            case 'nonContact':
                return (
                    <div className="flex items-center gap-2">
                        <input
                            type="number"
                            placeholder="3"
                            value={localFilters.minNonContactPeriod || ''}
                            onChange={(e) => handleChange('minNonContactPeriod', e.target.value)}
                            className="w-20 p-1.5 border border-[var(--border-color-strong)] rounded-md bg-[var(--background-tertiary)] text-[var(--text-primary)] text-sm"
                        />
                        <span className="text-sm text-[var(--text-secondary)]">개월 이상 연락 없음</span>
                    </div>
                );
            case 'regDate':
                return (
                    <div className="flex items-center gap-2 flex-wrap">
                        <input
                            type="date"
                            value={localFilters.registrationDateStart || ''}
                            onChange={(e) => handleChange('registrationDateStart', e.target.value)}
                            className="p-1.5 border border-[var(--border-color-strong)] rounded-md bg-[var(--background-tertiary)] text-[var(--text-primary)] text-xs"
                        />
                        <span className="text-[var(--text-muted)]">~</span>
                        <input
                            type="date"
                            value={localFilters.registrationDateEnd || ''}
                            onChange={(e) => handleChange('registrationDateEnd', e.target.value)}
                            className="p-1.5 border border-[var(--border-color-strong)] rounded-md bg-[var(--background-tertiary)] text-[var(--text-primary)] text-xs"
                        />
                    </div>
                );
            case 'rejection':
                return (
                    <select
                        value={localFilters.rejectionReason || ''}
                        onChange={(e) => handleChange('rejectionReason', e.target.value as any)}
                        className="w-full p-1.5 border border-[var(--border-color-strong)] rounded-md bg-[var(--background-tertiary)] text-[var(--text-primary)] text-sm"
                    >
                        <option value="">선택 안함</option>
                        <option value="ALL">전체 (거절 이력 있음)</option>
                        {['가격', '상품', '시기', '다른설계사', '가족', '기타'].map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                );
            case 'probability':
                return (
                    <select
                        value={localFilters.recontactProbability || ''}
                        onChange={(e) => handleChange('recontactProbability', e.target.value)}
                        className="w-full p-1.5 border border-[var(--border-color-strong)] rounded-md bg-[var(--background-tertiary)] text-[var(--text-primary)] text-sm"
                    >
                        <option value="">선택 안함</option>
                        {['상', '중', '하'].map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                );
            default:
                return null;
        }
    };

    return (
        <BaseModal isOpen={isOpen} onClose={onClose} className="max-w-2xl w-full h-[80vh] flex flex-col">
            {/* Header */}
            <div className="p-5 border-b border-[var(--border-color)] flex justify-between items-center bg-[var(--background-secondary)] rounded-t-lg shrink-0">
                <h2 className="text-xl font-bold text-[var(--text-primary)] flex items-center gap-2">
                    <FilterIcon className="h-6 w-6 text-[var(--text-accent)]" />
                    상세 검색
                </h2>
                <button onClick={onClose} className="text-[var(--text-muted)] hover:text-[var(--text-primary)] p-1">
                    <XIcon className="h-6 w-6" />
                </button>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-4 bg-[var(--background-primary)]">
                
                {/* Add Condition Button */}
                <div className="relative mb-6" ref={menuRef}>
                    <button
                        onClick={() => setIsMenuOpen(!isMenuOpen)}
                        className="flex items-center gap-2 px-4 py-2.5 bg-[var(--background-accent)] text-[var(--text-on-accent)] rounded-lg text-sm font-bold shadow-md hover:bg-[var(--background-accent-hover)] transition-colors w-full justify-center md:w-auto"
                    >
                        <PlusIcon className="h-5 w-5" />
                        조건 추가하기
                        <ChevronDownIcon className={`h-4 w-4 transition-transform ${isMenuOpen ? 'rotate-180' : ''}`} />
                    </button>
                    
                    {isMenuOpen && (
                        <div className="absolute top-full left-0 mt-2 w-56 bg-[var(--background-secondary)] border border-[var(--border-color)] rounded-lg shadow-xl z-50 overflow-hidden animate-fade-in-up">
                            {['기본 정보', '고객 정보', '계약 정보', '활동 정보', '상태 정보'].map(group => (
                                <div key={group} className="border-b border-[var(--border-color)] last:border-0">
                                    <div className="px-3 py-1.5 bg-[var(--background-tertiary)] text-xs font-bold text-[var(--text-muted)]">
                                        {group}
                                    </div>
                                    {FILTER_OPTIONS.filter(opt => opt.group === group).map(opt => (
                                        <button
                                            key={opt.key}
                                            onClick={() => handleAddFilter(opt.key)}
                                            disabled={activeFilters.includes(opt.key)}
                                            className="w-full text-left px-4 py-2 text-sm text-[var(--text-primary)] hover:bg-[var(--background-tertiary)] disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            {opt.label}
                                        </button>
                                    ))}
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Active Filters List */}
                {activeFilters.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-10 text-[var(--text-muted)] border-2 border-dashed border-[var(--border-color-strong)] rounded-lg bg-[var(--background-tertiary)]/30">
                        <FilterIcon className="h-10 w-10 mb-2 opacity-50" />
                        <p className="text-sm">위 버튼을 눌러 검색 조건을 추가해주세요.</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {activeFilters.map(key => {
                            const option = FILTER_OPTIONS.find(o => o.key === key);
                            return (
                                <div key={key} className="flex flex-col md:flex-row md:items-start gap-2 p-4 bg-[var(--background-secondary)] border border-[var(--border-color)] rounded-lg shadow-sm animate-fade-in">
                                    <div className="flex items-center justify-between md:w-32 shrink-0">
                                        <span className="text-sm font-bold text-[var(--text-primary)]">{option?.label}</span>
                                        <button 
                                            onClick={() => handleRemoveFilter(key)}
                                            className="md:hidden p-1 text-[var(--text-muted)] hover:text-[var(--text-danger)]"
                                        >
                                            <XIcon className="h-4 w-4" />
                                        </button>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        {renderFilterInput(key)}
                                    </div>
                                    <button 
                                        onClick={() => handleRemoveFilter(key)}
                                        className="hidden md:block p-1.5 text-[var(--text-muted)] hover:text-[var(--text-danger)] hover:bg-[var(--background-tertiary)] rounded-full self-center"
                                    >
                                        <XIcon className="h-4 w-4" />
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Footer */}
            <div className="p-5 border-t border-[var(--border-color)] bg-[var(--background-tertiary)] rounded-b-lg flex justify-between items-center shrink-0">
                <button 
                    onClick={handleResetClick}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-[var(--text-secondary)] bg-[var(--background-secondary)] border border-[var(--border-color-strong)] rounded-md hover:bg-[var(--background-primary)]"
                >
                    <CycleIcon className="h-4 w-4" />
                    초기화
                </button>
                <div className="flex gap-3">
                    <button onClick={onClose} className="px-5 py-2 text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--background-primary)] rounded-md">
                        취소
                    </button>
                    <button 
                        onClick={handleApply} 
                        className="px-6 py-2 text-sm font-bold text-[var(--text-on-accent)] bg-[var(--background-accent)] hover:bg-[var(--background-accent-hover)] rounded-md shadow-sm"
                    >
                        검색 ({activeFilters.length})
                    </button>
                </div>
            </div>
        </BaseModal>
    );
};

export default CustomerFilterModal;
