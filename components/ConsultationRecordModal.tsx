
import React, { useState, useEffect } from 'react';
import type { MeetingType } from '../types';
import BaseModal from './ui/BaseModal';
import { XIcon } from './icons';

export interface ConsultationRecordData {
  date: string;
  meetingType: MeetingType;
  notes: string;
}

interface ConsultationRecordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: ConsultationRecordData) => void;
  customerName: string;
  defaultDate?: string;
  defaultMeetingType?: MeetingType;
  meetingTypeOptions?: string[];
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

const pcConsultationTemplate = `II. 제안 내용 및 목적
* 주요 제안 상품/솔루션: 
* 핵심 제안 사유 (고객 니즈 연결): 

III. 고객 반응 및 질의응답 (Q&A)
* [긍정적 반응 👍]: 
* [주요 질문 및 거절/우려 사항 💬]: 
* [전반적인 태도 및 분위기]: 

IV. 핵심 결과 및 다음 단계 (Action Plan)
* 상담 결과 요약: 
* 고객이 하기로 한 일 (To-Do for Customer): 
* 내가 하기로 한 일 (To-Do for Me): 

V. 추가 발견사항 및 향후 제안 컨셉 (Next Opportunity)
* [상담 중 발견한 추가 니즈]: 
* [향후 추가 제안할 상품 컨셉]: 

VI. 종합 의견 및 특이사항
* 상담에 대한 종합적인 느낌 및 평가 (Feeling): 
* 기타 특이사항: 
`;

const ConsultationRecordModal: React.FC<ConsultationRecordModalProps> = ({
  isOpen,
  onClose,
  onSave,
  customerName,
  defaultDate,
  defaultMeetingType,
  meetingTypeOptions = ['AP', 'PC', 'TA', '기타'],
}) => {
  const [date, setDate] = useState('');
  const [meetingType, setMeetingType] = useState<MeetingType>('AP');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (isOpen) {
      const today = new Date();
      const todayStr = new Date(today.getTime() - (today.getTimezoneOffset() * 60000)).toISOString().split('T')[0];
      
      setDate(defaultDate || todayStr);
      const currentMeetingType = defaultMeetingType || 'AP';
      setMeetingType(currentMeetingType);
      
      // 초기 진입 시 템플릿 설정
      if (currentMeetingType === 'PC') {
        setNotes(pcConsultationTemplate);
      } else {
        setNotes(apConsultationTemplate);
      }
    }
  }, [isOpen, defaultDate, defaultMeetingType]);

  // 유형 변경 시 템플릿 자동 전환 로직
  const handleMeetingTypeChange = (newType: MeetingType) => {
    const prevType = meetingType;
    setMeetingType(newType);

    // 사용자가 내용을 수정하지 않았을 때만(즉, 이전 템플릿 그대로일 때만) 새 템플릿으로 교체
    const isNotesDefault = notes === apConsultationTemplate || notes === pcConsultationTemplate || notes === '';
    
    if (isNotesDefault) {
      if (newType === 'PC') {
        setNotes(pcConsultationTemplate);
      } else if (prevType === 'PC') {
        // PC에서 다른 유형으로 넘어갈 때만 기본 양식으로 복구
        setNotes(apConsultationTemplate);
      }
    }
  };

  const handleSave = () => {
    onSave({ date, meetingType, notes });
  };

  if (!isOpen) {
    return null;
  }

  return (
    <BaseModal isOpen={isOpen} onClose={onClose} className="max-w-3xl w-full h-[90vh]">
      <div className="p-4 border-b border-[var(--border-color)] flex justify-between items-center flex-shrink-0">
        <h2 className="text-xl font-bold text-[var(--text-primary)]">{customerName}님 상담 기록</h2>
        <button onClick={onClose} className="text-[var(--text-muted)] hover:text-[var(--text-primary)]">
          <XIcon className="h-6 w-6" />
        </button>
      </div>
      <div className="p-6 space-y-4 overflow-y-auto flex-1 min-h-0 custom-scrollbar">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="consultation-date" className="block text-sm font-medium text-[var(--text-secondary)]">
              상담일
            </label>
            <input
              type="date"
              id="consultation-date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="mt-1 block w-full bg-[var(--background-secondary)] border border-[var(--border-color-strong)] rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-[var(--background-accent)] focus:border-[var(--background-accent)]"
            />
          </div>
          <div>
            <label htmlFor="consultation-meetingType" className="block text-sm font-medium text-[var(--text-secondary)]">
              미팅 유형
            </label>
            <select
              id="consultation-meetingType"
              value={meetingType}
              onChange={(e) => handleMeetingTypeChange(e.target.value as MeetingType)}
              className="mt-1 block w-full bg-[var(--background-secondary)] border border-[var(--border-color-strong)] rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-[var(--background-accent)] focus:border-[var(--background-accent)]"
            >
              {meetingTypeOptions.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div>
          <label htmlFor="consultation-notes" className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
            상담 내용
          </label>
          <textarea
            id="consultation-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={25}
            className="block w-full bg-[var(--background-secondary)] border border-[var(--border-color-strong)] rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-[var(--background-accent)] focus:border-[var(--background-accent)] font-mono text-sm leading-relaxed"
          />
        </div>
      </div>
      <div className="p-4 bg-[var(--background-tertiary)] border-t border-[var(--border-color)] flex justify-end space-x-4 flex-shrink-0">
        <button
          onClick={onClose}
          className="px-4 py-2 bg-[var(--background-secondary)] border border-[var(--border-color-strong)] rounded-md text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--background-primary)]"
        >
          취소
        </button>
        <button
          onClick={handleSave}
          className="px-6 py-2 bg-[var(--background-accent)] text-[var(--text-on-accent)] rounded-md text-sm font-medium hover:bg-[var(--background-accent-hover)]"
        >
          저장
        </button>
      </div>
    </BaseModal>
  );
};

export default ConsultationRecordModal;
