
import React, { useState, useRef, useEffect } from 'react';
import type { Customer, ProfileInfo, FavoriteGreeting, MessageTemplate, PerformancePrediction, PerformanceRecord, Appointment } from '../types';
import { 
    analyzePolicyWithQuestion,
    generateAdvancedGreeting,
    geocodeAddress,
    generatePersonalizedGreeting
} from '../services/geminiService';
import { hashPassword } from '../services/cryptoService';
import Spinner from './ui/Spinner';
import { 
    ClipboardIcon, CheckIcon, UploadCloudIcon, TrashIcon, PlusIcon, SparklesIcon, XIcon, 
    PencilIcon, LocationMarkerIcon, CogIcon, DownloadIcon, DocumentTextIcon, MessageIcon, 
    FileImageIcon, FileAudioIcon, BrainIcon, EyeIcon, EyeOffIcon, BriefcaseIcon, CalculatorIcon
} from './icons';
import { AdvancedGreetingModal } from './AdvancedGreetingModal';
import BaseModal from './ui/BaseModal';
import MeetingTypeColorSettingsModal from './MeetingTypeColorSettingsModal';
import MeetingTypeManagementModal from './MeetingTypeManagementModal';
import ExportActivityReportModal from './ExportActivityReportModal';
import TemplateLibraryModal from './TemplateLibraryModal';
import InsuranceInfoModal from './InsuranceInfoModal';
import PensionCalculatorsModal from './PensionCalculatorsModal';

type Theme = 'light' | 'dark' | 'comfortable' | 'sepia' | 'clean' | 'system';
type FontSize = 'small' | 'medium' | 'large';
type FontFamily = 'default' | 'gothic' | 'handwriting' | 'handwriting2' | 'handwriting3';

const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve((reader.result as string).split(',')[1]);
        reader.onerror = error => reject(error);
    });
};

// --- Internal Components (Modals) ---

interface MyStyleModalProps {
  isOpen: boolean;
  onClose: () => void;
  profileInfo: ProfileInfo | null;
  favoriteGreetings: FavoriteGreeting[];
  onAddFavoriteGreeting: (content: string) => Promise<void>;
  onDeleteFavoriteGreeting: (id: string) => Promise<void>;
}

const MyStyleModal: React.FC<MyStyleModalProps> = ({ isOpen, onClose, profileInfo, favoriteGreetings, onAddFavoriteGreeting, onDeleteFavoriteGreeting }) => {
  const [newStyleText, setNewStyleText] = useState('');

    const handleAdd = async () => {
        if (newStyleText.trim()) {
            await onAddFavoriteGreeting(newStyleText.trim());
            setNewStyleText('');
        }
    };

    const handleCopy = (text: string) => {
        navigator.clipboard.writeText(text);
        alert('복사되었습니다.');
    };

    return (
        <BaseModal isOpen={isOpen} onClose={onClose} className="max-w-lg w-full">
            <div className="p-4 border-b border-[var(--border-color)] flex justify-between items-center">
                <h2 className="text-xl font-bold text-[var(--text-primary)]">나의 스타일 (자주 쓰는 문구)</h2>
                <button onClick={onClose}><XIcon className="h-6 w-6 text-[var(--text-muted)]" /></button>
            </div>
            <div className="p-4 flex-1 min-h-0 overflow-y-auto custom-scrollbar space-y-4">
                 <div className="flex gap-2">
                    <input 
                        type="text" 
                        value={newStyleText} 
                        onChange={(e) => setNewStyleText(e.target.value)} 
                        placeholder="새로운 문구 추가..."
                        className="flex-1 p-2 border border-[var(--border-color-strong)] rounded-md bg-[var(--background-tertiary)]"
                    />
                    <button onClick={handleAdd} className="px-4 py-2 bg-[var(--background-accent)] text-white rounded-md">추가</button>
                 </div>
                 <div className="space-y-2">
                    {favoriteGreetings.map(greeting => (
                        <div key={greeting.id} className="p-3 bg-[var(--background-tertiary)] rounded-md flex justify-between items-start gap-2">
                            <p className="text-sm text-[var(--text-secondary)] whitespace-pre-wrap">{greeting.content}</p>
                            <div className="flex flex-col gap-1">
                                <button onClick={() => handleCopy(greeting.content)} className="text-[var(--text-muted)] hover:text-[var(--text-accent)]"><ClipboardIcon className="h-4 w-4"/></button>
                                <button onClick={() => onDeleteFavoriteGreeting(greeting.id)} className="text-[var(--text-muted)] hover:text-[var(--text-danger)]"><TrashIcon className="h-4 w-4"/></button>
                            </div>
                        </div>
                    ))}
                 </div>
            </div>
        </BaseModal>
    );
};

interface PolicyAnalysisModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const PolicyAnalysisModal: React.FC<PolicyAnalysisModalProps> = ({ isOpen, onClose }) => {
    const [file, setFile] = useState<File | null>(null);
    const [question, setQuestion] = useState('');
    const [answer, setAnswer] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
        }
    };

    const handleAnalyze = async () => {
        if (!file || !question.trim()) return;
        setIsLoading(true);
        try {
            const base64 = await fileToBase64(file);
            const mimeType = file.type;
            const result = await analyzePolicyWithQuestion({ base64Data: base64, mimeType }, question);
            setAnswer(result);
        } catch (e) {
            setAnswer('분석 중 오류가 발생했습니다. 다시 시도해주세요.');
            console.error(e);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <BaseModal isOpen={isOpen} onClose={onClose} className="max-w-2xl w-full">
            <div className="p-4 border-b border-[var(--border-color)] flex justify-between items-center">
                <h2 className="text-xl font-bold text-[var(--text-primary)]">AI 약관 분석</h2>
                <button onClick={onClose}><XIcon className="h-6 w-6 text-[var(--text-muted)]" /></button>
            </div>
            <div className="p-6 space-y-4 overflow-y-auto custom-scrollbar flex-1 min-h-0">
                <div>
                    <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">약관 파일 (PDF/이미지)</label>
                    <div 
                        className="border-2 border-dashed border-[var(--border-color-strong)] rounded-lg p-6 text-center cursor-pointer hover:bg-[var(--background-tertiary)]"
                        onClick={() => fileInputRef.current?.click()}
                    >
                        <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="application/pdf,image/*" />
                        <UploadCloudIcon className="h-10 w-10 mx-auto text-[var(--text-muted)] mb-2" />
                        <p className="text-sm text-[var(--text-secondary)]">{file ? file.name : '클릭하여 파일 업로드'}</p>
                    </div>
                </div>
                <div>
                    <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">질문 내용</label>
                    <textarea 
                        value={question}
                        onChange={(e) => setQuestion(e.target.value)}
                        placeholder="예: 이 약관에서 암 진단비 지급 기준이 어떻게 되나요?"
                        className="w-full p-3 border border-[var(--border-color-strong)] rounded-md bg-[var(--background-tertiary)] h-24"
                    />
                </div>
                
                {answer && (
                    <div className="p-4 bg-[var(--background-tertiary)] rounded-lg border border-[var(--border-color)]">
                        <h3 className="font-bold text-[var(--text-primary)] mb-2">AI 답변:</h3>
                        <div className="prose prose-sm text-[var(--text-secondary)] whitespace-pre-wrap">
                            {answer}
                        </div>
                    </div>
                )}
            </div>
            <div className="p-4 border-t border-[var(--border-color)] flex justify-end gap-2 bg-[var(--background-tertiary)]">
                <button onClick={onClose} className="px-4 py-2 rounded-md border border-[var(--border-color-strong)] bg-[var(--background-secondary)]">닫기</button>
                <button onClick={handleAnalyze} disabled={isLoading || !file || !question} className="px-6 py-2 rounded-md bg-[var(--background-accent)] text-white disabled:opacity-50 flex items-center gap-2">
                    {isLoading ? <Spinner small /> : <SparklesIcon className="h-4 w-4" />}
                    분석하기
                </button>
            </div>
        </BaseModal>
    );
};


// --- Main Component ---

interface TouchRecommendationProps {
  customers: Customer[];
  appointments: Appointment[];
  performanceRecords: PerformanceRecord[];
  performancePredictions: PerformancePrediction[];
  profileInfo: ProfileInfo | null;
  onSaveProfileInfo: (profile: ProfileInfo) => void;
  onSetTheme: (theme: Theme) => void;
  currentTheme: Theme;
  favoriteGreetings: FavoriteGreeting[];
  onAddFavoriteGreeting: (content: string) => Promise<void>;
  onDeleteFavoriteGreeting: (id: string) => Promise<void>;
  onSetFontSize: (size: FontSize) => void;
  currentFontSize: FontSize;
  onSetFontFamily: (font: FontFamily) => void;
  currentFontFamily: FontFamily;
  onClearDemoData: () => void;
  onOpenGuideModal: () => void;
  templates: MessageTemplate[];
  onAddTemplate: (template: Omit<MessageTemplate, 'id' | 'createdAt'>) => Promise<void>;
  onUpdateTemplate: (template: MessageTemplate) => Promise<void>;
  onDeleteTemplate: (id: string) => Promise<void>;
  geocodeAndUpdateCustomers: (addressesToGeocode: Map<string, Set<'home' | 'work'>>, onProgress: (current: number, total: number) => void) => Promise<void>;
  onSelectCustomer: (customer: Customer, initialTab?: 'details' | 'consultations' | 'contracts' | 'callHistory') => void;
  onOpenNearbyCustomersModal: () => void;
  onOpenGoalBoardModal: () => void;
  onExport: () => void;
  onImport: () => void;
}

export const TouchRecommendation: React.FC<TouchRecommendationProps> = ({ 
    customers, 
    appointments, 
    performanceRecords, 
    performancePredictions, 
    profileInfo, 
    onSaveProfileInfo, 
    onSetTheme, 
    currentTheme,
    favoriteGreetings,
    onAddFavoriteGreeting,
    onDeleteFavoriteGreeting,
    onSetFontSize,
    currentFontSize,
    onSetFontFamily,
    currentFontFamily,
    onClearDemoData,
    onOpenGuideModal,
    templates,
    onAddTemplate,
    onUpdateTemplate,
    onDeleteTemplate,
    geocodeAndUpdateCustomers,
    onSelectCustomer,
    onOpenNearbyCustomersModal,
    onOpenGoalBoardModal,
    onExport,
    onImport
}) => {
    const [isAdvancedGreetingModalOpen, setIsAdvancedGreetingModalOpen] = useState(false);
    const [isMyStyleModalOpen, setIsMyStyleModalOpen] = useState(false);
    const [isPolicyAnalysisModalOpen, setIsPolicyAnalysisModalOpen] = useState(false);
    const [isColorSettingsModalOpen, setIsColorSettingsModalOpen] = useState(false);
    const [isMeetingTypeModalOpen, setIsMeetingTypeModalOpen] = useState(false);
    const [isExportReportModalOpen, setIsExportReportModalOpen] = useState(false);
    const [isTemplateLibraryModalOpen, setIsTemplateLibraryModalOpen] = useState(false);
    const [isInsuranceInfoModalOpen, setIsInsuranceInfoModalOpen] = useState(false);
    const [isPensionModalOpen, setIsPensionModalOpen] = useState(false);

    const [isEditingProfile, setIsEditingProfile] = useState(false);
    const [editName, setEditName] = useState('');
    const [editOrg, setEditOrg] = useState('');

    const [generatedMessage, setGeneratedMessage] = useState('');

    const [migrationProgress, setMigrationProgress] = useState<{ current: number; total: number } | null>(null);

    // Password State
    const [passwordState, setPasswordState] = useState({
        currentPassword: '',
        newPassword: '',
        confirm: '',
        isEditing: false,
        isRemoving: false
    });
    const [isLockEnabled, setIsLockEnabled] = useState(localStorage.getItem('app_lock_enabled') === 'true');

    const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setPasswordState(prev => ({ ...prev, [name]: value }));
    };

    const savePassword = async () => {
        if (passwordState.newPassword.length < 4) {
             alert("비밀번호는 4자리 이상이어야 합니다.");
             return;
        }
        if (passwordState.newPassword !== passwordState.confirm) {
            alert("비밀번호가 일치하지 않습니다.");
            return;
        }

        // 비밀번호가 이미 설정되어 있는 경우 (변경), 현재 비밀번호 확인
        if (isLockEnabled) {
            const storedHash = localStorage.getItem('app_password_hash');
            const currentInputHash = await hashPassword(passwordState.currentPassword);
            
            if (storedHash && currentInputHash !== storedHash) {
                alert("현재 비밀번호가 일치하지 않습니다.");
                return;
            }
        }

        const hash = await hashPassword(passwordState.newPassword);
        localStorage.setItem('app_password_hash', hash);
        localStorage.setItem('app_lock_enabled', 'true');
        // Ensure PasswordLock treats this as a valid authenticated state for future
        localStorage.setItem('initial_auth_passed', 'true'); 
        setIsLockEnabled(true);
        alert("비밀번호가 설정되었습니다. 다음 실행부터 잠금화면이 표시됩니다.");
        setPasswordState({ currentPassword: '', newPassword: '', confirm: '', isEditing: false, isRemoving: false });
    };

    const confirmRemovePassword = async () => {
        const storedHash = localStorage.getItem('app_password_hash');
        const currentInputHash = await hashPassword(passwordState.currentPassword);
        
        if (storedHash && currentInputHash === storedHash) {
            localStorage.removeItem('app_password_hash');
            localStorage.setItem('app_lock_enabled', 'false');
            setIsLockEnabled(false);
            alert('비밀번호 잠금이 해제되었습니다.');
            setPasswordState({ currentPassword: '', newPassword: '', confirm: '', isEditing: false, isRemoving: false });
        } else {
            alert("비밀번호가 일치하지 않습니다.");
        }
    };

    const cancelPasswordEdit = () => {
        setPasswordState({ currentPassword: '', newPassword: '', confirm: '', isEditing: false, isRemoving: false });
    };
    
    const handleProfileEdit = () => {
        setEditName(profileInfo?.name || '');
        setEditOrg(profileInfo?.organization || '');
        setIsEditingProfile(true);
    };

    const handleProfileSave = () => {
        onSaveProfileInfo({
            id: 'user_profile',
            name: editName,
            organization: editOrg
        });
        setIsEditingProfile(false);
    };

    const handleAddressMigration = async () => {
        const addressesToGeocode = new Map<string, Set<'home' | 'work'>>();
        
        customers.forEach(c => {
            const types = new Set<'home' | 'work'>();
            if (c.homeAddress && c.homeAddress !== '미확인' && c.homeLat === undefined) types.add('home');
            if (c.workAddress && c.workAddress !== '미확인' && c.workLat === undefined) types.add('work');
            
            if (types.size > 0) {
                addressesToGeocode.set(c.id, types);
            }
        });

        if (addressesToGeocode.size === 0) {
            alert('업데이트할 주소 정보가 없습니다.');
            return;
        }

        if (confirm(`${addressesToGeocode.size}명의 고객 주소 좌표를 변환하시겠습니까? (시간이 소요될 수 있습니다)`)) {
            try {
                await geocodeAndUpdateCustomers(addressesToGeocode, (current, total) => {
                    setMigrationProgress({ current, total });
                });
                alert('주소 좌표 변환이 완료되었습니다.');
            } catch (e) {
                console.error(e);
                alert('좌표 변환 중 오류가 발생했습니다.');
            } finally {
                setMigrationProgress(null);
            }
        }
    };

    return (
        <div className="animate-fade-in pb-20 md:pb-0">
             <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-[var(--text-primary)]">⚙️ 기능 및 설정</h1>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                {/* Profile Card */}
                <div className="bg-[var(--background-secondary)] p-6 rounded-lg shadow-lg border border-[var(--border-color)] animate-fade-in-up">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-2xl font-semibold text-[var(--text-primary)]">프로필 설정</h2>
                        {!isEditingProfile ? (
                            <button onClick={handleProfileEdit} className="text-[var(--text-accent)] hover:underline text-sm font-medium">수정</button>
                        ) : (
                             <div className="flex gap-2">
                                <button onClick={() => setIsEditingProfile(false)} className="text-[var(--text-muted)] hover:text-[var(--text-primary)] text-sm font-medium">취소</button>
                                <button onClick={handleProfileSave} className="text-green-500 hover:text-green-600 text-sm font-bold">저장</button>
                             </div>
                        )}
                    </div>
                    {isEditingProfile ? (
                        <div className="space-y-3">
                            <div>
                                <label className="block text-sm font-medium text-[var(--text-secondary)]">이름</label>
                                <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)} className="mt-1 w-full p-2 bg-[var(--background-tertiary)] border border-[var(--border-color-strong)] rounded-md" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-[var(--text-secondary)]">소속</label>
                                <input type="text" value={editOrg} onChange={(e) => setEditOrg(e.target.value)} className="mt-1 w-full p-2 bg-[var(--background-tertiary)] border border-[var(--border-color-strong)] rounded-md" />
                            </div>
                        </div>
                    ) : (
                        <div className="flex items-center gap-4">
                             <div className="w-16 h-16 bg-[var(--background-accent)] rounded-full flex items-center justify-center text-[var(--text-on-accent)] font-bold text-2xl">
                                {profileInfo?.name?.[0] || 'U'}
                            </div>
                            <div>
                                <p className="text-xl font-bold text-[var(--text-primary)]">{profileInfo?.name || '사용자'}</p>
                                <p className="text-[var(--text-secondary)]">{profileInfo?.organization || '소속 없음'}</p>
                            </div>
                        </div>
                    )}
                    
                    {/* Password Settings */}
                    <div className="mt-6 pt-6 border-t border-[var(--border-color)]">
                        <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-3">비밀번호 설정</h3>
                        {passwordState.isRemoving ? (
                            <div className="space-y-3 animate-fade-in">
                                <p className="text-sm text-[var(--text-danger)] font-medium">잠금을 해제하려면 현재 비밀번호를 입력하세요.</p>
                                <div>
                                    <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">현재 비밀번호</label>
                                    <input 
                                        type="password" 
                                        name="currentPassword" 
                                        value={passwordState.currentPassword} 
                                        onChange={handlePasswordChange}
                                        className="w-full p-2 bg-[var(--background-tertiary)] border border-[var(--border-color-strong)] rounded-md text-[var(--text-primary)]"
                                        placeholder="비밀번호 입력"
                                        autoFocus
                                    />
                                </div>
                                <div className="flex justify-end gap-2">
                                    <button onClick={cancelPasswordEdit} className="px-3 py-1.5 text-sm bg-[var(--background-secondary)] border border-[var(--border-color-strong)] rounded-md text-sm font-medium text-[var(--text-secondary)]">취소</button>
                                    <button onClick={confirmRemovePassword} className="px-3 py-1.5 text-sm bg-[var(--background-danger)] text-white rounded-md hover:bg-[var(--background-danger-hover)]">해제 확인</button>
                                </div>
                            </div>
                        ) : passwordState.isEditing ? (
                            <div className="space-y-3 animate-fade-in">
                                {isLockEnabled && (
                                    <div>
                                        <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">현재 비밀번호</label>
                                        <input 
                                            type="password" 
                                            name="currentPassword" 
                                            value={passwordState.currentPassword} 
                                            onChange={handlePasswordChange}
                                            className="w-full p-2 bg-[var(--background-tertiary)] border border-[var(--border-color-strong)] rounded-md text-[var(--text-primary)]"
                                            placeholder="현재 비밀번호 입력"
                                        />
                                    </div>
                                )}
                                <div>
                                    <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">새 비밀번호</label>
                                    <input 
                                        type="password" 
                                        name="newPassword" 
                                        value={passwordState.newPassword} 
                                        onChange={handlePasswordChange}
                                        className="w-full p-2 bg-[var(--background-tertiary)] border border-[var(--border-color-strong)] rounded-md text-[var(--text-primary)]"
                                        placeholder="4자리 이상 입력"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">비밀번호 확인</label>
                                    <input 
                                        type="password" 
                                        name="confirm" 
                                        value={passwordState.confirm} 
                                        onChange={handlePasswordChange}
                                        className="w-full p-2 bg-[var(--background-tertiary)] border border-[var(--border-color-strong)] rounded-md text-[var(--text-primary)]"
                                        placeholder="비밀번호 재입력"
                                    />
                                </div>
                                <div className="flex justify-end gap-2">
                                    <button onClick={cancelPasswordEdit} className="px-3 py-1.5 text-sm bg-[var(--background-secondary)] border border-[var(--border-color-strong)] rounded-md text-sm font-medium text-[var(--text-secondary)]">취소</button>
                                    <button onClick={savePassword} className="px-3 py-1.5 text-sm bg-[var(--background-accent)] text-white rounded-md">저장</button>
                                </div>
                            </div>
                        ) : (
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-[var(--text-secondary)]">
                                    {isLockEnabled ? '현재 비밀번호가 설정되어 있습니다.' : '비밀번호가 설정되어 있지 않습니다.'}
                                </span>
                                <div className="flex gap-2">
                                    {isLockEnabled && (
                                        <button
                                            onClick={() => setPasswordState(prev => ({ ...prev, isRemoving: true, currentPassword: '' }))}
                                            className="px-3 py-1.5 text-sm bg-[var(--background-danger)] text-white border border-transparent rounded-md hover:bg-[var(--background-danger-hover)]"
                                        >
                                            잠금 해제
                                        </button>
                                    )}
                                    <button 
                                        onClick={() => setPasswordState(prev => ({ ...prev, isEditing: true, currentPassword: '' }))}
                                        className="px-3 py-1.5 text-sm bg-[var(--background-tertiary)] border border-[var(--border-color-strong)] rounded-md hover:bg-[var(--background-primary)] text-[var(--text-primary)]"
                                    >
                                        {isLockEnabled ? '비밀번호 변경' : '비밀번호 설정'}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
                
                {/* Settings Card (Theme, Font) */}
                <div className="bg-[var(--background-secondary)] p-6 rounded-lg shadow-lg border border-[var(--border-color)] animate-fade-in-up">
                    <h2 className="text-2xl font-semibold text-[var(--text-primary)] mb-4">화면 설정</h2>
                    <div className="space-y-6">
                        <div>
                            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">테마</label>
                            <div className="flex flex-wrap gap-2">
                                {(['light', 'dark', 'comfortable', 'sepia', 'clean', 'system'] as const).map(t => (
                                    <button
                                        key={t}
                                        onClick={() => onSetTheme(t)}
                                        className={`px-3 py-1.5 rounded-md text-sm border transition-colors ${currentTheme === t ? 'bg-[var(--background-accent)] text-[var(--text-on-accent)] border-transparent' : 'bg-[var(--background-tertiary)] text-[var(--text-secondary)] border-[var(--border-color-strong)] hover:bg-[var(--background-primary)]'}`}
                                    >
                                        {{ light: '라이트', dark: '다크', comfortable: '편안한', sepia: '세피아', clean: '클린', system: '시스템' }[t]}
                                    </button>
                                ))}
                            </div>
                        </div>
                         <div>
                            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">글자 크기</label>
                            <div className="flex flex-wrap gap-2">
                                {(['small', 'medium', 'large'] as const).map(s => (
                                    <button
                                        key={s}
                                        onClick={() => onSetFontSize(s)}
                                        className={`px-3 py-1.5 rounded-md text-sm border transition-colors ${currentFontSize === s ? 'bg-[var(--background-accent)] text-[var(--text-on-accent)] border-transparent' : 'bg-[var(--background-tertiary)] text-[var(--text-secondary)] border-[var(--border-color-strong)] hover:bg-[var(--background-primary)]'}`}
                                    >
                                        {{ small: '작게', medium: '보통', large: '크게' }[s]}
                                    </button>
                                ))}
                            </div>
                        </div>
                         <div>
                            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">글씨체</label>
                            <div className="flex flex-wrap gap-2">
                                {(['default', 'gothic', 'handwriting', 'handwriting2', 'handwriting3'] as const).map(f => (
                                    <button
                                        key={f}
                                        onClick={() => onSetFontFamily(f)}
                                        className={`px-3 py-1.5 rounded-md text-sm border transition-colors ${currentFontFamily === f ? 'bg-[var(--background-accent)] text-[var(--text-on-accent)] border-transparent' : 'bg-[var(--background-tertiary)] text-[var(--text-secondary)] border-[var(--border-color-strong)] hover:bg-[var(--background-primary)]'}`}
                                        style={{ fontFamily: f === 'default' ? '' : f === 'gothic' ? 'Gothic A1' : f === 'handwriting' ? 'Poor Story' : f === 'handwriting2' ? 'Do Hyeon' : 'Yeon Sung' }}
                                    >
                                        {{ default: '기본', gothic: '고딕', handwriting: '손글씨1', handwriting2: '손글씨2', handwriting3: '손글씨3' }[f]}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Additional Features & Guide */}
            <div className="bg-[var(--background-secondary)] p-6 rounded-lg shadow-lg border border-[var(--border-color)] animate-fade-in-up mb-8">
                <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-4">추가 기능 및 가이드</h2>
                 <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                     <button onClick={() => setIsTemplateLibraryModalOpen(true)} className="p-4 bg-[var(--background-tertiary)] rounded-lg hover:bg-[var(--background-primary)] border border-[var(--border-color-strong)] flex flex-col items-center justify-center text-center transition-all hover:scale-105">
                        <DocumentTextIcon className="h-8 w-8 text-indigo-500 mb-2" />
                        <span className="font-bold text-[var(--text-primary)]">템플릿 라이브러리</span>
                        <span className="text-xs text-[var(--text-muted)] mt-1">자주 쓰는 메시지 관리</span>
                    </button>
                     <button onClick={onOpenGoalBoardModal} className="p-4 bg-[var(--background-tertiary)] rounded-lg hover:bg-[var(--background-primary)] border border-[var(--border-color-strong)] flex flex-col items-center justify-center text-center transition-all hover:scale-105">
                        <BrainIcon className="h-8 w-8 text-purple-500 mb-2" />
                        <span className="font-bold text-[var(--text-primary)]">목표 관리 보드</span>
                         <span className="text-xs text-[var(--text-muted)] mt-1">만다라트, 마인드맵 등</span>
                    </button>
                     <button onClick={() => setIsColorSettingsModalOpen(true)} className="p-4 bg-[var(--background-tertiary)] rounded-lg hover:bg-[var(--background-primary)] border border-[var(--border-color-strong)] flex flex-col items-center justify-center text-center transition-all hover:scale-105">
                        <span className="text-2xl mb-2">🎨</span>
                        <span className="font-bold text-[var(--text-primary)]">미팅 색상 설정</span>
                         <span className="text-xs text-[var(--text-muted)] mt-1">일정 유형별 색상 커스텀</span>
                    </button>
                     <button onClick={() => setIsMeetingTypeModalOpen(true)} className="p-4 bg-[var(--background-tertiary)] rounded-lg hover:bg-[var(--background-primary)] border border-[var(--border-color-strong)] flex flex-col items-center justify-center text-center transition-all hover:scale-105">
                        <span className="text-2xl mb-2">🏷️</span>
                        <span className="font-bold text-[var(--text-primary)]">미팅 유형 관리</span>
                         <span className="text-xs text-[var(--text-muted)] mt-1">일정 카테고리 편집</span>
                    </button>
                     <button onClick={() => setIsExportReportModalOpen(true)} className="p-4 bg-[var(--background-tertiary)] rounded-lg hover:bg-[var(--background-primary)] border border-[var(--border-color-strong)] flex flex-col items-center justify-center text-center transition-all hover:scale-105">
                        <DownloadIcon className="h-8 w-8 text-blue-600 mb-2" />
                        <span className="font-bold text-[var(--text-primary)]">활동 리포트 내보내기</span>
                         <span className="text-xs text-[var(--text-muted)] mt-1">주간/월간 활동 내역 엑셀 다운로드</span>
                    </button>
                    <button onClick={() => setIsInsuranceInfoModalOpen(true)} className="p-4 bg-[var(--background-tertiary)] rounded-lg hover:bg-[var(--background-primary)] border border-[var(--border-color-strong)] flex flex-col items-center justify-center text-center transition-all hover:scale-105">
                        <BriefcaseIcon className="h-8 w-8 text-teal-600 mb-2" />
                        <span className="font-bold text-[var(--text-primary)]">보험사 연락처/링크</span>
                         <span className="text-xs text-[var(--text-muted)] mt-1">콜센터, 팩스, 전산 바로가기</span>
                    </button>
                    <button onClick={() => setIsPensionModalOpen(true)} className="p-4 bg-[var(--background-tertiary)] rounded-lg hover:bg-[var(--background-primary)] border border-[var(--border-color-strong)] flex flex-col items-center justify-center text-center transition-all hover:scale-105">
                        <CalculatorIcon className="h-8 w-8 text-orange-500 mb-2" />
                        <span className="font-bold text-[var(--text-primary)]">보험사별 연금계산기</span>
                         <span className="text-xs text-[var(--text-muted)] mt-1">국민, 미래에셋, IBK 등</span>
                    </button>
                </div>
                 <button onClick={onOpenGuideModal} className="w-full mt-4 p-3 bg-[var(--background-accent-subtle)] text-[var(--text-accent)] rounded-lg font-bold text-center hover:bg-opacity-80 transition-colors">
                    📖 사용 가이드 보기
                </button>
            </div>

            {/* Data Management Section */}
            <div className="bg-[var(--background-secondary)] p-6 rounded-lg shadow-lg border border-[var(--border-color)] mb-8 animate-fade-in-up">
                <h2 className="text-2xl font-semibold text-[var(--text-primary)] mb-4">데이터 및 기타</h2>
                <div className="flex flex-wrap gap-4">
                    <button onClick={onExport} className="px-4 py-2 bg-[var(--background-tertiary)] text-[var(--text-secondary)] border border-[var(--border-color-strong)] rounded-md hover:bg-[var(--background-primary)] text-sm font-medium">
                        전체 데이터 백업 (내보내기)
                    </button>
                     <button onClick={onImport} className="px-4 py-2 bg-[var(--background-tertiary)] text-[var(--text-secondary)] border border-[var(--border-color-strong)] rounded-md hover:bg-[var(--background-primary)] text-sm font-medium">
                        데이터 복원 (불러오기)
                    </button>
                    <button onClick={onClearDemoData} className="px-4 py-2 bg-red-100 text-red-600 border border-red-200 rounded-md hover:bg-red-200 text-sm font-medium ml-auto">
                        예시 데이터 전체 삭제
                    </button>
                </div>
                 {migrationProgress && (
                    <div className="mt-4">
                        <div className="w-full bg-[var(--background-tertiary)] rounded-full h-2.5">
                            <div className="bg-[var(--background-accent)] h-2.5 rounded-full transition-all duration-300" style={{ width: `${(migrationProgress.current / migrationProgress.total) * 100}%` }}></div>
                        </div>
                        <p className="text-xs text-[var(--text-muted)] text-center mt-1">{migrationProgress.current} / {migrationProgress.total}</p>
                    </div>
                )}
            </div>

            <AdvancedGreetingModal
                isOpen={isAdvancedGreetingModalOpen}
                onClose={() => setIsAdvancedGreetingModalOpen(false)}
                profileInfo={profileInfo}
                favoriteGreetings={favoriteGreetings}
                onAddFavoriteGreeting={onAddFavoriteGreeting}
                onMessageGenerated={setGeneratedMessage}
            />
            <MyStyleModal
                isOpen={isMyStyleModalOpen}
                onClose={() => setIsMyStyleModalOpen(false)}
                profileInfo={profileInfo}
                favoriteGreetings={favoriteGreetings}
                onAddFavoriteGreeting={onAddFavoriteGreeting}
                onDeleteFavoriteGreeting={onDeleteFavoriteGreeting}
            />
            <PolicyAnalysisModal
                isOpen={isPolicyAnalysisModalOpen}
                onClose={() => setIsPolicyAnalysisModalOpen(false)}
            />
            <MeetingTypeColorSettingsModal
                isOpen={isColorSettingsModalOpen}
                onClose={() => setIsColorSettingsModalOpen(false)}
            />
             <MeetingTypeManagementModal
                isOpen={isMeetingTypeModalOpen}
                onClose={() => setIsMeetingTypeModalOpen(false)}
            />
            <ExportActivityReportModal
                isOpen={isExportReportModalOpen}
                onClose={() => setIsExportReportModalOpen(false)}
                appointments={appointments}
                performanceRecords={performanceRecords}
                performancePredictions={performancePredictions}
            />
            <TemplateLibraryModal
                isOpen={isTemplateLibraryModalOpen}
                onClose={() => setIsTemplateLibraryModalOpen(false)}
                templates={templates}
                onAdd={onAddTemplate}
                onUpdate={onUpdateTemplate}
                onDelete={onDeleteTemplate}
            />
            <InsuranceInfoModal
                isOpen={isInsuranceInfoModalOpen}
                onClose={() => setIsInsuranceInfoModalOpen(false)}
            />
            <PensionCalculatorsModal
                isOpen={isPensionModalOpen}
                onClose={() => setIsPensionModalOpen(false)}
            />
        </div>
    );
};
