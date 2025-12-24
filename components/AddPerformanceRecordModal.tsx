
import React, { useState, useEffect } from 'react';
import type { PerformanceRecord, AIExtractedPerformanceRecord, Customer } from '../types';
import BaseModal from './ui/BaseModal';
import Spinner from './ui/Spinner';
import { XIcon, DocumentTextIcon, PlusIcon, TrashIcon, ChevronUpIcon, ChevronDownIcon } from './icons';

interface AddPerformanceRecordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (record: Omit<PerformanceRecord, 'id'> | Omit<PerformanceRecord, 'id'>[]) => void;
  record: PerformanceRecord | Partial<PerformanceRecord> | null;
  isAiMode: boolean;
  customers: Customer[];
}

const coverageCategories: PerformanceRecord['coverageCategory'][] = ['종합건강', '치매재가간병', '태아어린이', '운전자상해', '종신정기', '단기납', '연금', '경영인정기', '달러', '기타'];


const AddPerformanceRecordModal: React.FC<AddPerformanceRecordModalProps> = ({ isOpen, onClose, onSave, record, isAiMode, customers }) => {
  const [activeTab, setActiveTab] = useState<'ai' | 'manual'>(isAiMode ? 'ai' : 'manual');
  const [aiText, setAiText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showRules, setShowRules] = useState(false);
  const [formData, setFormData] = useState<Omit<PerformanceRecord, 'id'>>({
    contractorName: '',
    dob: '',
    applicationDate: '',
    premium: 0,
    insuranceCompany: '',
    productName: '',
    recognizedPerformance: 0,
    coverageCategory: '기타',
  });
  
  const [suggestions, setSuggestions] = useState<Customer[]>([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [extractedRecords, setExtractedRecords] = useState<AIExtractedPerformanceRecord[] | null>(null);


  useEffect(() => {
    const today = new Date();
    const todayStr = new Date(today.getTime() - (today.getTimezoneOffset() * 60000)).toISOString().split('T')[0];
    const defaultData = {
        contractorName: '',
        dob: '',
        applicationDate: todayStr,
        premium: 0,
        insuranceCompany: '',
        productName: '',
        recognizedPerformance: 0,
        coverageCategory: '기타' as const,
    };

    if (isOpen) {
        if (record) {
          setFormData({...defaultData, ...record});
          setActiveTab('manual');
        } else {
           setFormData(defaultData);
           setActiveTab(isAiMode ? 'ai' : 'manual');
        }
        setSuggestions([]);
        setIsDropdownOpen(false);
        setAiText('');
        setError('');
        setExtractedRecords(null);
    }
  }, [record, isOpen, isAiMode]);

  const handleAiAnalyze = () => {
    if (!aiText.trim()) {
      setError('분석할 내용을 입력해주세요.');
      return;
    }
    setIsLoading(true);
    setError('');
    
    // Simulate processing delay
    setTimeout(() => {
      try {
        const lines = aiText.trim().split('\n').filter(line => line.trim() !== '');
        const results = lines.map(line => {
            const text = line.trim();
            const result: AIExtractedPerformanceRecord = {
                contractorName: '',
                dob: '',
                applicationDate: new Date().toISOString().split('T')[0],
                premium: 0,
                recognizedPerformance: 0,
                insuranceCompany: '',
                productName: '',
                coverageCategory: '기타',
            };

            // 1. 계약일 (Contract Date)
            if (text.includes('어제')) {
                const d = new Date();
                d.setDate(d.getDate() - 1);
                result.applicationDate = d.toISOString().split('T')[0];
            }

            // 2. 계약자명 & 생년월일 (Contractor Name & DOB)
            // Try to match with existing customers first
            let matchedCustomer: Customer | undefined;
            for (const c of customers) {
                if (text.includes(c.name)) {
                    matchedCustomer = c;
                    break;
                }
            }
            
            if (matchedCustomer) {
                result.contractorName = matchedCustomer.name;
                result.dob = matchedCustomer.birthday || '';
            } else {
                // Fallback: Regex for Name (2-5 Hangul chars)
                const nameMatch = text.match(/[가-힣]{2,5}/);
                if (nameMatch) {
                    const keywords = ['삼성', '교보', '한화', '현대', 'DB', 'KB', '메리츠', '흥국', '농협', '신한', '라이나', '동양', '생명', '손보', '화재', '해상', '보험', '실적', '인정', '만원', '어제', '오늘', '기타'];
                    if (!keywords.some(k => nameMatch[0].includes(k))) {
                        result.contractorName = nameMatch[0];
                    }
                }
                // Fallback: Regex for DOB (6 or 8 digits)
                const dobMatch = text.match(/\d{6}|\d{8}/);
                if (dobMatch) {
                    let dob = dobMatch[0];
                    if (dob.length === 6) {
                        // Simple guess for century: >30 -> 19xx, <=30 -> 20xx
                        const y = parseInt(dob.substring(0, 2));
                        const prefix = y > 30 ? '19' : '20';
                        dob = `${prefix}${y}-${dob.substring(2, 4)}-${dob.substring(4, 6)}`;
                    } else {
                        dob = `${dob.substring(0, 4)}-${dob.substring(4, 6)}-${dob.substring(6, 8)}`;
                    }
                    result.dob = dob;
                }
            }

            // 3. 보험료 & 인정실적 (Premium & Recognized Performance)
            const moneyRegex = /(.*?)\s*(\d+(?:,\d+)*)\s*(만?원)/g;
            let match;
            while ((match = moneyRegex.exec(text)) !== null) {
                const context = match[1]; // Text before the number
                const numStr = match[2].replace(/,/g, '');
                let amount = parseInt(numStr, 10);
                if (match[3].startsWith('만')) amount *= 10000;

                if (context.includes('실적') || context.includes('인정')) {
                    result.recognizedPerformance = amount;
                } else {
                    // If premium is not set yet, use this.
                    // If premium is set but recognized is not, and this doesn't have explicit 'perf' keyword,
                    // typically the second number might be performance if context implies. 
                    // But adhering to rules: look for explicit keywords or fallback logic.
                    if (result.premium === 0) {
                        result.premium = amount;
                    } else if (result.recognizedPerformance === 0) {
                        // If we already have premium, assume this is performance?
                        // Often users type: "10만원 120만원" (Premium, Perf)
                        result.recognizedPerformance = amount;
                    }
                }
            }
            // If only premium found, assume performance = premium? Or 0? 
            // Let's leave it 0 if not found, user can edit. Or usually perf >= premium.
            
            // 4. 보험사 (Insurance Company)
            const companies = ['삼성', '교보', '한화', '현대', 'DB', 'KB', '메리츠', '흥국', '농협', '신한', '라이나', '동양', 'AIA', 'MetLife', '푸르덴셜', 'IBK', '하나', '롯데', 'MG', 'AIG'];
            const companySuffixes = ['생명', '손보', '화재', '해상', '라이프'];
            
            for (const co of companies) {
                if (text.includes(co)) {
                    // Check if followed by a suffix
                    const suffixRegex = new RegExp(`${co}\\s*(${companySuffixes.join('|')})`);
                    const suffixMatch = text.match(suffixRegex);
                    if (suffixMatch) {
                        result.insuranceCompany = suffixMatch[0].replace(/\s/g, '');
                    } else {
                        // Just the company name found
                         // Try to find ANY suffix in text to combine?
                         // Simple approach: if '삼성' found, save '삼성'.
                         result.insuranceCompany = co;
                         // Heuristic: Append '생명' or '화재' if commonly associated? 
                         // Let's just extract what matches.
                    }
                    break;
                }
            }
            // Fallback: look for any word containing suffix
            if (!result.insuranceCompany) {
                const anyCompMatch = text.match(new RegExp(`[가-힣]+(${companySuffixes.join('|')})`));
                if (anyCompMatch) result.insuranceCompany = anyCompMatch[0];
            }

            // 5. Category
            const cats = ['종합건강', '치매재가간병', '태아어린이', '운전자상해', '종신정기', '단기납', '연금', '경영인정기', '달러', '기타'];
            for (const cat of cats) {
                if (text.includes(cat)) {
                    result.coverageCategory = cat as any;
                    break;
                }
                // Partial matches
                if (cat === '종합건강' && (text.includes('종합') || text.includes('건강'))) { result.coverageCategory = cat as any; break; }
                if (cat === '치매재가간병' && (text.includes('치매') || text.includes('간병'))) { result.coverageCategory = cat as any; break; }
                if (cat === '태아어린이' && (text.includes('태아') || text.includes('어린이'))) { result.coverageCategory = cat as any; break; }
                if (cat === '운전자상해' && (text.includes('운전자') || text.includes('상해'))) { result.coverageCategory = cat as any; break; }
                if (cat === '종신정기' && (text.includes('종신') || text.includes('정기'))) { result.coverageCategory = cat as any; break; }
            }

            // 6. Product Name
            const productMatch = text.match(/[@#]([^\s,]+)/);
            if (productMatch) {
                result.productName = productMatch[1];
            }

            return result;
        });

        if (results.length === 1) {
            setFormData(prev => ({
                ...prev,
                ...results[0],
            }));
            setActiveTab('manual');
            setExtractedRecords(null);
        } else {
            setExtractedRecords(results);
        }
      } catch (e) {
        setError((e as Error).message);
        setExtractedRecords(null);
      } finally {
        setIsLoading(false);
      }
    }, 300);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: (type === 'number') ? (value ? parseInt(value, 10) : 0) : value,
    }));
  };
  
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));

    if (value) {
      const filtered = customers.filter(c =>
        c.name.toLowerCase().includes(value.toLowerCase())
      );
      setSuggestions(filtered);
      setIsDropdownOpen(filtered.length > 0);
    } else {
      setSuggestions([]);
      setIsDropdownOpen(false);
    }
  };

  const handleSelectCustomer = (customer: Customer) => {
    setFormData(prev => ({
      ...prev,
      contractorName: customer.name,
      dob: customer.birthday,
    }));
    setSuggestions([]);
    setIsDropdownOpen(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.contractorName || !formData.applicationDate) {
        setError('계약자명과 계약일은 필수입니다.');
        return;
    }
    onSave(formData);
    onClose();
  };
  
  const handleSaveExtracted = () => {
    if (extractedRecords && extractedRecords.length > 0) {
        onSave(extractedRecords);
        onClose();
    }
  };
  
  const handleDeleteExtractedRecord = (index: number) => {
    if (!extractedRecords) return;
    setExtractedRecords(extractedRecords.filter((_, i) => i !== index));
  };


  const renderAiTab = () => {
    if (extractedRecords) {
        return (
            <div className="space-y-4">
                <p className="text-sm text-[var(--text-muted)]">{extractedRecords.length}건의 실적이 분석되었습니다. 내용을 확인하고 저장하세요.</p>
                <div className="space-y-3 max-h-[50vh] overflow-y-auto custom-scrollbar p-1">
                    {extractedRecords.map((rec, index) => (
                        <div key={index} className="p-3 border border-[var(--border-color-strong)] rounded-lg bg-[var(--background-primary)]">
                            <div className="flex justify-between items-start mb-2">
                                <p className="font-bold text-[var(--text-primary)]">{rec.contractorName} ({rec.dob})</p>
                                <button onClick={() => handleDeleteExtractedRecord(index)} className="p-1 text-[var(--text-muted)] hover:text-[var(--text-danger)]"><TrashIcon className="h-4 w-4"/></button>
                            </div>
                            <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-sm">
                                <div><span className="text-xs text-[var(--text-muted)]">보험사:</span> {rec.insuranceCompany}</div>
                                <div><span className="text-xs text-[var(--text-muted)]">상품명:</span> {rec.productName}</div>
                                <div><span className="text-xs text-[var(--text-muted)]">보험료:</span> {rec.premium.toLocaleString()}원</div>
                                <div><span className="text-xs text-[var(--text-muted)]">실적:</span> {rec.recognizedPerformance.toLocaleString()}원</div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-4">
            <p className="text-sm text-[var(--text-muted)]">계약 정보를 포함한 텍스트를 붙여넣으세요. 규칙 기반으로 분석하여 자동으로 필드를 채워줍니다.</p>
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
                        <li><strong>계약자명</strong>: 2~5자 한글</li>
                        <li><strong>생년월일</strong>: 8자리(YYYYMMDD) 또는 6자리(YYMMDD) 숫자</li>
                        <li><strong>계약일</strong>: '오늘' 또는 '어제'. 언급 없으면 오늘 날짜로 자동 설정.</li>
                        <li><strong>보험료/실적</strong>: 숫자와 '원' 또는 '만원' 조합 (예: 10만원, 실적 120만원). '실적' 또는 '인정' 키워드를 함께 사용하면 더 정확합니다.</li>
                        <li><strong>보험사</strong>: '생명', '손보', '라이프', '화재', '해상' 키워드가 포함된 텍스트</li>
                        <li><strong>상품분류</strong>: '종합건강', '치매재가간병', '운전자상해' 등</li>
                        <li><strong>상품명</strong>: '@상품명' 또는 '#상품명' 형식으로 입력하면 더 정확하게 인식됩니다. (예: #참좋은운전자보험)</li>
                    </ul>
                </div>
                )}
            </div>
            <textarea
                value={aiText}
                onChange={(e) => setAiText(e.target.value)}
                rows={6}
                className="w-full p-2 border rounded-md focus:ring-2 focus:ring-[var(--background-accent)] bg-[var(--background-tertiary)] border-[var(--border-color-strong)] text-[var(--text-primary)]"
                placeholder="예: 김민준 850520, 오늘 삼성생명 암보험 10만원, 실적 120만원&#10;한 줄에 한 건씩 입력하여 여러 건을 동시에 등록할 수 있습니다."
            />
        </div>
    );
  };

  const renderManualTab = () => (
    <form id="performance-record-form" onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label htmlFor="contractorName" className="block text-sm font-medium text-[var(--text-secondary)]">계약자</label>
          <div className="relative">
            <input 
              type="text" 
              name="contractorName" 
              value={formData.contractorName} 
              onChange={handleNameChange}
              onBlur={() => setTimeout(() => setIsDropdownOpen(false), 200)}
              className="mt-1 w-full p-2 border rounded-md bg-[var(--background-tertiary)] border-[var(--border-color-strong)]"
              autoComplete="off"
            />
            {isDropdownOpen && suggestions.length > 0 && (
              <ul className="absolute z-10 w-full mt-1 bg-[var(--background-secondary)] border border-[var(--border-color-strong)] rounded-md shadow-lg max-h-40 overflow-y-auto">
                {suggestions.map(customer => (
                  <li
                    key={customer.id}
                    onMouseDown={() => handleSelectCustomer(customer)}
                    className="p-2 hover:bg-[var(--background-accent-subtle)] cursor-pointer"
                  >
                    {customer.name} ({customer.birthday})
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
        <div>
          <label htmlFor="dob" className="block text-sm font-medium text-[var(--text-secondary)]">생년월일</label>
          <input type="date" name="dob" value={formData.dob} onChange={handleChange} className="mt-1 w-full p-2 border rounded-md bg-[var(--background-tertiary)] border-[var(--border-color-strong)]" />
        </div>
        <div>
          <label htmlFor="applicationDate" className="block text-sm font-medium text-[var(--text-secondary)]">계약일</label>
          <input type="date" name="applicationDate" value={formData.applicationDate} onChange={handleChange} className="mt-1 w-full p-2 border rounded-md bg-[var(--background-tertiary)] border-[var(--border-color-strong)]" />
        </div>
        <div>
          <label htmlFor="premium" className="block text-sm font-medium text-[var(--text-secondary)]">보험료 (원)</label>
          <input type="number" name="premium" value={formData.premium} onChange={handleChange} className="mt-1 w-full p-2 border rounded-md bg-[var(--background-tertiary)] border-[var(--border-color-strong)]" />
        </div>
        <div>
          <label htmlFor="insuranceCompany" className="block text-sm font-medium text-[var(--text-secondary)]">보험사</label>
          <input type="text" name="insuranceCompany" value={formData.insuranceCompany} onChange={handleChange} className="mt-1 w-full p-2 border rounded-md bg-[var(--background-tertiary)] border-[var(--border-color-strong)]" />
        </div>
        
        <div className="md:col-span-2">
            <label className="block text-sm font-medium text-[var(--text-secondary)]">보장 구분</label>
            <div className="mt-2 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-x-4 gap-y-2">
                {coverageCategories.map(category => (
                    <div key={category} className="flex items-center">
                        <input
                            id={`perf-category-${category}`}
                            name="coverageCategory"
                            type="radio"
                            value={category}
                            checked={formData.coverageCategory === category}
                            onChange={handleChange}
                            className="h-4 w-4 text-[var(--background-accent)] focus:ring-[var(--background-accent)] border-[var(--border-color-strong)]"
                        />
                        <label htmlFor={`perf-category-${category}`} className="ml-2 block text-sm text-[var(--text-secondary)]">
                            {category}
                        </label>
                    </div>
                ))}
            </div>
        </div>

        <div className="md:col-span-2">
          <label htmlFor="productName" className="block text-sm font-medium text-[var(--text-secondary)]">상품명</label>
          <input type="text" name="productName" value={formData.productName} onChange={handleChange} className="mt-1 w-full p-2 border rounded-md bg-[var(--background-tertiary)] border-[var(--border-color-strong)]" />
        </div>
        <div className="md:col-span-2">
          <label htmlFor="recognizedPerformance" className="block text-sm font-medium text-[var(--text-secondary)]">인정실적 (원)</label>
          <input type="number" name="recognizedPerformance" value={formData.recognizedPerformance} onChange={handleChange} className="mt-1 w-full p-2 border rounded-md bg-[var(--background-tertiary)] border-[var(--border-color-strong)]" />
        </div>
      </div>
    </form>
  );

  return (
    <BaseModal isOpen={isOpen} onClose={onClose} className="max-w-2xl w-full">
      <div className="p-4 border-b border-[var(--border-color)] flex justify-between items-center flex-shrink-0">
        <h2 className="text-2xl font-bold text-[var(--text-primary)]">{record ? '실적 수정' : '새 실적 추가'}</h2>
        <button onClick={onClose} className="text-[var(--text-muted)] hover:text-[var(--text-primary)]"><XIcon className="h-6 w-6" /></button>
      </div>

      <div className="p-6 overflow-y-auto custom-scrollbar flex-1 min-h-0">
        {!record && (
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
       <div className={`p-4 bg-[var(--background-tertiary)] border-t border-[var(--border-color)] flex items-center flex-shrink-0 ${activeTab === 'ai' && extractedRecords ? 'justify-between' : 'justify-end'} space-x-2`}>
        {activeTab === 'ai' ? (
          extractedRecords ? (
            <>
              <button type="button" onClick={() => setExtractedRecords(null)} className="px-4 py-2 bg-[var(--background-secondary)] border border-[var(--border-color-strong)] rounded-md text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--background-primary)]">뒤로</button>
              <button type="button" onClick={handleSaveExtracted} className="px-6 py-2 bg-[var(--background-accent)] text-[var(--text-on-accent)] rounded-md text-sm font-medium hover:bg-[var(--background-accent-hover)]">
                  전체 저장 ({extractedRecords.length}건)
              </button>
            </>
          ) : (
            <>
              <button type="button" onClick={onClose} className="px-4 py-2 bg-[var(--background-secondary)] border border-[var(--border-color-strong)] rounded-md text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--background-primary)]">취소</button>
              <button
                onClick={handleAiAnalyze}
                disabled={isLoading}
                className="flex items-center justify-center gap-2 px-4 py-2 bg-[var(--background-accent)] text-[var(--text-on-accent)] font-semibold rounded-md hover:bg-[var(--background-accent-hover)] disabled:opacity-50"
              >
                {isLoading ? <Spinner small /> : <DocumentTextIcon className="h-5 w-5" />}
                {isLoading ? '분석 중...' : '텍스트 분석'}
              </button>
            </>
          )
        ) : ( // manual tab
          <>
            <button type="button" onClick={onClose} className="px-4 py-2 bg-[var(--background-secondary)] border border-[var(--border-color-strong)] rounded-md text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--background-primary)]">취소</button>
            <button type="submit" form="performance-record-form" className="px-6 py-2 bg-[var(--background-accent)] text-[var(--text-on-accent)] rounded-md text-sm font-medium hover:bg-[var(--background-accent-hover)]">{record ? '수정' : '저장'}</button>
          </>
        )}
      </div>
    </BaseModal>
  );
};

export default AddPerformanceRecordModal;
