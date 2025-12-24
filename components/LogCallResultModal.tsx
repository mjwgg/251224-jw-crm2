
import React, { useState } from 'react';
import type { Customer, CallResult } from '../types';
import { callResultLabels } from '../types';
import { XIcon, ChevronDownIcon, ChevronUpIcon } from './icons';

interface LogCallResultModalProps {
  customer: Customer;
  onClose: () => void;
  onSave: (customer: Customer, result: CallResult, notes: string, followUpDate?: string) => void;
}

const LogCallResultModal: React.FC<LogCallResultModalProps> = ({ customer, onClose, onSave }) => {
  const [result, setResult] = useState<CallResult>('meeting_scheduled');
  const [notes, setNotes] = useState('');
  const [followUpOption, setFollowUpOption] = useState('1d');
  const [customFollowUpDate, setCustomFollowUpDate] = useState('');
  const [showRules, setShowRules] = useState(false);

  const handleSave = () => {
    let followUpDate: string | undefined = undefined;
    if (['rejected', 'no_answer', 'recall'].includes(result)) {
      if (followUpOption === 'custom') {
        followUpDate = customFollowUpDate;
      } else if (followUpOption !== 'none') {
        const date = new Date();
        if (followUpOption === '1d') {
          date.setDate(date.getDate() + 1);
        } else if (followUpOption === '2d') {
          date.setDate(date.getDate() + 2);
        } else if (followUpOption === '1w') {
          date.setDate(date.getDate() + 7);
        }
        followUpDate = new Date(date.getTime() - (date.getTimezoneOffset() * 60000)).toISOString().split('T')[0];
      }
    }
    onSave(customer, result, notes, followUpDate);
  };

  const followUpOptions = [
    { value: '1d', label: '하루 뒤' },
    { value: '2d', label: '이틀 뒤' },
    { value: '1w', label: '다음 주' },
    { value: 'none', label: '설정 안함' },
    { value: 'custom', label: '직접 선택' },
  ];
  
  return (
    <div className="fixed inset-0 bg-[var(--background-overlay)] z-[80] flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-[var(--background-secondary)] rounded-lg shadow-2xl max-w-lg w-full border border-[var(--border-color)]">
        <div className="p-6 border-b border-[var(--border-color)] flex justify-between items-center">
          <h2 className="text-2xl font-bold text-[var(--text-primary)]">
            <span className="text-[var(--text-accent)]">{customer.name}</span>님 통화 결과 기록
          </h2>
          <button onClick={onClose} className="text-[var(--text-muted)] hover:text-[var(--text-primary)]">
            <XIcon className="h-6 w-6" />
          </button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)]">통화 결과</label>
            <div className="mt-2 flex flex-wrap gap-2">
              {(Object.keys(callResultLabels) as CallResult[]).map(key => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setResult(key)}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors border ${
                    result === key
                      ? 'bg-[var(--background-accent)] text-[var(--text-on-accent)] border-transparent'
                      : 'bg-[var(--background-tertiary)] text-[var(--text-secondary)] hover:bg-[var(--background-primary)] border-[var(--border-color-strong)]'
                  }`}
                >
                  {callResultLabels[key]}
                </button>
              ))}
            </div>
          </div>

          {['rejected', 'no_answer', 'recall'].includes(result) && (
            <div className="p-3 bg-[var(--background-primary)] rounded-md border border-[var(--border-color)] animate-fade-in">
              <label className="block text-sm font-medium text-[var(--text-secondary)]">재접촉 시점 설정</label>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                {followUpOptions.map(opt => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setFollowUpOption(opt.value)}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium border ${
                      followUpOption === opt.value
                        ? 'bg-[var(--background-accent)] text-[var(--text-on-accent)] border-transparent'
                        : 'bg-[var(--background-tertiary)] text-[var(--text-secondary)] hover:bg-[var(--background-primary)] border-[var(--border-color-strong)]'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              {followUpOption === 'custom' && (
                <div className="mt-3">
                  <input
                    type="date"
                    value={customFollowUpDate}
                    onChange={(e) => setCustomFollowUpDate(e.target.value)}
                    className="p-1.5 border border-[var(--border-color-strong)] bg-[var(--background-tertiary)] text-[var(--text-primary)] rounded-md shadow-sm focus:ring-[var(--background-accent)] focus:border-[var(--background-accent)]"
                  />
                </div>
              )}
            </div>
          )}

          <div>
            {result === 'meeting_scheduled' && (
                <div className="border border-[var(--border-color-strong)] rounded-md mb-2">
                    <button
                        type="button"
                        className="w-full flex justify-between items-center p-2 text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--background-tertiary)]"
                        onClick={() => setShowRules(!showRules)}
                        aria-expanded={showRules}
                        aria-controls="ai-rules-content"
                    >
                        <span>텍스트로 등록: 자동 인식 규칙 보기/숨기기</span>
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
            )}
            <label htmlFor="notes" className="block text-sm font-medium text-[var(--text-secondary)]">
              메모
            </label>
            <div className="relative mt-1">
                <textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={4}
                  placeholder={
                    result === 'meeting_scheduled' 
                    ? "약속 시간, 장소, 내용 등 미팅 정보를 입력하세요." 
                    : "통화 관련 특이사항을 기록하세요."
                  }
                  className="block w-full border border-[var(--border-color-strong)] bg-[var(--background-tertiary)] text-[var(--text-primary)] rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-[var(--background-accent)] focus:border-[var(--background-accent)]"
                />
            </div>
          </div>
        </div>
        <div className="p-6 bg-[var(--background-primary)] border-t border-[var(--border-color)] flex justify-end items-center space-x-4">
          <button type="button" onClick={onClose} className="px-4 py-2 bg-[var(--background-tertiary)] border border-[var(--border-color-strong)] rounded-md text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--background-primary)]">
            취소
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-6 py-2 bg-[var(--background-accent)] text-[var(--text-on-accent)] rounded-md text-sm font-medium hover:bg-[var(--background-accent-hover)] disabled:opacity-50"
          >
            저장
          </button>
        </div>
      </div>
    </div>
  );
};

export default LogCallResultModal;
