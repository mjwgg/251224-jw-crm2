
import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { extractProspectInfoFromText, extractProspectInfoFromImage, extractProspectInfoFromAudio } from '../services/geminiService';
import type { AIExtractedProspect, CustomerType, AIExtractedProspectWithDetails, CustomerTypeDefinition, NamedAnniversary, Customer, PerformanceRecord } from '../types';
import { getFieldsForCustomerType } from '../config/customerFields';
import Spinner from './ui/Spinner';
import { XIcon, UploadCloudIcon, FileImageIcon, FileAudioIcon, SparklesIcon, PlusIcon, TrashIcon, DocumentTextIcon, ChevronUpIcon, ChevronDownIcon, CheckIcon } from './icons';
import BaseModal from './ui/BaseModal';
import * as XLSX from 'xlsx';
// FIX: Import useLunarCalendar hook
import { useLunarCalendar } from '../hooks/useData';

interface AddProspectModalProps {
  onClose: () => void;
  onAddCustomer: (prospects: AIExtractedProspectWithDetails[]) => Promise<void>;
  onUpdateCustomer: (customer: Customer) => Promise<void>;
  onAddPerformanceRecord: (records: (Omit<PerformanceRecord, 'id'> & { customerType?: CustomerType; }) | (Omit<PerformanceRecord, 'id'> & { customerType?: CustomerType; })[]) => Promise<void>;
  onAddSuccess: () => void;
  customerTypes: CustomerTypeDefinition[];
  onAddCustomerType: (newType: {id: string, label: string}) => Promise<void>;
  customers: Customer[];
}

const LunarConversionHelper: React.FC<{ date: string; isLunar?: boolean; isLeap?: boolean; className?: string }> = ({ date, isLunar, isLeap, className = '' }) => {
    const calendar = useLunarCalendar();
    const result = useMemo(() => {
        if (!isLunar || !calendar) return null;

        try {
            const parts = date.split('-');
            const yearStr = parts[0] || '';
            const monthStr = parts[1] || '';
            const dayStr = parts[2] || '';
            
            if (!yearStr || !monthStr || !dayStr) {
                return { type: 'info', message: '(양력 날짜가 여기에 표시됩니다)' };
            }

            const year = parseInt(yearStr, 10);
            const month = parseInt(monthStr, 10);
            const day = parseInt(dayStr, 10);
            
            if (isNaN(year) || isNaN(month) || isNaN(day) || year < 1900 || year > 2100 || month < 1 || month > 12 || day < 1 || day > 31) {
                return { type: 'error', message: '(올바른 날짜를 입력해주세요.)' };
            }

            const solar = calendar.lunarToSolar(year, month, day, isLeap || false);
            if (solar) {
                return { type: 'success', message: `(양력 ${solar.year}-${String(solar.month).padStart(2, '0')}-${String(solar.day).padStart(2, '0')})` };
            }
            
            return { type: 'error', message: '(유효하지 않은 음력 날짜입니다.)' };
        } catch (e) {
            console.error("Lunar to solar conversion error:", e);
            return { type: 'error', message: '(날짜 변환 오류)' };
        }
    }, [date, isLunar, isLeap, calendar]);

    if (!result) return null;

    const textClass = result.type === 'error' 
        ? 'text-[var(--text-danger)]' 
        : result.type === 'info'
        ? 'text-[var(--text-muted)]'
        : 'text-[var(--text-accent)]';

    return <p className={`text-xs mt-1 ${textClass} ${className}`}>{result.message}</p>;
};

interface LunarDateInputProps {
    dateString: string;
    isLeap: boolean;
    onChange: (date: string, isLeap: boolean) => void;
    idPrefix: string;
}

const LunarDateInput: React.FC<LunarDateInputProps> = ({ dateString, isLeap, onChange, idPrefix }) => {
    const [year, month, day] = useMemo(() => {
        if (!dateString) return ['', '', ''];
        const parts = dateString.split('-');
        return [parts[0] || '', parts[1] || '', parts[2] || ''];
    }, [dateString]);

    const handlePartChange = (part: 'year' | 'month' | 'day', value: string) => {
        const newYear = part === 'year' ? value : year;
        const newMonth = part === 'month' ? value : month;
        const newDay = part === 'day' ? value : day;
        onChange(`${newYear}-${newMonth.padStart(2,'0')}-${newDay.padStart(2,'0')}`, isLeap);
    };

    const handleLeapChange = (checked: boolean) => {
        onChange(`${year}-${month}-${day}`, checked);
    };

    return (
        <div className="flex items-center flex-wrap gap-x-2 gap-y-1">
            <input
                type="number"
                value={year}
                onChange={e => handlePartChange('year', e.target.value)}
                placeholder="YYYY"
                className="w-20 p-2 bg-[var(--background-tertiary)] border border-[var(--border-color-strong)] rounded-md text-sm"
            />
            <span className="text-[var(--text-muted)]">년</span>
            <input
                type="number"
                value={month}
                onChange={e => handlePartChange('month', e.target.value)}
                placeholder="MM"
                className="w-16 p-2 bg-[var(--background-tertiary)] border border-[var(--border-color-strong)] rounded-md text-sm"
            />
            <span className="text-[var(--text-muted)]">월</span>
            <input
                type="number"
                value={day}
                onChange={e => handlePartChange('day', e.target.value)}
                placeholder="DD"
                className="w-16 p-2 bg-[var(--background-tertiary)] border border-[var(--border-color-strong)] rounded-md text-sm"
            />
            <span className="text-[var(--text-muted)]">일</span>
            <div className="flex items-center flex-shrink-0 ml-2">
                <input
                    id={`${idPrefix}-isLeap`}
                    type="checkbox"
                    checked={isLeap}
                    onChange={e => handleLeapChange(e.target.checked)}
                    className="h-4 w-4 text-[var(--background-accent)] focus:ring-[var(--background-accent)] border-[var(--border-color-strong)] rounded bg-[var(--background-secondary)]"
                />
                <label htmlFor={`${idPrefix}-isLeap`} className="ml-2 text-sm text-[var(--text-secondary)]">윤달</label>
            </div>
        </div>
    );
};


const getMimeTypeFromFile = (file: File): string => {
    if (file.type) {
        return file.type;
    }
    const extension = file.name.split('.').pop()?.toLowerCase();
    switch(extension) {
        case 'm4a': return 'audio/mp4';
        case 'mp3': return 'audio/mpeg';
        case 'wav': return 'audio/wav';
        case 'mp4': return 'audio/mp4';
        case 'aac': return 'audio/aac';
        case 'ogg': return 'audio/ogg';
        case 'opus': return 'audio/opus';
        case 'webm': return 'audio/webm';
        default: return '';
    }
};


type SelectableProspect = AIExtractedProspectWithDetails & {
    _isSelected: boolean;
};

const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve((reader.result as string).split(',')[1]);
        reader.onerror = error => reject(error);
    });
};

const formatPhoneNumberKR = (phone: string | null): string => {
    if (!phone || phone === '미확인') return phone || '미확인';
    const cleaned = ('' + phone).replace(/\D/g, '');

    // 다양한 형식의 전화번호를 표준 형식으로 변환 (하이픈 포함/미포함, 공백 포함 등)
    if (cleaned.startsWith('010') && cleaned.length === 11) {
        return `${cleaned.substring(0, 3)}-${cleaned.substring(3, 7)}-${cleaned.substring(7)}`;
    }
    if (cleaned.startsWith('01') && (cleaned.length === 10 || cleaned.length === 11)) {
        const match = cleaned.match(/^(\d{3})(\d{3,4})(\d{4})$/);
        if (match) {
          return [match[1], match[2], match[3]].join('-');
        }
    }
    return phone;
};

// A robust date parser for various Excel date formats.
const parseDateFromExcel = (excelDate: any, outputFormat: 'YYYY-MM-DD' | 'YYYYMMDD' = 'YYYY-MM-DD'): string | undefined => {
    if (excelDate === null || excelDate === undefined) return undefined;

    const wasNumber = typeof excelDate === 'number';

    // 1. Handle Excel serial dates first. This is less ambiguous than YYMMDD-like numbers.
    if (wasNumber && excelDate > 1 && excelDate < 100000) { 
        try {
            const jsDate = XLSX.SSF.parse_date_code(excelDate);
            if (jsDate && jsDate.y > 1900 && jsDate.y < 2100) {
                const year = jsDate.y;
                const month = String(jsDate.m).padStart(2, '0');
                const day = String(jsDate.d).padStart(2, '0');
                return outputFormat === 'YYYY-MM-DD' ? `${year}-${month}-${day}` : `${year}${month}${day}`;
            }
        } catch (e) { /* Fall through to string parsing */ }
    }

    // 2. From here on, work with strings.
    const dateStr = String(excelDate).trim();

    // 3. Prioritize parsing digit-only strings (YYMMDD or YYYYMMDD).
    if (/^\d+$/.test(dateStr)) {
        let potentialDateStr = dateStr;
        // If it's a 5-digit number like 41020 (from 041020 in Excel), pad it.
        if (wasNumber && dateStr.length === 5) {
            potentialDateStr = '0' + dateStr;
        }

        if (potentialDateStr.length === 6) { // YYMMDD
            let yearNum = parseInt(potentialDateStr.substring(0, 2), 10);
            const yearStr = String(yearNum < 50 ? 2000 + yearNum : 1900 + yearNum);
            const monthStr = potentialDateStr.substring(2, 4);
            const dayStr = potentialDateStr.substring(4, 6);
            if (parseInt(monthStr) >= 1 && parseInt(monthStr) <= 12 && parseInt(dayStr) >= 1 && parseInt(dayStr) <= 31) {
                return outputFormat === 'YYYY-MM-DD' ? `${yearStr}-${monthStr}-${dayStr}` : `${yearStr}${monthStr}${dayStr}`;
            }
        }
        if (dateStr.length === 8) { // YYYYMMDD
            const yearStr = dateStr.substring(0, 4);
            const monthStr = dateStr.substring(4, 6);
            const dayStr = dateStr.substring(6, 8);
            if (parseInt(yearStr) > 1900 && parseInt(yearStr) < 2100 && parseInt(monthStr) >= 1 && parseInt(monthStr) <= 12 && parseInt(dayStr) >= 1 && parseInt(dayStr) <= 31) {
                return outputFormat === 'YYYY-MM-DD' ? `${yearStr}-${monthStr}-${dayStr}` : dateStr;
            }
        }
    }
    
    // 4. Handle common delimited formats.
    const match = dateStr.match(/^(\d{2,4})[.-/](\d{1,2})[.-/](\d{1,2})$/);
    if (match) {
        let yearStr = match[1];
        let monthStr = match[2].padStart(2, '0');
        let dayStr = match[3].padStart(2, '0');

        if (yearStr.length === 2) {
            let yearNum = parseInt(yearStr, 10);
            yearStr = String(yearNum < 50 ? 2000 + yearNum : 1900 + yearNum);
        }
        
        if (parseInt(yearStr) > 1900 && parseInt(yearStr) < 2100 && parseInt(monthStr) >= 1 && parseInt(monthStr) <= 12 && parseInt(dayStr) >= 1 && parseInt(dayStr) <= 31) {
            return outputFormat === 'YYYY-MM-DD' ? `${yearStr}-${monthStr}-${dayStr}` : `${yearStr}${monthStr}${dayStr}`;
        }
    }
    
    // 5. Fallback for standard formats that new Date() can parse, but avoid misinterpreting large numbers.
    const jsDate = new Date(dateStr);
    if (!isNaN(jsDate.getTime())) {
        const year = jsDate.getFullYear();
        if (year > 1900 && year < 2100) {
            const month = String(jsDate.getMonth() + 1).padStart(2, '0');
            const day = String(jsDate.getDate()).padStart(2, '0');
            return outputFormat === 'YYYY-MM-DD' ? `${year}-${month}-${day}` : `${year}${month}${day}`;
        }
    }
    
    return undefined;
};


const DynamicCustomerFields = ({ prospect, onChange, isManual = false }: { prospect: Partial<AIExtractedProspectWithDetails>, onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => void, isManual?: boolean}) => {
    const specificFields = getFieldsForCustomerType(prospect.type || 'potential', 'specific');

    return (
        <>
            {specificFields.map(field => {
                 const isTextArea = field.type === 'textarea';
                 const isSelect = field.type === 'select';
                 const InputComponent = isTextArea ? 'textarea' : 'input';

                 return (
                    <div key={field.key} className={isTextArea ? "md:col-span-2" : ""}>
                        <label className="block text-sm font-medium text-[var(--text-secondary)]">{field.label}</label>
                        {isSelect ? (
                            <select name={field.key} value={(prospect as any)[field.key] || ''} onChange={onChange} className="mt-1 block w-full px-3 py-2 bg-[var(--background-tertiary)] border border-[var(--border-color-strong)] rounded-md shadow-sm focus:outline-none focus:ring-[var(--background-accent)] focus:border-[var(--background-accent)] sm:text-sm text-[var(--text-primary)]">
                                <option value="">선택</option>
                                {field.options?.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                            </select>
                        ) : (
                           <InputComponent
                                type={field.type || 'text'}
                                name={field.key}
                                value={(prospect as any)[field.key] || ''}
                                onChange={onChange}
                                rows={isTextArea ? 2 : undefined}
                                placeholder={field.key === 'desiredStartDate' ? 'YYYY-MM' : ''}
                                className="mt-1 block w-full px-3 py-2 bg-[var(--background-tertiary)] border border-[var(--border-color-strong)] rounded-md shadow-sm focus:outline-none focus:ring-[var(--background-accent)] focus:border-[var(--background-accent)] sm:text-sm text-[var(--text-primary)]"
                            />
                        )}
                    </div>
                 )
            })}
        </>
    );
};

const AnniversaryFieldsEditor: React.FC<{
    prospect: Partial<AIExtractedProspectWithDetails>;
    onUpdate: (updatedAnniversaries: NamedAnniversary[]) => void;
    onCheckAnniversarySolar: (annId: string) => void;
    anniversarySolarResults: Record<string, { type: 'info' | 'success' | 'error', message: string } | null>;
}> = ({ prospect, onUpdate, onCheckAnniversarySolar, anniversarySolarResults }) => {
    const anniversaries = prospect.namedAnniversaries || [];

    const handleAdd = () => {
        const newAnniversary: NamedAnniversary = { id: `new-${Date.now()}`, name: '', date: '' };
        onUpdate([...anniversaries, newAnniversary]);
    };

    const handleRemove = (id: string) => {
        onUpdate(anniversaries.filter(a => a.id !== id));
    };

    const handleChange = (id: string, field: 'name' | 'date' | 'isLunar' | 'isLeap', value: string | boolean) => {
        onUpdate(anniversaries.map(a => (a.id === id ? { ...a, [field]: value } : a)));
    };

    return (
        <div className="md:col-span-2 pt-4 border-t border-[var(--border-color)]">
            <label className="block text-sm font-medium text-[var(--text-secondary)]">기념일</label>
            <div className="space-y-2 mt-1">
                {anniversaries.map(ann => {
                    const solarResult = anniversarySolarResults[ann.id];
                    const textClass = solarResult?.type === 'error' 
                        ? 'text-[var(--text-danger)]' 
                        : 'text-[var(--text-accent)]';

                    return (
                        <div key={ann.id}>
                            <div className="flex items-center flex-wrap gap-2">
                                <input
                                    type="text"
                                    placeholder="기념일 이름 (예: 결혼기념일)"
                                    value={ann.name}
                                    onChange={e => handleChange(ann.id, 'name', e.target.value)}
                                    className="flex-grow p-2 bg-[var(--background-tertiary)] border border-[var(--border-color-strong)] rounded-md text-sm"
                                />
                                {!ann.isLunar && (
                                    <input
                                        type="date"
                                        value={ann.date}
                                        onChange={e => handleChange(ann.id, 'date', e.target.value)}
                                        className="p-2 bg-[var(--background-tertiary)] border border-[var(--border-color-strong)] rounded-md text-sm"
                                    />
                                )}
                                <div className="flex items-center flex-shrink-0">
                                    <input id={`ann-lunar-prospect-${ann.id}`} type="checkbox" checked={ann.isLunar || false} onChange={e => handleChange(ann.id, 'isLunar', e.target.checked)} className="h-4 w-4 text-[var(--background-accent)] focus:ring-[var(--background-accent)] border-[var(--border-color-strong)] rounded bg-[var(--background-secondary)]" />
                                    <label htmlFor={`ann-lunar-prospect-${ann.id}`} className="ml-2 text-sm text-[var(--text-secondary)]">음력</label>
                                </div>
                                <button type="button" onClick={() => handleRemove(ann.id)} className="p-2 text-[var(--text-danger)] hover:bg-red-500/10 rounded-full">
                                    <TrashIcon className="h-5 w-5" />
                                </button>
                            </div>
                             {ann.isLunar && (
                                <div className="mt-2 space-y-2">
                                    <div className="flex items-center flex-wrap gap-x-2 gap-y-1">
                                        <LunarDateInput
                                            idPrefix={`ann-prospect-${ann.id}`}
                                            dateString={ann.date}
                                            isLeap={ann.isLeap || false}
                                            onChange={(date, isLeap) => {
                                                handleChange(ann.id, 'date', date);
                                                handleChange(ann.id, 'isLeap', isLeap);
                                            }}
                                        />
                                        <button type="button" onClick={() => onCheckAnniversarySolar(ann.id)} className="px-3 py-1.5 text-sm font-medium rounded-md bg-[var(--background-tertiary)] text-[var(--text-accent)] hover:bg-opacity-80 border border-[var(--border-color-strong)]">
                                            양력 확인
                                        </button>
                                    </div>
                                    {solarResult && (
                                        <p className={`text-xs mt-1 ${textClass}`}>{solarResult.message}</p>
                                    )}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
            <button type="button" onClick={handleAdd} className="mt-2 flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-md bg-[var(--background-tertiary)] text-[var(--text-accent)] hover:bg-opacity-80">
                <PlusIcon className="h-4 w-4" /> 기념일 추가
            </button>
        </div>
    );
};

type ProcessedExcelAction = 'new_customer_contract' | 'new_customer' | 'existing_customer_contract' | 'existing_customer_update';

interface ProcessedExcelRow extends Record<string, any> {
  _action: ProcessedExcelAction;
}

const coverageCategories: PerformanceRecord['coverageCategory'][] = ['종합건강', '치매재가간병', '태아어린이', '운전자상해', '종신정기', '단기납', '연금', '경영인정기', '달러', '기타'];

const EditableProspectItem: React.FC<{
    prospect: SelectableProspect;
    index: number;
    customerTypes: CustomerTypeDefinition[];
    onUpdate: (index: number, updatedProspect: SelectableProspect) => void;
    onToggle: (index: number, isSelected: boolean) => void;
}> = ({ prospect, index, customerTypes, onUpdate, onToggle }) => {
    const [isExpanded, setIsExpanded] = useState(false);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        onUpdate(index, { ...prospect, [e.target.name]: e.target.value });
    };

    return (
        <div className="p-3 border rounded-lg bg-[var(--background-primary)] border-[var(--border-color-strong)]">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 flex-grow min-w-0">
                    <input type="checkbox" checked={prospect._isSelected} onChange={(e) => onToggle(index, e.target.checked)} className="h-5 w-5 rounded border-[var(--border-color-strong)] text-[var(--background-accent)] focus:ring-[var(--background-accent)] flex-shrink-0" />
                    <input name="customerName" value={prospect.customerName} onChange={handleChange} className="font-semibold text-[var(--text-primary)] bg-transparent border-b border-transparent focus:border-b-[var(--background-accent)] focus:outline-none w-full" />
                </div>
                <button type="button" onClick={() => setIsExpanded(!isExpanded)} className="p-1 text-[var(--text-muted)]">
                    {isExpanded ? <ChevronUpIcon className="h-5 w-5" /> : <ChevronDownIcon className="h-5 w-5" />}
                </button>
            </div>
            {isExpanded && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3 pt-3 border-t border-[var(--border-color)]">
                    <div>
                        <label className="text-xs text-[var(--text-muted)]">연락처</label>
                        <input name="contact" value={prospect.contact} onChange={handleChange} className="text-sm w-full bg-transparent border-b border-transparent focus:border-b-[var(--background-accent)] focus:outline-none" />
                    </div>
                    <div>
                        <label className="text-xs text-[var(--text-muted)]">생년월일 (YYYYMMDD)</label>
                        <input name="dob" value={prospect.dob} onChange={handleChange} className="text-sm w-full bg-transparent border-b border-transparent focus:border-b-[var(--background-accent)] focus:outline-none" />
                    </div>
                    <div>
                        <label className="text-xs text-[var(--text-muted)]">고객 유형</label>
                        <select name="type" value={prospect.type} onChange={handleChange} className="text-sm w-full bg-[var(--background-tertiary)] border border-[var(--border-color-strong)] rounded-md py-1">
                            {customerTypes.map(ct => <option key={ct.id} value={ct.id}>{ct.label}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="text-xs text-[var(--text-muted)]">주소</label>
                        <input name="homeAddress" value={prospect.homeAddress} onChange={handleChange} className="text-sm w-full bg-transparent border-b border-transparent focus:border-b-[var(--background-accent)] focus:outline-none" />
                    </div>
                </div>
            )}
        </div>
    );
};

export const AddProspectModal: React.FC<AddProspectModalProps> = ({ onClose, onAddCustomer, onUpdateCustomer, onAddPerformanceRecord, onAddSuccess, customerTypes, onAddCustomerType, customers }) => {
  const [activeTab, setActiveTab] = useState<'ai' | 'manual'>('ai');
  const calendar = useLunarCalendar();
  const [birthdaySolarResult, setBirthdaySolarResult] = useState<{ type: 'info' | 'success' | 'error', message: string } | null>(null);
  const [anniversarySolarResults, setAnniversarySolarResults] = useState<Record<string, { type: 'info' | 'success' | 'error', message: string } | null>>({});

  // AI state
  const [textInput, setTextInput] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showRules, setShowRules] = useState(false);

  const [isSaving, setIsSaving] = useState(false);
  const [consentChecked, setConsentChecked] = useState(false);
  const [saveSummary, setSaveSummary] = useState<{ customers: { name: string; birthday: string }[] } | null>(null);

  // Manual state
  const acquisitionSourceConfig = getFieldsForCustomerType('potential', 'additional').find(f => f.key === 'acquisitionSource');
  const [isInterestedManual, setIsInterestedManual] = useState(false);

  const defaultCustomerType = customerTypes.find(ct => !ct.isDefault)?.id || 'potential';
  const initialManualProspect = {
      name: '', customerName: '', contact: '', dob: '', birthday: '', gender: '', homeAddress: '', workAddress: '',
      familyRelations: '', occupation: '', monthlyPremium: '', preferredContact: '',
      type: defaultCustomerType,
      registrationDate: new Date(new Date().getTime() - (new Date().getTimezoneOffset() * 60000)).toISOString().split('T')[0],
      acquisitionSource: '',
      acquisitionSourceDetail: '',
      namedAnniversaries: [],
  };
  const [manualProspect, setManualProspect] = useState<AIExtractedProspectWithDetails>(initialManualProspect as AIExtractedProspectWithDetails);
  
  // Multi-prospect review state
  const [prospectsToReview, setProspectsToReview] = useState<SelectableProspect[] | null>(null);
  const [isInterestedBulk, setIsInterestedBulk] = useState(false);

  // Introducer search state for manual tab
  const [introducerSearch, setIntroducerSearch] = useState('');
  const [introducerSuggestions, setIntroducerSuggestions] = useState<Customer[]>([]);
  const [isIntroducerDropdownOpen, setIsIntroducerDropdownOpen] = useState(false);

  const allProspectFields: { key: keyof AIExtractedProspectWithDetails; label: string, type?: string, options?: string[] }[] = [
      { key: 'name', label: '고객명', type: 'text' },
      { key: 'contact', label: '연락처', type: 'text' },
      { key: 'birthday', label: '생년월일', type: 'date' },
      { key: 'gender', label: '성별', type: 'text' },
      { key: 'homeAddress', label: '집 주소', type: 'text' },
      { key: 'workAddress', label: '근무처', type: 'text' },
      { key: 'familyRelations', label: '가족관계', type: 'text' },
      { key: 'monthlyPremium', label: '월 보험료', type: 'text' },
      { key: 'preferredContact', label: '통화가능시간', type: 'text' },
      { key: 'acquisitionSource', label: '취득 경로', type: 'select', options: acquisitionSourceConfig?.options },
      { key: 'acquisitionSourceDetail', label: '상세 내용', type: 'text' },
  ];

  useEffect(() => {
    if (activeTab === 'manual') {
        setIntroducerSearch(manualProspect.acquisitionSourceDetail || '');
    }
  }, [activeTab, manualProspect.acquisitionSourceDetail]);

  useEffect(() => {
    if (!manualProspect.isBirthdayLunar) {
        setBirthdaySolarResult(null);
    }
}, [manualProspect.isBirthdayLunar]);

// biome-ignore lint/correctness/useExhaustiveDependencies: This effect should only run when namedAnniversaries changes.
useEffect(() => {
    const newResults: Record<string, any> = {};
    (manualProspect.namedAnniversaries || []).forEach(ann => {
        if (ann.isLunar && anniversarySolarResults[ann.id]) {
            newResults[ann.id] = anniversarySolarResults[ann.id];
        } else {
            newResults[ann.id] = null;
        }
    });
    setAnniversarySolarResults(newResults);
}, [manualProspect.namedAnniversaries]);

const checkSolarConversion = (date: string, isLeap?: boolean) => {
    if (!calendar) return { type: 'error' as const, message: '(달력 라이브러리 로딩 실패)' };
    try {
        const parts = date.split('-');
        const yearStr = parts[0] || '';
        const monthStr = parts[1] || '';
        const dayStr = parts[2] || '';
        
        if (!yearStr || !monthStr || !dayStr) {
            return null;
        }

        const year = parseInt(yearStr, 10);
        const month = parseInt(monthStr, 10);
        const day = parseInt(dayStr, 10);
        
        if (isNaN(year) || isNaN(month) || isNaN(day) || year < 1900 || year > 2100 || month < 1 || month > 12 || day < 1 || day > 31) {
            return { type: 'error' as const, message: '(올바른 날짜를 입력해주세요.)' };
        }

        const solar = calendar.lunarToSolar(year, month, day, isLeap || false);
        if (solar) {
            return { type: 'success' as const, message: `(양력 ${solar.year}-${String(solar.month).padStart(2, '0')}-${String(solar.day).padStart(2, '0')})` };
        }
        
        return { type: 'error' as const, message: '(유효하지 않은 음력 날짜입니다.)' };
    } catch (e) {
        console.error("Lunar to solar conversion error:", e);
        return { type: 'error' as const, message: '(날짜 변환 오류)' };
    }
};

const handleCheckBirthdaySolar = () => {
    const result = checkSolarConversion(manualProspect.birthday, manualProspect.isBirthdayLeap);
    setBirthdaySolarResult(result);
};

const handleCheckAnniversarySolar = (annId: string) => {
    const ann = manualProspect.namedAnniversaries?.find(a => a.id === annId);
    if (ann) {
        const result = checkSolarConversion(ann.date, ann.isLeap);
        setAnniversarySolarResults(prev => ({...prev, [annId]: result}));
    }
};


  const handleClearAiInputs = () => {
    setTextInput('');
    setSelectedFile(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleDragEvents = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    handleDragEvents(e);
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    handleDragEvents(e);
    setIsDragging(false);
  };
  
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    handleDragEvents(e);
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      setSelectedFile(e.dataTransfer.files[0]);
      setTextInput('');
      e.dataTransfer.clearData();
    }
  };
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFile(e.target.files[0]);
      setTextInput('');
    }
  };

  const handleDownloadExcelTemplate = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    const data = [
        ["고객유형", "고객명", "연락처", "생년월일", "성별", "집주소", "직장주소", "직업", "계약일", "보험사", "상품명", "보험료", "인정실적"],
        ["의사가망", "홍길동", "010 1111 2222", "1985-03-15", "남성", "서울시 강남구 테헤란로 123", "서울대학교병원", "의사", "24.01.15", "삼성생명", "종합건강보험", 150000, 180000]
    ];
    const ws = XLSX.utils.aoa_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "고객등록양식");
    XLSX.writeFile(wb, "고객_실적_일괄등록_양식.xlsx");
  };

  const handleManualProspectDataChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    
    setManualProspect(prev => {
        let newProspect;
        if (type === 'checkbox') {
            const { checked } = e.target as HTMLInputElement;
            newProspect = {...prev, [name]: checked};
        } else {
            newProspect = {...prev, [name]: value};
        }

        if (name === 'name' && type !== 'checkbox') {
            newProspect.customerName = value;
        }
        if (name === 'birthday') {
            newProspect.dob = value.replace(/-/g, '');
        }
        if (name === 'acquisitionSource' && value !== '소개') {
            newProspect.introducerId = undefined;
        }
        return newProspect;
    });
  };

  const handleIntroducerSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setIntroducerSearch(value);
    setManualProspect(prev => ({ ...prev, acquisitionSourceDetail: value, introducerId: undefined }));

    if (value) {
        const filtered = customers.filter(c =>
            c.name.toLowerCase().includes(value.toLowerCase())
        );
        setIntroducerSuggestions(filtered);
        setIsIntroducerDropdownOpen(filtered.length > 0);
    } else {
        setIntroducerSuggestions([]);
        setIsIntroducerDropdownOpen(false);
    }
  };

  const handleSelectIntroducer = (introducer: Customer) => {
    setManualProspect(prev => ({
        ...prev,
        introducerId: introducer.id,
        acquisitionSourceDetail: introducer.name,
    }));
    setIntroducerSearch(introducer.name);
    setIsIntroducerDropdownOpen(false);
  };

  const handleManualAnniversaryUpdate = (updatedAnniversaries: NamedAnniversary[]) => {
      setManualProspect(prev => ({ ...prev, namedAnniversaries: updatedAnniversaries }));
  };
  
  const processAndSaveExcel = async () => {
      if (!selectedFile) return;
      setIsSaving(true);
      setError(null);
      try {
          const data = await selectedFile.arrayBuffer();
          const workbook = XLSX.read(data);
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const json = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
          
          const dataRows = json.slice(1);

          // Automatically add new customer types
          const existingTypeLabels = new Set(customerTypes.map(ct => ct.label));
          const newTypesToCreate = new Set<string>();
          dataRows.forEach(row => {
              const typeLabel = String(row[0] || '').trim();
              if (typeLabel && !existingTypeLabels.has(typeLabel)) {
                  newTypesToCreate.add(typeLabel);
              }
          });

          if (newTypesToCreate.size > 0) {
              const creationPromises = Array.from(newTypesToCreate).map(label =>
                  onAddCustomerType({ id: label, label: label })
              );
              await Promise.all(creationPromises);
          }

          const customersToAdd: AIExtractedProspectWithDetails[] = [];
          const customersToUpdate: Customer[] = [];
          const performanceRecordsToAdd: (Omit<PerformanceRecord, 'id'> & { customerType?: CustomerType; })[] = [];
          const summaryList: { name: string; birthday: string }[] = [];

          dataRows.forEach(row => {
              if (!row || !row[1] || String(row[1]).trim() === '') {
                  return; // Skip empty rows
              }

              const customerName = String(row[1] || '');
              const rawBirthday = row[3];
              
              // Resident Registration Number Parsing
              let birthdayYYYYMMDD = '';
              let birthdayString = '';
              let extractedGender = '';
              let extractedNote = '';

              const rrRegex = /^(\d{6})-([1-4])\d{6}$/;
              const rawBirthdayStr = String(rawBirthday).trim();
              const rrMatch = rawBirthdayStr.match(rrRegex);

              if (rrMatch) {
                  const [fullRR, front, genderDigit] = rrMatch;
                  let century = (genderDigit === '1' || genderDigit === '2') ? '19' : '20';
                  const year = century + front.substring(0, 2);
                  const month = front.substring(2, 4);
                  const day = front.substring(4, 6);
                  
                  birthdayYYYYMMDD = `${year}${month}${day}`;
                  birthdayString = `${year}-${month}-${day}`;
                  
                  extractedGender = (genderDigit === '1' || genderDigit === '3') ? '남성' : '여성';
                  extractedNote = `주민등록번호: ${fullRR}`;
              } else {
                  birthdayYYYYMMDD = parseDateFromExcel(rawBirthday, 'YYYYMMDD') || '';
                  birthdayString = parseDateFromExcel(rawBirthday, 'YYYY-MM-DD') || '';
                  extractedGender = String(row[4] || '미확인');
              }

              const hasPerformanceInfo = row[8] || row[11] || row[12];

              const matchingCustomer = customers.find(c =>
                  c.name === customerName && 
                  (c.birthday ? c.birthday.replace(/-/g, '') : '') === birthdayYYYYMMDD
              );

              let action: ProcessedExcelAction;
              if (matchingCustomer) {
                  action = hasPerformanceInfo ? 'existing_customer_contract' : 'existing_customer_update';
              } else {
                  action = hasPerformanceInfo ? 'new_customer_contract' : 'new_customer';
              }

              const customerData: AIExtractedProspectWithDetails = {
                  customerName: customerName,
                  contact: formatPhoneNumberKR(String(row[2] || '')),
                  dob: birthdayYYYYMMDD || '',
                  gender: extractedGender,
                  homeAddress: String(row[5] || '미확인'),
                  workAddress: String(row[6] || '미확인'),
                  occupation: String(row[7] || '미확인'),
                  type: String(row[0] || 'potential') as CustomerType,
                  familyRelations: '미확인',
                  monthlyPremium: '미확인',
                  preferredContact: '미확인',
                  notes: extractedNote, // Save full resident number to notes
              };

              const applicationDateString = parseDateFromExcel(row[8], 'YYYY-MM-DD');
              const performanceData: Partial<Omit<PerformanceRecord, 'id'>> = {
                  applicationDate: applicationDateString,
                  premium: Number(row[11]) || 0,
                  recognizedPerformance: Number(row[12]) || 0,
                  insuranceCompany: String(row[9] || ''),
                  productName: String(row[10] || ''),
              };

              if (action === 'new_customer_contract') {
                  customersToAdd.push(customerData);
                  const record = {
                      contractorName: customerData.customerName,
                      dob: birthdayString,
                      ...performanceData,
                      customerType: customerData.type
                  };
                  performanceRecordsToAdd.push(record as any);
                  summaryList.push({ name: customerData.customerName, birthday: birthdayString });

              } else if (action === 'new_customer') {
                  customersToAdd.push(customerData);
                  summaryList.push({ name: customerData.customerName, birthday: birthdayString });

              } else if (action === 'existing_customer_update') {
                  if (matchingCustomer) {
                      const updatedCustomer: Customer = { ...matchingCustomer };
                      if (customerData.contact && customerData.contact !== '미확인') updatedCustomer.contact = customerData.contact;
                      if (customerData.homeAddress && customerData.homeAddress !== '미확인') updatedCustomer.homeAddress = customerData.homeAddress;
                      if (customerData.workAddress && customerData.workAddress !== '미확인') updatedCustomer.workAddress = customerData.workAddress;
                      if (customerData.occupation && customerData.occupation !== '미확인') updatedCustomer.occupation = customerData.occupation;
                      if (customerData.notes) {
                          updatedCustomer.notes = updatedCustomer.notes ? `${updatedCustomer.notes}\n${customerData.notes}` : customerData.notes;
                      }
                      customersToUpdate.push(updatedCustomer);
                  }
              } else if (action === 'existing_customer_contract') {
                  const record = {
                      contractorName: customerData.customerName,
                      dob: birthdayString,
                      ...performanceData,
                  };
                  performanceRecordsToAdd.push(record as any);
                  summaryList.push({ name: customerData.customerName, birthday: birthdayString });
              }
          });
          
          if (customersToAdd.length > 0) await onAddCustomer(customersToAdd);
          for (const cust of customersToUpdate) { await onUpdateCustomer(cust); }
          if (performanceRecordsToAdd.length > 0) await onAddPerformanceRecord(performanceRecordsToAdd);

          setSaveSummary({ customers: summaryList });

      } catch (err) {
          setError(err instanceof Error ? `엑셀 처리 오류: ${err.message}` : '엑셀 처리 중 오류가 발생했습니다.');
      } finally {
          setIsSaving(false);
      }
  };

  const handleAiAction = async () => {
    if (!textInput.trim() && !selectedFile) {
      setError('분석할 텍스트를 입력하거나 파일을 첨부해주세요.');
      return;
    }
    
    if (selectedFile && (selectedFile.name.endsWith('.xlsx') || selectedFile.name.endsWith('.xls'))) {
        await processAndSaveExcel();
        return;
    }

    setIsLoading(true);
    setError(null);

    try {
        let prospects: AIExtractedProspect[] = [];
        if (textInput.trim()) {
            prospects = await extractProspectInfoFromText(textInput, customerTypes);
        } else if (selectedFile) {
            const mimeType = getMimeTypeFromFile(selectedFile);
            if (mimeType.startsWith('audio/')) {
                const base64Audio = await fileToBase64(selectedFile);
                prospects = await extractProspectInfoFromAudio(base64Audio, mimeType);
            } else if (mimeType.startsWith('image/')) {
                const base64Image = await fileToBase64(selectedFile);
                prospects = await extractProspectInfoFromImage(base64Image, mimeType);
            }
        }

        if (prospects.length > 0) {
            if (prospects.length === 1) {
                const firstProspect = prospects[0];
                const manualStateData = {
                    ...initialManualProspect,
                    ...firstProspect,
                    name: firstProspect.customerName,
                    birthday: firstProspect.dob ? firstProspect.dob.replace(/(\d{4})(\d{2})(\d{2})/, '$1-$2-$3') : '',
                };
                setManualProspect(manualStateData as any);
                setActiveTab('manual');
            } else {
                setProspectsToReview(prospects.map(p => ({ ...p, _isSelected: true })));
            }
        } else {
            setError('정보를 추출하지 못했습니다. 직접 입력 탭으로 이동하여 수동으로 입력해주세요.');
            setActiveTab('manual');
        }
        handleClearAiInputs();
    } catch (err) {
        setError(err instanceof Error ? `분석 오류: ${err.message}` : '분석 중 오류가 발생했습니다.');
        setActiveTab('manual');
    } finally {
        setIsLoading(false);
    }
  };

  const handleManualSave = async () => {
    if (!manualProspect.customerName.trim()) {
        setError('고객명은 필수 항목입니다.');
        return;
    }
    setIsSaving(true);
    setError(null);
    try {
        const prospectToSend = { ...manualProspect, isInterested: isInterestedManual };
        await onAddCustomer([prospectToSend]);
        setSaveSummary({ customers: [{ name: prospectToSend.customerName, birthday: prospectToSend.dob }] });
    } catch (e) {
        setError('고객 추가 중 오류가 발생했습니다.');
    } finally {
        setIsSaving(false);
    }
  };

  const handleUpdateReviewedProspect = (index: number, updatedProspect: SelectableProspect) => {
    setProspectsToReview(prev => {
        if (!prev) return null;
        const newProspects = [...prev];
        newProspects[index] = updatedProspect;
        return newProspects;
    });
  };

  const handleToggleReviewedProspect = (index: number, isSelected: boolean) => {
      setProspectsToReview(prev => {
          if (!prev) return null;
          const newProspects = [...prev];
          newProspects[index] = { ...newProspects[index], _isSelected: isSelected };
          return newProspects;
      });
  };

  const handleSelectAllReviewed = (e: React.ChangeEvent<HTMLInputElement>) => {
      const isSelected = e.target.checked;
      setProspectsToReview(prev => prev!.map(p => ({ ...p, _isSelected: isSelected })));
  };

  const handleSaveReviewedProspects = async () => {
    if (!prospectsToReview) return;
    const selectedProspects = prospectsToReview.filter(p => p._isSelected);
    if (selectedProspects.length === 0) {
        setError('추가할 고객을 1명 이상 선택해주세요.');
        return;
    }
    setIsSaving(true);
    setError(null);
    try {
        const prospectsWithInterestFlag = selectedProspects.map(p => ({
            ...p,
            isInterested: isInterestedBulk,
        }));
        await onAddCustomer(prospectsWithInterestFlag);
        setSaveSummary({ customers: selectedProspects.map(c => ({ name: c.customerName, birthday: c.dob })) });
    } catch (e) {
        setError('고객 추가 중 오류가 발생했습니다.');
    } finally {
        setIsSaving(false);
    }
  };

  const handleClose = () => {
    setProspectsToReview(null);
    onClose();
  };

  const handleFooterAction = () => {
    if (!consentChecked) return;
    if (prospectsToReview) {
        handleSaveReviewedProspects();
    } else if (activeTab === 'ai') {
        handleAiAction();
    } else {
        handleManualSave();
    }
  };
  
  const getFileIcon = (file: File) => {
    if (file.type.startsWith('image/')) return <FileImageIcon className="h-10 w-10 text-blue-400" />;
    if (file.type.startsWith('audio/')) return <FileAudioIcon className="h-10 w-10 text-purple-400" />;
    if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls') || file.name.endsWith('.csv')) return <DocumentTextIcon className="h-10 w-10 text-green-400" />;
    return <DocumentTextIcon className="h-10 w-10 text-gray-400" />;
  };

  const isActionDisabled = (prospectsToReview ? prospectsToReview.filter(p => p._isSelected).length === 0 : 
                           (activeTab === 'manual' && !manualProspect.customerName.trim()) ||
                           (activeTab === 'ai' && !textInput.trim() && !selectedFile)) ||
                           isSaving || isLoading;

  if (saveSummary) {
    return (
        <BaseModal isOpen={true} onClose={onAddSuccess} className="max-w-md w-full">
            <div className="p-4 border-b border-[var(--border-color)]">
                <h2 className="text-xl font-bold text-[var(--text-primary)]">처리 완료</h2>
            </div>
            <div className="p-6 space-y-3">
                <div className="flex items-center justify-center text-green-500">
                    <CheckIcon className="h-10 w-10" />
                </div>
                <p className="text-center font-semibold text-[var(--text-primary)]">총 {saveSummary.customers.length}명의 고객 정보가 처리되었습니다.</p>
                <div className="max-h-60 overflow-y-auto custom-scrollbar border border-[var(--border-color)] rounded-md p-2 space-y-1">
                    {saveSummary.customers.map((c, i) => (
                        <div key={i} className="flex justify-between text-sm bg-[var(--background-tertiary)] p-1.5 rounded">
                            <span className="font-medium text-[var(--text-secondary)]">{c.name}</span>
                            <span className="text-[var(--text-muted)]">{c.birthday}</span>
                        </div>
                    ))}
                </div>
            </div>
            <div className="p-4 bg-[var(--background-tertiary)] border-t border-[var(--border-color)] flex justify-end">
                <button onClick={onAddSuccess} className="px-6 py-2 bg-[var(--background-accent)] text-[var(--text-on-accent)] rounded-md text-sm font-medium hover:bg-[var(--background-accent-hover)]">
                    확인
                </button>
            </div>
        </BaseModal>
    );
  }

  return (
    <BaseModal isOpen={true} onClose={handleClose} className="max-w-xl w-full">
      <div className="p-4 border-b border-[var(--border-color)] flex justify-between items-center flex-shrink-0">
        <h2 className="text-xl font-bold text-[var(--text-primary)]">신규 고객 추가</h2>
        <button onClick={handleClose} className="text-[var(--text-muted)] hover:text-[var(--text-primary)]"><XIcon className="h-6 w-6" /></button>
      </div>
      <div className="p-6 overflow-y-auto custom-scrollbar flex-1 min-h-0">
        {prospectsToReview ? (
             <div>
                <div className="flex justify-between items-center mb-4">
                    <div>
                        <h3 className="text-lg font-semibold text-[var(--text-primary)]">
                            {prospectsToReview.length}명의 고객 정보가 추출되었습니다.
                        </h3>
                        <p className="text-sm text-[var(--text-muted)]">
                            추가할 고객을 선택하고, 필요한 경우 정보를 수정하세요.
                        </p>
                    </div>
                    <button onClick={() => setProspectsToReview(null)} className="text-sm text-[var(--text-accent)] hover:underline">뒤로</button>
                </div>
                <div className="flex items-center p-2">
                    <input type="checkbox"
                        checked={prospectsToReview.every(p => p._isSelected)}
                        onChange={handleSelectAllReviewed}
                        className="h-5 w-5 rounded border-[var(--border-color-strong)] text-[var(--background-accent)] focus:ring-[var(--background-accent)] mr-3" />
                    <label className="text-sm font-medium">전체 선택</label>
                </div>
                <div className="space-y-3 max-h-[40vh] overflow-y-auto custom-scrollbar p-1">
                    {prospectsToReview.map((prospect, index) => (
                        <EditableProspectItem 
                            key={index}
                            prospect={prospect}
                            index={index}
                            customerTypes={customerTypes}
                            onUpdate={handleUpdateReviewedProspect}
                            onToggle={handleToggleReviewedProspect}
                        />
                    ))}
                </div>
            </div>
        ) : (
          <>
            <div className="flex justify-center p-1 bg-[var(--background-tertiary)] rounded-lg mb-6">
                <button onClick={() => setActiveTab('ai')} className={`w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-colors ${activeTab === 'ai' ? 'bg-[var(--background-secondary)] text-[var(--text-accent)] shadow' : 'text-[var(--text-secondary)]'}`}>
                    <SparklesIcon className="h-5 w-5" /> AI로 입력
                </button>
                <button onClick={() => setActiveTab('manual')} className={`w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-colors ${activeTab === 'manual' ? 'bg-[var(--background-secondary)] text-[var(--text-accent)] shadow' : 'text-[var(--text-secondary)]'}`}>
                    <PlusIcon className="h-5 w-5" /> 직접 입력
                </button>
            </div>
            
            {error && <div className="p-3 bg-red-500/10 text-[var(--text-danger)] text-sm rounded-md text-center mb-4">{error}</div>}

            {activeTab === 'ai' ? (
              <>
                {isLoading && <div className="flex justify-center items-center h-full"><Spinner /></div>}
                
                {!isLoading && (
                    <div className="space-y-4 animate-fade-in">
                        <textarea
                            value={textInput}
                            onChange={(e) => setTextInput(e.target.value)}
                            rows={6}
                            placeholder="이렇게 입력해보세요! (규칙 기반 자동인식)&#10;한 줄에 한 명씩 정보를 자유롭게 나열해주세요.&#10;&#10;예시: 김민준 010-1234-5678 900101 남자 서울시 강남구 의사가망 20만원대"
                            className="w-full p-2 border rounded-md shadow-sm focus:ring-[var(--background-accent)] focus:border-[var(--background-accent)] bg-[var(--background-tertiary)] border-[var(--border-color-strong)] text-[var(--text-primary)]"
                        />

                        <div className="text-center text-sm text-[var(--text-muted)]">또는</div>
                        
                        {selectedFile ? (
                            <div className="p-4 border-2 border-dashed rounded-lg text-center bg-[var(--background-tertiary)] border-[var(--border-color-strong)]">
                                <div className="flex flex-col items-center justify-center text-[var(--text-secondary)]">
                                    {getFileIcon(selectedFile)}
                                    <p className="mt-2 text-sm font-semibold text-[var(--text-primary)]">{selectedFile.name}</p>
                                    <p className="text-xs text-[var(--text-muted)]">({(selectedFile.size / 1024).toFixed(2)} KB)</p>
                                    <button
                                    type="button"
                                    onClick={handleClearAiInputs}
                                    className="mt-3 px-3 py-1 bg-red-500/10 text-[var(--text-danger)] text-xs font-medium rounded-full hover:bg-red-500/20"
                                    >
                                    파일 제거
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <>
                                {/* Desktop Dropzone */}
                                <div onDragEnter={handleDragEnter} onDragLeave={handleDragLeave} onDragOver={handleDragEvents} onDrop={handleDrop}
                                    className={`relative p-6 border-2 border-dashed rounded-lg text-center transition-colors ${isDragging ? 'border-[var(--background-accent)] bg-[var(--background-accent-subtle)]' : 'border-[var(--border-color-strong)]'} hover:border-[var(--border-color)] hidden md:block`}>
                                    <input ref={fileInputRef} type="file" onChange={handleFileChange} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" accept="image/*,audio/*,.m4a,.xls,.xlsx,.csv,.txt" />
                                    <div className="flex flex-col items-center justify-center text-[var(--text-muted)]">
                                        <UploadCloudIcon className="h-10 w-10" />
                                        <p className="mt-2 text-sm">
                                            <span className="font-semibold text-[var(--text-accent)]">명함, 음성, 엑셀, CSV, TXT 파일 첨부</span>하거나
                                        </p>
                                        <p className="text-sm">드래그 앤 드롭</p>
                                        <div className="flex gap-4 mt-4 text-[var(--text-primary)]">
                                            <FileImageIcon className="h-8 w-8"/>
                                            <FileAudioIcon className="h-8 w-8"/>
                                            <DocumentTextIcon className="h-8 w-8"/>
                                        </div>
                                    </div>
                                </div>
                                
                                {/* Mobile File Upload Button */}
                                <div className="md:hidden">
                                    <button type="button" onClick={() => fileInputRef.current?.click()} className="w-full flex items-center justify-center gap-2 p-3 border border-[var(--border-color-strong)] bg-[var(--background-tertiary)] rounded-lg text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--background-primary)]">
                                        <UploadCloudIcon className="h-5 w-5" />
                                        파일 첨부
                                    </button>
                                </div>
                            </>
                        )}


                        <div className="pt-4 space-y-2">
                            <div className="border border-[var(--border-color-strong)] rounded-md">
                                <button
                                    type="button"
                                    className="w-full flex justify-between items-center p-2 text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--background-tertiary)]"
                                    onClick={() => setShowRules(!showRules)}
                                    aria-expanded={showRules}
                                    aria-controls="ai-rules-content-prospect"
                                >
                                    <span>텍스트로 등록: 자동 인식 규칙 보기/숨기기</span>
                                    {showRules ? <ChevronUpIcon className="h-5 w-5" /> : <ChevronDownIcon className="h-5 w-5" />}
                                </button>
                                {showRules && (
                                <div id="ai-rules-content-prospect" className="p-3 border-t border-[var(--border-color-strong)] bg-[var(--background-primary)] text-xs text-[var(--text-muted)]">
                                   <ul className="list-disc list-inside space-y-1">
                                        <li><strong>이름:</strong> 2~5자 한글 (가장 앞에 적는 것을 추천)</li>
                                        <li><strong>연락처:</strong> 010으로 시작하는 휴대폰 번호</li>
                                        <li><strong>생년월일:</strong> 8자리(YYYYMMDD) 또는 6자리(YYMMDD) 숫자</li>
                                        <li><strong>성별:</strong> '남자' 또는 '여자'</li>
                                        <li><strong>고객유형:</strong> 등록된 고객 유형 이름 (예: 가망고객)</li>
                                        <li><strong>월 보험료:</strong> 숫자와 '만원' 조합 (예: 20만원, 20만원대)</li>
                                        <li><strong>주소:</strong> 위 정보를 제외한 나머지 텍스트</li>
                                    </ul>
                                </div>
                                )}
                            </div>
                            
                            <div className="text-center text-sm">
                                <a href="#" onClick={handleDownloadExcelTemplate} className="text-[var(--text-accent)] font-medium hover:underline">Excel 양식 다운로드</a>
                                <p className="text-xs text-[var(--text-muted)] mt-1">양식을 다운로드하여 고객 및 실적 정보를 한 번에 등록하세요.</p>
                            </div>
                        </div>
                    </div>
                )}
              </>
            ) : (
              <div className="space-y-4 animate-fade-in">
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-[var(--text-secondary)]">고객 유형</label>
                        <select name="type" value={manualProspect.type} onChange={handleManualProspectDataChange} className="mt-1 block w-full pl-3 pr-10 py-2 text-base bg-[var(--background-tertiary)] border-[var(--border-color-strong)] focus:outline-none focus:ring-[var(--background-accent)] focus:border-[var(--background-accent)] sm:text-sm rounded-md text-[var(--text-primary)]">
                            {customerTypes.map(ct => (<option key={ct.id} value={ct.id}>{ct.label}</option>))}
                        </select>
                    </div>
                    <div className="md:col-span-2 flex items-center mt-2">
                        <input
                            type="checkbox"
                            id="add-as-interested"
                            checked={isInterestedManual}
                            onChange={(e) => setIsInterestedManual(e.target.checked)}
                            className="h-4 w-4 rounded border-[var(--border-color-strong)] bg-[var(--background-secondary)] text-[var(--background-accent)] focus:ring-[var(--background-accent)]"
                        />
                        <label htmlFor="add-as-interested" className="ml-2 text-sm text-[var(--text-secondary)]">
                            관심고객으로 추가
                        </label>
                    </div>
                    {getFieldsForCustomerType(manualProspect.type, 'basic').filter(f => f.key !== 'type').map(field => (
                        field.key === 'birthday' ? (
                            <div key={field.key} className="md:col-span-2">
                                <label className="block text-sm font-medium text-[var(--text-secondary)]">{field.label}</label>
                                <div className="flex items-center gap-2 mt-1">
                                {!manualProspect.isBirthdayLunar && (
                                <input type={field.type} name={field.key} value={(manualProspect as any)[field.key] || ''} onChange={handleManualProspectDataChange} className="w-full px-3 py-2 bg-[var(--background-tertiary)] border border-[var(--border-color-strong)] rounded-md shadow-sm focus:outline-none focus:ring-[var(--background-accent)] focus:border-[var(--background-accent)] sm:text-sm text-[var(--text-primary)]" />
                                )}
                                <div className="flex items-center flex-shrink-0 ml-auto">
                                    <input id="isBirthdayLunar-prospect" name="isBirthdayLunar" type="checkbox" checked={manualProspect.isBirthdayLunar || false} onChange={handleManualProspectDataChange} className="h-4 w-4 text-[var(--background-accent)] focus:ring-[var(--background-accent)] border-[var(--border-color-strong)] rounded bg-[var(--background-secondary)]" />
                                    <label htmlFor="isBirthdayLunar-prospect" className="ml-2 text-sm text-[var(--text-secondary)]">음력</label>
                                </div>
                                </div>
                                {manualProspect.isBirthdayLunar && (
                                    <div className="mt-2 space-y-2">
                                        <div className="flex items-center flex-wrap gap-x-2 gap-y-1">
                                            <LunarDateInput
                                                idPrefix="prospect-birthday"
                                                dateString={manualProspect.birthday || ''}
                                                isLeap={manualProspect.isBirthdayLeap || false}
                                                onChange={(date, isLeap) => {
                                                    setManualProspect(prev => ({
                                                        ...prev,
                                                        birthday: date,
                                                        dob: date.replace(/-/g, ''),
                                                        isBirthdayLeap: isLeap
                                                    }));
                                                }}
                                            />
                                            <button type="button" onClick={handleCheckBirthdaySolar} className="px-3 py-1.5 text-sm font-medium rounded-md bg-[var(--background-tertiary)] text-[var(--text-accent)] hover:bg-opacity-80 border border-[var(--border-color-strong)]">
                                                양력 확인
                                            </button>
                                        </div>
                                        {birthdaySolarResult && (
                                            <p className={`text-xs mt-1 ${
                                                birthdaySolarResult.type === 'error' ? 'text-[var(--text-danger)]' : 'text-[var(--text-accent)]'
                                            }`}>
                                                {birthdaySolarResult.message}
                                            </p>
                                        )}
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div key={field.key}>
                            <label className="block text-sm font-medium text-[var(--text-secondary)]">{field.label}</label>
                            <input type={field.type} name={field.key} value={(manualProspect as any)[field.key] || ''} onChange={handleManualProspectDataChange} className="mt-1 block w-full px-3 py-2 bg-[var(--background-tertiary)] border border-[var(--border-color-strong)] rounded-md shadow-sm focus:outline-none focus:ring-[var(--background-accent)] focus:border-[var(--background-accent)] sm:text-sm text-[var(--text-primary)]" />
                        </div>
                        )
                    ))}
                    <DynamicCustomerFields prospect={manualProspect} onChange={handleManualProspectDataChange} isManual={true} />
                    {getFieldsForCustomerType(manualProspect.type, 'additional').map(field => {
                        if (field.key === 'acquisitionSourceDetail') {
                            return (
                                <div key={field.key} className={field.type === 'textarea' ? 'md:col-span-2' : ''}>
                                    <label className="block text-sm font-medium text-[var(--text-secondary)]">{field.label}</label>
                                    {manualProspect.acquisitionSource === '소개' ? (
                                    <div className="relative">
                                        <input
                                        type="text"
                                        name="acquisitionSourceDetail"
                                        value={introducerSearch}
                                        onChange={handleIntroducerSearchChange}
                                        // FIX: Corrected a typo in the onBlur event handler, changing 'setIsDropdownOpen' to 'setIsIntroducerDropdownOpen'.
                                        onBlur={() => setTimeout(() => setIsIntroducerDropdownOpen(false), 200)}
                                        onFocus={() => introducerSearch && introducerSuggestions.length > 0 && setIsIntroducerDropdownOpen(true)}
                                        className="mt-1 block w-full px-3 py-2 bg-[var(--background-tertiary)] border border-[var(--border-color-strong)] rounded-md shadow-sm focus:outline-none focus:ring-[var(--background-accent)] focus:border-[var(--background-accent)] sm:text-sm text-[var(--text-primary)]"
                                        autoComplete="off"
                                        placeholder="소개자 이름 검색..."
                                        />
                                        {isIntroducerDropdownOpen && (
                                        <ul className="absolute z-20 w-full mt-1 bg-[var(--background-secondary)] border border-[var(--border-color-strong)] rounded-md shadow-lg max-h-40 overflow-y-auto">
                                            {introducerSuggestions.map(c => (
                                            <li key={c.id} onMouseDown={() => handleSelectIntroducer(c)} className="p-2 hover:bg-[var(--background-accent-subtle)] cursor-pointer">
                                                {c.name} ({c.contact})
                                            </li>
                                            ))}
                                        </ul>
                                        )}
                                    </div>
                                    ) : (
                                    <input
                                        type={field.type}
                                        name={field.key}
                                        value={(manualProspect as any)[field.key] || ''}
                                        onChange={handleManualProspectDataChange}
                                        className="mt-1 block w-full px-3 py-2 bg-[var(--background-tertiary)] border border-[var(--border-color-strong)] rounded-md shadow-sm focus:outline-none focus:ring-[var(--background-accent)] focus:border-[var(--background-accent)] sm:text-sm text-[var(--text-primary)]"
                                    />
                                    )}
                                </div>
                            );
                        }
                        return (
                            <div key={field.key} className={field.type === 'textarea' ? "md:col-span-2" : ""}>
                                <label className="block text-sm font-medium text-[var(--text-secondary)]">{field.label}</label>
                                {field.type === 'select' ? (
                                    <select name={field.key} value={(manualProspect as any)[field.key] || ''} onChange={handleManualProspectDataChange} className="mt-1 block w-full pl-3 pr-10 py-2 text-base bg-[var(--background-tertiary)] border-[var(--border-color-strong)] focus:outline-none focus:ring-[var(--background-accent)] focus:border-[var(--background-accent)] sm:text-sm rounded-md text-[var(--text-primary)]">
                                        <option value="">선택</option>
                                        {field.options?.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                    </select>
                                ) : field.type === 'textarea' ? (
                                    <textarea name={field.key} value={(manualProspect as any)[field.key] || ''} onChange={handleManualProspectDataChange} rows={2} className="mt-1 block w-full px-3 py-2 bg-[var(--background-tertiary)] border border-[var(--border-color-strong)] rounded-md shadow-sm focus:outline-none focus:ring-[var(--background-accent)] focus:border-[var(--background-accent)] sm:text-sm text-[var(--text-primary)]" />
                                ) : (
                                    <input type={field.type} name={field.key} value={(manualProspect as any)[field.key] || ''} onChange={handleManualProspectDataChange} className="mt-1 block w-full px-3 py-2 bg-[var(--background-tertiary)] border border-[var(--border-color-strong)] rounded-md shadow-sm focus:outline-none focus:ring-[var(--background-accent)] focus:border-[var(--background-accent)] sm:text-sm text-[var(--text-primary)]" />
                                )}
                            </div>
                        )
                    })}
                    <AnniversaryFieldsEditor prospect={manualProspect} onUpdate={handleManualAnniversaryUpdate} onCheckAnniversarySolar={handleCheckAnniversarySolar} anniversarySolarResults={anniversarySolarResults}/>
                 </div>
              </div>
            )}
          </>
        )}
      </div>
      <div className="p-4 bg-[var(--background-tertiary)] border-t border-[var(--border-color)] flex flex-col md:flex-row md:justify-between md:items-center gap-4 flex-shrink-0">
         <div className="flex flex-col gap-2">
            <div className="flex items-center">
                <input 
                    type="checkbox" 
                    id="consent-checkbox-modal"
                    checked={consentChecked} 
                    onChange={e => setConsentChecked(e.target.checked)} 
                    className="h-4 w-4 rounded border-[var(--border-color-strong)] bg-[var(--background-secondary)] text-[var(--background-accent)] focus:ring-[var(--background-accent)]"
                />
                <label htmlFor="consent-checkbox-modal" className="ml-2 text-sm text-[var(--text-secondary)]">
                    고객으로부터 보험 상담 및 계약 관리를 위한 개인정보 수집·이용 동의를 받았음을 확인합니다.
                </label>
            </div>
            {prospectsToReview && (
                <div className="flex items-center">
                    <input
                        type="checkbox"
                        id="bulk-add-as-interested"
                        checked={isInterestedBulk}
                        onChange={(e) => setIsInterestedBulk(e.target.checked)}
                        className="h-4 w-4 rounded border-[var(--border-color-strong)] bg-[var(--background-secondary)] text-[var(--background-accent)] focus:ring-[var(--background-accent)]"
                    />
                    <label htmlFor="bulk-add-as-interested" className="ml-2 text-sm text-[var(--text-secondary)]">
                        선택한 {prospectsToReview.filter(p => p._isSelected).length}명의 고객을 관심고객으로 추가
                    </label>
                </div>
            )}
        </div>
        <div className="flex items-center gap-2 self-end md:self-auto">
            <button onClick={handleClose} className="px-4 py-2 bg-[var(--background-secondary)] border border-[var(--border-color-strong)] rounded-md text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--background-primary)] min-w-[100px] flex justify-center items-center">취소</button>
            <button onClick={handleFooterAction} disabled={isActionDisabled || !consentChecked} className="px-4 py-2 bg-[var(--background-success)] text-white rounded-md text-sm font-medium hover:opacity-90 disabled:opacity-50 min-w-[100px] flex items-center justify-center">
              {isSaving || isLoading ? <Spinner small /> : (prospectsToReview ? `선택 추가 (${prospectsToReview.filter(p => p._isSelected).length})` : (activeTab === 'ai' ? '분석' : '추가'))}
            </button>
        </div>
      </div>
    </BaseModal>
  );
};
