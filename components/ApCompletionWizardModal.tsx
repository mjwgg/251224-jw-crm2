
import React, { useState, useEffect } from 'react';
import type { Appointment, Customer, RejectionReason, RecontactProbability, MeetingType } from '../types';
import BaseModal from './ui/BaseModal';
import { XIcon, CheckIcon } from './icons';

interface ApCompletionWizardModalProps {
  isOpen: boolean;
  onClose: () => void;
  appointment: Appointment | null;
  customer: Customer | null;
  onSave: (result: 'positive' | 'rejection' | 'followUp' | 'simple', data: any, originalAppointment: Appointment) => Promise<void>;
}

const apConsultationTemplate = `1. Rapport 형성 (Ice-breaking & 칭찬 포인트)
- 

2. Fact Finding (고객 정보 파악)
- 가족 관계 및 재정 상황: 
- 현재 보유 계약 및 보장 현황: 
- 고객의 주요 관심사 및 목표: 
- 건강 상태 및 기타 특이사항: 

3. 고객 반응 및 성향 분석 (Customer Reaction & Disposition Analysis)
- 상담 중 긍정적/부정적 반응 및 그 이유: 
- 고객의 이해도 및 호응 수준: 
- 파악된 고객 성향: 

4. 주요 상담 결과 및 합의점 (Key Outcomes & Agreements)
- 제시한 솔루션/상품: 
- 고객이 긍정적으로 검토하기로 한 부분: 
- 합의된 보험 종류 및 예상 규모: 
- 안내된 내용 vs. 미안내된 내용: 

5. 종합 의견 및 다음 미팅 전략 (Overall Opinion & Next Meeting Strategy)
- 상담에 대한 종합적인 느낌 및 평가 (Feeling): 
- 다음 미팅 시 접근 전략 및 준비사항: 
- 기타 특이사항: 
`;

const followUpOptions = [
    { value: '3m', label: '3개월 후' },
    { value: '6m', label: '6개월 후' },
    { value: '1y', label: '1년 후' },
    { value: 'none', label: '설정 안함' },
    { value: 'custom', label: '직접 선택' },
];

const ApCompletionWizardModal: React.FC<ApCompletionWizardModalProps> = ({ isOpen, onClose, appointment, customer, onSave }) => {
    const [step, setStep] = useState(1);
    const [result, setResult] = useState<'positive' | 'rejection' | 'followUp' | 'simple' | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    
    // Form states
    const [consultationNotes, setConsultationNotes] = useState('');
    const [pcAppointmentData, setPcAppointmentData] = useState<Omit<Appointment, 'id' | 'status'>>({
        customerId: '', customerName: '', date: '', time: '10:00', meetingType: 'PC', notes: '',
    });
    const [rejectionData, setRejectionData] = useState<{ reason: RejectionReason, probability: RecontactProbability, notes: string, nextFollowUpDate?: string }>({
        reason: '기타', probability: '하', notes: '',
    });
    const [followUpData, setFollowUpData] = useState<Omit<Appointment, 'id' | 'status'>>({
        customerId: '', customerName: '', date: '', time: '10:00', meetingType: 'Follow Up', notes: '',
    });

    const [followUpOption, setFollowUpOption] = useState<string>('custom');

    useEffect(() => {
        if (isOpen && appointment && customer) {
            // Reset state
            setStep(1);
            setResult(null);
            setFollowUpOption('custom');
            
            const followUpDate = new Date(appointment.date);
            followUpDate.setDate(followUpDate.getDate() + 7);
            const followUpDateStr = new Date(followUpDate.getTime() - (followUpDate.getTimezoneOffset() * 60000)).toISOString().split('T')[0];

            setConsultationNotes(apConsultationTemplate);
            setPcAppointmentData({
                customerId: customer.id, customerName: customer.name, date: followUpDateStr, time: '10:00', meetingType: 'PC', notes: `[PC 후속] 원본: ${appointment.date} ${appointment.notes || ''}`
            });
            setRejectionData({ reason: '기타', probability: '하', notes: '' });
            setFollowUpData({
                customerId: customer.id, customerName: customer.name, date: followUpDateStr, time: '10:00', meetingType: 'Follow Up', notes: `[후속] 원본: ${appointment.date} ${appointment.notes || ''}`
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
            // Optionally, we could clear the date or keep the last calculated one.
            // Here we keep it as is or default to today if empty? 
            // Let's leave it as is to avoid overwriting user input if they switch back and forth.
        } else if (option === 'none') {
             setRejectionData(prev => ({ ...prev, nextFollowUpDate: undefined }));
        } else {
            const newDate = calculateFollowUpDate(option);
            setRejectionData(prev => ({ ...prev, nextFollowUpDate: newDate }));
        }
    };

    const handleResultSelect = (selectedResult: 'positive' | 'rejection' | 'followUp' | 'simple') => {
        setResult(selectedResult);
        setStep(2);
    };

    const handleSaveAll = async () => {
        if (!result) return;
        setIsLoading(true);
        let dataToSave: any = { consultationNotes };
        if (result === 'positive') dataToSave.pcAppointmentData = pcAppointmentData;
        else if (result === 'rejection') dataToSave.rejectionData = rejectionData;
        else if (result === 'followUp') dataToSave.followUpData = followUpData;
        
        try {
            await onSave(result, dataToSave, appointment);
        } catch (e) {
            console.error("Failed to save AP completion result", e);
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
                <button
                    onClick={() => handleResultSelect('positive')}
                    className="group flex flex-col items-center justify-center p-3 rounded-xl border border-[var(--border-color)] hover:border-green-500 bg-[var(--background-tertiary)] hover:bg-green-50 dark:hover:bg-green-900/20 transition-all duration-200 shadow-sm"
                >
                    <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/50 flex items-center justify-center text-lg mb-2 group-hover:scale-110 transition-transform">✅</div>
                    <span className="text-sm font-bold text-[var(--text-primary)] group-hover:text-green-600 dark:group-hover:text-green-400">긍정적 / PC</span>
                    <span className="text-[10px] text-[var(--text-muted)] mt-0.5">제안 단계로 이동</span>
                </button>

                <button
                    onClick={() => handleResultSelect('rejection')}
                    className="group flex flex-col items-center justify-center p-3 rounded-xl border border-[var(--border-color)] hover:border-red-500 bg-[var(--background-tertiary)] hover:bg-red-50 dark:hover:bg-red-900/20 transition-all duration-200 shadow-sm"
                >
                    <div className="w-8 h-8 rounded-full bg-red-100 dark:bg-red-900/50 flex items-center justify-center text-lg mb-2 group-hover:scale-110 transition-transform">❌</div>
                    <span className="text-sm font-bold text-[var(--text-primary)] group-hover:text-red-600 dark:group-hover:text-red-400">부정적 / 거절</span>
                    <span className="text-[10px] text-[var(--text-muted)] mt-0.5">사유 및 재접촉 기록</span>
                </button>

                <button
                    onClick={() => handleResultSelect('followUp')}
                    className="group flex flex-col items-center justify-center p-3 rounded-xl border border-[var(--border-color)] hover:border-blue-500 bg-[var(--background-tertiary)] hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all duration-200 shadow-sm"
                >
                    <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center text-lg mb-2 group-hover:scale-110 transition-transform">🔄</div>
                    <span className="text-sm font-bold text-[var(--text-primary)] group-hover:text-blue-600 dark:group-hover:text-blue-400">보류 / 후속</span>
                    <span className="text-[10px] text-[var(--text-muted)] mt-0.5">추후 다시 연락</span>
                </button>

                <button
                    onClick={() => handleResultSelect('simple')}
                    className="group flex flex-col items-center justify-center p-3 rounded-xl border border-[var(--border-color)] hover:border-gray-500 bg-[var(--background-tertiary)] hover:bg-gray-50 dark:hover:bg-gray-800 transition-all duration-200 shadow-sm"
                >
                    <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-lg mb-2 group-hover:scale-110 transition-transform">📄</div>
                    <span className="text-sm font-bold text-[var(--text-primary)] group-hover:text-gray-600 dark:group-hover:text-gray-400">단순 완료</span>
                    <span className="text-[10px] text-[var(--text-muted)] mt-0.5">상담 내용만 기록</span>
                </button>
            </div>
        </div>
    );

    const renderStep2 = () => (
        <div className="space-y-4">
            {result === 'positive' && (
                <div className="p-3 bg-[var(--background-primary)] border border-[var(--border-color)] rounded-lg space-y-2">
                    <h3 className="text-sm font-semibold text-green-500">후속 PC 일정 등록</h3>
                    <div className="grid grid-cols-2 gap-2">
                        <div>
                            <label className="text-xs text-[var(--text-muted)]">날짜</label>
                            <input type="date" value={pcAppointmentData.date} onChange={e => setPcAppointmentData({...pcAppointmentData, date: e.target.value})} className="mt-1 w-full p-1.5 text-sm border rounded-md bg-[var(--background-tertiary)] border-[var(--border-color-strong)]"/>
                        </div>
                         <div>
                            <label className="text-xs text-[var(--text-muted)]">시간</label>
                            <input type="time" value={pcAppointmentData.time} onChange={e => setPcAppointmentData({...pcAppointmentData, time: e.target.value})} className="mt-1 w-full p-1.5 text-sm border rounded-md bg-[var(--background-tertiary)] border-[var(--border-color-strong)]"/>
                        </div>
                    </div>
                </div>
            )}
            {result === 'rejection' && (
                 <div className="p-3 bg-[var(--background-primary)] border border-[var(--border-color)] rounded-lg space-y-2">
                    <h3 className="text-sm font-semibold text-red-500">거절 정보 기록</h3>
                     <div className="grid grid-cols-2 gap-2">
                        <div>
                            <label className="text-xs text-[var(--text-muted)]">거절 사유</label>
                            <select value={rejectionData.reason} onChange={(e) => setRejectionData({...rejectionData, reason: e.target.value as RejectionReason})} className="mt-1 block w-full p-1.5 text-sm bg-[var(--background-tertiary)] border border-[var(--border-color-strong)] rounded-md">
                                {['가격', '상품', '시기', '다른설계사', '가족', '기타'].map(r => <option key={r} value={r}>{r}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="text-xs text-[var(--text-muted)]">재접촉 가능성</label>
                            <select value={rejectionData.probability} onChange={(e) => setRejectionData({...rejectionData, probability: e.target.value as RecontactProbability})} className="mt-1 block w-full p-1.5 text-sm bg-[var(--background-tertiary)] border border-[var(--border-color-strong)] rounded-md">
                                {['상', '중', '하'].map(p => <option key={p} value={p}>{p}</option>)}
                            </select>
                        </div>
                    </div>
                     <div>
                        <label className="text-xs text-[var(--text-muted)]">다음 재접촉 시점</label>
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
                </div>
            )}
            {result === 'followUp' && (
                <div className="p-3 bg-[var(--background-primary)] border border-[var(--border-color)] rounded-lg space-y-2">
                    <h3 className="text-sm font-semibold text-blue-500">후속 일정 등록</h3>
                     <div className="grid grid-cols-2 gap-2">
                        <div>
                             <label className="text-xs text-[var(--text-muted)]">날짜</label>
                             <input type="date" value={followUpData.date} onChange={e => setFollowUpData({...followUpData, date: e.target.value})} className="mt-1 w-full p-1.5 text-sm border rounded-md bg-[var(--background-tertiary)] border-[var(--border-color-strong)]"/>
                        </div>
                        <div>
                             <label className="text-xs text-[var(--text-muted)]">시간</label>
                             <input type="time" value={followUpData.time} onChange={e => setFollowUpData({...followUpData, time: e.target.value})} className="mt-1 w-full p-1.5 text-sm border rounded-md bg-[var(--background-tertiary)] border-[var(--border-color-strong)]"/>
                        </div>
                     </div>
                </div>
            )}
            <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">상담 내용 기록</label>
                <textarea
                    value={consultationNotes}
                    onChange={(e) => setConsultationNotes(e.target.value)}
                    rows={result === 'simple' ? 15 : 8}
                    className="block w-full bg-[var(--background-secondary)] border border-[var(--border-color-strong)] rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-[var(--background-accent)] focus:border-[var(--background-accent)] font-mono text-sm leading-relaxed"
                />
            </div>
        </div>
    );

    const renderStep3 = () => {
        let summaryText = '';
        if (result === 'positive') summaryText = "후속 PC 일정이 추가됩니다.";
        else if (result === 'rejection') summaryText = "고객이 '거절 고객'으로 분류됩니다.";
        else if (result === 'followUp') summaryText = "새로운 후속 일정이 등록됩니다.";
        else if (result === 'simple') summaryText = "상담 내용이 기록됩니다.";

        return (
            <div className="text-center space-y-4">
                <h3 className="text-lg font-semibold text-[var(--text-primary)]">최종 확인</h3>
                <p className="p-4 bg-[var(--background-tertiary)] rounded-md text-[var(--text-secondary)] text-sm">{summaryText} 또한, 입력된 상담 내용은 고객 히스토리에 저장되고 원본 AP 미팅은 '완료' 상태로 자동 변경됩니다.</p>
            </div>
        );
    };

    return (
        <BaseModal isOpen={isOpen} onClose={onClose} className="max-w-lg w-full">
            <div className="p-4 border-b border-[var(--border-color)] flex justify-between items-center">
                <h2 className="text-lg font-bold text-[var(--text-primary)]">{customer.name}님 AP 미팅 결과</h2>
                <button onClick={onClose} className="text-[var(--text-muted)] hover:text-[var(--text-primary)]"><XIcon className="h-5 w-5" /></button>
            </div>
            <div className="p-5 flex-1 min-h-0 overflow-y-auto custom-scrollbar">
                {stepper}
                {step === 1 && renderStep1()}
                {step === 2 && renderStep2()}
                {step === 3 && renderStep3()}
            </div>
             <div className="p-4 bg-[var(--background-tertiary)] border-t border-[var(--border-color)] flex justify-between">
                <button onClick={() => setStep(step - 1)} disabled={step === 1 || isLoading} className="px-4 py-2 bg-[var(--background-secondary)] border border-[var(--border-color-strong)] rounded-md text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--background-primary)] disabled:opacity-50">이전</button>
                {step < 3 ? (
                    <button
                        onClick={() => setStep(step + 1)}
                        disabled={!result || isLoading}
                        className="px-6 py-2 bg-[var(--background-accent)] text-[var(--text-on-accent)] rounded-md text-sm font-medium hover:bg-[var(--background-accent-hover)] disabled:opacity-50"
                    >
                        다음
                    </button>
                ) : (
                     <button onClick={handleSaveAll} disabled={isLoading} className="px-6 py-2 bg-green-600 text-white rounded-md text-sm font-medium hover:bg-green-700 disabled:opacity-50">{isLoading ? '저장 중...' : '저장 및 완료'}</button>
                )}
            </div>
        </BaseModal>
    );
};

export default ApCompletionWizardModal;
