
import React, { useState, useRef, useMemo, useEffect } from 'react';
import type { Customer, Consultation, CustomerTypeDefinition, Product, Contract, CallRecord, MeetingType, NamedAnniversary, CoverageDetail } from '../types';
import { callResultLabels } from '../types';
import { getFieldsForCustomerType, type FieldConfig } from '../config/customerFields';
import { analyzeInsurancePolicy } from '../services/geminiService';
import { setItem, getItem } from '../services/storageService';
import Tag from './ui/Tag';
import Spinner from './ui/Spinner';
import { XIcon, ClipboardIcon, CheckIcon, PencilIcon, TrashIcon, PlusIcon, DownloadIcon, UploadCloudIcon, PhoneIcon } from './icons';
import BaseModal from './ui/BaseModal';
import ConfirmationModal from './ui/ConfirmationModal';
import { useLunarCalendar } from '../hooks/useData';
import ConsultationRecordModal, { type ConsultationRecordData } from './ConsultationRecordModal';


interface CustomerDetailModalProps {
  customer: Customer;
  customers: Customer[];
  customerTypes: CustomerTypeDefinition[];
  onClose: () => void;
  onSave: (customer: Customer) => void;
  onDelete: (customerId: string) => void;
  onUpdateCustomer: (customer: Customer) => Promise<void>;
  onUpdateConsultation: (customerId: string, consultation: Consultation) => Promise<Customer | undefined>;
  onDeleteConsultation: (customerId: string, consultationId: string) => void;
  onDeleteMultipleConsultations: (consultations: Array<{ customerId: string; consultationId: string }>) => void;
  initialTab?: 'details' | 'consultations' | 'contracts' | 'callHistory' | 'introductions';
  allTags: string[];
  newContractSeed?: Partial<Contract>;
  onClearNewContractSeed: () => void;
  onShowNotification: (message: string, type: 'success' | 'error') => void;
  onSelectCustomer: (customer: Customer) => void;
  meetingTypeOptions: string[];
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


const coverageCategories = ['종합건강', '치매재가간병', '태아어린이', '운전자상해', '종신정기', '단기납', '연금', '경영인정기', '달러', '기타'] as const;

const fileToBase64 = (file: File): Promise<{ base64: string; name: string }> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve({
            base64: (reader.result as string).split(',')[1],
            name: file.name
        });
        reader.onerror = error => reject(error);
    });
};

const downloadAttachment = (base64Data: string, fileName: string) => {
    try {
        const byteCharacters = atob(base64Data);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: 'application/octet-stream' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    } catch (error) {
        console.error("Failed to download attachment:", error);
        alert("파일 다운로드에 실패했습니다.");
    }
};


export const CustomerDetailModal: React.FC<CustomerDetailModalProps> = ({ customer, customers, customerTypes, onClose, onSave, onDelete, onUpdateCustomer, onUpdateConsultation, onDeleteConsultation, onDeleteMultipleConsultations, initialTab = 'details', allTags, newContractSeed, onClearNewContractSeed, onShowNotification, onSelectCustomer, meetingTypeOptions }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedCustomer, setEditedCustomer] = useState<Customer>({
      ...customer,
      contracts: customer.contracts || [],
      callHistory: customer.callHistory || [],
  });
  const [contactCopied, setContactCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'details' | 'consultations' | 'contracts' | 'callHistory' | 'introductions'>(initialTab);
  
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  const [isAddingContract, setIsAddingContract] = useState(false);
  const [editingContract, setEditingContract] = useState<Partial<Contract> | null>(null);
  
  const [editingConsultationId, setEditingConsultationId] = useState<string | null>(null);
  const [currentConsultationEdit, setCurrentConsultationEdit] = useState<Partial<Consultation>>({});

  const [selectedConsultationIds, setSelectedConsultationIds] = useState<Set<string>>(new Set());
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [isCustomerDeleteConfirmOpen, setIsCustomerDeleteConfirmOpen] = useState(false);
  const consultationHeaderCheckboxRef = useRef<HTMLInputElement>(null);
  const [expandedCallRecordId, setExpandedCallRecordId] = useState<string | null>(null);
  const [expandedConsultationIds, setExpandedConsultationIds] = useState<Set<string>>(new Set());
  
  // State for tag autocomplete
  const [tagInput, setTagInput] = useState('');
  const [tagSuggestions, setTagSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const tagInputRef = useRef<HTMLInputElement>(null);
  
  const [isAnalyzingPolicy, setIsAnalyzingPolicy] = useState(false);

  const [isDragging, setIsDragging] = useState(false);
  const fileInputForContractRef = useRef<HTMLInputElement>(null);

  // State for introducer search
  const [introducerSearch, setIntroducerSearch] = useState('');
  const [introducerSuggestions, setIntroducerSuggestions] = useState<Customer[]>([]);
  const [isIntroducerDropdownOpen, setIsIntroducerDropdownOpen] = useState(false);

  // Lunar conversion states
  const calendar = useLunarCalendar();
  const [birthdaySolarResult, setBirthdaySolarResult] = useState<{ type: 'info' | 'success' | 'error', message: string } | null>(null);
  const [anniversarySolarResults, setAnniversarySolarResults] = useState<Record<string, { type: 'info' | 'success' | 'error', message: string } | null>>({});

  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);
  
  const typeLabelMap = useMemo(() => new Map(customerTypes.map(ct => [ct.id, ct.label])), [customerTypes]);
  
  const { introducer, introducedCustomers } = useMemo(() => {
    const introducer = customer.introducerId ? customers.find(c => c.id === customer.introducerId) : null;
    const introducedCustomers = customers.filter(c => c.introducerId === customer.id);
    return { introducer, introducedCustomers };
  }, [customer, customers]);

  useEffect(() => {
    setEditedCustomer({
        ...customer,
        contracts: customer.contracts || [],
        callHistory: customer.callHistory || [],
        consultations: (customer.consultations || []).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    });
  }, [customer]);

  useEffect(() => {
    if (newContractSeed && initialTab === 'contracts') {
        setIsEditing(true);
        setIsAddingContract(true);
        setEditingContract(newContractSeed);
        onClearNewContractSeed();
    }
  }, [newContractSeed, initialTab, onClearNewContractSeed]);

  useEffect(() => {
    if (isEditing) {
        setIntroducerSearch(editedCustomer.acquisitionSourceDetail || '');
    }
  }, [isEditing, editedCustomer.acquisitionSourceDetail]);

  const isChanged = useMemo(() => {
    // 깊은 비교 대신 주요 필드들을 명시적으로 비교하여 감도를 높임
    const fieldsToCompare: (keyof Customer)[] = [
        'name', 'contact', 'birthday', 'homeAddress', 'workAddress', 
        'occupation', 'gender', 'familyRelations', 'monthlyPremium',
        'preferredContactTime', 'type', 'medicalHistory', 'interests', 'notes'
    ];

    const detailsChanged = fieldsToCompare.some(field => {
        const original = (customer as any)[field] || '';
        const edited = (editedCustomer as any)[field] || '';
        return String(original).trim() !== String(edited).trim();
    });

    const tagsChanged = JSON.stringify([...customer.tags].sort()) !== JSON.stringify([...editedCustomer.tags].sort());
    const contractsChanged = JSON.stringify(customer.contracts || []) !== JSON.stringify(editedCustomer.contracts || []);

    return detailsChanged || tagsChanged || contractsChanged;
  }, [customer, editedCustomer]);

  const handleSaveClick = async () => {
    setIsSaving(true);
    setSaveError('');
    try {
        let customerToSave = { ...editedCustomer };
        let typeChanged = false;

        // Check if a new contract was added and customer type is not 'existing'
        const originalContractCount = customer.contracts?.length || 0;
        const newContractCount = customerToSave.contracts?.length || 0;

        if (newContractCount > originalContractCount && customerToSave.type !== 'existing') {
            customerToSave.type = 'existing';
            typeChanged = true;
        }
        
        await onSave(customerToSave);

        if (typeChanged) {
            onShowNotification("고객 유형이 '기존고객'으로 자동 변경되었습니다.", 'success');
        }
    } catch (e) {
        setSaveError((e as Error).message);
    } finally {
        setIsSaving(false);
    }
  };

  const handleTabChange = async (tab: typeof activeTab) => {
    if (activeTab === tab) return;

    if (isEditing && isChanged) {
        // 알림 메시지를 더 명확하게 수정
        if (window.confirm('저장되지 않은 변경 사항이 있습니다. 지금 저장하고 이동하시겠습니까?\n\n[확인] : 저장 후 이동\n[취소] : 현재 탭에 머물기')) {
            await handleSaveClick();
            // handleSaveClick 내부에서 onSave를 호출하며, App.tsx 로직에 의해 모달이 닫힐 수 있음
            return;
        } else {
            // 취소를 누르면 탭 이동을 하지 않고 현재 편집 상태를 유지함
            return;
        }
    }
    
    // 수정 중이었지만 변경사항이 없는 경우, 편집 모드를 종료하고 탭 이동
    if (isEditing && !isChanged) {
        setIsEditing(false);
    }
    
    setActiveTab(tab);
  };

  const handleSaveNewConsultation = async (data: ConsultationRecordData) => {
    const newConsultation: Consultation = {
        id: `consult-${Date.now()}`,
        date: new Date(data.date).toISOString(),
        meetingType: data.meetingType,
        notes: data.notes,
    };
    
    const updatedConsultations = [newConsultation, ...editedCustomer.consultations].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    
    const updatedCustomer: Customer = {
        ...editedCustomer,
        consultations: updatedConsultations,
    };
    
    // 로컬 상태 즉시 업데이트
    setEditedCustomer(updatedCustomer);
    
    // DB 업데이트
    await onUpdateCustomer(updatedCustomer);
    setIsRecordModalOpen(false);
    onShowNotification('상담 기록이 성공적으로 추가되었습니다.', 'success');
  };

  const handleCopyContact = () => {
    navigator.clipboard.writeText(customer.contact);
    setContactCopied(true);
    setTimeout(() => setContactCopied(false), 2000);
  };
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    
    if (type === 'checkbox') {
        const { checked } = e.target as HTMLInputElement;
        setEditedCustomer(prev => ({ ...prev, [name]: checked }));
    } else {
        setEditedCustomer(prev => {
            const newCustomer = { ...prev, [name]: value };
            if (name === 'acquisitionSource' && value !== '소개') {
                newCustomer.introducerId = undefined;
            }
            return newCustomer;
        });
    }
  };

  const handleIntroducerSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setIntroducerSearch(value);
    setEditedCustomer(prev => ({ ...prev, acquisitionSourceDetail: value, introducerId: undefined }));

    if (value) {
        const filtered = customers.filter(c =>
            c.id !== editedCustomer.id &&
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
      setEditedCustomer(prev => ({
          ...prev,
          introducerId: introducer.id,
          acquisitionSourceDetail: introducer.name,
      }));
      setIntroducerSearch(introducer.name);
      setIsIntroducerDropdownOpen(false);
  };
  
   const handleTagInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setTagInput(value);
    if (value) {
        setShowSuggestions(true);
        setTagSuggestions(allTags.filter(tag => tag.toLowerCase().includes(value.toLowerCase())));
    } else {
        setShowSuggestions(false);
    }
   };
   
    const addTag = (tagToAdd: string) => {
        const trimmedTag = tagToAdd.trim();
        if (trimmedTag && !editedCustomer.tags.includes(trimmedTag)) {
            setEditedCustomer(prev => ({ ...prev, tags: [...prev.tags, trimmedTag] }));
        }
        setTagInput('');
        setShowSuggestions(false);
        tagInputRef.current?.focus();
    };

    const handleTagKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            addTag(tagInput);
        }
    };
   
    const removeTag = (tagToRemove: string) => {
        setEditedCustomer(prev => ({ ...prev, tags: prev.tags.filter(tag => tag !== tagToRemove) }));
    };

    const handleAddAnniversary = () => {
        setEditedCustomer(prev => ({
            ...prev,
            namedAnniversaries: [...(prev.namedAnniversaries || []), { id: `new-${Date.now()}`, name: '', date: '' }]
        }));
    };
    const handleRemoveAnniversary = (id: string) => {
        setEditedCustomer(prev => ({
            ...prev,
            namedAnniversaries: (prev.namedAnniversaries || []).filter(a => a.id !== id)
        }));
    };
    const handleAnniversaryChange = (id: string, field: 'name' | 'date' | 'isLunar' | 'isLeap', value: string | boolean) => {
        setEditedCustomer(prev => ({
            ...prev,
            namedAnniversaries: (prev.namedAnniversaries || []).map(a => a.id === id ? { ...a, [field]: value } : a)
        }));
    };

    const checkSolarConversion = (date: string, isLeap?: boolean) => {
        if (!calendar) return { type: 'error' as const, message: '(달력 라이브러리 로딩 실패)' };
        try {
            const parts = date.split('-');
            if (parts.length < 3 || !parts[0] || !parts[1] || !parts[2]) {
                return null;
            }
            const year = parseInt(parts[0], 10);
            const month = parseInt(parts[1], 10);
            const day = parseInt(parts[2], 10);
            if (isNaN(year) || isNaN(month) || isNaN(day) || year < 1900 || month < 1 || month > 12 || day < 1 || day > 31) {
                return { type: 'error' as const, message: '(올바른 날짜를 입력해주세요.)' };
            }
            const solar = calendar.lunarToSolar(year, month, day, isLeap || false);
            if (solar) {
                return { type: 'success' as const, message: `(양력 ${solar.year}-${String(solar.month).padStart(2, '0')}-${String(solar.day).padStart(2, '0')})` };
            }
            return { type: 'error' as const, message: '(유효하지 않은 음력 날짜입니다.)' };
        } catch (e) {
            return { type: 'error' as const, message: '(날짜 변환 오류)' };
        }
    };

    const handleCheckBirthdaySolar = () => {
        const result = checkSolarConversion(editedCustomer.birthday, editedCustomer.isBirthdayLeap);
        setBirthdaySolarResult(result);
    };

    const handleCheckAnniversarySolar = (annId: string) => {
        const ann = editedCustomer.namedAnniversaries?.find(a => a.id === annId);
        if (ann) {
            const result = checkSolarConversion(ann.date, ann.isLeap);
            setAnniversarySolarResults(prev => ({ ...prev, [annId]: result }));
        }
    };

  const handleContractChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>, id: string | null) => {
      const { name, value, type } = e.target;
      const isNumber = type === 'number';
      
      const updatedValue = isNumber ? parseFloat(value) || 0 : value;

      if (id) { // Editing existing contract
          setEditedCustomer(prev => ({
              ...prev,
              contracts: (prev.contracts || []).map(c => c.id === id ? { ...c, [name]: updatedValue } : c),
          }));
          setEditingContract(prev => prev ? { ...prev, [name]: updatedValue } : null);
      } else { // Editing the new contract being added
          setEditingContract(prev => prev ? { ...prev, [name]: updatedValue } : { id: `new-${Date.now()}`, [name]: updatedValue });
      }
  };
  
  const handleAttachmentChange = async (e: React.ChangeEvent<HTMLInputElement> | null, contractId: string | null) => {
    const file = e?.target.files?.[0];
    const attachmentUpdate = file 
        ? await fileToBase64(file)
        : { attachmentName: undefined, attachmentData: undefined };

    if (contractId) { // Editing existing
        setEditedCustomer(prev => ({
            ...prev,
            contracts: (prev.contracts || []).map(c => {
                if (c.id === contractId) {
                    const { attachmentName, attachmentData, ...rest } = c;
                    return { ...rest, ...attachmentUpdate };
                }
                return c;
            })
        }));
        setEditingContract(prev => {
            if (!prev) return null;
            const { attachmentName, attachmentData, ...rest } = prev;
            return { ...rest, ...attachmentUpdate };
        });
    } else { // Adding new
        setEditingContract(prev => {
            if (!prev) return null;
            const { attachmentName, attachmentData, ...rest } = prev;
            return { ...rest, ...attachmentUpdate };
        });
    }
  };

  const handleSaveContract = (id: string | null) => {
      if (id) { // This is an update to an existing contract, which is already in editedCustomer
          setEditingContract(null);
      } else { // This is a new contract
          if (editingContract) {
              const finalContract: Contract = {
                ...{
                    id: `contract-${Date.now()}`,
                    insuranceCompany: '',
                    productName: '',
                    contractDate: '',
                    monthlyPremium: 0,
                    paymentPeriod: '',
                    policyNumber: '',
                    status: 'active',
                },
                ...editingContract,
              };
              setEditedCustomer(prev => ({
                  ...prev,
                  contracts: [...(prev.contracts || []), finalContract]
              }));
          }
      }
      setIsAddingContract(false);
      setEditingContract(null);
  };
  
  const handleStartEditingContract = (contract: Contract) => {
    setIsAddingContract(false); // Ensure only one edit form is open
    setEditingContract(contract);
  };

  const handleDeleteContract = (id: string) => {
      if (window.confirm('이 계약 정보를 삭제하시겠습니까?')) {
          setEditedCustomer(prev => ({
              ...prev,
              contracts: (prev.contracts || []).filter(c => c.id !== id)
          }));
      }
  };
  
    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, contractId: string | null) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsAnalyzingPolicy(true);

        try {
            const { base64, name } = await fileToBase64(file);
            
            const attachmentData = {
                attachmentName: name,
                attachmentData: base64,
            };

            const analysis = await analyzeInsurancePolicy(base64, file.type);
            
            const updateData = { ...analysis, ...attachmentData };

            if (contractId) {
                 setEditedCustomer(prev => ({
                    ...prev,
                    contracts: (prev.contracts || []).map(c => c.id === contractId ? { ...c, ...updateData } : c),
                }));
                setEditingContract(prev => prev ? { ...prev, ...updateData } : null);
            } else {
                setEditingContract(prev => ({...prev, ...updateData}));
            }
        } catch (error) {
            console.error("Policy analysis failed:", error);
            onShowNotification("AI 보험 증권 분석에 실패했습니다.", 'error');
        } finally {
            setIsAnalyzingPolicy(false);
            if (e.target) {
                e.target.value = '';
            }
        }
    };

    const handleEditConsultation = (id: string, field: keyof Consultation, value: any) => {
        setCurrentConsultationEdit(prev => ({...prev, [field]: value}));
    };

    const handleSaveConsultationEdit = async (id: string) => {
        const originalConsultation = editedCustomer.consultations.find(c => c.id === id);
        if (!originalConsultation) return;

        const consultationToSave: Consultation = {
            ...originalConsultation,
            ...currentConsultationEdit,
        };
        await onUpdateConsultation(customer.id, consultationToSave);
        setEditingConsultationId(null);
        setCurrentConsultationEdit({});
    };

    useEffect(() => {
        if (consultationHeaderCheckboxRef.current) {
            const numSelected = selectedConsultationIds.size;
            const numTotal = editedCustomer.consultations.length;
            if (numTotal === 0) {
              consultationHeaderCheckboxRef.current.checked = false;
              consultationHeaderCheckboxRef.current.indeterminate = false;
              return;
            }
            consultationHeaderCheckboxRef.current.checked = numSelected > 0 && numSelected === numTotal;
            consultationHeaderCheckboxRef.current.indeterminate = numSelected > 0 && numSelected < numTotal;
        }
    }, [selectedConsultationIds, editedCustomer.consultations]);

    const handleSelectAllConsultations = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.checked) {
            setSelectedConsultationIds(new Set(editedCustomer.consultations.map(c => c.id)));
        } else {
            setSelectedConsultationIds(new Set());
        }
    };

    const handleSelectOneConsultation = (id: string) => {
        setSelectedConsultationIds(prev => {
            const newSet = new Set(prev);
            if (newSet.has(id)) {
                newSet.delete(id);
            } else {
                newSet.add(id);
            }
            return newSet;
        });
    };
    
    const handleDeleteSelectedConsultations = () => {
        if(selectedConsultationIds.size > 0) {
            setIsDeleteConfirmOpen(true);
        }
    };

    const confirmConsultationDeletion = async () => {
        const toDelete = Array.from(selectedConsultationIds).map(consultId => ({
            customerId: customer.id,
            consultationId: consultId,
        }));
        await onDeleteMultipleConsultations(toDelete);
        setSelectedConsultationIds(new Set());
        setIsDeleteConfirmOpen(false);
    };

    const toggleExpandConsultation = (id: string) => {
        setExpandedConsultationIds(prev => {
            const newSet = new Set(prev);
            if (newSet.has(id)) {
                newSet.delete(id);
            } else {
                newSet.add(id);
            }
            return newSet;
        });
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

    const handleDrop = (e: React.DragEvent<HTMLDivElement>, contractId: string | null) => {
        handleDragEvents(e);
        setIsDragging(false);
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            const file = e.dataTransfer.files[0];
            const mockEvent = { target: { files: [file] } } as unknown as React.ChangeEvent<HTMLInputElement>;
            handleFileUpload(mockEvent, contractId);
            e.dataTransfer.clearData();
        }
    };

    const renderField = (field: FieldConfig) => {
      if (field.key === 'type') {
          return (
              <div key={field.key}>
                  <label htmlFor={field.key} className="block text-sm font-medium text-[var(--text-secondary)]">{field.label}</label>
                  <select
                      id={field.key}
                      name={field.key}
                      value={editedCustomer.type}
                      onChange={handleChange}
                      className="mt-1 block w-full bg-[var(--background-tertiary)] border border-[var(--border-color-strong)] rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-[var(--background-accent)] focus:border-[var(--background-accent)] sm:text-sm text-[var(--text-primary)]"
                  >
                      {customerTypes.map(ct => (
                          <option key={ct.id} value={ct.id}>{ct.label}</option>
                      ))}
                  </select>
              </div>
          );
      }
      const anniversaryEditor = (
        <div className="md:col-span-2 pt-4 border-t border-[var(--border-color)]">
          <label className="block text-sm font-medium text-[var(--text-secondary)]">기념일</label>
          <div className="space-y-2 mt-1">
            {(editedCustomer.namedAnniversaries || []).map(ann => {
                const solarResult = anniversarySolarResults[ann.id];
                const textClass = solarResult?.type === 'error' ? 'text-[var(--text-danger)]' : 'text-[var(--text-accent)]';
                return (
                    <div key={ann.id}>
                        <div className="flex items-center flex-wrap gap-2">
                            <input
                                type="text"
                                placeholder="기념일 이름 (예: 결혼기념일)"
                                value={ann.name}
                                onChange={e => handleAnniversaryChange(ann.id, 'name', e.target.value)}
                                className="flex-grow p-2 bg-[var(--background-tertiary)] border border-[var(--border-color-strong)] rounded-md text-sm"
                            />
                             {!ann.isLunar && (
                                <input
                                    type="date"
                                    value={ann.date}
                                    onChange={e => handleAnniversaryChange(ann.id, 'date', e.target.value)}
                                    className="p-2 bg-[var(--background-tertiary)] border border-[var(--border-color-strong)] rounded-md text-sm"
                                />
                            )}
                            <div className="flex items-center flex-shrink-0">
                                <input
                                    id={`ann-lunar-${ann.id}`}
                                    type="checkbox"
                                    checked={ann.isLunar || false}
                                    onChange={e => handleAnniversaryChange(ann.id, 'isLunar', e.target.checked)}
                                    className="h-4 w-4 text-[var(--background-accent)] focus:ring-[var(--background-accent)] border-[var(--border-color-strong)] rounded bg-[var(--background-secondary)]"
                                />
                                <label htmlFor={`ann-lunar-${ann.id}`} className="ml-2 text-sm text-[var(--text-secondary)]">음력</label>
                            </div>
                            <button type="button" onClick={() => handleRemoveAnniversary(ann.id)} className="p-2 text-[var(--text-danger)] hover:bg-red-500/10 rounded-full">
                            <TrashIcon className="h-5 w-5" />
                            </button>
                        </div>
                        {ann.isLunar && (
                            <div className="mt-2 space-y-2">
                                <div className="flex items-center flex-wrap gap-x-2 gap-y-1">
                                    <LunarDateInput
                                        idPrefix={`ann-customer-${ann.id}`}
                                        dateString={ann.date}
                                        isLeap={ann.isLeap || false}
                                        onChange={(date, isLeap) => {
                                            handleAnniversaryChange(ann.id, 'date', date);
                                            handleAnniversaryChange(ann.id, 'isLeap', isLeap);
                                        }}
                                    />
                                    <button type="button" onClick={() => handleCheckAnniversarySolar(ann.id)} className="px-3 py-1.5 text-sm font-medium rounded-md bg-[var(--background-tertiary)] text-[var(--text-accent)] hover:bg-opacity-80 border border-[var(--border-color-strong)]">
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
          <button type="button" onClick={handleAddAnniversary} className="mt-2 flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-md bg-[var(--background-tertiary)] text-[var(--text-accent)] hover:bg-opacity-80">
            <PlusIcon className="h-4 w-4" /> 기념일 추가
          </button>
        </div>
      );
    
      if (field.key === 'birthday') {
        const textClass = birthdaySolarResult?.type === 'error' ? 'text-[var(--text-danger)]' : 'text-[var(--text-accent)]';
          return (
              <div key={field.key} className="md:col-span-2">
                  <label htmlFor={field.key} className="block text-sm font-medium text-[var(--text-secondary)]">{field.label}</label>
                  <div className="flex items-center gap-2 mt-1">
                    {!editedCustomer.isBirthdayLunar && (
                        <input
                            type={field.type || 'text'}
                            id={field.key}
                            name={field.key}
                            value={editedCustomer.birthday || ''}
                            onChange={handleChange}
                            className="w-full bg-[var(--background-tertiary)] border border-[var(--border-color-strong)] rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-[var(--background-accent)] focus:border-[var(--background-accent)] sm:text-sm text-[var(--text-primary)]"
                        />
                    )}
                      <div className="flex items-center flex-shrink-0 ml-auto">
                          <input
                              id="isBirthdayLunar"
                              name="isBirthdayLunar"
                              type="checkbox"
                              checked={editedCustomer.isBirthdayLunar || false}
                              onChange={handleChange}
                              className="h-4 w-4 text-[var(--background-accent)] focus:ring-[var(--background-accent)] border-[var(--border-color-strong)] rounded bg-[var(--background-secondary)]"
                          />
                          <label htmlFor="isBirthdayLunar" className="ml-2 text-sm text-[var(--text-secondary)]">
                              음력
                          </label>
                      </div>
                  </div>
                   {editedCustomer.isBirthdayLunar && (
                        <div className="mt-2 space-y-2">
                            <div className="flex items-center flex-wrap gap-x-2 gap-y-1">
                                <LunarDateInput
                                    idPrefix={`customer-birthday-${editedCustomer.id}`}
                                    dateString={editedCustomer.birthday || ''}
                                    isLeap={editedCustomer.isBirthdayLeap || false}
                                    onChange={(date, isLeap) => {
                                        setEditedCustomer(prev => ({
                                            ...prev,
                                            birthday: date,
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
          );
      }

      if (field.key === 'acquisitionSourceDetail') {
        return (
            <div key={field.key} className={field.type === 'textarea' ? 'md:col-span-2' : ''}>
                <label htmlFor={field.key} className="block text-sm font-medium text-[var(--text-secondary)]">{field.label}</label>
                {editedCustomer.acquisitionSource === '소개' ? (
                <div className="relative">
                    <input
                    type="text"
                    id={field.key}
                    name={field.key}
                    value={introducerSearch}
                    onChange={handleIntroducerSearchChange}
                    onBlur={() => setTimeout(() => setIsIntroducerDropdownOpen(false), 200)}
                    onFocus={() => introducerSearch && introducerSuggestions.length > 0 && setIsIntroducerDropdownOpen(true)}
                    className="mt-1 block w-full bg-[var(--background-tertiary)] border border-[var(--border-color-strong)] rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-[var(--background-accent)] focus:border-[var(--background-accent)] sm:text-sm text-[var(--text-primary)]"
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
                    type={field.type || 'text'}
                    id={field.key}
                    name={field.key}
                    value={(editedCustomer as any)[field.key] || ''}
                    onChange={handleChange}
                    className="mt-1 block w-full bg-[var(--background-tertiary)] border border-[var(--border-color-strong)] rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-[var(--background-accent)] focus:border-[var(--background-accent)] sm:text-sm text-[var(--text-primary)]"
                />
                )}
            </div>
        );
      }

      const fieldInput = (
        <div key={field.key} className={field.type === 'textarea' ? 'md:col-span-2' : ''}>
            <label htmlFor={field.key} className="block text-sm font-medium text-[var(--text-secondary)]">{field.label}</label>
            {field.type === 'textarea' ? (
                <textarea id={field.key} name={field.key} value={(editedCustomer as any)[field.key] || ''} onChange={handleChange} rows={2} className="mt-1 block w-full bg-[var(--background-tertiary)] border border-[var(--border-color-strong)] rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-[var(--background-accent)] focus:border-[var(--background-accent)] sm:text-sm text-[var(--text-primary)]" />
            ) : field.type === 'select' ? (
                <select id={field.key} name={field.key} value={(editedCustomer as any)[field.key] || ''} onChange={handleChange} className="mt-1 block w-full bg-[var(--background-tertiary)] border border-[var(--border-color-strong)] rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-[var(--background-accent)] focus:border-[var(--background-accent)] sm:text-sm text-[var(--text-primary)]">
                    <option value="">선택</option>
                    {field.options?.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                </select>
            ) : field.type === 'checkbox' ? (
                <input type="checkbox" id={field.key} name={field.key} checked={(editedCustomer as any)[field.key] || false} onChange={handleChange} className="mt-2 h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />
            ) : (
                <input type={field.type || 'text'} id={field.key} name={field.key} value={(editedCustomer as any)[field.key] || ''} onChange={handleChange} className="mt-1 block w-full bg-[var(--background-tertiary)] border border-[var(--border-color-strong)] rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-[var(--background-accent)] focus:border-[var(--background-accent)] sm:text-sm text-[var(--text-primary)]" />
            )}
        </div>
      );

      return (
        <React.Fragment key={field.key}>
          {fieldInput}
          {field.key === 'familyRelations' && anniversaryEditor}
        </React.Fragment>
      )
    };

    const renderDisplayField = (field: FieldConfig) => {
        let value = (customer as any)[field.key];
        if (field.key === 'type') {
            value = typeLabelMap.get(value) || value;
        }
        if (field.key === 'birthday' && customer.isBirthdayLunar) {
            value = `${value} (음력${customer.isBirthdayLeap ? ' 윤달' : ''})`;
        }
        if (field.type === 'checkbox') {
            value = value ? 'Yes' : 'No';
        }
        
        const anniversaryDisplay = (
            (customer.namedAnniversaries && customer.namedAnniversaries.length > 0) && (
                <div className="md:col-span-2 pt-4 mt-4 border-t border-[var(--border-color)]">
                    <p className="text-xs text-[var(--text-muted)]">기념일</p>
                    <div className="mt-1 space-y-1">
                        {customer.namedAnniversaries.map(ann => (
                            <div key={ann.id}>
                                <p className="text-base text-[var(--text-primary)] font-medium">
                                   {ann.name}: {ann.date}{ann.isLunar ? ` (음력${ann.isLeap ? ' 윤달' : ''})` : ''}
                                </p>
                                <LunarConversionHelper date={ann.date} isLunar={ann.isLunar} isLeap={ann.isLeap} />
                            </div>
                        ))}
                    </div>
                </div>
            )
        );

        return (
            <React.Fragment key={field.key}>
                <div key={field.key}>
                    <p className="text-xs text-[var(--text-muted)]">{field.label}</p>
                    <p className="text-base text-[var(--text-primary)] font-medium whitespace-pre-wrap">{value || 'N/A'}</p>
                    {field.key === 'birthday' && <LunarConversionHelper date={customer.birthday} isLunar={customer.isBirthdayLunar} isLeap={customer.isBirthdayLeap} />}
                </div>
                {field.key === 'familyRelations' && anniversaryDisplay}
            </React.Fragment>
        );
    };

    const renderContractForm = (contract: Partial<Contract> | null, id: string | null) => (
         <div className="relative p-4 bg-[var(--background-primary)] border border-dashed border-[var(--background-accent)] rounded-lg mb-4 space-y-4 animate-fade-in">
            {isAnalyzingPolicy && (
                <div className="absolute inset-0 bg-[var(--background-overlay)] z-10 flex flex-col items-center justify-center rounded-lg">
                    <Spinner />
                    <p className="mt-2 text-white font-semibold">AI가 증권을 분석 중입니다...</p>
                </div>
            )}
            <fieldset disabled={isAnalyzingPolicy} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-[var(--text-secondary)]">AI 증권 분석 (파일 첨부)</label>
                    {contract?.attachmentName ? (
                        <div className="flex items-center justify-between mt-1 p-2 bg-[var(--background-tertiary)] border border-[var(--border-color-strong)] rounded-md">
                            <span className="text-sm text-[var(--text-primary)] truncate">{contract.attachmentName}</span>
                            <div className="flex items-center gap-2">
                                 {contract.attachmentData && (
                                    <button
                                        type="button"
                                        onClick={(e) => { e.stopPropagation(); downloadAttachment(contract.attachmentData!, contract.attachmentName!); }}
                                        className="text-xs text-[var(--text-accent)] hover:underline flex items-center gap-1"
                                    >
                                        <DownloadIcon className="h-4 w-4" />
                                        다운로드
                                    </button>
                                )}
                                <button type="button" onClick={() => handleAttachmentChange(null, id)} className="text-xs text-[var(--text-danger)] hover:underline flex items-center gap-1">
                                    <TrashIcon className="h-4 w-4" />
                                    삭제
                                </button>
                            </div>
                        </div>
                    ) : (
                       <>
                            <div
                                onDragEnter={handleDragEnter}
                                onDragLeave={handleDragLeave}
                                onDragOver={handleDragEvents}
                                onDrop={(e) => handleDrop(e, id)}
                                onClick={() => fileInputForContractRef.current?.click()}
                                className={`relative mt-1 border-2 border-dashed rounded-lg text-center transition-colors cursor-pointer
                                ${isDragging ? 'border-[var(--background-accent)] bg-[var(--background-accent-subtle)]' : 'border-[var(--border-color-strong)]'} 
                                hover:border-[var(--border-color)] hidden md:block p-4`}
                            >
                                <input
                                    ref={fileInputForContractRef}
                                    type="file"
                                    onChange={(e) => handleFileUpload(e, id)}
                                    className="hidden"
                                    accept="image/*,.pdf"
                                />
                                <div className="flex flex-col items-center justify-center text-[var(--text-muted)]">
                                    <UploadCloudIcon className="h-8 w-8" />
                                    <p className="mt-2 text-sm">
                                        <span className="font-semibold text-[var(--text-accent)]">증권 파일(이미지, PDF)을 첨부</span>하거나
                                    </p>
                                    <p className="text-xs">드래그 앤 드롭</p>
                                </div>
                            </div>
                            <input
                                type="file"
                                onChange={(e) => handleFileUpload(e, id)}
                                className="mt-1 block w-full text-sm text-[var(--text-secondary)] file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-[var(--background-accent-subtle)] file:text-[var(--text-accent)] hover:file:bg-opacity-80 md:hidden"
                                accept="image/*,.pdf"
                            />
                        </>
                    )}
                    <p className="text-xs text-[var(--text-muted)] mt-1">
                        증권 이미지/PDF를 올리면 AI가 보장내용, 보험료 등을 분석하고 파일이 자동으로 첨부됩니다.
                    </p>
                </div>
                 <div>
                    <label className="block text-sm font-medium text-[var(--text-secondary)]">보장 구분</label>
                    <div className="mt-2 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-x-4 gap-y-2">
                        {coverageCategories.map(category => (
                            <div key={category} className="flex items-center">
                                <input
                                    id={`category-${category}-${id || 'new'}`}
                                    name="coverageCategory"
                                    type="radio"
                                    value={category}
                                    checked={contract?.coverageCategory === category}
                                    onChange={(e) => handleContractChange(e, id)}
                                    className="h-4 w-4 text-[var(--background-accent)] focus:ring-[var(--background-accent)] border-[var(--border-color-strong)]"
                                />
                                <label htmlFor={`category-${category}-${id || 'new'}`} className="ml-2 block text-sm text-[var(--text-secondary)]">
                                    {category}
                                </label>
                            </div>
                        ))}
                    </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <input type="text" name="insuranceCompany" value={contract?.insuranceCompany || ''} onChange={(e) => handleContractChange(e, id)} placeholder="보험사" className="p-2 bg-[var(--background-tertiary)] border border-[var(--border-color-strong)] rounded-md" />
                    <input type="text" name="productName" value={contract?.productName || ''} onChange={(e) => handleContractChange(e, id)} placeholder="상품명" className="p-2 bg-[var(--background-tertiary)] border border-[var(--border-color-strong)] rounded-md" />
                    <div>
                        <label htmlFor={`contractDate-${id || 'new'}`} className="block text-sm font-medium text-[var(--text-secondary)]">계약일</label>
                        <input
                            type="date"
                            id={`contractDate-${id || 'new'}`}
                            name="contractDate"
                            value={contract?.contractDate || ''}
                            onChange={(e) => handleContractChange(e, id)}
                            className="mt-1 w-full p-2 bg-[var(--background-tertiary)] border border-[var(--border-color-strong)] rounded-md"
                        />
                    </div>
                    <input type="number" name="monthlyPremium" value={contract?.monthlyPremium || ''} onChange={(e) => handleContractChange(e, id)} placeholder="월 보험료" className="p-2 bg-[var(--background-tertiary)] border border-[var(--border-color-strong)] rounded-md" />
                    <input type="text" name="paymentPeriod" value={contract?.paymentPeriod || ''} onChange={(e) => handleContractChange(e, id)} placeholder="납입기간" className="p-2 bg-[var(--background-tertiary)] border border-[var(--border-color-strong)] rounded-md" />
                    <input type="text" name="policyNumber" value={contract?.policyNumber || ''} onChange={(e) => handleContractChange(e, id)} placeholder="증권번호" className="p-2 bg-[var(--background-tertiary)] border border-[var(--border-color-strong)] rounded-md" />
                    <select name="status" value={contract?.status || 'active'} onChange={(e) => handleContractChange(e, id)} className="p-2 bg-[var(--background-tertiary)] border border-[var(--border-color-strong)] rounded-md">
                        <option value="active">유지</option> <option value="expired">만기</option> <option value="terminated">해지</option>
                    </select>
                    <input type="date" name="expiryDate" value={contract?.expiryDate || ''} onChange={(e) => handleContractChange(e, id)} placeholder="만기일" className="p-2 bg-[var(--background-tertiary)] border border-[var(--border-color-strong)] rounded-md" />
                </div>

                {Array.isArray(contract?.coverageDetails) && contract.coverageDetails.length > 0 ? (
                    <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">보장내용 (AI 분석 결과)</label>
                        <div className="overflow-x-auto border border-[var(--border-color-strong)] rounded-md">
                            <table className="min-w-full text-sm text-left">
                                <thead className="bg-[var(--background-tertiary)]">
                                    <tr>
                                        <th className="px-4 py-2 font-medium">구분</th>
                                        <th className="px-4 py-2 font-medium">보장명</th>
                                        <th className="px-4 py-2 font-medium text-right">가입금액</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[var(--border-color)]">
                                    {contract.coverageDetails.map((detail, index) => (
                                        <tr key={index}>
                                            <td className="px-4 py-2">{detail.type}</td>
                                            <td className="px-4 py-2">{detail.name}</td>
                                            <td className="px-4 py-2 text-right">{detail.amount}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <p className="text-xs text-[var(--text-muted)] mt-1">
                            AI 분석 결과는 수정할 수 없습니다. 내용을 변경하려면 증권을 다시 업로드하여 분석해주세요.
                        </p>
                    </div>
                ) : (
                    <textarea 
                        name="coverageDetails" 
                        value={typeof contract?.coverageDetails === 'string' ? contract.coverageDetails : ''}
                        onChange={(e) => handleContractChange(e, id)} 
                        rows={4} 
                        placeholder="상세 보장 내용 (수동 입력)" 
                        className="md:col-span-2 p-2 bg-[var(--background-tertiary)] border border-[var(--border-color-strong)] rounded-md" 
                    />
                )}
                <textarea name="notes" value={contract?.notes || ''} onChange={(e) => handleContractChange(e, id)} rows={2} placeholder="기타 메모" className="md:col-span-2 p-2 bg-[var(--background-tertiary)] border border-[var(--border-color-strong)] rounded-md" />

            </fieldset>

            <div className="flex justify-end gap-2 mt-4">
                <button type="button" onClick={() => id ? setEditingContract(null) : setIsAddingContract(false)} className="px-4 py-2 bg-[var(--background-secondary)] border border-[var(--border-color-strong)] rounded-md text-sm font-medium text-[var(--text-secondary)]">취소</button>
                <button type="button" onClick={() => handleSaveContract(id)} className="px-6 py-2 bg-[var(--background-accent)] text-[var(--text-on-accent)] rounded-md text-sm font-medium hover:bg-[var(--background-accent-hover)]">저장</button>
            </div>
         </div>
    );
    
    return (
        <BaseModal isOpen={true} onClose={onClose} className="max-w-4xl w-full h-[90vh]">
          <div className="p-4 border-b border-[var(--border-color)] flex justify-between items-center flex-shrink-0">
            <h2 className="text-xl font-bold text-[var(--text-primary)]">{customer.name}</h2>
            <button onClick={onClose} className="text-[var(--text-muted)] hover:text-[var(--text-primary)]"><XIcon className="h-6 w-6" /></button>
          </div>
          
          <div className="flex-1 min-h-0 flex flex-col md:flex-row">
            <div className="md:w-64 border-b md:border-b-0 md:border-r border-[var(--border-color)] p-2 md:p-4 flex-shrink-0">
                <div className="flex md:flex-col gap-1">
                    <button onClick={() => handleTabChange('details')} className={`w-full text-left p-3 rounded-lg font-medium text-sm ${activeTab === 'details' ? 'bg-[var(--background-accent-subtle)] text-[var(--text-accent)]' : 'hover:bg-[var(--background-tertiary)]'}`}>기본 정보</button>
                    <button onClick={() => handleTabChange('consultations')} className={`w-full text-left p-3 rounded-lg font-medium text-sm ${activeTab === 'consultations' ? 'bg-[var(--background-accent-subtle)] text-[var(--text-accent)]' : 'hover:bg-[var(--background-tertiary)]'}`}>상담 히스토리</button>
                    <button onClick={() => handleTabChange('contracts')} className={`w-full text-left p-3 rounded-lg font-medium text-sm ${activeTab === 'contracts' ? 'bg-[var(--background-accent-subtle)] text-[var(--text-accent)]' : 'hover:bg-[var(--background-tertiary)]'}`}>보유 계약</button>
                    <button onClick={() => handleTabChange('callHistory')} className={`w-full text-left p-3 rounded-lg font-medium text-sm ${activeTab === 'callHistory' ? 'bg-[var(--background-accent-subtle)] text-[var(--text-accent)]' : 'hover:bg-[var(--background-tertiary)]'}`}>통화 기록</button>
                    <button onClick={() => handleTabChange('introductions')} className={`w-full text-left p-3 rounded-lg font-medium text-sm ${activeTab === 'introductions' ? 'bg-[var(--background-accent-subtle)] text-[var(--text-accent)]' : 'hover:bg-[var(--background-tertiary)]'}`}>소개 관계</button>
                </div>
            </div>
            
            <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar p-6">
                 {activeTab === 'details' && (
                    <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {isEditing ? getFieldsForCustomerType(editedCustomer.type, 'basic').map(renderField) : getFieldsForCustomerType(customer.type, 'basic').map(renderDisplayField)}
                        </div>

                        <div className="pt-4 border-t border-[var(--border-color)]">
                            <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-3">태그</h3>
                            {isEditing ? (
                                <div>
                                    <div className="flex flex-wrap gap-2">
                                        {editedCustomer.tags.map(tag => (
                                            <Tag key={tag} label={tag} onRemove={() => removeTag(tag)} />
                                        ))}
                                    </div>
                                    <div className="relative mt-2">
                                        <input
                                            ref={tagInputRef}
                                            type="text"
                                            value={tagInput}
                                            onChange={handleTagInputChange}
                                            onKeyDown={handleTagKeyDown}
                                            onFocus={() => setShowSuggestions(true)}
                                            onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                                            placeholder="태그 추가..."
                                            className="w-full p-2 border rounded-md bg-[var(--background-tertiary)] border-[var(--border-color-strong)]"
                                        />
                                        {showSuggestions && tagSuggestions.length > 0 && (
                                            <ul className="absolute z-10 w-full mt-1 bg-[var(--background-secondary)] border border-[var(--border-color-strong)] rounded-md shadow-lg max-h-40 overflow-y-auto">
                                                {tagSuggestions.map(tag => (
                                                    <li key={tag} onMouseDown={() => addTag(tag)} className="p-2 hover:bg-[var(--background-accent-subtle)] cursor-pointer">
                                                        {tag}
                                                    </li>
                                                ))}
                                            </ul>
                                        )}
                                    </div>
                                </div>
                            ) : (
                                <div className="flex flex-wrap gap-2">
                                    {customer.tags.map(tag => ( <Tag key={tag} label={tag} /> ))}
                                </div>
                            )}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-[var(--border-color)]">
                        {isEditing ? getFieldsForCustomerType(editedCustomer.type, 'specific').map(renderField) : getFieldsForCustomerType(customer.type, 'specific').map(renderDisplayField)}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-[var(--border-color)]">
                        {isEditing ? getFieldsForCustomerType(editedCustomer.type, 'additional').map(renderField) : getFieldsForCustomerType(customer.type, 'additional').map(renderDisplayField)}
                        </div>
                    </div>
                 )}

                 {activeTab === 'consultations' && (
                    <div className="space-y-4">
                         <div className="flex justify-between items-center mb-3">
                            <h3 className="text-lg font-semibold text-[var(--text-primary)]">상담 기록</h3>
                            <button type="button" onClick={() => setIsRecordModalOpen(true)} className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-md bg-[var(--background-accent-subtle)] text-[var(--text-accent)] hover:bg-opacity-80">
                                <PlusIcon className="h-4 w-4" /> 새 상담 기록 추가
                            </button>
                        </div>
                        <div className="flex items-center justify-between p-2">
                            <div className="flex items-center gap-3">
                            <input
                                ref={consultationHeaderCheckboxRef}
                                type="checkbox"
                                onChange={handleSelectAllConsultations}
                                className="h-5 w-5 rounded border-[var(--border-color-strong)] bg-[var(--background-tertiary)] text-[var(--background-accent)] focus:ring-[var(--background-accent)]"
                                aria-label="모든 상담 기록 선택"
                            />
                            <label className="text-sm font-medium text-[var(--text-secondary)]">전체 선택</label>
                            </div>
                            {selectedConsultationIds.size > 0 && (
                                <button onClick={handleDeleteSelectedConsultations} className="flex items-center gap-1 text-sm text-[var(--text-danger)] font-medium hover:text-[var(--text-danger)]/80">
                                    <TrashIcon className="h-4 w-4" /> 선택 삭제 ({selectedConsultationIds.size})
                                </button>
                            )}
                        </div>
                        <div className="space-y-3 mt-2">
                            {editedCustomer.consultations.map(consult => (
                            <div key={consult.id} className={`p-3 border rounded-lg ${selectedConsultationIds.has(consult.id) ? 'bg-[var(--background-accent-subtle)] border-[var(--background-accent)]/50' : 'bg-[var(--background-primary)] border-[var(--border-color-strong)]'}`}>
                                <div className="flex items-start gap-3">
                                    <input
                                        type="checkbox"
                                        checked={selectedConsultationIds.has(consult.id)}
                                        onChange={() => handleSelectOneConsultation(consult.id)}
                                        className="h-5 w-5 rounded border-[var(--border-color-strong)] bg-[var(--background-tertiary)] text-[var(--background-accent)] focus:ring-[var(--background-accent)] mt-1"
                                    />
                                    <div className="flex-1">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <p className="font-semibold text-[var(--text-primary)]">{new Date(consult.date).toLocaleDateString()}</p>
                                                <p className="text-sm text-[var(--text-muted)]">{consult.meetingType}</p>
                                            </div>
                                            <div className="flex items-center gap-1">
                                                {editingConsultationId === consult.id ? (
                                                    <>
                                                    <button onClick={() => handleSaveConsultationEdit(consult.id)} className="p-1 text-green-500"><CheckIcon className="h-5 w-5"/></button>
                                                    <button onClick={() => setEditingConsultationId(null)} className="p-1 text-[var(--text-muted)]"><XIcon className="h-5 w-5"/></button>
                                                    </>
                                                ) : (
                                                    <>
                                                    <button onClick={() => { setEditingConsultationId(consult.id); setCurrentConsultationEdit(consult); }} className="p-1 text-[var(--text-muted)] hover:text-[var(--text-accent)]"><PencilIcon className="h-4 w-4"/></button>
                                                    <button onClick={() => onDeleteConsultation(customer.id, consult.id)} className="p-1 text-[var(--text-muted)] hover:text-[var(--text-danger)]"><TrashIcon className="h-4 w-4"/></button>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                        {editingConsultationId === consult.id ? (
                                            <textarea value={currentConsultationEdit.notes || ''} onChange={(e) => handleEditConsultation(consult.id, 'notes', e.target.value)} rows={4} className="mt-2 w-full p-2 border rounded-md bg-[var(--background-tertiary)] border-[var(--border-color-strong)]" />
                                        ) : (
                                            <pre className={`mt-2 whitespace-pre-wrap font-sans text-sm text-[var(--text-secondary)] transition-all duration-300 ${expandedConsultationIds.has(consult.id) ? 'max-h-none' : 'max-h-16 overflow-hidden'}`}>
                                                {consult.notes}
                                            </pre>
                                        )}
                                        {consult.notes.length > 100 && (
                                            <button onClick={() => toggleExpandConsultation(consult.id)} className="text-xs text-[var(--text-accent)] mt-1">{expandedConsultationIds.has(consult.id) ? '접기' : '더보기'}</button>
                                        )}
                                    </div>
                                </div>
                            </div>
                            ))}
                        </div>
                    </div>
                 )}

                 {activeTab === 'contracts' && (
                    <div>
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-semibold text-[var(--text-primary)]">보유 계약 ({editedCustomer.contracts?.length || 0}건)</h3>
                            <button onClick={() => { setIsAddingContract(true); setEditingContract({}); }} className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-md bg-[var(--background-accent-subtle)] text-[var(--text-accent)] hover:bg-opacity-80">
                                <PlusIcon className="h-4 w-4" /> 계약 추가
                            </button>
                        </div>
                        
                        {isAddingContract && renderContractForm(editingContract, null)}
                        
                        <div className="space-y-4">
                            {(editedCustomer.contracts || []).map(contract => (
                                editingContract?.id === contract.id 
                                ? renderContractForm(editingContract, contract.id) 
                                : (
                                    <div key={contract.id} className="p-4 bg-[var(--background-tertiary)] rounded-lg border border-[var(--border-color)]">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <p className="font-bold text-[var(--text-primary)]">{contract.productName}</p>
                                                <p className="text-sm text-[var(--text-muted)]">{contract.insuranceCompany}</p>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <button onClick={() => handleStartEditingContract(contract)} className="p-1 text-[var(--text-muted)] hover:text-[var(--text-accent)]"><PencilIcon className="h-4 w-4" /></button>
                                                <button onClick={() => handleDeleteContract(contract.id)} className="p-1 text-[var(--text-muted)] hover:text-[var(--text-danger)]"><TrashIcon className="h-4 w-4" /></button>
                                            </div>
                                        </div>
                                        <div className="mt-3 pt-3 border-t border-[var(--border-color)] grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                                            <p><strong className="text-[var(--text-muted)]">월 보험료:</strong> {(contract.monthlyPremium || 0).toLocaleString()}원</p>
                                            <p><strong className="text-[var(--text-muted)]">계약일:</strong> {contract.contractDate}</p>
                                            <p><strong className="text-[var(--text-muted)]">납입/보장:</strong> {contract.paymentPeriod}</p>
                                            <p><strong className="text-[var(--text-muted)]">증권번호:</strong> {contract.policyNumber}</p>
                                            <p><strong className="text-[var(--text-muted)]">상태:</strong> {contract.status}</p>
                                            {contract.attachmentName && (
                                                <div className="col-span-2">
                                                    <strong className="text-[var(--text-muted)]">첨부파일:</strong> 
                                                    <button onClick={() => downloadAttachment(contract.attachmentData!, contract.attachmentName!)} className="ml-2 text-[var(--text-accent)] hover:underline">{contract.attachmentName}</button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )
                            ))}
                        </div>
                    </div>
                 )}

                 {activeTab === 'callHistory' && (
                    <div className="space-y-3">
                        {editedCustomer.callHistory?.map(call => (
                           <div key={call.id} className="p-3 bg-[var(--background-tertiary)] rounded-md border border-[var(--border-color)]">
                            <div className="flex justify-between items-center text-sm">
                                <p className="font-semibold text-[var(--text-primary)]">{new Date(call.date).toLocaleString('ko-KR')}</p>
                                <span className="px-2 py-1 text-xs font-semibold rounded-full bg-blue-500/20 text-blue-300">{callResultLabels[call.result]}</span>
                            </div>
                            {call.notes && (
                                <p className={`mt-2 text-sm text-[var(--text-secondary)] transition-all duration-300 ${expandedCallRecordId === call.id ? 'max-h-none' : 'max-h-12 overflow-hidden'}`}>
                                    {call.notes}
                                </p>
                            )}
                             {call.notes && call.notes.length > 80 && (
                                <button onClick={() => setExpandedCallRecordId(prev => prev === call.id ? null : call.id)} className="text-xs text-[var(--text-accent)] mt-1">{expandedCallRecordId === call.id ? '접기' : '더보기'}</button>
                            )}
                           </div>
                        ))}
                    </div>
                 )}
                 {activeTab === 'introductions' && (
                     <div className="space-y-4">
                        {introducer && (
                            <div>
                                <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-2">소개자 정보</h3>
                                <div className="p-3 bg-[var(--background-tertiary)] rounded-md border border-[var(--border-color)]">
                                    <p className="font-bold">{introducer.name}</p>
                                    <p className="text-sm text-[var(--text-muted)]">{introducer.contact}</p>
                                    <button onClick={() => onSelectCustomer(introducer)} className="text-sm text-[var(--text-accent)] hover:underline mt-1">상세정보 보기</button>
                                </div>
                            </div>
                        )}
                        <div>
                            <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-2">소개한 고객 목록 ({introducedCustomers.length}명)</h3>
                            <div className="space-y-2">
                            {introducedCustomers.map(c => (
                                <div key={c.id} className="p-3 bg-[var(--background-tertiary)] rounded-md border border-[var(--border-color)] flex justify-between items-center">
                                    <div>
                                        <p className="font-bold">{c.name}</p>
                                        <p className="text-sm text-[var(--text-muted)]">{c.contact}</p>
                                    </div>
                                    <button onClick={() => onSelectCustomer(c)} className="text-sm text-[var(--text-accent)] hover:underline">상세정보 보기</button>
                                </div>
                            ))}
                            </div>
                        </div>
                     </div>
                 )}
            </div>
          </div>

          <div className="p-4 bg-[var(--background-tertiary)] border-t border-[var(--border-color)] flex justify-between items-center flex-shrink-0">
            <button onClick={() => setIsCustomerDeleteConfirmOpen(true)} className="px-4 py-2 bg-[var(--background-danger)] text-white rounded-md text-sm font-medium hover:bg-[var(--background-danger-hover)]">고객 삭제</button>
            <div className="flex gap-4">
                <button onClick={() => isEditing ? setIsEditing(false) : onClose()} className="px-4 py-2 bg-[var(--background-secondary)] border border-[var(--border-color-strong)] rounded-md text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--background-primary)]">
                    {isEditing ? '취소' : '닫기'}
                </button>
                <button 
                    onClick={() => isEditing ? handleSaveClick() : setIsEditing(true)} 
                    className="px-6 py-2 bg-[var(--background-accent)] text-[var(--text-on-accent)] rounded-md text-sm font-medium hover:bg-[var(--background-accent-hover)]"
                    disabled={isSaving}
                >
                    {isSaving ? <Spinner small /> : (isEditing ? '저장' : '수정')}
                </button>
            </div>
          </div>
          <ConfirmationModal
            isOpen={isDeleteConfirmOpen}
            onClose={() => setIsDeleteConfirmOpen(false)}
            onConfirm={confirmConsultationDeletion}
            title="상담 기록 삭제 확인"
            message={<p>선택한 <strong>{selectedConsultationIds.size}</strong>개의 상담 기록을 삭제하시겠습니까?</p>}
            zIndex="z-[70]"
          />
          <ConfirmationModal
            isOpen={isCustomerDeleteConfirmOpen}
            onClose={() => setIsCustomerDeleteConfirmOpen(false)}
            onConfirm={() => onDelete(customer.id)}
            title="고객 삭제 확인"
            message={<p><strong>{customer.name}</strong> 고객의 모든 정보(상담, 계약, 통화 기록 등)를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.</p>}
            zIndex="z-[70]"
          />
          <ConsultationRecordModal
            isOpen={isRecordModalOpen}
            onClose={() => setIsRecordModalOpen(false)}
            onSave={handleSaveNewConsultation}
            customerName={customer.name}
            meetingTypeOptions={meetingTypeOptions}
          />
        </BaseModal>
    );
};
