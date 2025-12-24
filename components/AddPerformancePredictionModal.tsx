
import React, { useState, useEffect } from 'react';
import type { PerformancePrediction } from '../types';
import BaseModal from './ui/BaseModal';
import Spinner from './ui/Spinner';
import { XIcon, DocumentTextIcon, PlusIcon, ChevronUpIcon, ChevronDownIcon } from './icons';

interface AddPerformancePredictionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (prediction: Omit<PerformancePrediction, 'id'>) => void;
  prediction: PerformancePrediction | Partial<PerformancePrediction> | null;
  isAiMode: boolean;
}

const AddPerformancePredictionModal: React.FC<AddPerformancePredictionModalProps> = ({ isOpen, onClose, onSave, prediction, isAiMode }) => {
  const [activeTab, setActiveTab] = useState<'ai' | 'manual'>(isAiMode ? 'ai' : 'manual');
  const [aiText, setAiText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showRules, setShowRules] = useState(false);
  const [formData, setFormData] = useState<Omit<PerformancePrediction, 'id'>>({
    customerName: '',
    pcDate: '',
    productName: '',
    premium: 0,
    recognizedPerformance: 0,
  });

  useEffect(() => {
    const today = new Date();
    const todayStr = new Date(today.getTime() - (today.getTimezoneOffset() * 60000)).toISOString().split('T')[0];
    const defaultData = {
        customerName: '',
        pcDate: todayStr,
        productName: '',
        premium: 0,
        recognizedPerformance: 0,
    };

    if (isOpen) {
      if (prediction) {
        setFormData({...defaultData, ...prediction});
        setActiveTab('manual');
      } else {
        setFormData(defaultData);
        setActiveTab(isAiMode ? 'ai' : 'manual');
      }
      setAiText('');
      setError('');
    }
  }, [prediction, isOpen, isAiMode]);

  const handleAiAnalyze = () => {
    if (!aiText.trim()) {
      setError('분석할 내용을 입력해주세요.');
      return;
    }
    setIsLoading(true);
    setError('');
    
    setTimeout(() => {
        try {
            const text = aiText.trim();
            const result: Omit<PerformancePrediction, 'id'> = {
                customerName: '',
                pcDate: new Date().toISOString().split('T')[0],
                productName: '',
                premium: 0,
                recognizedPerformance: 0,
            };

            // 1. Date Parsing
            const now = new Date();
            // Reset time to midnight to avoid issues
            now.setHours(0, 0, 0, 0);
            
            const targetDate = new Date(now);
            let dateFound = false;

            if (text.includes('오늘')) {
                dateFound = true;
            } else if (text.includes('내일')) {
                targetDate.setDate(targetDate.getDate() + 1);
                dateFound = true;
            } else if (text.includes('모레')) {
                targetDate.setDate(targetDate.getDate() + 2);
                dateFound = true;
            } else if (text.includes('글피')) {
                targetDate.setDate(targetDate.getDate() + 3);
                dateFound = true;
            }
            
            if (!dateFound) {
                // MM월 DD일 pattern
                const mmddMatch = text.match(/(\d{1,2})(?:월|\.|-)\s*(\d{1,2})(?:일)?/);
                if (mmddMatch) {
                    const month = parseInt(mmddMatch[1]) - 1;
                    const day = parseInt(mmddMatch[2]);
                    targetDate.setMonth(month);
                    targetDate.setDate(day);
                    // If date is far in past (e.g. > 3 months ago), assume next year
                    if (targetDate < new Date(new Date().setDate(new Date().getDate() - 90))) {
                        targetDate.setFullYear(targetDate.getFullYear() + 1);
                    }
                    dateFound = true;
                }
            }

            if (!dateFound) {
                // DD일 pattern (isolated) - 이번 달의 날짜로 인식
                const ddMatch = text.match(/(?<!\d)(\d{1,2})일/);
                if (ddMatch) {
                    const day = parseInt(ddMatch[1]);
                    if (day >= 1 && day <= 31) {
                        targetDate.setDate(day);
                        // Note: Should we handle if 'day' has already passed in current month?
                        // Requirement says "dd일만 있으면 이번달로 인식". So we keep current month/year.
                        dateFound = true;
                    }
                }
            }

            if (!dateFound) {
                // Weekday pattern
                const dayMatch = text.match(/(월|화|수|목|금|토|일)요일/);
                if (dayMatch) {
                    const dayChar = dayMatch[1];
                    const dayMap: { [key: string]: number } = { '일': 0, '월': 1, '화': 2, '수': 3, '목': 4, '금': 5, '토': 6 };
                    const targetDayOfWeek = dayMap[dayChar];
                    const currentDayOfWeek = now.getDay();

                    let diff = targetDayOfWeek - currentDayOfWeek;
                    // Rule: If target is future (diff > 0), this week.
                    // If target is today or past (diff <= 0), next week (+7).
                    if (diff <= 0) {
                        diff += 7;
                    }
                    
                    targetDate.setDate(targetDate.getDate() + diff);
                    dateFound = true;
                }
            }

            // Ensure timezone handling for ISO string
            const offset = targetDate.getTimezoneOffset() * 60000;
            result.pcDate = new Date(targetDate.getTime() - offset).toISOString().split('T')[0];

            // 2. Premium & Performance
            const moneyRegex = /(.*?)\s*(\d+(?:,\d+)*)\s*(만?원)/g;
            let m;
            while ((m = moneyRegex.exec(text)) !== null) {
                const context = m[1]; // Text immediately preceding the number
                const numStr = m[2].replace(/,/g, '');
                let amount = parseInt(numStr, 10);
                if (m[3].startsWith('만')) amount *= 10000;

                if (context.includes('실적') || context.includes('인정')) {
                    result.recognizedPerformance = amount;
                } else {
                    if (result.premium === 0) {
                        result.premium = amount;
                    } else if (result.recognizedPerformance === 0) {
                        // If premium already set, maybe this is performance?
                        result.recognizedPerformance = amount;
                    }
                }
            }

            // 3. Product Name
            const tagMatch = text.match(/[@#]([^\s,]+)/);
            if (tagMatch) {
                result.productName = tagMatch[1];
            } else {
                const insuranceMatch = text.match(/([^\s]+보험)/);
                if (insuranceMatch) {
                    result.productName = insuranceMatch[1];
                }
            }

            // 4. Customer Name
            // Simple heuristic: 2-5 length hangul word that isn't a keyword
            const keywords = ['오늘', '내일', '모레', '글피', '만원', '실적', '인정', '보험', '예상', '월', '일', '년', '오전', '오후', '요일'];
            const words = text.split(/\s+/);
            for (const word of words) {
                const cleanWord = word.replace(/[^\uAC00-\uD7A3]/g, '');
                if (cleanWord.length >= 2 && cleanWord.length <= 5) {
                    if (!keywords.some(k => cleanWord.includes(k)) && !cleanWord.endsWith('원')) {
                         if (result.productName && result.productName.includes(cleanWord)) continue;
                         result.customerName = cleanWord;
                         break;
                    }
                }
            }

            setFormData(result);
            setActiveTab('manual');
        } catch (e) {
            setError('분석 중 오류가 발생했습니다.');
        } finally {
            setIsLoading(false);
        }
    }, 300);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? (value ? parseInt(value, 10) : 0) : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (activeTab === 'ai') {
      handleAiAnalyze();
      return;
    }

    if (!formData.customerName || !formData.pcDate) {
        setError('고객명과 PC일정은 필수입니다.');
        return;
    }
    setError('');
    onSave(formData);
    onClose();
  };

  const renderAiTab = () => (
    <div className="space-y-4">
      <p className="text-sm text-[var(--text-muted)]">예상 실적 정보를 포함한 텍스트를 붙여넣으세요. 규칙 기반으로 분석하여 자동으로 필드를 채워줍니다.</p>
      <div className="border border-[var(--border-color-strong)] rounded-md">
          <button
              type="button"
              className="w-full flex justify-between items-center p-2 text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--background-tertiary)]"
              onClick={() => setShowRules(!showRules)}
              aria-expanded={showRules}
              aria-controls="ai-prediction-rules-content"
          >
              <span>텍스트로 등록: 자동 인식 규칙 보기/숨기기</span>
              {showRules ? <ChevronUpIcon className="h-5 w-5" /> : <ChevronDownIcon className="h-5 w-5" />}
          </button>
          {showRules && (
          <div id="ai-prediction-rules-content" className="p-3 border-t border-[var(--border-color-strong)] bg-[var(--background-primary)] text-xs text-[var(--text-muted)] animate-fade-in">
              <ul className="list-disc list-inside space-y-1">
                  <li><strong>고객명</strong>: 2~5자 한글</li>
                  <li><strong>PC일정</strong>: '오늘', '내일', '모레', '글피', 'MM월 DD일' 인식.</li>
                  <li><strong>날짜 단축</strong>: 'DD일' 입력 시 이번 달 DD일로 인식.</li>
                  <li><strong>요일</strong>: 'X요일' 입력 시, 미래면 이번 주, 오늘/과거면 다음 주 해당 요일로 자동 설정.</li>
                  <li><strong>예상 보험료/실적</strong>: 숫자와 '원' 또는 '만원' 조합 (예: 15만원, 실적 180만원). '실적' 또는 '인정' 키워드를 함께 사용하면 인정실적으로 구분합니다.</li>
                  <li><strong>상품명</strong>: '@상품명', '#상품명' 또는 'OO보험' 형식으로 입력하면 더 정확하게 인식됩니다.</li>
              </ul>
          </div>
          )}
      </div>
      <textarea
        value={aiText}
        onChange={(e) => setAiText(e.target.value)}
        rows={6}
        className="w-full p-2 border rounded-md focus:ring-2 focus:ring-[var(--background-accent)] bg-[var(--background-tertiary)] border-[var(--border-color-strong)] text-[var(--text-primary)]"
        placeholder="예: 이민준 고객 내일 PC미팅, 종신보험 15만원, 인정실적 180만원 예상"
      />
    </div>
  );

  const renderManualTab = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label htmlFor="customerName" className="block text-sm font-medium text-[var(--text-secondary)]">고객명</label>
          <input type="text" name="customerName" value={formData.customerName} onChange={handleChange} className="mt-1 w-full p-2 border rounded-md bg-[var(--background-tertiary)] border-[var(--border-color-strong)]" />
        </div>
        <div>
          <label htmlFor="pcDate" className="block text-sm font-medium text-[var(--text-secondary)]">PC일정</label>
          <input type="date" name="pcDate" value={formData.pcDate} onChange={handleChange} className="mt-1 w-full p-2 border rounded-md bg-[var(--background-tertiary)] border-[var(--border-color-strong)]" />
        </div>
        <div className="md:col-span-2">
          <label htmlFor="productName" className="block text-sm font-medium text-[var(--text-secondary)]">상품명</label>
          <input type="text" name="productName" value={formData.productName} onChange={handleChange} className="mt-1 w-full p-2 border rounded-md bg-[var(--background-tertiary)] border-[var(--border-color-strong)]" />
        </div>
        <div>
          <label htmlFor="premium" className="block text-sm font-medium text-[var(--text-secondary)]">예상 보험료 (원)</label>
          <input type="number" name="premium" value={formData.premium} onChange={handleChange} className="mt-1 w-full p-2 border rounded-md bg-[var(--background-tertiary)] border-[var(--border-color-strong)]" />
        </div>
        <div>
          <label htmlFor="recognizedPerformance" className="block text-sm font-medium text-[var(--text-secondary)]">예상 인정실적 (원)</label>
          <input type="number" name="recognizedPerformance" value={formData.recognizedPerformance} onChange={handleChange} className="mt-1 w-full p-2 border rounded-md bg-[var(--background-tertiary)] border-[var(--border-color-strong)]" />
        </div>
      </div>
    </div>
  );

  return (
    <BaseModal isOpen={isOpen} onClose={onClose} className="max-w-2xl w-full">
      <div className="p-4 border-b border-[var(--border-color)] flex justify-between items-center flex-shrink-0">
        <h2 className="text-2xl font-bold text-[var(--text-primary)]">{prediction ? '예측 수정' : '새 예측 추가'}</h2>
        <button type="button" onClick={onClose} className="text-[var(--text-muted)] hover:text-[var(--text-primary)]"><XIcon className="h-6 w-6" /></button>
      </div>

      <form id="prediction-form" onSubmit={handleSubmit} className="flex-1 min-h-0 flex flex-col">
        <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
          {!prediction && (
              <div className="flex justify-center p-1 bg-[var(--background-tertiary)] rounded-lg mb-6">
                  <button type="button" onClick={() => setActiveTab('ai')} className={`w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-colors ${activeTab === 'ai' ? 'bg-[var(--background-secondary)] text-[var(--text-accent)] shadow' : 'text-[var(--text-secondary)]'}`}>
                      <DocumentTextIcon className="h-5 w-5" /> 텍스트로 분석
                  </button>
                  <button type="button" onClick={() => setActiveTab('manual')} className={`w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-colors ${activeTab === 'manual' ? 'bg-[var(--background-secondary)] text-[var(--text-accent)] shadow' : 'text-[var(--text-secondary)]'}`}>
                      <PlusIcon className="h-5 w-5" /> 직접 입력
                  </button>
              </div>
          )}
          {error && <p className="text-sm text-center text-[var(--text-danger)] bg-red-500/10 p-2 rounded-md mb-4">{error}</p>}
          {activeTab === 'ai' ? renderAiTab() : renderManualTab()}
        </div>
      </form>
      
      <div className="p-4 bg-[var(--background-tertiary)] border-t border-[var(--border-color)] flex justify-end items-center space-x-4 flex-shrink-0">
        <button type="button" onClick={onClose} className="px-4 py-2 bg-[var(--background-secondary)] border border-[var(--border-color-strong)] rounded-md text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--background-primary)]">취소</button>
        <button
            type="submit"
            form="prediction-form"
            disabled={isLoading}
            className="flex items-center justify-center gap-2 px-6 py-2 bg-[var(--background-accent)] text-[var(--text-on-accent)] rounded-md text-sm font-medium hover:bg-[var(--background-accent-hover)] disabled:opacity-50 min-w-[120px]"
        >
          {isLoading ? <Spinner small /> : (activeTab === 'ai' ? <DocumentTextIcon className="h-5 w-5" /> : null)}
          {isLoading ? '분석 중...' : (activeTab === 'ai' ? '텍스트 분석' : (prediction ? '수정' : '저장'))}
        </button>
      </div>
    </BaseModal>
  );
};

export default AddPerformancePredictionModal;
