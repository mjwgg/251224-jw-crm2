
import React, { useState, useEffect } from 'react';
import type { Appointment, Customer, PerformanceRecord, RejectionReason, RecontactProbability, CustomerType } from '../types';
import BaseModal from './ui/BaseModal';
import { XIcon, CheckIcon, CalendarPlusIcon, DocumentTextIcon, PlusIcon, ChevronUpIcon, ChevronDownIcon } from './icons';
import Spinner from './ui/Spinner';

interface PcCompletionWizardModalProps {
  isOpen: boolean;
  onClose: () => void;
  appointment: Appointment | null;
  customer: Customer | null;
  onSave: (result: 'success' | 'rejection' | 'followUp', data: any, originalAppointment: Appointment) => Promise<void>;
  customers: Customer[];
}

const coverageCategories: PerformanceRecord['coverageCategory'][] = ['종합건강', '치매재가간병', '태아어린이', '운전자상해', '종신정기', '단기납', '연금', '경영인정기', '달러', '기타'];

const pcConsultationTemplate = `II. 제안 내용 및 목적
* 주요 제안 상품/솔루션: 
* 핵심 제안 사유 (고객 니즈 연결): 

III. 고객 반응 및 질의응답 (Q&A)
* [긍정적 반응 👍]: 
* [주요 질문 및 거절/우려 사항 💬]: 
* [전반적인 태도 및 분위기]: 

IV. 핵심 결과 및 다음 단계 (Action Plan)
* 상담 결과 요약: [결과 입력]
* 고객이 하기로 한 일 (To-Do for Customer): 
* 내가 하기로 한 일 (To-Do for Me): 

VI. 종합 의견 및 특이사항
* 상담에 대한 종합적인 느낌 및 평가 (Feeling): 
* 기타 특이사항: 
`;

const followUpOptions = [
    { value: '3m', label: '3개월 후' },
    { value: '6m', label: '6개월 후' },
    { value: '1y', label: '1년 후' },
    { value: 'none', label: '설정 안함' },
    { value: 'custom', label: '직접 선택' },
];

const PcCompletionWizardModal: React.FC<PcCompletionWizardModalProps> = ({ isOpen, onClose, appointment, customer, onSave, customers }) => {
    const [step, setStep] = useState(1);
    const [result, setResult] = useState<'success' | 'rejection' | 'followUp' | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    
    // Form states
    const [consultationNotes, setConsultationNotes] = useState('');
    const [performanceData, setPerformanceData] = useState<Omit<PerformanceRecord, 'id'>>({
        contractorName: '', dob: '', applicationDate: '', premium: 0, insuranceCompany: '', productName: '', recognizedPerformance: 0, coverageCategory: '기타',
    });
    const [rejectionData, setRejectionData] = useState<{ reason: RejectionReason, probability: RecontactProbability, notes: string, nextFollowUpDate?: string }>({
        reason: '기타', probability: '하', notes: '',
    });
    const [followUpData, setFollowUpData] = useState<Omit<Appointment, 'id' | 'status'>>({
        customerId: '', customerName: '', date: '', time: '10:00', meetingType: 'PC', notes: '',
    });

    const [successTab, setSuccessTab] = useState<'ai' | 'manual'>('ai');
    const [aiText, setAiText] = useState('');
    const [showRules, setShowRules] = useState(false);

    const [followUpOption, setFollowUpOption] = useState<string>('custom');

    useEffect(() => {
        if (isOpen && appointment && customer) {
            // Reset state on open
            setStep(1);
            setResult(null);
            setSuccessTab('ai');
            setAiText('');
            setShowRules(false);
            setConsultationNotes('');
            setFollowUpOption('custom');
            
            // Pre-fill success data
            const today = new Date();
            const todayStr = new Date(today.getTime() - (today.getTimezoneOffset() * 60000)).toISOString().split('T')[0];
            setPerformanceData({
                contractorName: customer.name,
                dob: customer.birthday,
                applicationDate: todayStr,
                premium: 0, insuranceCompany: '', productName: '', recognizedPerformance: 0,
                coverageCategory: '기타',
            });

            // Pre-fill rejection data
            setRejectionData({ reason: '기타', probability: '하', notes: '' });
            
            // Pre-fill follow-up data
            const followUpDate = new Date(appointment.date);
            followUpDate.setDate(followUpDate.getDate() + 7);
            setFollowUpData({
                customerId: customer.id,
                customerName: customer.name,
                date: new Date(followUpDate.getTime() - (followUpDate.getTimezoneOffset() * 60000)).toISOString().split('T')[0],
                time: '10:00',
                meetingType: 'PC',
                notes: `[후속 상담] 원본: ${appointment.date} ${appointment.notes}`,
            });

        }
    }, [isOpen, appointment, customer]);
    
    if (!isOpen || !appointment || !customer) return null;

    const calculateFollowUpDate = (option: string) => {
        const today = new Date();
        const targetDate = new Date(today);

        switch (option) {
            case '3m':
                targetDate.setMonth(today.getMonth() + 3);
                break;
            case '6m':
                targetDate.setMonth(today.getMonth() + 6);
                break;
            case '1y':
                targetDate.setFullYear(today.getFullYear() + 1);
                break;
            default:
                return undefined;
        }

        return new Date(targetDate.getTime() - (targetDate.getTimezoneOffset() * 60000)).toISOString().split('T')[0];
    };

    const handleFollowUpOptionChange = (option: string) => {
        setFollowUpOption(option);
        if (option === 'custom') {
            // Do nothing, let user select date manually.
        } else if (option === 'none') {
             setRejectionData(prev => ({ ...prev, nextFollowUpDate: undefined }));
        } else {
            const newDate = calculateFollowUpDate(option);
            setRejectionData(prev => ({ ...prev, nextFollowUpDate: newDate }));
        }
    };

    const handleResultSelect = (selectedResult: 'success' | 'rejection' | 'followUp') => {
        setResult(selectedResult);
        setStep(2);
        if (selectedResult === 'success') {
            setSuccessTab('ai');
            setConsultationNotes(pcConsultationTemplate.replace('[결과 입력]', '계약 체결'));
        } else if (selectedResult === 'rejection') {
            setConsultationNotes(pcConsultationTemplate.replace('[결과 입력]', '거절'));
        } else {
            setConsultationNotes(pcConsultationTemplate.replace('[결과 입력]', '후속 조치 필요'));
        }
    };

    const handleAiAnalyze = () => {
        if (!aiText.trim()) return;
        setIsLoading(true);
        
        // 규칙 기반 분석 (Rule-based Parsing)
        setTimeout(() => {
            try {
                const parsedData: any = {
                    contractorName: customer.name,
                    dob: customer.birthday,
                    applicationDate: new Date().toISOString().split('T')[0], // Default Today
                    premium: 0,
                    recognizedPerformance: 0,
                    insuranceCompany: '',
                    productName: '',
                    coverageCategory: '기타'
                };

                const text = aiText;

                // 1. 계약일 ('어제' 확인, 없으면 오늘)
                if (text.includes('어제')) {
                    const yesterday = new Date();
                    yesterday.setDate(yesterday.getDate() - 1);
                    parsedData.applicationDate = yesterday.toISOString().split('T')[0];
                }

                // 2. 보험료 및 실적 (숫자 + 원/만원)
                const numberPattern = /(\d+(?:,\d+)*)\s*(만?원)/g;
                let m;
                // 기존 값 초기화 (재분석 시)
                parsedData.premium = 0;
                parsedData.recognizedPerformance = 0;

                while ((m = numberPattern.exec(text)) !== null) {
                    const rawNum = m[1].replace(/,/g, '');
                    const unit = m[2];
                    let value = parseInt(rawNum, 10);
                    if (unit === '만원') value *= 10000;
                    
                    const index = m.index;
                    // 숫자 앞의 텍스트 확인 (실적/인정 키워드)
                    const precedingText = text.substring(Math.max(0, index - 10), index);
                    
                    if (precedingText.includes('실적') || precedingText.includes('인정')) {
                        parsedData.recognizedPerformance = value;
                    } else {
                         // 키워드가 없으면 보험료로 간주 (첫 번째 발견된 값 우선)
                         if (parsedData.premium === 0) parsedData.premium = value;
                    }
                }

                // 3. 보험사 (키워드 매칭)
                const companyKeywords = ['생명', '손보', '라이프', '화재', '해상'];
                const words = text.split(/\s+/);
                for (const word of words) {
                    if (companyKeywords.some(k => word.includes(k))) {
                        // 특수문자 제거 후 저장
                        parsedData.insuranceCompany = word.replace(/[^가-힣a-zA-Z0-9]/g, ''); 
                        break; // 첫 번째 매칭된 것 사용
                    }
                }

                // 4. 상품분류 (키워드 매칭)
                const categories = ['종합건강', '치매재가간병', '운전자상해', '종신정기', '단기납', '연금', '경영인정기', '달러', '기타'];
                for (const cat of categories) {
                    if (text.includes(cat)) {
                        parsedData.coverageCategory = cat;
                        break;
                    }
                }

                // 5. 상품명 (# 또는 @ 로 시작하는 단어 우선)
                const productMatch = text.match(/[@#]([^\s,]+)/);
                if (productMatch) {
                    parsedData.productName = productMatch[1];
                } else {
                    // 6. 상품명 (남은 한글 텍스트)
                    // 다른 정보로 인식되지 않은 단어들을 조합하여 상품명으로 추정
                    const remainingWords = words.filter(word => {
                        // 금액 제외
                        if (word.match(/(\d+(?:,\d+)*)\s*(만?원)/) || word.includes('실적') || word.includes('인정')) return false;
                        // 날짜 키워드 제외
                        if (word === '어제' || word === '오늘') return false;
                        // 보험사 제외
                        if (companyKeywords.some(k => word.includes(k))) return false;
                        // 카테고리 제외
                        if (categories.some(cat => word.includes(cat))) return false;
                        // 특수문자만 있는 경우 제외
                        if (/^[^가-힣a-zA-Z0-9]+$/.test(word)) return false;
                        
                        return true;
                    });
                    
                    if (remainingWords.length > 0) {
                        parsedData.productName = remainingWords.join(' ');
                    }
                }

                setPerformanceData(prev => ({
                    ...prev,
                    ...parsedData
                }));
                setSuccessTab('manual');
            } catch (e) {
                console.error("Rule-based analysis failed", e);
            } finally {
                setIsLoading(false);
            }
        }, 300);
    };

    const handleSaveAll = async () => {
        if (!result) return;
        setIsLoading(true);
        let dataToSave: any;
        if (result === 'success') {
            dataToSave = { performanceData, consultationNotes };
        } else if (result === 'rejection') {
            dataToSave = { rejectionData, consultationNotes };
        } else if (result === 'followUp') {
            dataToSave = { followUpData, consultationNotes };
        }
        
        try {
            await onSave(result, dataToSave, appointment);
        } catch (e) {
            console.error("Failed to save PC completion result", e);
            // Optionally show an error message to the user
        } finally {
            setIsLoading(false);
        }
    };
    
    const stepper = (
        <div className="flex items-center justify-center mb-4">
            {['결과 선택', '상세 입력', '완료'].map((label, index) => (
                <React.Fragment key={label}>
                {index > 0 && <div className={`h-0.5 w-12 transition-colors duration-500 ${step > index ? 'bg-[var(--background-accent)]' : 'bg-[var(--border-color-strong)]'}`} />}
                <div className="flex flex-col items-center text-center w-16">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs transition-all duration-300 ${step > index + 1 ? 'bg-[var(--background-accent)] text-white' : step === index + 1 ? 'border-2 border-[var(--background-accent)] text-[var(--background-accent)]' : 'bg-[var(--background-tertiary)] text-[var(--text-muted)]'}`}>
                    {step > index + 1 ? <CheckIcon className="w-4 h-4"/> : index + 1}
                    </div>
                    <p className={`mt-1 text-[10px] font-medium transition-colors duration-300 ${step >= index + 1 ? 'text-[var(--text-primary)]' : 'text-[var(--text-muted)]'}`}>{label}</p>
                </div>
                </React.Fragment>
            ))}
        </div>
    );

    const renderStep1 = () => (
        <div className="space-y-4">
            <p className="text-[var(--text-secondary)] text-center text-sm font-medium mb-2">미팅 결과를 선택해주세요.</p>
            <div className="grid grid-cols-2 gap-3">
                {/* Success Button */}
                <button
                    onClick={() => handleResultSelect('success')}
                    className="group flex flex-col items-center justify-center p-3 rounded-xl border border-[var(--border-color)] hover:border-green-500 bg-[var(--background-tertiary)] hover:bg-green-50 dark:hover:bg-green-900/20 transition-all duration-200 shadow-sm"
                >
                    <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/50 flex items-center justify-center text-lg mb-2 group-hover:scale-110 transition-transform">✅</div>
                    <span className="text-sm font-bold text-[var(--text-primary)] group-hover:text-green-600 dark:group-hover:text-green-400">계약 체결</span>
                    <span className="text-[10px] text-[var(--text-muted)] mt-0.5">실적 등록 및 고객 전환</span>
                </button>

                {/* Rejection Button */}
                <button
                    onClick={() => handleResultSelect('rejection')}
                    className="group flex flex-col items-center justify-center p-3 rounded-xl border border-[var(--border-color)] hover:border-red-500 bg-[var(--background-tertiary)] hover:bg-red-50 dark:hover:bg-red-900/20 transition-all duration-200 shadow-sm"
                >
                    <div className="w-8 h-8 rounded-full bg-red-100 dark:bg-red-900/50 flex items-center justify-center text-lg mb-2 group-hover:scale-110 transition-transform">❌</div>
                    <span className="text-sm font-bold text-[var(--text-primary)] group-hover:text-red-600 dark:group-hover:text-red-400">거절 / 실패</span>
                    <span className="text-[10px] text-[var(--text-muted)] mt-0.5">사유 및 재접촉 기록</span>
                </button>

                {/* Follow Up Button */}
                <button
                    onClick={() => handleResultSelect('followUp')}
                    className="group flex flex-col items-center justify-center p-3 rounded-xl border border-[var(--border-color)] hover:border-blue-500 bg-[var(--background-tertiary)] hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all duration-200 shadow-sm col-span-2"
                >
                    <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center text-lg mb-2 group-hover:scale-110 transition-transform">🔄</div>
                    <span className="text-sm font-bold text-[var(--text-primary)] group-hover:text-blue-600 dark:group-hover:text-blue-400">보류 / 후속</span>
                    <span className="text-[10px] text-[var(--text-muted)] mt-0.5">추후 다시 연락</span>
                </button>
            </div>
        </div>
    );

    const commonNotesSection = (
      <div className="md:col-span-2">
        <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">상담 내용 기록</label>
        <textarea
          value={consultationNotes}
          onChange={(e) => setConsultationNotes(e.target.value)}
          rows={10}
          className="block w-full bg-[var(--background-secondary)] border border-[var(--border-color-strong)] rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-[var(--background-accent)] focus:border-[var(--background-accent)] font-mono text-sm leading-relaxed"
        />
      </div>
    );

    const renderStep2 = () => {
        switch (result) {
            case 'success': return (
                <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-green-500">실적 정보 입력</h3>
                     <div className="flex justify-center p-1 bg-[var(--background-tertiary)] rounded-lg">
                        <button type="button" onClick={() => setSuccessTab('ai')} className={`w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-colors ${successTab === 'ai' ? 'bg-[var(--background-secondary)] text-[var(--text-accent)] shadow' : 'text-[var(--text-secondary)]'}`}>
                            <DocumentTextIcon className="h-5 w-5" /> 텍스트로 분석
                        </button>
                        <button type="button" onClick={() => setSuccessTab('manual')} className={`w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-colors ${successTab === 'manual' ? 'bg-[var(--background-secondary)] text-[var(--text-accent)] shadow' : 'text-[var(--text-secondary)]'}`}>
                            <PlusIcon className="h-5 w-5" /> 직접 입력
                        </button>
                    </div>
                    {successTab === 'manual' ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-[var(--text-secondary)]">보험사</label>
                                <input type="text" value={performanceData.insuranceCompany} onChange={e => setPerformanceData({...performanceData, insuranceCompany: e.target.value})} className="mt-1 w-full p-2 border rounded-md bg-[var(--background-tertiary)] border-[var(--border-color-strong)]"/>
                            </div>
                             <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-[var(--text-secondary)]">계약일</label>
                                <input type="date" value={performanceData.applicationDate} onChange={e => setPerformanceData({...performanceData, applicationDate: e.target.value})} className="mt-1 w-full p-2 border rounded-md bg-[var(--background-tertiary)] border-[var(--border-color-strong)]"/>
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-[var(--text-secondary)]">보장 구분</label>
                                <div className="mt-2 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-x-4 gap-y-2">
                                    {coverageCategories.map(category => (
                                    <div key={category} className="flex items-center">
                                        <input
                                        id={`pc-wiz-category-${category}`}
                                        name="coverageCategory"
                                        type="radio"
                                        value={category}
                                        checked={performanceData.coverageCategory === category}
                                        onChange={e => setPerformanceData({...performanceData, coverageCategory: e.target.value as any})}
                                        className="h-4 w-4 text-[var(--background-accent)] focus:ring-[var(--background-accent)] border-[var(--border-color-strong)]"
                                        />
                                        <label htmlFor={`pc-wiz-category-${category}`} className="ml-2 block text-sm text-[var(--text-secondary)]">
                                        {category}
                                        </label>
                                    </div>
                                    ))}
                                </div>
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-[var(--text-secondary)]">상품명</label>
                                <input type="text" value={performanceData.productName} onChange={e => setPerformanceData({...performanceData, productName: e.target.value})} className="mt-1 w-full p-2 border rounded-md bg-[var(--background-tertiary)] border-[var(--border-color-strong)]"/>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-[var(--text-secondary)]">월 보험료</label>
                                <input type="number" value={performanceData.premium} onChange={e => setPerformanceData({...performanceData, premium: Number(e.target.value)})} className="mt-1 w-full p-2 border rounded-md bg-[var(--background-tertiary)] border-[var(--border-color-strong)]"/>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-[var(--text-secondary)]">인정 실적</label>
                                <input type="number" value={performanceData.recognizedPerformance} onChange={e => setPerformanceData({...performanceData, recognizedPerformance: Number(e.target.value)})} className="mt-1 w-full p-2 border rounded-md bg-[var(--background-tertiary)] border-[var(--border-color-strong)]"/>
                            </div>
                            {commonNotesSection}
                        </div>
                    ) : (
                        <div className="space-y-4">
                             <div className="border border-[var(--border-color-strong)] rounded-md">
                                <button
                                    type="button"
                                    className="w-full flex justify-between items-center p-2 text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--background-tertiary)]"
                                    onClick={() => setShowRules(!showRules)}
                                    aria-expanded={showRules}
                                    aria-controls="ai-record-rules-content-wizard"
                                >
                                    <span>텍스트로 등록: 자동 인식 규칙 보기/숨기기</span>
                                    {showRules ? <ChevronUpIcon className="h-5 w-5" /> : <ChevronDownIcon className="h-5 w-5" />}
                                </button>
                                {showRules && (
                                <div id="ai-record-rules-content-wizard" className="p-3 border-t border-[var(--border-color-strong)] bg-[var(--background-primary)] text-xs text-[var(--text-muted)] animate-fade-in">
                                    <ul className="list-disc list-inside space-y-1">
                                        <li><strong>계약자명/생년월일</strong>: 현재 고객 정보 자동 연동</li>
                                        <li><strong>계약일</strong>: '오늘' 또는 '어제'. 언급 없으면 오늘 날짜로 자동 설정.</li>
                                        <li><strong>보험료/실적</strong>: 숫자와 '원' 또는 '만원' 조합 (예: 10만원, 실적 120만원). '실적' 또는 '인정' 키워드를 함께 사용하면 인정실적으로 인식합니다.</li>
                                        <li><strong>보험사</strong>: '생명', '손보', '라이프', '화재', '해상' 키워드가 포함된 텍스트</li>
                                        <li><strong>상품분류</strong>: '종합건강', '치매재가간병', '운전자상해' 등</li>
                                        <li><strong>상품명</strong>: '@상품명', '#상품명' 형식으로 입력하면 가장 정확하며, 그렇지 않을 경우 남은 텍스트를 상품명으로 추정합니다.</li>
                                    </ul>
                                </div>
                                )}
                            </div>
                            <textarea
                                value={aiText}
                                onChange={(e) => setAiText(e.target.value)}
                                rows={5}
                                className="w-full p-2 border rounded-md bg-[var(--background-tertiary)] border-[var(--border-color-strong)]"
                                placeholder="예: 삼성생명 @종합건강보험 10만원, 실적 120만원"
                            />
                        </div>
                    )}
                </div>
            );
            case 'rejection': return (
                <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-red-500">거절 사유 기록</h3>
                     <div>
                        <label className="block text-sm font-medium text-[var(--text-secondary)]">거절 사유</label>
                        <select value={rejectionData.reason} onChange={(e) => setRejectionData({...rejectionData, reason: e.target.value as RejectionReason})} className="mt-1 block w-full bg-[var(--background-secondary)] border border-[var(--border-color-strong)] rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-[var(--background-accent)] focus:border-[var(--background-accent)]">
                            {['가격', '상품', '시기', '다른설계사', '가족', '기타'].map(r => <option key={r} value={r}>{r}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-[var(--text-secondary)]">재접촉 가능성</label>
                        <select value={rejectionData.probability} onChange={(e) => setRejectionData({...rejectionData, probability: e.target.value as RecontactProbability})} className="mt-1 block w-full bg-[var(--background-secondary)] border border-[var(--border-color-strong)] rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-[var(--background-accent)] focus:border-[var(--background-accent)]">
                            {['상', '중', '하'].map(p => <option key={p} value={p}>{p}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-[var(--text-secondary)]">다음 재접촉 시점</label>
                        <div className="flex flex-wrap gap-2 mt-1">
                            {followUpOptions.map((option) => (
                                <button
                                    key={option.value}
                                    onClick={() => handleFollowUpOptionChange(option.value)}
                                    className={`px-3 py-1.5 text-xs rounded-full border transition-colors ${
                                        followUpOption === option.value
                                            ? 'bg-[var(--background-accent)] text-[var(--text-on-accent)] border-transparent'
                                            : 'bg-[var(--background-tertiary)] text-[var(--text-secondary)] border-[var(--border-color-strong)] hover:bg-[var(--background-secondary)]'
                                    }`}
                                >
                                    {option.label}
                                </button>
                            ))}
                        </div>
                        {followUpOption === 'custom' && (
                            <input 
                                type="date" 
                                value={rejectionData.nextFollowUpDate || ''} 
                                onChange={e => setRejectionData(prev => ({ ...prev, nextFollowUpDate: e.target.value }))} 
                                className="mt-2 w-full p-1.5 text-sm border rounded-md bg-[var(--background-tertiary)] border-[var(--border-color-strong)]"
                            />
                        )}
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-[var(--text-secondary)]">상세 내용 (거절 관련)</label>
                        <textarea value={rejectionData.notes} onChange={(e) => setRejectionData({...rejectionData, notes: e.target.value})} rows={3} className="mt-1 block w-full bg-[var(--background-secondary)] border border-[var(--border-color-strong)] rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-[var(--background-accent)] focus:border-[var(--background-accent)]" />
                    </div>
                    {commonNotesSection}
                </div>
            );
            case 'followUp': return (
                <div className="space-y-4">
                     <h3 className="text-lg font-semibold text-blue-500">후속 일정 등록</h3>
                     <div className="grid grid-cols-2 gap-4">
                        <div>
                             <label className="block text-sm font-medium text-[var(--text-secondary)]">날짜</label>
                             <input type="date" value={followUpData.date} onChange={e => setFollowUpData({...followUpData, date: e.target.value})} className="mt-1 w-full p-2 border rounded-md bg-[var(--background-tertiary)] border-[var(--border-color-strong)]"/>
                        </div>
                        <div>
                             <label className="block text-sm font-medium text-[var(--text-secondary)]">시간</label>
                             <input type="time" value={followUpData.time} onChange={e => setFollowUpData({...followUpData, time: e.target.value})} className="mt-1 w-full p-2 border rounded-md bg-[var(--background-tertiary)] border-[var(--border-color-strong)]"/>
                        </div>
                     </div>
                      <div>
                        <label className="block text-sm font-medium text-[var(--text-secondary)]">메모 (후속 일정 관련)</label>
                        <textarea value={followUpData.notes} onChange={(e) => setFollowUpData({...followUpData, notes: e.target.value})} rows={3} className="mt-1 block w-full bg-[var(--background-secondary)] border border-[var(--border-color-strong)] rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-[var(--background-accent)] focus:border-[var(--background-accent)]" />
                    </div>
                    {commonNotesSection}
                </div>
            );
            default: return null;
        }
    };
    
    const renderStep3 = () => {
        let summaryText = '';
        if (result === 'success') {
            summaryText = "실적 1건이 기록되고, 고객의 보유 계약 목록에 정보가 추가됩니다.";
        } else if (result === 'rejection') {
            summaryText = "고객이 '거절 고객'으로 분류되고, 재접촉 정보가 기록됩니다.";
        } else if (result === 'followUp') {
            summaryText = "새로운 후속 상담 일정이 등록됩니다.";
        }
        return (
            <div className="text-center space-y-4">
                <h3 className="text-lg font-semibold text-[var(--text-primary)]">최종 확인</h3>
                <p className="p-4 bg-[var(--background-tertiary)] rounded-md text-[var(--text-secondary)]">{summaryText} 또한, 입력된 상담 내용은 고객 히스토리에 저장되고 원본 PC 미팅은 '완료' 상태로 자동 변경됩니다.</p>
            </div>
        );
    };

    const handleNextClick = () => {
        if (step === 2 && result === 'success' && successTab === 'ai') {
            handleAiAnalyze();
        } else {
            setStep(step + 1);
        }
    };

    const isAiAnalysisStep = step === 2 && result === 'success' && successTab === 'ai';

    return (
        <BaseModal isOpen={isOpen} onClose={onClose} className="max-w-lg w-full">
            <div className="p-4 border-b border-[var(--border-color)] flex justify-between items-center">
                <h2 className="text-xl md:text-2xl font-bold text-[var(--text-primary)]">{customer.name}님 PC 미팅 결과</h2>
                <button onClick={onClose} className="text-[var(--text-muted)] hover:text-[var(--text-primary)]"><XIcon className="h-6 w-6" /></button>
            </div>
            <div className="p-5 flex-1 min-h-0 overflow-y-auto custom-scrollbar">
                {stepper}
                {step === 1 && renderStep1()}
                {step === 2 && renderStep2()}
                {step === 3 && renderStep3()}
            </div>
             <div className="p-4 bg-[var(--background-tertiary)] border-t border-[var(--border-color)] flex justify-between">
                <button onClick={() => setStep(step - 1)} disabled={step === 1} className="px-4 py-2 bg-[var(--background-secondary)] border border-[var(--border-color-strong)] rounded-md text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--background-primary)] disabled:opacity-50">이전</button>
                {step < 3 ? (
                    <button
                        onClick={handleNextClick}
                        disabled={!result || (isAiAnalysisStep && (!aiText.trim() || isLoading))}
                        className="px-6 py-2 bg-[var(--background-accent)] text-[var(--text-on-accent)] rounded-md text-sm font-medium hover:bg-[var(--background-accent-hover)] disabled:opacity-50 flex items-center justify-center min-w-[120px]"
                    >
                        {isAiAnalysisStep ? 
                            (isLoading ? <Spinner small /> : <><DocumentTextIcon className="h-5 w-5 mr-2" />텍스트로 분석</>)
                            : '다음'
                        }
                    </button>
                ) : (
                     <button onClick={handleSaveAll} disabled={isLoading} className="px-6 py-2 bg-green-600 text-white rounded-md text-sm font-medium hover:bg-green-700 disabled:opacity-50">{isLoading ? '저장 중...' : '저장 및 완료'}</button>
                )}
            </div>
        </BaseModal>
    );
};

export default PcCompletionWizardModal;
