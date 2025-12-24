
import React, { useState, useRef, useMemo, useEffect } from 'react';
import type { AIExtractedAppointment, Customer, Appointment, MeetingType, RecurrenceSettings } from '../types';
import Spinner from './ui/Spinner';
import { XIcon, SparklesIcon, PlusIcon, ChevronUpIcon, ChevronDownIcon } from './icons';
import BaseModal from './ui/BaseModal';
import { getItem, setItem } from '../services/storageService';
import { extractAppointmentInfoFromText } from '../services/geminiService';

interface AIAppointmentModalProps {
    customers: Customer[];
    onClose: () => void;
    onAddAppointment: (appointment: Omit<Appointment, 'id' | 'status'>, recurrence?: RecurrenceSettings) => void;
    seedData: { customer: Customer, notes: string } | null;
}

const generateTimeOptions = () => {
    const options = [];
    for (let h = 0; h < 24; h++) {
        for (let m = 0; m < 60; m += 30) {
            const hour = String(h).padStart(2, '0');
            const minute = String(m).padStart(2, '0');
            options.push(`${hour}:${minute}`);
        }
    }
    return options;
};


export const AIAppointmentModal: React.FC<AIAppointmentModalProps> = ({ customers, onClose, onAddAppointment, seedData }) => {
  const [activeTab, setActiveTab] = useState<'ai' | 'manual'>('ai');
  const [aiText, setAiText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showRules, setShowRules] = useState(false);

  const [formData, setFormData] = useState({
    customerId: '',
    title: '',
    date: '',
    time: '',
    endTime: '',
    location: '',
    meetingType: 'AP',
    notes: '',
  });
  const [eventType, setEventType] = useState<'customer' | 'personal'>('customer');
  const [customerSearch, setCustomerSearch] = useState('');
  const [customerSuggestions, setCustomerSuggestions] = useState<Customer[]>([]);
  const [isCustomerDropdownOpen, setIsCustomerDropdownOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [personalMeetingTypes, setPersonalMeetingTypes] = useState<string[]>([]);
  const [newPersonalType, setNewPersonalType] = useState('');
  const PERSONAL_MEETING_TYPES_KEY = 'personal_meeting_types';
  
  const [customerMeetingTypes, setCustomerMeetingTypes] = useState<string[]>([]);
  const [newCustomerType, setNewCustomerType] = useState('');
  const CUSTOMER_MEETING_TYPES_KEY = 'customer_meeting_types';

  const [recurrenceType, setRecurrenceType] = useState<RecurrenceSettings['type']>('none');
  const [recurrenceDays, setRecurrenceDays] = useState<Set<number>>(new Set());
  const [recurrenceEndDate, setRecurrenceEndDate] = useState('');
  const [useEndDate, setUseEndDate] = useState(false);
  const [recurrenceInterval, setRecurrenceInterval] = useState(1);
  const [isLunar, setIsLunar] = useState(false);

  const timeOptions = useMemo(() => generateTimeOptions(), []);

  useEffect(() => {
    const storedPersonalTypes = getItem<string[]>(PERSONAL_MEETING_TYPES_KEY);
    if (storedPersonalTypes && storedPersonalTypes.length > 0) {
      setPersonalMeetingTypes(storedPersonalTypes);
    } else {
      const defaultTypes = ['교육', '회의', '가족일정', '자기계발', '마케팅', '개인', '운동'];
      setPersonalMeetingTypes(defaultTypes);
      setItem(PERSONAL_MEETING_TYPES_KEY, defaultTypes);
    }

    const storedCustomerTypes = getItem<string[]>(CUSTOMER_MEETING_TYPES_KEY);
    const defaultCustomerTypes: MeetingType[] = ['AP', 'PC', '기타', '증권전달'];
    if (storedCustomerTypes && storedCustomerTypes.length > 0) {
        setCustomerMeetingTypes(storedCustomerTypes);
    } else {
        setCustomerMeetingTypes(defaultCustomerTypes);
        setItem(CUSTOMER_MEETING_TYPES_KEY, defaultCustomerTypes);
    }
  }, []);
  
  useEffect(() => {
    if (seedData && (customerMeetingTypes.length > 0 || personalMeetingTypes.length > 0)) {
        setActiveTab('ai');
        setAiText(seedData.notes);
        // Automatically run analysis if there's seed data
        const runSeededAnalysis = async () => {
            setError(null);
            setIsLoading(true);
            try {
                // Create reference date for seeded analysis as well
                const today = new Date();
                const year = today.getFullYear();
                const month = String(today.getMonth() + 1).padStart(2, '0');
                const day = String(today.getDate()).padStart(2, '0');
                const todayStr = `${year}-${month}-${day}`;

                const result = await extractAppointmentInfoFromText(seedData.notes, customers, customerMeetingTypes, personalMeetingTypes, seedData.customer.name, todayStr);
                
                let customerId = '';
                if (result.customerName) {
                    const matchingCustomer = customers.find(c => c.name === result.customerName);
                    if (matchingCustomer) {
                        customerId = matchingCustomer.id;
                    }
                }
                
                let finalEndTime = result.endTime || '';
                if (!finalEndTime && result.time) {
                     const [hour, minute] = result.time.split(':').map(Number);
                     if (!isNaN(hour)) {
                         const startDate = new Date();
                         startDate.setHours(hour, minute);
                         startDate.setHours(startDate.getHours() + 1);
                         const endHour = String(startDate.getHours()).padStart(2, '0');
                         const endMinute = String(startDate.getMinutes()).padStart(2, '0');
                         finalEndTime = `${endHour}:${endMinute}`;
                     }
                }
                
                setFormData({
                    customerId: customerId,
                    title: result.title || '',
                    date: result.date || '',
                    time: result.time || '',
                    endTime: finalEndTime,
                    location: result.location || '',
                    meetingType: result.meetingType || 'AP',
                    notes: result.notes || seedData.notes,
                });

                if (customerId) {
                    setCustomerSearch(result.customerName || '');
                } else if (result.customerName) {
                    setCustomerSearch(result.customerName);
                } else {
                    setCustomerSearch('');
                }
                
                setActiveTab('manual');

            } catch(e) {
                setError((e as Error).message);
            } finally {
                setIsLoading(false);
            }
        }
        runSeededAnalysis();
    }
  }, [seedData, customers, customerMeetingTypes, personalMeetingTypes]);

  const handleEventTypeChange = (type: 'customer' | 'personal') => {
    setEventType(type);
    if (type === 'customer') {
        setFormData(prev => ({ ...prev, meetingType: customerMeetingTypes.length > 0 ? customerMeetingTypes[0] : 'AP' }));
    } else {
        setFormData(prev => ({ ...prev, meetingType: personalMeetingTypes.length > 0 ? personalMeetingTypes[0] : '' }));
    }
  };

  const handleAiAnalyze = async () => {
    if (!aiText.trim()) {
      setError('분석할 내용을 입력해주세요.');
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      // Generate local date string to pass as reference
      const today = new Date();
      const year = today.getFullYear();
      const month = String(today.getMonth() + 1).padStart(2, '0');
      const day = String(today.getDate()).padStart(2, '0');
      const todayStr = `${year}-${month}-${day}`;

      const result = await extractAppointmentInfoFromText(aiText, customers, customerMeetingTypes, personalMeetingTypes, seedData?.customer.name, todayStr);
      
      const isPersonal = !result.customerName && !!result.title;
      setEventType(isPersonal ? 'personal' : 'customer');
      
      let customerId = '';
      if (!isPersonal && result.customerName) {
        const matchingCustomer = customers.find(c => c.name === result.customerName);
        if (matchingCustomer) {
            customerId = matchingCustomer.id;
        }
      }

      let finalEndTime = result.endTime || '';
      if (!finalEndTime && result.time) {
          const [hour, minute] = result.time.split(':').map(Number);
          if (!isNaN(hour)) {
              const startDate = new Date();
              startDate.setHours(hour, minute);
              startDate.setHours(startDate.getHours() + 1);
              const endHour = String(startDate.getHours()).padStart(2, '0');
              const endMinute = String(startDate.getMinutes()).padStart(2, '0');
              finalEndTime = `${endHour}:${endMinute}`;
          }
      }
      
      setFormData({
        customerId: customerId,
        title: result.title || '',
        date: result.date,
        time: result.time,
        endTime: finalEndTime,
        location: result.location || '',
        meetingType: result.meetingType || (isPersonal ? (personalMeetingTypes[0] || '') : 'AP'),
        notes: result.notes || aiText,
      });

      if (customerId) {
        setCustomerSearch(result.customerName || '');
      } else if (result.customerName) {
        setCustomerSearch(result.customerName);
      } else {
        setCustomerSearch('');
      }

      setRecurrenceType(result.recurrenceType || 'none');
      // FIX: recurrenceDays from AI result might not be a typed array. Coerce to number and filter.
      const numericRecurrenceDays: number[] = Array.isArray(result.recurrenceDays)
        ? result.recurrenceDays.map((v): number => Number(v)).filter(n => !isNaN(n))
        : [];
      setRecurrenceDays(new Set(numericRecurrenceDays));
      setRecurrenceInterval(result.recurrenceInterval || 1);
      setUseEndDate(false);
      setRecurrenceEndDate('');
      
      setActiveTab('manual');
    } catch (e) {
      setError((e as Error).message);
    } finally {
        setIsLoading(false);
    }
  };


  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleCustomerSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setCustomerSearch(value);
    setFormData(prev => ({ ...prev, customerId: '' }));
    if (value) {
      setCustomerSuggestions(customers.filter(c => c.name.toLowerCase().includes(value.toLowerCase())));
      setIsCustomerDropdownOpen(true);
    } else {
      setIsCustomerDropdownOpen(false);
    }
  };

  const handleCustomerSelect = (customer: Customer) => {
    setCustomerSearch(customer.name);
    setFormData(prev => ({ ...prev, customerId: customer.id }));
    setIsCustomerDropdownOpen(false);
  };
  
  const handleAddPersonalType = () => {
      if (newPersonalType && !personalMeetingTypes.includes(newPersonalType)) {
          const updatedTypes = [...personalMeetingTypes, newPersonalType];
          setPersonalMeetingTypes(updatedTypes);
          setItem(PERSONAL_MEETING_TYPES_KEY, updatedTypes);
          setFormData(prev => ({ ...prev, meetingType: newPersonalType }));
          setNewPersonalType('');
      }
  };

  const handleAddCustomerType = () => {
      if (newCustomerType && !customerMeetingTypes.includes(newCustomerType)) {
          const updatedTypes = [...customerMeetingTypes, newCustomerType];
          setCustomerMeetingTypes(updatedTypes);
          setItem(CUSTOMER_MEETING_TYPES_KEY, updatedTypes);
          setNewCustomerType('');
      }
  };

  const toggleRecurrenceDay = (day: number) => {
    setRecurrenceDays(prev => {
        const newSet = new Set(prev);
        if (newSet.has(day)) newSet.delete(day); else newSet.add(day);
        return newSet;
    });
  };

  const convertedLunarDateText = useMemo(() => {
    if (isLunar && recurrenceType === 'yearly' && formData.date) {
        const calendar = (window as any).KoreanLunarCalendar ? new (window as any).KoreanLunarCalendar() : null;
        if (calendar) {
            try {
                const [year, month, day] = formData.date.split('-').map(Number);
                calendar.solarToLunar(year, month, day);
                const lunar = calendar.getLunar();
                if (lunar) {
                    return `(음력 ${lunar.month}월 ${lunar.day}일로 매년 반복됩니다)`;
                }
            } catch (e) {
                console.error("Error converting to lunar date", e);
            }
        }
    }
    return '';
  }, [isLunar, recurrenceType, formData.date]);

  const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      if (activeTab === 'ai') {
        await handleAiAnalyze();
        return;
      }

      if (eventType === 'customer' && (!customerSearch.trim() || !formData.date || !formData.time)) {
          setError('고객명, 날짜, 시간은 필수 항목입니다.');
          return;
      }
      if (eventType === 'personal' && (!formData.title.trim() || !formData.date || !formData.time)) {
          setError('일정 제목, 날짜, 시간은 필수 항목입니다.');
          return;
      }
      if (formData.endTime && formData.time > formData.endTime) {
        setError('종료 시간은 시작 시간보다 빠를 수 없습니다.');
        return;
      }
      setError(null);

      let appointmentData: any;
      if (eventType === 'customer') {
          const existingCustomer = formData.customerId ? customers.find(c => c.id === formData.customerId) : null;
          appointmentData = {
              ...formData,
              customerId: existingCustomer ? existingCustomer.id : `unregistered-${Date.now()}`,
              customerName: existingCustomer ? existingCustomer.name : customerSearch.trim(),
              title: '',
          };
      } else {
          appointmentData = {
              ...formData,
              customerId: undefined,
              customerName: undefined,
          };
      }
      
      appointmentData.isLunar = recurrenceType === 'yearly' && isLunar;
      
      const recurrenceSettings: RecurrenceSettings = {
          type: recurrenceType,
          interval: recurrenceInterval > 0 ? recurrenceInterval : 1,
          days: [...recurrenceDays].sort(),
          endDate: useEndDate && recurrenceEndDate ? recurrenceEndDate : undefined,
      };

      onAddAppointment(appointmentData, recurrenceSettings);
      onClose();
  };

  return (
    <BaseModal isOpen={true} onClose={onClose} className="max-w-3xl w-full">
        <div className="p-4 border-b border-[var(--border-color)] flex justify-between items-center flex-shrink-0">
            <h2 className="text-xl font-bold text-[var(--text-primary)]">텍스트로 일정 추가</h2>
            <button type="button" onClick={onClose} className="text-[var(--text-muted)] hover:text-[var(--text-primary)]">
                <XIcon className="h-6 w-6" />
            </button>
        </div>
        <div className="overflow-y-auto custom-scrollbar flex-1 min-h-0">
            <div className="p-6">
                <div className="flex justify-center p-1 bg-[var(--background-tertiary)] rounded-lg mb-6">
                    <button type="button" onClick={() => setActiveTab('ai')} className={`w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-colors ${activeTab === 'ai' ? 'bg-[var(--background-secondary)] text-[var(--text-accent)] shadow' : 'text-[var(--text-secondary)]'}`}>
                        <SparklesIcon className="h-5 w-5" /> 텍스트로 입력
                    </button>
                    <button type="button" onClick={() => setActiveTab('manual')} className={`w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-colors ${activeTab === 'manual' ? 'bg-[var(--background-secondary)] text-[var(--text-accent)] shadow' : 'text-[var(--text-secondary)]'}`}>
                        <PlusIcon className="h-5 w-5" /> 직접 입력
                    </button>
                </div>
                {error && <p className="text-sm text-center text-[var(--text-danger)] bg-red-500/10 p-2 rounded-md mb-4">{error}</p>}
                
                <form id="appointment-form" onSubmit={handleSubmit}>
                {activeTab === 'ai' ? (
                    <div className="space-y-4 animate-fade-in">
                        <p className="text-sm text-[var(--text-muted)]">일정 정보를 포함한 텍스트를 붙여넣으세요. 규칙 기반으로 분석하여 자동으로 필드를 채워줍니다.</p>
                        <div className="border border-[var(--border-color-strong)] rounded-md">
                            <button
                                type="button"
                                className="w-full flex justify-between items-center p-2 text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--background-tertiary)]"
                                onClick={() => setShowRules(!showRules)}
                                aria-expanded={showRules}
                                aria-controls="ai-rules-content"
                            >
                                <span>자동 인식 규칙 보기/숨기기</span>
                                {showRules ? <ChevronUpIcon className="h-5 w-5" /> : <ChevronDownIcon className="h-5 w-5" />}
                            </button>
                            {showRules && (
                            <div id="ai-rules-content" className="p-3 border-t border-[var(--border-color-strong)] bg-[var(--background-primary)] text-xs text-[var(--text-muted)] animate-fade-in">
                                <ul className="list-disc list-inside space-y-1">
                                    <li><strong>날짜</strong>: '오늘', '내일', '모레', '이번주/다음주 X요일', 'X월 X일', 'X일' 등 자연어 인식.</li>
                                    <li><strong>시간</strong>: '점심', '저녁', '오전/오후 X시', 'X시 반' 등 자연어 인식.</li>
                                    <li><strong>고객명</strong>: 기존 고객 DB에서 이름 매칭. 없다면 'OO님', 'OO고객' 형식으로 새 고객 이름 추출.</li>
                                    <li><strong>미팅 유형</strong>: 'PC', '클로징', 'AP', '초회상담' 등 키워드로 자동 분류. 고객 미팅이 아니면 '개인용무'로 설정.</li>
                                    <li><strong>장소</strong>: 'OO에서', 'OO앞에서' 등 패턴 인식.</li>
                                    <li><strong>반복</strong>: '매주', '매일', '매월' 키워드로 반복 설정.</li>
                                </ul>
                            </div>
                            )}
                        </div>
                        <div className="relative">
                            <textarea
                                value={aiText}
                                onChange={(e) => setAiText(e.target.value)}
                                rows={6}
                                className="w-full p-2 border rounded-md focus:ring-2 focus:ring-[var(--background-accent)] bg-[var(--background-tertiary)] border-[var(--border-color-strong)] text-[var(--text-primary)] disabled:opacity-60"
                                placeholder="예: 내일 3시 강남역 스타벅스에서 김민준 고객과 PC 미팅"
                                disabled={isLoading}
                            />
                        </div>
                    </div>
                ) : (
                    <div className="space-y-4 animate-fade-in">
                        <div className="flex justify-center p-1 bg-[var(--background-tertiary)] rounded-lg">
                            <button type="button" onClick={() => handleEventTypeChange('customer')} className={`w-full px-4 py-2 text-sm font-medium rounded-md transition-colors ${eventType === 'customer' ? 'bg-[var(--background-secondary)] text-[var(--text-accent)] shadow' : 'text-[var(--text-secondary)]'}`}>
                                고객 일정
                            </button>
                            <button type="button" onClick={() => handleEventTypeChange('personal')} className={`w-full px-4 py-2 text-sm font-medium rounded-md transition-colors ${eventType === 'personal' ? 'bg-[var(--background-secondary)] text-[var(--text-accent)] shadow' : 'text-[var(--text-secondary)]'}`}>
                                개인 일정
                            </button>
                        </div>

                        {eventType === 'customer' ? (
                            <div>
                                <label htmlFor="customerSearch" className="block text-sm font-medium text-[var(--text-secondary)]">고객</label>
                                <div className="relative">
                                <input type="text" id="customerSearch" value={customerSearch} onChange={handleCustomerSearchChange}
                                    onFocus={() => { if (customerSearch) setIsCustomerDropdownOpen(true); }}
                                    onBlur={() => setTimeout(() => setIsCustomerDropdownOpen(false), 200)}
                                    placeholder="고객 이름 입력 또는 검색" autoComplete="off"
                                    className="mt-1 block w-full bg-[var(--background-tertiary)] border border-[var(--border-color-strong)] rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-[var(--background-accent)] focus:border-[var(--background-accent)] sm:text-sm text-[var(--text-primary)]" />
                                {isCustomerDropdownOpen && customerSuggestions.length > 0 && (
                                    <ul className="absolute z-10 w-full bg-[var(--background-secondary)] border border-[var(--border-color-strong)] rounded-md shadow-lg max-h-40 overflow-y-auto mt-1">
                                        {customerSuggestions.map(c => ( <li key={c.id} onMouseDown={() => handleCustomerSelect(c)} className="p-2 hover:bg-[var(--background-accent-subtle)] cursor-pointer text-[var(--text-primary)]">{c.name} ({c.contact})</li> ))}
                                    </ul>
                                )}
                                </div>
                            </div>
                        ) : (
                            <div>
                                <label htmlFor="title" className="block text-sm font-medium text-[var(--text-secondary)]">일정 제목</label>
                                <input type="text" id="title" name="title" value={formData.title} onChange={handleChange} className="mt-1 block w-full border border-[var(--border-color-strong)] bg-[var(--background-tertiary)] text-[var(--text-primary)] rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-[var(--background-accent)] focus:border-[var(--background-accent)] sm:text-sm" />
                            </div>
                        )}
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                            <label htmlFor="date" className="block text-sm font-medium text-[var(--text-secondary)]">날짜</label>
                            <input
                                type="date"
                                id="date"
                                name="date"
                                value={formData.date}
                                onChange={handleChange}
                                className="mt-1 block w-full border border-[var(--border-color-strong)] bg-[var(--background-tertiary)] text-[var(--text-primary)] rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-[var(--background-accent)] focus:border-[var(--background-accent)] sm:text-sm"
                            />
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <label htmlFor="time" className="block text-sm font-medium text-[var(--text-secondary)]">시작 시간</label>
                                    <select id="time" name="time" value={formData.time} onChange={handleChange} className="mt-1 block w-full pl-2 pr-8 py-2 text-sm border-[var(--border-color-strong)] bg-[var(--background-tertiary)] text-[var(--text-primary)] focus:outline-none focus:ring-[var(--background-accent)] focus:border-[var(--background-accent)] rounded-md">
                                        {timeOptions.map(t => <option key={t} value={t}>{t}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label htmlFor="endTime" className="block text-sm font-medium text-[var(--text-secondary)]">종료 시간</label>
                                    <select id="endTime" name="endTime" value={formData.endTime || ''} onChange={handleChange} className="mt-1 block w-full pl-2 pr-8 py-2 text-sm border-[var(--border-color-strong)] bg-[var(--background-tertiary)] text-[var(--text-primary)] focus:outline-none focus:ring-[var(--background-accent)] focus:border-[var(--background-accent)] rounded-md">
                                        <option value="">선택 안함</option>
                                        {timeOptions.map(t => <option key={t} value={t}>{t}</option>)}
                                    </select>
                                </div>
                            </div>
                        </div>

                        <div>
                            <label htmlFor="location" className="block text-sm font-medium text-[var(--text-secondary)]">장소</label>
                            <input type="text" id="location" name="location" value={formData.location} onChange={handleChange} className="mt-1 block w-full border border-[var(--border-color-strong)] bg-[var(--background-tertiary)] text-[var(--text-primary)] rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-[var(--background-accent)] focus:border-[var(--background-accent)] sm:text-sm" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-[var(--text-secondary)]">미팅 유형</label>
                            <div className="flex items-center gap-2 mt-1">
                                <select name="meetingType" value={formData.meetingType} onChange={handleChange} className="flex-grow block w-full border border-[var(--border-color-strong)] bg-[var(--background-tertiary)] text-[var(--text-primary)] rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-[var(--background-accent)] focus:border-[var(--background-accent)] sm:text-sm">
                                    {(eventType === 'customer' ? customerMeetingTypes : personalMeetingTypes).map(type => (<option key={type} value={type}>{type}</option>))}
                                </select>
                                <input type="text" value={eventType === 'customer' ? newCustomerType : newPersonalType} onChange={e => eventType === 'customer' ? setNewCustomerType(e.target.value) : setNewPersonalType(e.target.value)} placeholder="새 유형 추가" className="p-2 border border-[var(--border-color-strong)] bg-[var(--background-tertiary)] text-[var(--text-primary)] rounded-md text-sm w-32" />
                                <button type="button" onClick={eventType === 'customer' ? handleAddCustomerType : handleAddPersonalType} className="px-3 py-2 bg-[var(--background-tertiary)] text-[var(--text-secondary)] text-sm rounded-md hover:bg-[var(--background-tertiary)]/80">추가</button>
                            </div>
                        </div>

                        <div className="pt-4 mt-4 border-t border-[var(--border-color)]">
                            <h3 className="text-lg font-semibold mb-3 text-[var(--text-primary)]">반복 설정</h3>
                            <div className="flex items-center p-1 bg-[var(--background-tertiary)] rounded-lg mb-4 space-x-1">
                                {(['none', 'daily', 'weekly', 'monthly', 'yearly'] as const).map(type => (
                                    <button key={type} type="button" onClick={() => setRecurrenceType(type)} className={`flex-1 px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${recurrenceType === type ? 'bg-[var(--background-secondary)] text-[var(--text-accent)] shadow' : 'text-[var(--text-secondary)]'}`}>
                                        { {none: '없음', daily: '매일', weekly: '매주', monthly: '매월', yearly: '매년'}[type] }
                                    </button>
                                ))}
                            </div>
                            {recurrenceType !== 'none' && (
                                <div className="space-y-4 p-4 bg-[var(--background-secondary)] rounded-md border border-[var(--border-color)] animate-fade-in">
                                    <div className="flex items-center gap-2">
                                        <input type="number" value={recurrenceInterval} onChange={e => setRecurrenceInterval(Math.max(1, parseInt(e.target.value) || 1))} className="w-16 p-2 border border-[var(--border-color-strong)] bg-[var(--background-tertiary)] text-[var(--text-primary)] rounded-md" min="1"/>
                                        <span className='text-[var(--text-secondary)]'>{ { daily: '일', weekly: '주', monthly: '개월', yearly: '년' }[recurrenceType] }마다 반복</span>
                                        {recurrenceType === 'yearly' && (
                                            <div className="flex items-center ml-4">
                                                <input type="checkbox" id="isLunar" checked={isLunar} onChange={e => setIsLunar(e.target.checked)} className="h-4 w-4 rounded border-[var(--border-color-strong)] bg-[var(--background-tertiary)] text-[var(--background-accent)] focus:ring-[var(--background-accent)]" />
                                                <label htmlFor="isLunar" className="ml-2 text-sm text-[var(--text-secondary)]">음력</label>
                                            </div>
                                        )}
                                    </div>
                                    {convertedLunarDateText && <p className="text-sm text-[var(--text-accent)] font-medium">{convertedLunarDateText}</p>}
                                    {recurrenceType === 'weekly' && (
                                        <div>
                                            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">요일 선택</label>
                                            <div className="flex flex-wrap gap-2">
                                                {['일', '월', '화', '수', '목', '금', '토'].map((day, index) => (
                                                    <button key={day} type="button" onClick={() => toggleRecurrenceDay(index)} className={`w-10 h-10 rounded-full text-sm font-medium transition-colors border ${recurrenceDays.has(index) ? 'bg-[var(--background-accent)] text-[var(--text-on-accent)] border-transparent' : 'bg-[var(--background-tertiary)] text-[var(--text-secondary)] hover:bg-[var(--background-primary)] border-[var(--border-color-strong)]'}`}>
                                                        {day}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                    <div>
                                        <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">종료일</label>
                                        <div className="flex items-center gap-4">
                                            <div className="flex items-center">
                                                <input type="radio" id="no-end-date" name="endDateOption" checked={!useEndDate} onChange={() => setUseEndDate(false)} className="h-4 w-4 text-[var(--background-accent)] focus:ring-[var(--background-accent)] border-[var(--border-color-strong)] bg-[var(--background-tertiary)]"/>
                                                <label htmlFor="no-end-date" className="ml-2 text-sm text-[var(--text-secondary)]">없음</label>
                                            </div>
                                            <div className="flex items-center">
                                                <input type="radio" id="with-end-date" name="endDateOption" checked={useEndDate} onChange={() => setUseEndDate(true)} className="h-4 w-4 text-[var(--background-accent)] focus:ring-[var(--background-accent)] border-[var(--border-color-strong)] bg-[var(--background-tertiary)]"/>
                                                <label htmlFor="with-end-date" className="ml-2 text-sm text-[var(--text-secondary)]">날짜 지정</label>
                                            </div>
                                            <input type="date" disabled={!useEndDate} value={recurrenceEndDate} onChange={e => setRecurrenceEndDate(e.target.value)} className="p-2 border border-[var(--border-color-strong)] bg-[var(--background-tertiary)] text-[var(--text-primary)] rounded-md disabled:opacity-50"/>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                        <div>
                            <label htmlFor="notes" className="block text-sm font-medium text-[var(--text-secondary)]">메모</label>
                            <textarea id="notes" name="notes" value={formData.notes} onChange={handleChange} rows={3} className="mt-1 block w-full border border-[var(--border-color-strong)] bg-[var(--background-tertiary)] text-[var(--text-primary)] rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-[var(--background-accent)] focus:border-[var(--background-accent)] sm:text-sm"></textarea>
                        </div>
                    </div>
                )}
                </form>
            </div>
        </div>
        <div className="p-4 bg-[var(--background-tertiary)] border-t border-[var(--border-color)] flex justify-end items-center space-x-4 flex-shrink-0">
          <button type="button" onClick={onClose} className="px-4 py-2 bg-[var(--background-secondary)] border border-[var(--border-color-strong)] rounded-md text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--background-primary)]">취소</button>
          <button type="submit" form="appointment-form" className="px-6 py-2 bg-[var(--background-accent)] text-[var(--text-on-accent)] rounded-md text-sm font-medium hover:bg-[var(--background-accent-hover)]">
                {activeTab === 'ai' ? (isLoading ? '분석 중...' : '텍스트 분석') : (seedData ? '추가' : '추가')}
            </button>
          </div>
    </BaseModal>
  );
};
