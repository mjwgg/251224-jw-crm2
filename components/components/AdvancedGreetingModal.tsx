


import React, { useState, useEffect, useCallback, useRef } from 'react';
import BaseModal from '../ui/BaseModal';
import { XIcon, SparklesIcon, ClipboardIcon, CheckIcon, UploadCloudIcon, FileImageIcon, FileAudioIcon } from '../icons';
import Spinner from '../ui/Spinner';
import { generateAdvancedGreeting } from '../../services/geminiService';
import type { ProfileInfo, FavoriteGreeting } from '../../types';

type StyleType = '감성적 안부' | '정보 제공형' | '명언/격언 인용';

// FIX: Moved the 'AdvancedGreetingOptions' interface definition before 'AdvancedGreetingModalProps' to resolve a TypeScript scoping error.
export interface AdvancedGreetingOptions {
  style: StyleType;
  length: number;
  includeDate: boolean;
  includeQuote: boolean;
  keywords: string;
  customerName: string;
  freeformRequest: string;
  examples: string[];
}

interface AdvancedGreetingModalProps {
  isOpen: boolean;
  onClose: () => void;
  profileInfo: ProfileInfo | null;
  favoriteGreetings: FavoriteGreeting[];
  onAddFavoriteGreeting: (content: string) => Promise<void>;
  initialValues?: Partial<AdvancedGreetingOptions>;
  onMessageGenerated: (message: string) => void;
}


const styles: Record<StyleType, { example: string; length: number }> = {
  '감성적 안부': {
    example: "싱그러운 여름 햇살이 가득한 월요일 아침입니다. 새로운 한 주도 활기차게 시작하셨나요? 무더위에 지치지 않도록 건강 잘 챙기시고, 시원한 하루 보내시길 바랍니다.",
    length: 120
  },
  '정보 제공형': {
    example: "최근 변동성이 큰 금융 시장에서 안정적인 자산 관리가 더욱 중요해지고 있습니다. 이번 주 주요 경제 지표와 함께 확인해보시면 좋을 투자 전략을 간단히 정리해 보았습니다. 궁금하신 점은 언제든 편하게 문의해주세요.",
    length: 130
  },
  '명언/격언 인용': {
    example: "'성공은 최종적인 것이 아니며, 실패는 치명적인 것이 아니다. 중요한 것은 계속 나아가는 용기다.' - 윈스턴 처칠. 새로운 도전을 앞두고 계신 고객님께 이 말을 전하며, 항상 곁에서 응원하겠습니다.",
    length: 130
  }
};



const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve((reader.result as string).split(',')[1]);
        reader.onerror = error => reject(error);
    });
};

const getMimeTypeFromFile = (file: File): string => {
    if (file.type && file.type !== '') { return file.type; }
    const extension = file.name.split('.').pop()?.toLowerCase();
    switch(extension) {
        case 'm4a': return 'audio/mp4'; case 'mp3': return 'audio/mpeg';
        case 'wav': return 'audio/wav'; case 'mp4': return 'audio/mp4';
        case 'aac': return 'audio/aac'; case 'ogg': return 'audio/ogg';
        case 'opus': return 'audio/opus'; case 'webm': return 'audio/webm';
        default: return 'application/octet-stream';
    }
};

// FIX: Changed from a default export to a named export to resolve module loading issues.
export const AdvancedGreetingModal: React.FC<AdvancedGreetingModalProps> = ({ isOpen, onClose, profileInfo, favoriteGreetings, onAddFavoriteGreeting, initialValues = {}, onMessageGenerated }) => {
  
  const [options, setOptions] = useState<Omit<AdvancedGreetingOptions, 'examples'>>({
      style: '감성적 안부',
      length: 120,
      includeDate: true,
      includeQuote: false,
      keywords: '',
      customerName: '',
      freeformRequest: '',
  });
  const [examples, setExamples] = useState<string[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const resultRef = useRef<HTMLDivElement>(null);
  
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setErrorState] = useState('');
  const [isCopied, setIsCopied] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const resetState = useCallback(() => {
    setOptions({
        style: '감성적 안부',
        length: styles['감성적 안부'].length,
        includeDate: true,
        includeQuote: false,
        keywords: '',
        customerName: '',
        freeformRequest: '',
    });
    setExamples([]);
    setSelectedFile(null);
    if(fileInputRef.current) fileInputRef.current.value = "";
    setMessage('');
    setErrorState('');
    setIsCopied(false);
    setSaveSuccess(false);
  }, []);

  useEffect(() => {
    if (isOpen) {
      resetState();
      
      const typedInitialValues = initialValues as Partial<AdvancedGreetingOptions>;

      setOptions(prev => ({
        ...prev,
        style: typedInitialValues.style || '감성적 안부',
        length: typedInitialValues.length || styles[typedInitialValues.style || '감성적 안부'].length,
        includeDate: typedInitialValues.includeDate !== undefined ? typedInitialValues.includeDate : true,
        includeQuote: typedInitialValues.includeQuote || false,
        keywords: typedInitialValues.keywords || '',
        customerName: typedInitialValues.customerName || '',
        freeformRequest: typedInitialValues.freeformRequest || '',
      }));
      setExamples(typedInitialValues.examples || []);
    }
  }, [isOpen, initialValues, resetState]);

  const handleToggleExample = (content: string) => {
    setExamples(prev => 
      prev.includes(content) 
        ? prev.filter(e => e !== content) 
        : [...prev, content]
    );
  };

  const handleGenerate = async () => {
    setIsLoading(true);
    setErrorState('');
    setMessage('');
    try {
        const fileData = selectedFile
            ? { base64Data: await fileToBase64(selectedFile), mimeType: getMimeTypeFromFile(selectedFile) }
            : undefined;
        const msg = await generateAdvancedGreeting({
            ...options,
            examples,
            profileName: profileInfo?.name || '담당자',
            file: fileData
        });
        setMessage(msg);
        onMessageGenerated(msg);
        
        // Scroll to result
        setTimeout(() => {
            resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
        }, 100);

    } catch (err) {
        setErrorState(err instanceof Error ? err.message : 'AI 메시지 생성에 실패했습니다.');
    } finally {
        setIsLoading(false);
    }
  };

  const handleCopy = () => {
      if (!message) return;
      navigator.clipboard.writeText(message).then(() => {
          setIsCopied(true);
          setTimeout(() => setIsCopied(false), 2000);
      });
  };

  const handleSaveToFavorites = async () => {
    if (!message) return;
    try {
        await onAddFavoriteGreeting(message);
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 2000);
    } catch (e) {
        // Handle error if needed
    }
  };
  
  const handleDragEvents = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); };
  const handleDragEnter = (e: React.DragEvent) => { handleDragEvents(e); setIsDragging(true); };
  const handleDragLeave = (e: React.DragEvent) => { handleDragEvents(e); setIsDragging(false); };
  const handleDrop = (e: React.DragEvent) => {
      handleDragEvents(e);
      setIsDragging(false);
      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
          setSelectedFile(e.dataTransfer.files[0]);
      }
  };
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
          setSelectedFile(e.target.files[0]);
      }
  };
  const clearFile = () => {
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
  };
  const getFileIcon = (file: File) => {
    if (file.type.startsWith('image/')) return <FileImageIcon className="h-8 w-8 text-blue-400" />;
    if (file.type.startsWith('audio/')) return <FileAudioIcon className="h-8 w-8 text-purple-400" />;
    return null;
  };

  const handleStyleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newStyle = e.target.value as StyleType;
    setOptions(prev => ({
        ...prev,
        style: newStyle,
        length: styles[newStyle].length
    }));
  };

  // FIX: Added return statement to component.
  return (
    <BaseModal isOpen={isOpen} onClose={onClose} className="max-w-xl w-full">
        <div className="p-4 border-b border-[var(--border-color)] flex justify-between items-center">
            <h2 className="text-xl font-bold text-[var(--text-primary)]">AI 맞춤 문구 생성</h2>
            <button onClick={onClose}><XIcon className="h-6 w-6 text-[var(--text-muted)]"/></button>
        </div>
        <div className="p-4 flex-1 min-h-0 overflow-y-auto custom-scrollbar space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label htmlFor="style-select" className="block text-sm font-medium text-[var(--text-secondary)]">문구 스타일</label>
                    <select id="style-select" value={options.style} onChange={handleStyleChange} className="mt-1 block w-full p-2 border border-[var(--border-color-strong)] rounded-md bg-[var(--background-tertiary)]">
                        {Object.keys(styles).map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                </div>
                <div>
                    <label htmlFor="length-slider" className="block text-sm font-medium text-[var(--text-secondary)]">문구 길이 (약 {options.length}자)</label>
                    <input id="length-slider" type="range" min="50" max="300" step="10" value={options.length} onChange={e => setOptions(prev => ({ ...prev, length: parseInt(e.target.value, 10) }))} className="mt-3 w-full h-2 bg-[var(--background-tertiary)] rounded-lg appearance-none cursor-pointer accent-[var(--background-accent)]"/>
                </div>
            </div>
            <p className="text-xs text-[var(--text-muted)] bg-[var(--background-primary)] p-2 rounded">예시: {styles[options.style].example}</p>
            
            <div className="flex flex-wrap gap-4">
                <div className="flex items-center">
                    <input id="includeDate" type="checkbox" checked={options.includeDate} onChange={e => setOptions(prev => ({ ...prev, includeDate: e.target.checked }))} className="h-4 w-4 rounded border-[var(--border-color-strong)] bg-[var(--background-tertiary)] text-[var(--background-accent)] focus:ring-[var(--background-accent)]"/>
                    <label htmlFor="includeDate" className="ml-2 text-sm text-[var(--text-secondary)]">오늘 날짜/계절 포함</label>
                </div>
                <div className="flex items-center">
                    <input id="includeQuote" type="checkbox" checked={options.includeQuote} onChange={e => setOptions(prev => ({ ...prev, includeQuote: e.target.checked }))} className="h-4 w-4 rounded border-[var(--border-color-strong)] bg-[var(--background-tertiary)] text-[var(--background-accent)] focus:ring-[var(--background-accent)]"/>
                    <label htmlFor="includeQuote" className="ml-2 text-sm text-[var(--text-secondary)]">명언/격언 포함</label>
                </div>
            </div>

            {favoriteGreetings && favoriteGreetings.length > 0 && (
                <div className="mt-2">
                    <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">나의 스타일 참고하기 (선택 시 AI가 학습)</label>
                    <div className="space-y-2 max-h-40 overflow-y-auto custom-scrollbar p-2 border border-[var(--border-color-strong)] rounded-md bg-[var(--background-tertiary)]">
                        {favoriteGreetings.map(greeting => (
                             <label key={greeting.id} className="flex items-start gap-2 cursor-pointer hover:bg-[var(--background-secondary)] p-1 rounded" onChange={() => handleToggleExample(greeting.content)}>
                                <input
                                    type="checkbox"
                                    checked={examples.includes(greeting.content)}
                                    onChange={() => {}} // handled by label wrapper
                                    className="mt-1 h-4 w-4 rounded border-[var(--border-color-strong)] bg-[var(--background-primary)] text-[var(--background-accent)] focus:ring-[var(--background-accent)] flex-shrink-0"
                                />
                                <span className="text-sm text-[var(--text-primary)] leading-snug select-none">{greeting.content}</span>
                            </label>
                        ))}
                    </div>
                    <p className="text-xs text-[var(--text-muted)] mt-1">
                        * 선택한 문구들의 말투와 스타일을 AI가 모방하여 작성합니다.
                    </p>
                </div>
            )}

            <div>
                <label htmlFor="keywords" className="block text-sm font-medium text-[var(--text-secondary)]">포함할 키워드 (쉼표로 구분)</label>
                <input id="keywords" type="text" value={options.keywords} onChange={e => setOptions(prev => ({ ...prev, keywords: e.target.value }))} className="mt-1 w-full p-2 border border-[var(--border-color-strong)] rounded-md bg-[var(--background-tertiary)]" placeholder="예: 경제, 금융, 뉴스"/>
            </div>
            <div>
                <label htmlFor="customerName" className="block text-sm font-medium text-[var(--text-secondary)]">고객 이름 (선택 사항)</label>
{/* FIX: Corrected incomplete onChange handler. */}
                <input id="customerName" type="text" value={options.customerName} onChange={e => setOptions(prev => ({ ...prev, customerName: e.target.value }))} className="mt-1 w-full p-2 border border-[var(--border-color-strong)] rounded-md bg-[var(--background-tertiary)]" placeholder="예: 김민준"/>
            </div>
            <div>
                <label htmlFor="freeformRequest" className="block text-sm font-medium text-[var(--text-secondary)]">자유 요청사항</label>
                <textarea id="freeformRequest" rows={2} value={options.freeformRequest} onChange={e => setOptions(prev => ({ ...prev, freeformRequest: e.target.value }))} className="mt-1 w-full p-2 border border-[var(--border-color-strong)] rounded-md bg-[var(--background-tertiary)]"/>
            </div>
            
            <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mt-2">이미지/음성 파일 첨부하여 문맥 부여</label>
                {selectedFile ? (
                    <div className="mt-1 p-2 border-2 border-dashed rounded-lg bg-[var(--background-tertiary)] border-[var(--border-color-strong)]">
                        <div className="flex items-center justify-between text-[var(--text-secondary)]">
                            <div className="flex items-center gap-2">
                                {getFileIcon(selectedFile)}
                                <span className="text-sm font-medium text-[var(--text-primary)]">{selectedFile.name}</span>
                            </div>
                            <button type="button" onClick={clearFile} className="p-1 text-[var(--text-danger)] hover:bg-red-500/10 rounded-full"><XIcon className="h-5 w-5"/></button>
                        </div>
                    </div>
                ) : (
                    <div
                        onDragEnter={handleDragEnter} onDragLeave={handleDragLeave} onDragOver={handleDragEvents} onDrop={handleDrop}
                        className={`mt-1 p-4 border-2 border-dashed rounded-lg text-center transition-colors ${isDragging ? 'border-[var(--background-accent)] bg-[var(--background-accent-subtle)]' : 'border-[var(--border-color-strong)]'} hover:border-[var(--border-color)] cursor-pointer`}
                        onClick={() => fileInputRef.current?.click()}
                    >
                        <input ref={fileInputRef} type="file" onChange={handleFileChange} className="hidden" accept="image/*,audio/*,.m4a" />
                        <div className="flex flex-col items-center justify-center text-[var(--text-muted)]">
                            <UploadCloudIcon className="h-8 w-8" />
                            <p className="mt-1 text-sm">클릭 또는 드래그 앤 드롭</p>
                        </div>
                    </div>
                )}
            </div>

            {error && <p className="text-center text-sm text-[var(--text-danger)] bg-red-500/10 p-2 rounded-md">{error}</p>}
            {isLoading && <div className="flex justify-center py-4"><Spinner /></div>}
            {message && !isLoading && (
                <div ref={resultRef} className="p-4 bg-[var(--background-primary)] rounded-md border border-[var(--border-color)] space-y-2 animate-fade-in">
                    <h3 className="text-sm font-semibold text-[var(--text-primary)]">AI 생성 결과</h3>
                    <pre className="whitespace-pre-wrap font-sans text-sm text-[var(--text-secondary)]">{message}</pre>
                    <div className="flex justify-end items-center gap-2">
                        <button onClick={handleCopy} className="flex items-center px-2 py-1 bg-[var(--background-tertiary)] rounded-md text-xs font-medium">
                            {isCopied ? <CheckIcon className="h-4 w-4 text-green-500 mr-1"/> : <ClipboardIcon className="h-4 w-4 mr-1" />}
                            {isCopied ? '복사됨' : '복사'}
                        </button>
                        <button onClick={handleSaveToFavorites} className={`flex items-center px-2 py-1 rounded-md text-xs font-medium ${saveSuccess ? 'bg-green-100 text-green-700' : 'bg-[var(--background-tertiary)]'}`}>
                            {saveSuccess ? <CheckIcon className="h-4 w-4 mr-1"/> : <SparklesIcon className="h-4 w-4 mr-1"/>}
                            {saveSuccess ? '저장됨' : '내 스타일에 추가'}
                        </button>
                    </div>
                </div>
            )}
        </div>
         <div className="p-4 bg-[var(--background-tertiary)] border-t border-[var(--border-color)] flex justify-between items-center">
            <button onClick={onClose} className="px-4 py-2 bg-[var(--background-secondary)] border border-[var(--border-color-strong)] rounded-md">닫기</button>
            <button onClick={handleGenerate} disabled={isLoading} className="flex items-center gap-2 px-4 py-2 bg-[var(--background-accent)] text-[var(--text-on-accent)] rounded-md font-medium disabled:opacity-50">
                {isLoading ? <Spinner small /> : <SparklesIcon className="h-5 w-5"/>}
                {isLoading ? '생성 중...' : '메시지 생성'}
            </button>
        </div>
    </BaseModal>
  );
};
