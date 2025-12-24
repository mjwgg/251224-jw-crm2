
import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import type { AppView, Customer, Appointment, Product, CallResult, Todo, Consultation, MeetingType, SearchFilters, CustomerTypeDefinition, RecurrenceSettings, PerformanceRecord, PerformancePrediction, ProfileInfo, Goal, Script, QuickMemo, FavoriteGreeting, AIExtractedProspectWithDetails, Contract, MessageTemplate, RejectionReason, RecontactProbability, DailyReview, Habit, HabitLog, CallRecord, CustomerType, GoalBoard } from './types';
// Add callResultLabels import
import { callResultLabels } from './types';
import { DashboardIcon, UsersIcon, PhoneIcon, CalendarIcon, XIcon, MessageIcon, CheckIcon, ChartBarIcon, DocumentTextIcon, PencilIcon, TrashIcon, SearchIcon, UserAddIcon, SparklesIcon, CalendarPlusIcon, DownloadIcon, UploadCloudIcon, InfoIcon, MicIcon, BriefcaseIcon, ChevronLeftIcon, ChevronRightIcon } from './components/icons';
import { Dashboard } from './components/Dashboard';
import { CustomerList } from './components/CustomerList';
import { AddProspectModal } from './components/AddProspectModal';
import { CustomerDetailModal } from './components/CustomerDetailModal';
import EventNotifier from './components/EventNotifier';
import TelephoneApproach from './components/TelephoneApproach';
import ScheduleCalendar from './components/ScheduleCalendar';
import { AddAppointmentModal } from './components/AddAppointmentModal';
import AppointmentReviewModal from './components/AppointmentReviewModal';
import { TouchRecommendation } from './components/TouchRecommendation';
import { AppointmentDetailModal } from './components/AppointmentDetailModal';
import { PerformanceManagement } from './components/PerformanceManagement';
import { useCustomers, useAppointments, useScripts, useTodos, useDailyReviews, useGoals, useProducts, useCustomerTypes, usePerformanceRecords, usePerformancePredictions, useProfileInfo, useQuickMemos, useFavoriteGreetings, useMessageTemplates, useHabits, useGoalBoards, useLunarCalendar } from './hooks/useData';
import { importData, exportData, db } from './services/db';
import { getItem } from './services/storageService';
import Spinner from './components/ui/Spinner';
import LogCallResultModal from './components/LogCallResultModal';
import ConsultationList from './components/ConsultationList';
import GlobalSearchBar from './components/GlobalSearchBar';
import SearchResultsModal from './components/SearchResultsModal';
import { AIAppointmentModal } from './components/AIAppointmentModal';
import BaseModal from './components/ui/BaseModal';
import CustomerTypeManagementModal from './components/CustomerTypeManagementModal';
import AddReminderModal from './components/AddReminderModal';
import ConfirmationModal from './components/ui/ConfirmationModal';
import PasswordLock from './components/ui/PasswordLock';
import TagManagementModal from './components/TagManagementModal';
import UsageGuideModal from './components/UsageGuideModal';
import PcCompletionWizardModal from './components/PcCompletionWizardModal';
import ApCompletionWizardModal from './components/ApCompletionWizardModal';
import NearbyCustomersModal from './components/NearbyCustomersModal';
import GoalBoardModal from './components/GoalBoardModal';
import ConsultationRecordModal from './components/ConsultationRecordModal';
import type { ConsultationRecordData } from './components/ConsultationRecordModal';

// Add ToastData interface
interface ToastData {
  message: string;
  confirmLabel?: string;
  secondaryConfirmLabel?: string;
  onConfirm: (isButtonClick: boolean) => void;
  onSecondaryConfirm?: () => void;
  onUndo?: () => void;
}

interface ConsultationData {
    consultation: Omit<Consultation, 'date' | 'id'>;
    date: string;
}

interface EditConsultationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (consultation: Consultation) => Promise<any>;
    consultation: Consultation | null;
    customerName: string;
    meetingTypeOptions: string[];
}

const EditConsultationModal: React.FC<EditConsultationModalProps> = ({ isOpen, onClose, onSave, consultation, customerName, meetingTypeOptions }) => {
    const [editedData, setEditedData] = useState<Consultation | null>(consultation);

    useEffect(() => {
        setEditedData(consultation);
    }, [consultation]);

    if (!isOpen || !editedData) return null;

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setEditedData(prev => prev ? { ...prev, [name]: value } : null);
    };

    const handleSave = async () => {
        if (editedData) {
            await onSave(editedData);
            onClose();
        }
    };

    return (
        <BaseModal isOpen={isOpen} onClose={onClose} className="max-w-2xl w-full" zIndex="z-[60]">
            <div className="p-4 border-b border-[var(--border-color)] flex justify-between items-center flex-shrink-0">
                <h2 className="text-xl font-bold text-[var(--text-primary)]">{customerName}님 상담 기록 수정</h2>
                <button onClick={onClose} className="text-[var(--text-muted)] hover:text-[var(--text-primary)]"><XIcon className="h-6 w-6" /></button>
            </div>
            <div className="p-6 space-y-4 overflow-y-auto flex-1 min-h-0 custom-scrollbar">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label htmlFor="date" className="block text-sm font-medium text-[var(--text-secondary)]">상담일</label>
                        <input type="date" name="date" id="date" value={new Date(editedData.date).toISOString().split('T')[0]} onChange={handleChange} className="mt-1 block w-full bg-[var(--background-secondary)] border border-[var(--border-color-strong)] rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-[var(--background-accent)] focus:border-[var(--background-accent)]" />
                    </div>
                    <div>
                        <label htmlFor="meetingType" className="block text-sm font-medium text-[var(--text-secondary)]">상담 유형</label>
                        <select name="meetingType" id="meetingType" value={editedData.meetingType} onChange={handleChange} className="mt-1 block w-full bg-[var(--background-secondary)] border border-[var(--border-color-strong)] rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-[var(--background-accent)] focus:border-[var(--background-accent)]">
                            {meetingTypeOptions.map(type => <option key={type} value={type}>{type}</option>)}
                        </select>
                    </div>
                </div>
                <div>
                    <label htmlFor="notes" className="block text-sm font-medium text-[var(--text-secondary)] mb-1">상담 메모</label>
                    <textarea id="notes" name="notes" value={editedData.notes} onChange={handleChange} rows={10} 
                        className="block w-full bg-[var(--background-secondary)] border border-[var(--border-color-strong)] rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-[var(--background-accent)] focus:border-[var(--background-accent)]"
                    />
                </div>
            </div>
            <div className="p-4 bg-[var(--background-tertiary)] border-t border-[var(--border-color)] flex justify-end space-x-4 flex-shrink-0">
                <button onClick={onClose} className="px-4 py-2 bg-[var(--background-secondary)] border border-[var(--border-color-strong)] rounded-md text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--background-primary)]">취소</button>
                <button onClick={handleSave} className="px-6 py-2 bg-[var(--background-accent)] text-[var(--text-on-accent)] rounded-md text-sm font-medium hover:bg-[var(--background-accent-hover)]">저장</button>
            </div>
        </BaseModal>
    );
};

interface ImportPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  summary: {
    backupDate?: string;
    customerCount: number;
    appointmentCount: number;
    productCount: number;
    customerTypeCount: number;
    version?: number;
  } | null;
}

const ImportPreviewModal: React.FC<ImportPreviewModalProps> = ({ isOpen, onClose, onConfirm, summary }) => {
  if (!isOpen || !summary) return null;

  const formattedDate = summary.backupDate 
    ? new Date(summary.backupDate).toLocaleString('ko-KR', {
        year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
      })
    : '알 수 없음';

  return (
    <BaseModal isOpen={isOpen} onClose={onClose} className="max-w-lg w-full">
      <div className="p-4 border-b border-[var(--border-color)] flex justify-between items-center flex-shrink-0">
        <h2 className="text-xl font-bold text-[var(--text-primary)]">데이터 가져오기 확인</h2>
        <button onClick={onClose} className="text-[var(--text-muted)] hover:text-[var(--text-primary)]">
          <XIcon className="h-6 w-6" />
        </button>
      </div>
      <div className="p-6 flex-1 min-h-0 overflow-y-auto custom-scrollbar">
        <p className="text-[var(--text-secondary)] mb-4">선택한 파일의 데이터를 가져오시겠습니까? 현재 애플리케이션의 모든 데이터는 이 파일의 데이터로 대체됩니다. 이 작업은 되돌릴 수 없습니다.</p>
        <div className="bg-[var(--background-tertiary)] p-4 rounded-md border border-[var(--border-color-strong)] text-[var(--text-secondary)]">
          <p><strong className="font-medium text-[var(--text-primary)]">백업 일시:</strong> {formattedDate}</p>
          <p><strong className="font-medium text-[var(--text-primary)]">고객 수:</strong> {summary.customerCount}명</p>
          <p><strong className="font-medium text-[var(--text-primary)]">일정 수:</strong> {summary.appointmentCount}개</p>
          <p><strong className="font-medium text-[var(--text-primary)]">상품 수:</strong> {summary.productCount}개</p>
          <p><strong className="font-medium text-[var(--text-primary)]">고객 유형 수:</strong> {summary.customerTypeCount}개</p>
          {summary.version && <p><strong className="font-medium text-[var(--text-primary)]">데이터 버전:</strong> v{summary.version}</p>}
        </div>
      </div>
      <div className="p-4 bg-[var(--background-tertiary)] border-t border-[var(--border-color)] flex justify-end items-center space-x-4 flex-shrink-0">
        <button onClick={onClose} className="px-4 py-2 bg-[var(--background-secondary)] border border-[var(--border-color-strong)] rounded-md text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--background-primary)]">취소</button>
        <button onClick={onConfirm} className="px-6 py-2 bg-[var(--background-accent)] text-[var(--text-on-accent)] rounded-md text-sm font-medium hover:bg-[var(--background-accent-hover)]">가져오기</button>
      </div>
    </BaseModal>
  );
};

const MigrationProgressModal: React.FC<{ isOpen: boolean; current: number; total: number; }> = ({ isOpen, current, total }) => {
    if (!isOpen) return null;
    
    const progressPercentage = total > 0 ? (current / total) * 100 : 0;

    return (
        <div className="fixed inset-0 bg-[var(--background-overlay)] z-[100] flex items-center justify-center p-4">
            <div className="bg-[var(--background-secondary)] p-8 rounded-lg shadow-xl max-w-md w-full">
                <h2 className="text-xl font-bold text-[var(--text-primary)] mb-4">주소 좌표 변환 중...</h2>
                <p className="text-[var(--text-secondary)] mb-4">
                    고객 주소 정보를 좌표로 변환하고 있습니다. 잠시만 기다려주세요.
                </p>
                <div className="w-full bg-[var(--background-tertiary)] rounded-full h-4">
                    <div
                        className="bg-[var(--background-accent)] h-4 rounded-full transition-all duration-500"
                        style={{ width: `${progressPercentage}%` }}
                    ></div>
                </div>
                <p className="text-center text-[var(--text-primary)] font-semibold mt-2">
                    {current} / {total}
                </p>
            </div>
        </div>
    );
};

interface RejectionReasonModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (customerId: string, reason: RejectionReason, probability: RecontactProbability, notes: string, nextFollowUpDate?: string) => void;
    customer: Customer | null;
}

const RejectionReasonModal: React.FC<RejectionReasonModalProps> = ({ isOpen, onClose, onSave, customer }) => {
    const [reason, setReason] = useState<RejectionReason>('기타');
    const [probability, setProbability] = useState<RecontactProbability>('하');
    const [notes, setNotes] = useState('');
    const [nextFollowUpDate, setNextFollowUpDate] = useState('');

    useEffect(() => {
        if (isOpen && customer) {
            setReason(customer.rejectionReason || '기타');
            setProbability(customer.recontactProbability || '하');
            setNotes(customer.rejectionNotes || '');
            setNextFollowUpDate(customer.nextFollowUpDate || '');
        }
    }, [isOpen, customer]);
    
    if (!isOpen || !customer) return null;

    const handleSave = () => {
        onSave(customer.id, reason, probability, notes, nextFollowUpDate);
        onClose();
    };
    
    const rejectionReasons: RejectionReason[] = ['가격', '상품', '시기', '다른설계사', '가족', '기타'];
    const recontactProbabilities: RecontactProbability[] = ['상', '중', '하'];

    return (
        <BaseModal isOpen={isOpen} onClose={onClose} className="max-w-lg w-full" zIndex="z-[70]">
            <div className="p-4 border-b border-[var(--border-color)] flex-shrink-0">
                <h2 className="text-xl font-bold text-[var(--text-primary)]">{customer.name}님 거절 사유 기록</h2>
            </div>
            <div className="p-6 space-y-4 flex-1 min-h-0 overflow-y-auto custom-scrollbar">
                <div>
                    <label className="block text-sm font-medium text-[var(--text-secondary)]">거절 사유</label>
                    <select value={reason} onChange={(e) => setReason(e.target.value as RejectionReason)} className="mt-1 block w-full bg-[var(--background-secondary)] border border-[var(--border-color-strong)] rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-[var(--background-accent)] focus:border-[var(--background-accent)]">
                        {rejectionReasons.map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-medium text-[var(--text-secondary)]">재접촉 가능성</label>
                    <select value={probability} onChange={(e) => setProbability(e.target.value as RecontactProbability)} className="mt-1 block w-full bg-[var(--background-secondary)] border border-[var(--border-color-strong)] rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-[var(--background-accent)] focus:border-[var(--background-accent)]">
                        {recontactProbabilities.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-medium text-[var(--text-secondary)]">다음 재접촉일 (선택)</label>
                    <input type="date" value={nextFollowUpDate} onChange={e => setNextFollowUpDate(e.target.value)} className="mt-1 block w-full bg-[var(--background-secondary)] border border-[var(--border-color-strong)] rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-[var(--background-accent)] focus:border-[var(--background-accent)]" />
                </div>
                <div>
                    <label className="block text-sm font-medium text-[var(--text-secondary)]">상세 내용</label>
                    <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={4} className="mt-1 block w-full bg-[var(--background-secondary)] border border-[var(--border-color-strong)] rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-[var(--background-accent)] focus:border-[var(--background-accent)]" />
                </div>
            </div>
            <div className="p-4 bg-[var(--background-tertiary)] border-t border-[var(--border-color)] flex justify-end flex-shrink-0">
                <button onClick={handleSave} className="px-6 py-2 bg-[var(--background-accent)] text-[var(--text-on-accent)] rounded-md text-sm font-medium hover:bg-[var(--background-accent-hover)]">저장</button>
            </div>
        </BaseModal>
    );
};


const Notification: React.FC<{ message: string; type: 'success' | 'error'; onClose: () => void; }> = ({ message, type, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 4000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const isSuccess = type === 'success';
  const bgColor = isSuccess ? 'bg-[var(--background-success)]' : 'bg-[var(--background-danger)]';
  const textColor = isSuccess ? 'text-white' : 'text-white';
  const Icon = isSuccess ? CheckIcon : XIcon;

  return (
    <div 
        className={`fixed top-5 right-5 z-[100] flex items-center p-4 mb-4 text-sm rounded-lg shadow-lg animate-fade-in ${bgColor} ${textColor}`} 
        role="alert"
    >
      <Icon className="h-5 w-5 mr-3" />
      <span className="font-medium">{message}</span>
      <button type="button" className="ml-auto -mx-1.5 -my-1.5 p-1.5 rounded-full inline-flex h-8 w-8 hover:bg-black/20" onClick={onClose} aria-label="Close">
        <span className="sr-only">닫기</span>
        <XIcon className="h-5 w-5" />
      </button>
    </div>
  );
};

interface ActionToastProps {
    toast: {
      message: string;
      confirmLabel?: string;
      secondaryConfirmLabel?: string;
    } | null;
    onUndo: () => void;
    onConfirm: (isButtonClick: boolean) => void;
    onSecondaryConfirm?: () => void;
}

const ActionToast: React.FC<ActionToastProps> = ({ toast, onUndo, onConfirm, onSecondaryConfirm }) => {
    if (!toast) return null;
    const { message, confirmLabel, secondaryConfirmLabel } = toast;

    return (
        <div
            className="fixed bottom-5 right-5 z-[100] flex items-center justify-between p-4 min-w-[350px] max-w-md rounded-lg shadow-lg animate-fade-in-up bg-[var(--background-secondary)] border border-[var(--border-color)]"
            role="alert"
        >
            <div className="flex items-center">
                <CheckIcon className="h-5 w-5 mr-3 text-[var(--text-success)]" />
                <span className="font-medium text-sm text-[var(--text-primary)]">{message}</span>
            </div>
            <div className="flex items-center ml-4 space-x-2">
                <button onClick={onUndo} className="text-sm font-semibold text-[var(--text-accent)] hover:underline">
                    실행 취소
                </button>
                {secondaryConfirmLabel && onSecondaryConfirm && (
                    <button onClick={onSecondaryConfirm} className="px-3 py-1.5 bg-[var(--background-danger)] text-white rounded-md text-sm font-medium hover:bg-[var(--background-danger-hover)]">
                        {secondaryConfirmLabel}
                    </button>
                )}
                {confirmLabel && (
                    <button onClick={() => onConfirm(true)} className="px-3 py-1.5 bg-[var(--background-accent)] text-[var(--text-on-accent)] rounded-md text-sm font-medium hover:bg-[var(--background-accent-hover)]">
                        {confirmLabel}
                    </button>
                )}
            </div>
        </div>
    );
};

const UpdateNotification: React.FC<{ onUpdate: () => void; }> = ({ onUpdate }) => (
    <div 
        className="fixed top-20 right-5 z-[100] flex items-center p-4 mb-4 text-sm rounded-lg shadow-lg animate-fade-in bg-[var(--background-accent)] text-white" 
        role="alert"
    >
      <InfoIcon className="h-5 w-5 mr-3" />
      <span className="font-medium mr-4">새로운 버전이 있습니다!</span>
      <button type="button" className="font-bold underline hover:no-underline" onClick={onUpdate}>
        업데이트
      </button>
    </div>
);

interface SelectCustomerForContractModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (customerId: string) => void;
  onCreateNew: () => void;
  record: Omit<PerformanceRecord, 'id'> | null;
  matchingCustomers: Customer[];
}

const SelectCustomerForContractModal: React.FC<SelectCustomerForContractModalProps> = ({ isOpen, onClose, onSelect, onCreateNew, record, matchingCustomers }) => {
  if (!isOpen || !record) return null;

  return (
    <BaseModal isOpen={isOpen} onClose={onClose} className="max-w-lg w-full" zIndex="z-[70]">
      <div className="p-4 border-b border-[var(--border-color)]">
        <h2 className="text-xl font-bold text-[var(--text-primary)]">중복된 고객 이름</h2>
      </div>
      <div className="p-6 space-y-4">
        <p className="text-[var(--text-secondary)]">'{record.contractorName}' 이름의 고객이 여러 명 있습니다. 어떤 고객의 정보에 실적을 추가하시겠습니까?</p>
        <div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar border border-[var(--border-color)] rounded-lg p-2">
          {matchingCustomers.map(customer => (
            <div key={customer.id} onClick={() => onSelect(customer.id)} className="p-3 border border-[var(--border-color)] rounded-lg hover:bg-[var(--background-tertiary)] cursor-pointer">
              <p className="font-bold text-[var(--text-primary)]">{customer.name}</p>
              <p className="text-sm text-[var(--text-muted)]">생년월일: {customer.birthday}</p>
              <p className="text-sm text-[var(--text-muted)]">연락처: {customer.contact}</p>
            </div>
          ))}
        </div>
        <div className="pt-4 border-t border-[var(--border-color)]">
          <button onClick={onCreateNew} className="w-full px-4 py-2 bg-[var(--background-secondary)] border border-[var(--border-color-strong)] rounded-md text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--background-primary)]">
            '{record.contractorName}' 이름으로 새 고객 등록하기
          </button>
        </div>
      </div>
      <div className="p-4 bg-[var(--background-tertiary)] border-t border-[var(--border-color)] flex justify-end">
        <button onClick={onClose} className="px-4 py-2 bg-[var(--background-secondary)] border border-[var(--border-color-strong)] rounded-md text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--background-primary)]">
          취소
        </button>
      </div>
    </BaseModal>
  );
};

export type Theme = 'light' | 'dark' | 'comfortable' | 'sepia' | 'clean' | 'system';
export type FontSize = 'small' | 'medium' | 'large';
export type FontFamily = 'default' | 'gothic' | 'handwriting' | 'handwriting2' | 'handwriting3';

const App: React.FC = () => {
  const [view, setView] = useState<AppView>('dashboard');
  const [theme, setTheme] = useState<Theme>(() => {
    const storedTheme = localStorage.getItem('app-theme') as Theme | null;
    return storedTheme || 'clean';
  });
  const [fontSize, setFontSize] = useState<FontSize>(() => {
    const storedSize = localStorage.getItem('app-font-size') as FontSize | null;
    return storedSize || 'medium';
  });
  const [fontFamily, setFontFamily] = useState<FontFamily>(() => {
    const storedFont = localStorage.getItem('app-font-family') as FontFamily | null;
    return storedFont || 'default';
  });
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [isUpdateAvailable, setIsUpdateAvailable] = useState(false);
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null);
  const [isUnlocked, setIsUnlocked] = useState(() => {
    return localStorage.getItem('app_lock_enabled') !== 'true';
  });
  const [isGuideModalOpen, setIsGuideModalOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const APP_GUIDE_SEEN_KEY = 'app_guide_seen_v1';
  
  const [customerMeetingTypes, setCustomerMeetingTypes] = useState<string[]>(() => {
      const stored = getItem<string[]>('customer_meeting_types');
      return stored || ['AP', 'PC', '기타', '증권전달'];
  });

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      const registerServiceWorker = () => {
        const swUrl = `${window.location.origin}/sw.js?v=4.4.2`; // 버전 업데이트
        navigator.serviceWorker.register(swUrl).then(registration => {
          registration.onupdatefound = () => {
            const newWorker = registration.installing;
            if (newWorker) {
              newWorker.onstatechange = () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  setWaitingWorker(newWorker);
                  setIsUpdateAvailable(true);
                }
              };
            }
          };
        }).catch(error => {
          console.error('Error during service worker registration:', error);
        });
      };
      
      window.addEventListener('load', registerServiceWorker);

      let refreshing = false;
      const controllerChangeHandler = () => {
        if (refreshing) return;
        window.location.reload();
        refreshing = true;
      };
      navigator.serviceWorker.addEventListener('controllerchange', controllerChangeHandler);

      return () => {
        window.removeEventListener('load', registerServiceWorker);
        navigator.serviceWorker.removeEventListener('controllerchange', controllerChangeHandler);
      };
    }
  }, []);

  useEffect(() => {
      if (isUnlocked) {
          const guideSeen = localStorage.getItem(APP_GUIDE_SEEN_KEY);
          if (guideSeen !== 'true') {
              setIsGuideModalOpen(true);
          }
      }
  }, [isUnlocked]);

  const handleUnlock = () => {
      setIsUnlocked(true);
      const guideSeen = localStorage.getItem(APP_GUIDE_SEEN_KEY);
      if (guideSeen !== 'true') {
          setIsGuideModalOpen(true);
      }
  };

  const handleGuideClose = (dontShowAgain: boolean) => {
      if (dontShowAgain) {
          localStorage.setItem(APP_GUIDE_SEEN_KEY, 'true');
      }
      setIsGuideModalOpen(false);
  };

  const handleUpdate = () => {
    if (waitingWorker) {
      waitingWorker.postMessage({ type: 'SKIP_WAITING' });
      setIsUpdateAvailable(false);
    }
  };

  const [callingListCustomerIds, setCallingListCustomerIds] = useState<string[] | null>(null);
  const [completedInCallingList, setCompletedInCallingList] = useState<Set<string>>(new Set());
  const [appIsLoading, setAppIsLoading] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isClearConfirmOpen, setIsClearConfirmOpen] = useState(false);
  const [newContractSeed, setNewContractSeed] = useState<{ customerId: string; contractData: Partial<Contract> } | null>(null);


  useEffect(() => {
      const handleResize = () => setIsMobile(window.innerWidth < 768);
      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
      const applyTheme = (t: Theme) => {
          const root = document.documentElement;
          if (t === 'system') {
              const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
              root.setAttribute('data-theme', systemPrefersDark ? 'dark' : 'light');
          } else {
              root.setAttribute('data-theme', t);
          }
          localStorage.setItem('app-theme', t);
      };

      applyTheme(theme);

      if (theme === 'system') {
          const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
          const handleChange = () => applyTheme('system');
          mediaQuery.addEventListener('change', handleChange);
          return () => mediaQuery.removeEventListener('change', handleChange);
      }
  }, [theme]);
  
  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute('data-font-size', fontSize);
    localStorage.setItem('app-font-size', fontSize);
  }, [fontSize]);

  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute('data-font-family', fontFamily === 'default' ? '' : fontFamily);
    localStorage.setItem('app-font-family', fontFamily);
  }, [fontFamily]);

  const { customers, setCustomers, addCustomer, updateCustomer, deleteCustomer, deleteMultipleCustomers, logCallResult, bulkLogTouch, updateConsultation, deleteConsultation, deleteMultipleConsultations, clearMultipleFollowUpDates, isLoading: customersLoading, bulkUpdateTags, updateCustomerTags, customersToMigrateCount, runAddressMigration, geocodeAndUpdateCustomers, bulkUpdateCustomerType, associateContractWithCustomer } = useCustomers();
  const { appointments, setAppointments, addAppointment, updateAppointment, deleteAppointment, addAppointmentException, endRecurrence, deleteMultipleAppointments, updateAppointmentStatus, updateMultipleAppointmentStatuses, deleteAppointmentsByCustomerIds, isLoading: appointmentsLoading } = useAppointments();
  const { scripts, setScripts, saveScript, deleteScript } = useScripts();
  const { products, setProducts, addProduct, updateProduct, deleteProduct, isLoading: productsLoading } = useProducts();
  const { todos, setTodos, addTodo, toggleTodo, deleteTodo, updateTodo, rolloverTodos, isLoading: todosLoading } = useTodos();
  const { dailyReviews, setDailyReviews, saveDailyReview, deleteDailyReview, deleteMultipleDailyReviews } = useDailyReviews();
  const { goals, setGoals, addGoal, updateGoal, deleteGoal } = useGoals();
  const { customerTypes, setCustomerTypes, addCustomerType, updateCustomerType, deleteCustomerType, isLoading: customerTypesLoading } = useCustomerTypes();
  const { performanceRecords, setPerformanceRecords, addPerformanceRecord, updatePerformanceRecord, deletePerformanceRecord, isLoading: performanceLoading } = usePerformanceRecords();
  const { performancePredictions, setPerformancePredictions, addPerformancePrediction, updatePerformancePrediction, deletePerformancePrediction, isLoading: predictionsLoading } = usePerformancePredictions();
  const { profileInfo, setProfileInfo, saveProfileInfo } = useProfileInfo();
  const { quickMemos, setQuickMemos, addQuickMemo, updateQuickMemo, deleteQuickMemo, deleteMultipleQuickMemos, isLoading: memosLoading } = useQuickMemos();
  const { greetings, setGreetings, addFavoriteGreeting, deleteFavoriteGreeting } = useFavoriteGreetings();
  const { templates, setTemplates, addTemplate, updateTemplate, deleteTemplate, isLoading: templatesLoading } = useMessageTemplates();
  const { habits, habitLogs, addHabit, updateHabit, deleteHabit, logHabit, isLoading: habitsLoading } = useHabits();
  const { goalBoards, setGoalBoards, addGoalBoard, updateGoalBoard, deleteGoalBoard, isLoading: goalBoardsLoading } = useGoalBoards();

  const isLoading = customersLoading || appointmentsLoading || todosLoading || productsLoading || customerTypesLoading || performanceLoading || predictionsLoading || memosLoading || appIsLoading || templatesLoading || habitsLoading || goalBoardsLoading;
  
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<{ 
    customers: { customer: Customer; snippet: string }[],
    appointments: { appointment: Appointment; snippet: string }[],
    consultations: { customer: Customer, consultation: Consultation, snippet: string }[],
    dailyReviews: { review: DailyReview; snippet: string }[],
    todos: { todo: Todo; snippet: string }[],
    quickMemos: { memo: QuickMemo; snippet: string }[],
    contracts: { customer: Customer, contract: Contract, snippet: string }[]
  } | null>(null);
  const [isSearchResultsModalOpen, setIsSearchResultsModalOpen] = useState(false);
  const [isAIModalOpen, setIsAIModalOpen] = useState(false);
  const [isCustomerTypeModalOpen, setIsCustomerTypeModalOpen] = useState(false);
  const [isAddReminderModalOpen, setIsAddReminderModalOpen] = useState(false);
  const [reminderToEdit, setReminderToEdit] = useState<Customer | null>(null);
  const [isTagManagementModalOpen, setIsTagManagementModalOpen] = useState(false);
  const [aiAppointmentSeed, setAiAppointmentSeed] = useState<{customer: Customer, notes: string} | null>(null);
  const [selectCustomerForContractModalState, setSelectCustomerForContractModalState] = useState<{
    isOpen: boolean;
    record: (Omit<PerformanceRecord, 'id'> & { customerType?: CustomerType; }) | null;
    matchingCustomers: Customer[];
  }>({ isOpen: false, record: null, matchingCustomers: [] });
  const [isNearbyCustomersModalOpen, setIsNearbyCustomersModalOpen] = useState(false);
  const [isGoalBoardModalOpen, setIsGoalBoardModalOpen] = useState(false);

  const mainScrollRef = useRef<HTMLElement>(null);
  
  const allTags = useMemo(() => {
    const tags = new Set<string>();
    customers.forEach(c => c.tags.forEach(tag => tags.add(tag)));
    return Array.from(tags).sort();
  }, [customers]);

  const importFileRef = useRef<HTMLInputElement>(null);
  const [importFileContent, setImportFileContent] = useState<string | null>(null);
  const [importSummary, setImportSummary] = useState<ImportPreviewModalProps['summary']>(null);
  const [showImportPreview, setShowImportPreview] = useState(false);
  const [migrationProgress, setMigrationProgress] = useState<{ current: number; total: number } | null>(null);
  const [onAppointmentAddSuccess, setOnAppointmentAddSuccess] = useState<(() => void) | null>(null);

  const handleSetOnAppointmentAddSuccess = useCallback((callback: (() => void) | null) => {
      setOnAppointmentAddSuccess(() => callback);
  }, []);

    const lastNotificationCheck = useRef<string | null>(null);
    useEffect(() => {
        if (typeof window.Notification === 'undefined' || window.Notification.permission !== 'granted' || habits.length === 0) {
            return;
        }

        const checkNotifications = () => {
            const now = new Date();
            const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
            
            if (lastNotificationCheck.current === currentTime) {
                return;
            }
            lastNotificationCheck.current = currentTime;

            const todayStr = new Date(now.getTime() - (now.getTimezoneOffset() * 60000)).toISOString().split('T')[0];
            const completedToday = new Set(
                habitLogs
                    .filter(log => log.date === todayStr && log.completed)
                    .map(log => log.habitId)
            );

            habits.forEach(habit => {
                if (habit.notificationTime === currentTime && !completedToday.has(habit.id)) {
                    if ('serviceWorker' in navigator && navigator.serviceWorker.ready) {
                          navigator.serviceWorker.ready.then(registration => {
                            registration.showNotification('습관 알림', {
                                body: `'${habit.name}' 습관을 완료할 시간입니다!`,
                                icon: '/icon.svg',
                                badge: '/icon.svg',
                                tag: `habit-${habit.id}-${todayStr}`
                            });
                        });
                    }
                }
            });
        };

        const interval = setInterval(checkNotifications, 30000); 

        return () => clearInterval(interval);

    }, [habits, habitLogs]);


  const startCallingList = useCallback((customerIds: string[]) => {
    setCallingListCustomerIds(customerIds);
    setCompletedInCallingList(new Set());
    setView('telephone');
  }, []);

  const endCallingList = useCallback(() => {
    setCallingListCustomerIds(null);
    setCompletedInCallingList(new Set());
  }, []);

  const markCustomerCompletedInCallingList = useCallback((customerId: string) => {
    if (callingListCustomerIds) {
        setCompletedInCallingList(prev => new Set(prev).add(customerId));
    }
  }, [callingListCustomerIds]);


  useEffect(() => {
    if(!isLoading) {
      rolloverTodos();
    }
  }, [isLoading, rolloverTodos]);

  useEffect(() => {
    if (mainScrollRef.current) {
      mainScrollRef.current.scrollTo(0, 0);
    }
  }, [view]);

  const [isAddProspectModalOpen, setIsAddProspectModalOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<{ customer: Customer; initialTab?: 'details' | 'consultations' | 'contracts' | 'callHistory' | 'introductions' } | null>(null);
  const [logCallModalState, setLogCallModalState] = useState<{ isOpen: boolean; customer: Customer | null }>({ isOpen: false, customer: null });
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [appointmentModal, setAppointmentModal] = useState<{
    isOpen: boolean;
    date?: string;
    time?: string;
    appointment?: Appointment;
    rescheduledFromId?: string;
    completedOriginalId?: string;
  }>({ isOpen: false });
  
  const [appointmentsToReview, setAppointmentsToReview] = useState<Appointment[]>([]);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [reviewModalHasBeenShown, setReviewModalHasBeenShown] = useState(false);
  const [editingConsultation, setEditingConsultation] = useState<{ customerId: string; customerName: string; consultation: Consultation } | null>(null);
  const [rejectionModalState, setRejectionModalState] = useState<{ isOpen: boolean; customer: Customer | null }>({ isOpen: false, customer: null });
  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);
  const [recordModalData, setRecordModalData] = useState<{
    customerId: string;
    customerName: string;
    date: string;
    meetingType: MeetingType;
  } | null>(null);
  
    const [pcCompletionWizardState, setPcCompletionWizardState] = useState<{ isOpen: boolean; appointment: Appointment | null }>({ isOpen: false, appointment: null });
    const [apCompletionWizardState, setApCompletionWizardState] = useState<{ isOpen: boolean; appointment: Appointment | null }>({ isOpen: false, appointment: null });

    const [actionToast, setActionToast] = useState<ToastData | null>(null);
    const toastTimeoutRef = useRef<number | null>(null);

    const clearActionToast = useCallback(() => {
        if (toastTimeoutRef.current) {
            clearTimeout(toastTimeoutRef.current);
        }
        setActionToast(null);
    }, []);

    const handleConfirmToastAction = useCallback((isButtonClick: boolean) => {
        if (actionToast) {
            actionToast.onConfirm(isButtonClick);
        }
        clearActionToast();
    }, [actionToast, clearActionToast]);

    const handleSecondaryConfirmToastAction = useCallback(() => {
        if (actionToast && actionToast.onSecondaryConfirm) {
            actionToast.onSecondaryConfirm();
        }
        clearActionToast();
    }, [actionToast, clearActionToast]);

    const handleUndoToastAction = useCallback(() => {
        if (actionToast && actionToast.onUndo) {
            actionToast.onUndo();
        }
        clearActionToast();
    }, [actionToast, clearActionToast]);

    const handleRequestAction = useCallback((toastData: ToastData) => {
        if (actionToast) {
            actionToast.onConfirm(false);
        }
        setActionToast(toastData);
    }, [actionToast]);
    
    useEffect(() => {
        if (actionToast) {
            toastTimeoutRef.current = window.setTimeout(() => {
                handleConfirmToastAction(false);
            }, 7000);
        }
        return () => {
            if (toastTimeoutRef.current) {
                clearTimeout(toastTimeoutRef.current);
            }
        };
    }, [actionToast, handleConfirmToastAction]);

  const handleOpenConsultationRecordModal = (customerId: string, customerName: string, date: string, meetingType: MeetingType) => {
    setRecordModalData({ customerId, customerName, date, meetingType });
    setIsRecordModalOpen(true);
  };

    const commitAppointmentAction = useCallback((appointment: Appointment, actionType: 'completed' | 'postponed' | 'cancelled') => {
        updateAppointmentStatus(appointment.id, actionType);
    }, [updateAppointmentStatus]);

    const handleOpenFollowUpModal = useCallback((appointment: Appointment) => {
        const baseDateStr = (appointment as any).occurrenceDate || appointment.date;
        const [year, month, day] = baseDateStr.split('-').map(Number);
        const originalDate = new Date(year, month - 1, day);
        originalDate.setDate(originalDate.getDate() + 7);
        const newDateStr = new Date(originalDate.getTime() - (originalDate.getTimezoneOffset() * 60000)).toISOString().split('T')[0];
        
        const newAppointmentData: Partial<Appointment> = {
            customerId: appointment.customerId,
            customerName: appointment.customerName,
            title: appointment.title,
            date: newDateStr,
            time: appointment.time,
            endTime: appointment.endTime,
            location: appointment.location,
            meetingType: appointment.meetingType,
            notes: `[후속 일정] 원본 일정:\n${baseDateStr} ${appointment.time}\n${appointment.notes || ''}`,
            status: 'scheduled',
        };
        
        setAppointmentModal({ 
            isOpen: true, 
            appointment: newAppointmentData as Appointment, 
        });
    }, []);

    const handleOpenRescheduleModal = useCallback((appointment: Appointment) => {
        const newAppointmentData = { ...appointment };
        delete (newAppointmentData as any).id;
        newAppointmentData.status = 'scheduled';
        newAppointmentData.recurrenceType = 'none';
        delete (newAppointmentData as any).recurrenceDays;
        delete (newAppointmentData as any).recurrenceEndDate;
        delete (newAppointmentData as any).recurrenceInterval;
        delete (newAppointmentData as any).exceptions;

        const originalDate = new Date(appointment.date);
        originalDate.setDate(originalDate.getDate() + 1);
        newAppointmentData.date = new Date(originalDate.getTime() - (originalDate.getTimezoneOffset() * 60000)).toISOString().split('T')[0];
        newAppointmentData.notes = `[연기된 일정] 원본 일정:\n${appointment.date} ${appointment.time}\n${appointment.notes || ''}`;

        setAppointmentModal({ isOpen: true, appointment: newAppointmentData as Appointment });
    }, []);
    
    const handleRequestAppointmentAction = useCallback((appointment: Appointment, actionType: 'completed' | 'postponed' | 'cancelled') => {
        if (actionType === 'completed' && appointment.meetingType === 'PC') {
            setPcCompletionWizardState({ isOpen: true, appointment: appointment });
            return;
        }
        if (actionType === 'completed' && appointment.meetingType === 'AP') {
            setApCompletionWizardState({ isOpen: true, appointment });
            return;
        }

        const onConfirm = (isButtonClick: boolean) => {
            commitAppointmentAction(appointment, actionType);
            if (isButtonClick) {
                if (actionType === 'completed') {
                    handleOpenFollowUpModal(appointment);
                } else if (actionType === 'postponed') {
                    handleOpenRescheduleModal(appointment);
                }
            }
        };
    
        const messages = {
            completed: "일정을 '완료' 처리했습니다.",
            postponed: "일정을 '연기' 처리했습니다.",
            cancelled: "일정을 '취소' 처리했습니다.",
        };
        const confirmLabels: Record<typeof actionType, string | undefined> = {
            completed: "후속일정",
            postponed: "새 일정 등록",
            cancelled: undefined,
        };
        
        handleRequestAction({
            message: messages[actionType],
            confirmLabel: confirmLabels[actionType],
            onConfirm,
        });
    }, [commitAppointmentAction, handleOpenFollowUpModal, handleOpenRescheduleModal, handleRequestAction]);
  
  useEffect(() => {
      if (reviewModalHasBeenShown || !appointments) return;

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayStr = new Date(today.getTime() - (today.getTimezoneOffset() * 60000)).toISOString().split('T')[0];
      const pastScheduledAppointments = appointments.filter(
          (app) => app.customerId && app.date < todayStr && app.status === 'scheduled'
      );

      if (pastScheduledAppointments.length > 0) {
          setAppointmentsToReview(pastScheduledAppointments);
          setIsReviewModalOpen(true);
          setReviewModalHasBeenShown(true);
      }
  }, [appointments, reviewModalHasBeenShown]);

  useEffect(() => {
    if (newContractSeed) {
        const customerToSelect = customers.find(c => c.id === newContractSeed.customerId);
        if (customerToSelect) {
            setSelectedCustomer({
                customer: customerToSelect,
                initialTab: 'contracts',
            });
        }
    }
  }, [newContractSeed, customers]);


  const handleAddCustomerAndCloseModal = useCallback(async (prospects: AIExtractedProspectWithDetails[]) => {
    await addCustomer(prospects);
    setIsAddProspectModalOpen(false);
    setView('customers');
    setNotification({ message: '고객 정보가 성공적으로 추가되었습니다.', type: 'success' });
  }, [addCustomer]);
  
  const handleUpdateCustomerAndCloseModal = useCallback(async (updatedCustomer: Customer) => {
    await updateCustomer(updatedCustomer);
    setSelectedCustomer(null);
  }, [updateCustomer]);

  const handleDeleteCustomerAndCloseModal = useCallback((customerId: string) => {
    deleteCustomer(customerId);
    deleteAppointmentsByCustomerIds([customerId]);
    setSelectedCustomer(null);
    setNotification({ message: '고객 정보가 삭제되었습니다.', type: 'success' });
  }, [deleteCustomer, deleteAppointmentsByCustomerIds]);

  const handleLogCallResult = useCallback(async (customer: Customer, result: CallResult, notes: string, followUpDate?: string) => {
    await logCallResult(customer.id, result, notes, followUpDate);
    setLogCallModalState({ isOpen: false, customer: null });

    if (callingListCustomerIds?.includes(customer.id)) {
        markCustomerCompletedInCallingList(customer.id);
    }

    if (result === 'meeting_scheduled' && notes.trim()) {
        setAiAppointmentSeed({ customer, notes });
        setIsAIModalOpen(true);
    }
    
    if (['meeting_scheduled', 'rejected', 'recall', 'other'].includes(result)) {
        const today = new Date();
        const todayStr = new Date(today.getTime() - (today.getTimezoneOffset() * 60000)).toISOString().split('T')[0];
        const timeStr = today.toTimeString().slice(0, 5);

        const callResultAppointment: Omit<Appointment, 'id' | 'status'> = {
            customerId: customer.id,
            customerName: customer.name,
            date: todayStr,
            time: timeStr,
            meetingType: 'TA',
            notes: `[자동생성] 통화 결과: ${callResultLabels[result]}\n\n${notes}`,
        };
        
        await addAppointment(callResultAppointment, undefined, undefined, 'completed');
    }
  }, [logCallResult, addAppointment, callingListCustomerIds, markCustomerCompletedInCallingList]);

  const handleLogTouch = useCallback(async (customer: Customer) => {
    const newCallRecord: CallRecord = {
        id: `touch-${Date.now()}`,
        date: new Date().toISOString(),
        result: 'other',
        notes: '터치',
    };

    const updatedCallHistory = [newCallRecord, ...(customer.callHistory || [])];
    const updatedCustomer = { ...customer, callHistory: updatedCallHistory };

    await updateCustomer(updatedCustomer);

    const onUndo = () => {
        updateCustomer({ ...customer, callHistory: customer.callHistory || [] });
        setNotification({ message: '터치 기록이 취소되었습니다.', type: 'success' });
    };

    handleRequestAction({
        message: `${customer.name}님께 '터치'를 기록했습니다.`,
        onConfirm: () => {}, 
        onUndo: onUndo,
    });
  }, [updateCustomer, handleRequestAction]);

  const handleUpdateAppointmentAndConsultation = useCallback(async (appointment, consultationData, recurrence) => {
      let updatedCustomer;
      if (consultationData && appointment.customerId) {
          const customer = customers.find(c => c.id === appointment.customerId);
          if (customer) {
              const newConsultation: Consultation = {
                  ...consultationData.consultation,
                  id: `consult-${Date.now()}`,
                  date: new Date(consultationData.date).toISOString(),
              };
              const updatedConsultations = [...customer.consultations, newConsultation];

              updatedCustomer = { ...customer, consultations: updatedConsultations };
              await updateCustomer(updatedCustomer);
          }
      }
      await updateAppointment(appointment, consultationData, recurrence);
      if (consultationData) {
        setNotification({ message: '저장이 완료되었습니다. 고객 상세정보의 상담 히스토리에서 저장 내용을 확인 및 수정할 수 있습니다.', type: 'success' });
      }
  }, [updateAppointment, updateCustomer, customers]);

  const handleAddAppointment = useCallback(async (
      appointment: Omit<Appointment, 'id' | 'status'>,
      consultationData?: ConsultationData,
      recurrence?: RecurrenceSettings,
      rescheduledFromId?: string,
      completedOriginalId?: string,
      status: Appointment['status'] = 'scheduled'
  ) => {
      const consultationUpdatedCustomer = await addAppointment(appointment, consultationData, recurrence, status);
      
      if (consultationUpdatedCustomer) {
          setCustomers(prev => prev.map(c => c.id === consultationUpdatedCustomer.id ? consultationUpdatedCustomer : c));
      }
      
      if (appointment.meetingType === 'PC' && appointment.customerName) {
        const appointmentDate = new Date(appointment.date + 'T00:00:00'); 
        const today = new Date();
        if (appointmentDate.getFullYear() === today.getFullYear() && appointmentDate.getMonth() === today.getMonth()) {
            const predictionExists = performancePredictions.some(p => 
                p.customerName === appointment.customerName && p.pcDate === appointment.date
            );

            if (!predictionExists) {
                const newPrediction: Omit<PerformancePrediction, 'id'> = {
                    customerName: appointment.customerName,
                    pcDate: appointment.date,
                    productName: '상품명 미정', 
                    premium: 0,
                    recognizedPerformance: 0,
                };
                await addPerformancePrediction(newPrediction);
                setNotification({ message: 'PC 일정이 실적 예측에 자동으로 추가되었습니다.', type: 'success' });
            }
        }
      }

      if (appointment.customerId && !appointment.customerId.startsWith('unregistered-') && ['AP', 'PC'].includes(appointment.meetingType)) {
        const customerToUpdate = consultationUpdatedCustomer || customers.find(c => c.id === appointment.customerId);
        if (customerToUpdate && customerToUpdate.tags.includes('관심고객')) {
            const newTags = customerToUpdate.tags.filter(t => t !== '관심고객');
            await updateCustomer({ ...customerToUpdate, tags: newTags });
        }
      }

      if (rescheduledFromId) {
          await deleteAppointment(rescheduledFromId);
      }
      if (consultationData) {
        setNotification({ message: '저장이 완료되었습니다. 고객 상세정보의 상담 히스토리에서 저장 내용을 확인 및 수정할 수 있습니다.', type: 'success' });
      }

      if (completedOriginalId) {
          await updateAppointmentStatus(completedOriginalId, 'completed');
      }

      if (onAppointmentAddSuccess) {
        onAppointmentAddSuccess();
        setOnAppointmentAddSuccess(null);
      }
  }, [addAppointment, setCustomers, deleteAppointment, onAppointmentAddSuccess, updateAppointmentStatus, customers, updateCustomer, performancePredictions, addPerformancePrediction]);

  const handleAddAppointmentFromAI = useCallback((
      appointment: Omit<Appointment, 'id' | 'status'>, 
      recurrence?: RecurrenceSettings
  ) => {
      handleAddAppointment(appointment, undefined, recurrence);
  }, [handleAddAppointment]);

  const handleAddPerformanceRecord = async (recordOrRecords: (Omit<PerformanceRecord, 'id'> & { customerType?: CustomerType; }) | (Omit<PerformanceRecord, 'id'> & { customerType?: CustomerType; })[]) => {
    const recordsToSave = (Array.isArray(recordOrRecords) ? recordOrRecords : [recordOrRecords]).map(({ customerType, ...rest }) => rest);
    await addPerformanceRecord(recordsToSave);

    const records = Array.isArray(recordOrRecords) ? recordOrRecords : [recordOrRecords];
    let multiMatchCount = 0;

    for (const record of records) {
        const { contractorName, dob } = record;
        if (dob && contractorName) {
            const exactMatches = customers.filter(c => c.name === contractorName && c.birthday === dob && c.status !== 'archived');
            if (exactMatches.length === 1) {
                await associateContractWithCustomer(exactMatches[0].id, record);
                continue; 
            }
        }
        
        const nameMatches = customers.filter(c => c.name === contractorName && c.status !== 'archived');

        if (nameMatches.length === 0) {
            await associateContractWithCustomer(null, record, record.customerType);
        } else if (nameMatches.length === 1) {
            await associateContractWithCustomer(nameMatches[0].id, record);
        } else { 
            if (records.length === 1) {
                setSelectCustomerForContractModalState({
                    isOpen: true,
                    record,
                    matchingCustomers: nameMatches,
                });
            } else {
                multiMatchCount++;
            }
        }
    }
    
    if (multiMatchCount > 0) {
        setNotification({ message: `${multiMatchCount}건의 실적은 중복된 고객 이름이 있어 계약 정보가 자동으로 연결되지 않았습니다. 고객 상세 화면에서 수동으로 추가해주세요.`, type: 'error' });
    }
  };

  const handleSelectCustomerForContract = async (customerId: string) => {
    if (selectCustomerForContractModalState.record) {
        const recordWithMaybeType = selectCustomerForContractModalState.record as (Omit<PerformanceRecord, 'id'> & { customerType?: CustomerType });
        await associateContractWithCustomer(customerId, recordWithMaybeType, recordWithMaybeType.customerType);
    }
    setSelectCustomerForContractModalState({ isOpen: false, record: null, matchingCustomers: [] });
  };

  const handleCreateNewCustomerForContract = async () => {
      if (selectCustomerForContractModalState.record) {
          const recordWithMaybeType = selectCustomerForContractModalState.record as (Omit<PerformanceRecord, 'id'> & { customerType?: CustomerType });
          await associateContractWithCustomer(null, recordWithMaybeType, recordWithMaybeType.customerType);
      }
      setSelectCustomerForContractModalState({ isOpen: false, record: null, matchingCustomers: [] });
  };

  const handlePcCompletionSave = useCallback(async (
      result: 'success' | 'rejection' | 'followUp',
      data: any,
      originalAppointment: Appointment
  ) => {
      await updateAppointmentStatus(originalAppointment.id, 'completed');

      if (data.consultationNotes && originalAppointment.customerId) {
        const customer = customers.find(c => c.id === originalAppointment.customerId);
        if (customer) {
            const newConsultation: Consultation = {
                id: `consult-${Date.now()}`,
                date: new Date(originalAppointment.date).toISOString(),
                meetingType: originalAppointment.meetingType as MeetingType,
                notes: data.consultationNotes,
            };
            const updatedConsultations = [newConsultation, ...(customer.consultations || [])].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
            const updatedCustomer = {
                ...customer,
                consultations: updatedConsultations,
            };
            await updateCustomer(updatedCustomer);
        }
      }

      if (result === 'success') {
          await handleAddPerformanceRecord(data.performanceData as (Omit<PerformanceRecord, 'id'> & { customerType?: CustomerType; }));
          setNotification({ message: '실적이 기록되고 계약 정보가 추가되었습니다.', type: 'success' });
      } else if (result === 'rejection') {
          const customer = customers.find(c => c.id === originalAppointment.customerId);
          if (customer) {
              const today = new Date();
              const todayStr = new Date(today.getTime() - (today.getTimezoneOffset() * 60000)).toISOString().split('T')[0];
              const updatedCustomer: Customer = {
                  ...customer,
                  tags: Array.from(new Set([...customer.tags, '거절고객'])),
                  rejectionReason: data.rejectionData.reason,
                  recontactProbability: data.recontactProbability,
                  rejectionNotes: data.rejectionData.notes,
                  rejectionDate: todayStr,
                  nextFollowUpDate: data.rejectionData.nextFollowUpDate || undefined
              };
              await updateCustomer(updatedCustomer);
              setNotification({ message: `${customer.name} 고객이 '거절 고객'으로 분류되었습니다.`, type: 'success' });
          }
      } else if (result === 'followUp') {
          await addAppointment(data.followUpData as Omit<Appointment, 'id' | 'status'>);
          setNotification({ message: '후속 일정이 추가되었습니다.', type: 'success' });
      }
      
      setPcCompletionWizardState({ isOpen: false, appointment: null });
  }, [customers, updateAppointmentStatus, handleAddPerformanceRecord, updateCustomer, addAppointment, associateContractWithCustomer]);

  const handleApCompletionSave = useCallback(async (
    result: 'positive' | 'rejection' | 'followUp' | 'simple',
    data: any,
    originalAppointment: Appointment
  ) => {
      await updateAppointmentStatus(originalAppointment.id, 'completed');
  
      if (data.consultationNotes && originalAppointment.customerId) {
          const customer = customers.find(c => c.id === originalAppointment.customerId);
          if (customer) {
              const newConsultation: Consultation = {
                  id: `consult-${Date.now()}`,
                  date: new Date(originalAppointment.date).toISOString(),
                  meetingType: originalAppointment.meetingType as MeetingType,
                  notes: data.consultationNotes,
              };
              const updatedConsultations = [newConsultation, ...(customer.consultations || [])].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
              const updatedCustomer = {
                  ...customer,
                  consultations: updatedConsultations,
              };
              await updateCustomer(updatedCustomer);
          }
      }
  
      if (result === 'positive') {
          await addAppointment(data.pcAppointmentData as Omit<Appointment, 'id' | 'status'>);
          setNotification({ message: '후속 PC 일정이 추가되었습니다.', type: 'success' });
      } else if (result === 'rejection') {
          const customer = customers.find(c => c.id === originalAppointment.customerId);
          if (customer) {
              const today = new Date();
              const todayStr = new Date(today.getTime() - (today.getTimezoneOffset() * 60000)).toISOString().split('T')[0];
              const updatedCustomer: Customer = {
                  ...customer,
                  tags: Array.from(new Set([...customer.tags, '거절고객'])),
                  rejectionReason: data.rejectionData.reason,
                  recontactProbability: data.recontactProbability,
                  rejectionNotes: data.rejectionData.notes,
                  rejectionDate: todayStr,
                  nextFollowUpDate: data.rejectionData.nextFollowUpDate || undefined
              };
              await updateCustomer(updatedCustomer);
              setNotification({ message: `${customer.name} 고객이 '거절 고객'으로 분류되었습니다.`, type: 'success' });
          }
      } else if (result === 'followUp') {
          await addAppointment(data.followUpData as Omit<Appointment, 'id' | 'status'>);
          setNotification({ message: '후속 일정이 추가되었습니다.', type: 'success' });
      }
      
      setApCompletionWizardState({ isOpen: false, appointment: null });
      setNotification({ message: 'AP 미팅이 완료 처리되었습니다.', type: 'success' });
  
  }, [customers, updateAppointmentStatus, updateCustomer, addAppointment]);

  const handleSaveReminder = useCallback(async ({ customerId, name, date, notes }) => {
    if (customerId) {
        const customer = customers.find(c => c.id === customerId);
        if (customer) {
            const newCallRecord: CallRecord = {
                id: Date.now().toString(),
                date: new Date().toISOString(),
                result: 'other',
                notes,
            };
            const updatedCustomer: Customer = {
                ...customer,
                name: name,
                nextFollowUpDate: date || undefined,
                callHistory: [newCallRecord, ...(customer.callHistory || [])],
            };
            await updateCustomer(updatedCustomer);
        }
    } else {
        let customerName = name;
        if (!customerName && notes) {
            customerName = notes.substring(0, 20) + (notes.length > 20 ? '...' : '');
        } else if (!customerName && !notes) {
            customerName = "제목 없는 리마인더";
        }
        
        const newProspect: AIExtractedProspectWithDetails = {
            customerName: customerName,
            contact: '미확인',
            dob: '',
            gender: '미확인',
            homeAddress: '미확인',
            workAddress: '미확인',
            familyRelations: '미확인',
            occupation: '미확인',
            monthlyPremium: '미확인',
            preferredContact: '미확인',
            type: 'potential',
            nextFollowUpDate: date,
            callHistory: [{
                id: Date.now().toString(),
                date: new Date().toISOString(),
                result: 'other',
                notes: notes
            }]
        };
        await addCustomer([newProspect]);
    }
    setIsAddReminderModalOpen(false);
    setReminderToEdit(null);
    setNotification({ message: '리마인더가 저장되었습니다.', type: 'success' });
  }, [customers, addCustomer, updateCustomer]);

  const handleSaveRejection = async (customerId: string, reason: RejectionReason, probability: RecontactProbability, notes: string, nextFollowUpDate?: string) => {
    const customer = customers.find(c => c.id === customerId);
    if (customer) {
        const today = new Date();
        const todayStr = new Date(today.getTime() - (today.getTimezoneOffset() * 60000)).toISOString().split('T')[0];

        const updatedCustomer: Customer = {
            ...customer,
            tags: Array.from(new Set([...customer.tags, '거절고객'])),
            rejectionReason: reason,
            recontactProbability: probability,
            rejectionNotes: notes,
            rejectionDate: todayStr,
            nextFollowUpDate: nextFollowUpDate || undefined
        };
        await updateCustomer(updatedCustomer);
        setNotification({ message: `${customer.name} 고객이 '거절 고객'으로 분류되었습니다.`, type: 'success' });
    }
  };

  const handleSaveConsultationRecord = useCallback(async (data: ConsultationRecordData) => {
    if (!recordModalData) return;

    const customer = customers.find(c => c.id === recordModalData.customerId);
    if (customer) {
        const newConsultation: Consultation = {
            id: `consult-${Date.now()}`,
            date: new Date(data.date).toISOString(),
            meetingType: data.meetingType,
            notes: data.notes,
        };
        const updatedConsultations = [newConsultation, ...(customer.consultations || [])].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        const updatedCustomer = {
            ...customer,
            consultations: updatedConsultations,
        };
        await updateCustomer(updatedCustomer);
        setIsRecordModalOpen(false);
        setRecordModalData(null);
        setNotification({ message: '상담 기록이 성공적으로 추가되었습니다.', type: 'success' });
    }
  }, [customers, recordModalData, updateCustomer]);

    const handleSearch = useCallback(async (query: string) => {
    setIsSearching(true);
    setSearchResults(null);
    setIsSearchResultsModalOpen(true);

    const lowerQuery = query.toLowerCase();

    const generateSnippet = (text: string, context = 20): string => {
        if (!text) return '';
        const index = text.toLowerCase().indexOf(lowerQuery);
        if (index === -1) return '';

        const start = Math.max(0, index - context);
        const end = Math.min(text.length, index + lowerQuery.length + context);
        
        const prefix = start > 0 ? '...' : '';
        const suffix = end < text.length ? '...' : '';

        const content = text.substring(start, end);
        const highlighted = content.replace(new RegExp(query, 'gi'), match => `<strong class="text-[var(--text-accent)]">${match}</strong>`);
        
        return `${prefix}${highlighted}${suffix}`;
    };

    await new Promise(resolve => setTimeout(resolve, 100));

    try {
        const results = {
            customers: [] as { customer: Customer; snippet: string }[],
            appointments: [] as { appointment: Appointment; snippet: string }[],
            consultations: [] as { customer: Customer; consultation: Consultation; snippet: string }[],
            dailyReviews: [] as { review: DailyReview; snippet: string }[],
            todos: [] as { todo: Todo; snippet: string }[],
            quickMemos: [] as { memo: QuickMemo; snippet: string }[],
            contracts: [] as { customer: Customer, contract: Contract, snippet: string }[],
        };
        const matchedCustomerIds = new Set<string>();

        customers.forEach(customer => {
            let snippet = '';
            if (customer.name.toLowerCase().includes(lowerQuery)) snippet = generateSnippet(customer.name);
            else if (customer.contact.includes(lowerQuery)) snippet = generateSnippet(customer.contact);
            else if (customer.occupation?.toLowerCase().includes(lowerQuery)) snippet = generateSnippet(customer.occupation);
            else if (customer.homeAddress?.toLowerCase().includes(lowerQuery)) snippet = generateSnippet(customer.homeAddress);
            else if (customer.workAddress?.toLowerCase().includes(lowerQuery)) snippet = generateSnippet(customer.workAddress);
            else if (customer.tags.some(tag => tag.toLowerCase().includes(lowerQuery))) {
                const matchedTag = customer.tags.find(tag => tag.toLowerCase().includes(lowerQuery));
                if(matchedTag) snippet = generateSnippet(matchedTag);
            }
            
            customer.consultations.forEach(consultation => {
                if (consultation.notes.toLowerCase().includes(lowerQuery)) {
                    results.consultations.push({ customer, consultation, snippet: generateSnippet(consultation.notes) });
                    matchedCustomerIds.add(customer.id);
                }
            });

            (customer.contracts || []).forEach(contract => {
                let contractSnippet = '';
                if (contract.productName?.toLowerCase().includes(lowerQuery)) contractSnippet = generateSnippet(contract.productName);
                else if (contract.insuranceCompany?.toLowerCase().includes(lowerQuery)) contractSnippet = generateSnippet(contract.insuranceCompany);
                else if (contract.policyNumber?.toLowerCase().includes(lowerQuery)) snippet = generateSnippet(contract.policyNumber);
                else if (typeof contract.coverageDetails === 'string' && contract.coverageDetails.toLowerCase().includes(lowerQuery)) {
                    contractSnippet = generateSnippet(contract.coverageDetails);
                } else if (Array.isArray(contract.coverageDetails)) {
                    const detailMatch = contract.coverageDetails.find(d => d.name.toLowerCase().includes(lowerQuery) || d.amount.toLowerCase().includes(lowerQuery));
                    if(detailMatch) contractSnippet = generateSnippet(`${detailMatch.name} - ${detailMatch.amount}`);
                }
                
                if (contractSnippet) {
                    results.contracts.push({ customer, contract, snippet: contractSnippet });
                    matchedCustomerIds.add(customer.id);
                }
            });
            
            if (snippet && !matchedCustomerIds.has(customer.id)) {
                results.customers.push({ customer, snippet });
            }
        });

        appointments.forEach(appointment => {
            let snippet = '';
            if (appointment.title?.toLowerCase().includes(lowerQuery)) snippet = generateSnippet(appointment.title);
            else if (appointment.customerName?.toLowerCase().includes(lowerQuery)) snippet = generateSnippet(appointment.customerName);
            else if (appointment.location?.toLowerCase().includes(lowerQuery)) snippet = generateSnippet(appointment.location);
            else if (appointment.notes?.toLowerCase().includes(lowerQuery)) snippet = generateSnippet(appointment.notes);
            
            if (snippet) {
                results.appointments.push({ appointment, snippet });
            }
        });
        
        dailyReviews.forEach(review => {
            if (review.content.toLowerCase().includes(lowerQuery)) {
                results.dailyReviews.push({ review, snippet: generateSnippet(review.content) });
            }
        });
        
        todos.forEach(todo => {
            if (todo.text.toLowerCase().includes(lowerQuery)) {
                results.todos.push({ todo, snippet: generateSnippet(todo.text) });
            }
        });
        
        quickMemos.forEach(memo => {
            if (memo.text.toLowerCase().includes(lowerQuery)) {
                results.quickMemos.push({ memo, snippet: generateSnippet(memo.text) });
            }
        });

        setSearchResults(results);
    } catch (e) {
        setNotification({ message: `검색 실패: ${(e as Error).message}`, type: 'error' });
        setIsSearchResultsModalOpen(false);
    } finally {
        setIsSearching(false);
    }
}, [customers, appointments, dailyReviews, todos, quickMemos]);
  
  const handleRescheduleFromPostponed = useCallback((appointment: Appointment) => {
    const newAppointmentData = { ...appointment };
    delete (newAppointmentData as any).id;
    newAppointmentData.status = 'scheduled';
    newAppointmentData.recurrenceType = 'none';
    delete (newAppointmentData as any).recurrenceDays;
    delete (newAppointmentData as any).recurrenceEndDate;
    delete (newAppointmentData as any).recurrenceInterval;
    delete (newAppointmentData as any).exceptions;

    const followUpDate = new Date();
    followUpDate.setDate(followUpDate.getDate() + 7);
    newAppointmentData.date = new Date(followUpDate.getTime() - (followUpDate.getTimezoneOffset() * 60000)).toISOString().split('T')[0];
    
    newAppointmentData.notes = `[재등록] 원본 일정:\n${appointment.date} ${appointment.time}\n${appointment.notes || ''}`;

    setAppointmentModal({ isOpen: true, appointment: newAppointmentData as Appointment, rescheduledFromId: appointment.id });
  }, []);

  const handleOpenAddAppointmentModal = useCallback((date: string, time: string) => {
    setAppointmentModal({ isOpen: true, date, time });
  }, []);

  const handleExport = async () => {
    try {
        const data = await exportData();
        const jsonData = JSON.stringify(data, null, 2);
        const now = new Date();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        const fileTimestamp = `${month}-${day}-${hours}${minutes}`;
        
        const isMobile = /Mobi/i.test(navigator.userAgent);

        if (isMobile) {
            const shareFileName = `${fileTimestamp}-aicrm-backup.txt`;
            const shareBlob = new Blob([jsonData], { type: 'text/plain' });
            const shareFile = new File([shareBlob], shareFileName, { type: 'text/plain' });

            if (navigator.share && navigator.canShare && navigator.canShare({ files: [shareFile] })) {
                try {
                    await navigator.share({
                        files: [shareFile],
                        title: 'AI CRM 데이터 백업',
                        text: `AI CRM 데이터 백업 파일: ${shareFileName}`,
                    });
                    setNotification({ message: '데이터를 성공적으로 공유했습니다.', type: 'success' });
                    return; 
                } catch (error) {
                    if (error instanceof DOMException && error.name === 'AbortError') {
                        console.log('Share was cancelled by the user.');
                        return;
                    }
                }
            }
        }
        
        const downloadFileName = `${fileTimestamp}-aicrm-backup.json`;
        const downloadBlob = new Blob([jsonData], { type: 'application/json' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(downloadBlob);
        link.download = downloadFileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(link.href);
        
        setNotification({ message: '데이터를 성공적으로 내보냈습니다.', type: 'success' });

    } catch (error) {
        console.error('Export failed:', error);
        setNotification({ message: '데이터 내보내기에 실패했습니다.', type: 'error' });
    }
};

  const handleImportClick = () => {
    importFileRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        setImportFileContent(content);
        try {
          const data = JSON.parse(content);
          setImportSummary({
            backupDate: data.backupDate,
            customerCount: data.customers?.length || 0,
            appointmentCount: data.appointments?.length || 0,
            productCount: data.products?.length || 0,
            customerTypeCount: data.customerTypes?.length || 0,
            version: data.version
          });
          setShowImportPreview(true);
        } catch (error) {
          setNotification({ message: '유효하지 않은 파일 형식입니다.', type: 'error' });
        }
      };
      reader.readAsText(file);
    }
  };

  const confirmImport = async () => {
    if (importFileContent) {
      setIsImporting(true);
      setShowImportPreview(false);
      try {
        const data = JSON.parse(importFileContent);
        const imported = await importData(data);
        
        setCustomers(imported.customers);
        setAppointments(imported.appointments);
        setScripts(imported.scripts);
        setTodos(imported.todos);
        setDailyReviews(imported.dailyReviews);
        setGoals(imported.goals);
        setProducts(imported.products);
        setCustomerTypes(imported.customerTypes);
        setPerformanceRecords(imported.performanceRecords);
        setPerformancePredictions(imported.performancePredictions);
        setProfileInfo(imported.profileInfo[0] || null);
        setQuickMemos(imported.quickMemos);
        setGreetings(imported.favoriteGreetings);
        setTemplates(imported.messageTemplates);
        setGoalBoards(imported.goalBoards || []);

        setNotification({ message: '데이터를 성공적으로 가져왔습니다.', type: 'success' });
      } catch (error) {
        console.error('Import failed:', error);
        setNotification({ message: '데이터 가져오기에 실패했습니다.', type: 'error' });
      } finally {
        setIsImporting(false);
        setImportFileContent(null);
        if (importFileRef.current) importFileRef.current.value = '';
      }
    }
  };

    const handleClearDemoData = async () => {
        setAppIsLoading(true);
        try {
            const dbModule = await import('./services/db');
            await Promise.all([
                dbModule.db.customers.clear(),
                dbModule.db.appointments.clear(),
                dbModule.db.todos.clear(),
                dbModule.db.dailyReviews.clear(),
                dbModule.db.performanceRecords.clear(),
                dbModule.db.performancePredictions.clear(),
                dbModule.db.quickMemos.clear(),
            ]);

            setCustomers([]);
            setAppointments([]);
            setTodos([]);
            setDailyReviews([]);
            setPerformanceRecords([]);
            setPerformancePredictions([]);
            setQuickMemos([]);
            
            setNotification({ message: '예시 데이터가 모두 삭제되었습니다.', type: 'success' });
        } catch (e) {
            console.error('Failed to clear demo data', e);
            setNotification({ message: '데이터 삭제 중 오류가 발생했습니다.', type: 'error' });
        } finally {
            setIsClearConfirmOpen(false);
            setAppIsLoading(false);
        }
    };
    
    const handleSelectCustomerFromAppointmentModal = (customer: Customer) => {
        setSelectedAppointment(null);
        setSelectedCustomer({ customer, initialTab: 'details' });
    };


  const NavItem: React.FC<{
    targetView: AppView;
    icon: React.ReactNode;
    label: string;
    collapsed?: boolean;
  }> = ({ targetView, icon, label, collapsed }) => (
    <button
      onClick={() => setView(targetView)}
      className={`flex items-center w-full py-3 text-sm font-medium rounded-lg transition-colors group ${
        collapsed ? 'justify-center px-2' : 'px-4'
      } ${
        view === targetView
          ? 'bg-[var(--background-accent)] shadow-md'
          : 'hover:bg-[var(--background-tertiary)]'
      }`}
      title={collapsed ? label : undefined}
    >
      {icon}
      {!collapsed && (
        <span className={`ml-3 ${
          view === targetView 
          ? 'text-[var(--text-on-accent)]' 
          : 'text-[var(--text-secondary)] group-hover:text-[var(--text-primary)]'
        }`}>
          {label}
        </span>
      )}
    </button>
  );
  
  const BottomNavItem: React.FC<{
    targetView: AppView;
    icon: React.ReactNode;
    label: string;
  }> = ({ targetView, icon, label }) => (
    <button
        onClick={() => setView(targetView)}
        className={`flex flex-col items-center justify-center w-full h-full text-xs font-medium transition-colors group rounded-lg
        ${
          view === targetView
            ? 'bg-[var(--background-tertiary)]'
            : 'hover:bg-[var(--background-tertiary)]'
        }`}
      >
        {icon}
        <span className={`mt-1 ${
            view === targetView 
            ? 'text-[var(--text-accent)]' 
            : 'text-[var(--text-muted)] group-hover:text-[var(--text-accent)]'
        }`}>
            {label}
        </span>
      </button>
  );

  const BottomNavBar = () => (
    <nav className="fixed bottom-0 left-0 right-0 h-16 bg-[var(--background-secondary)] border-t border-[var(--border-color)] flex justify-around items-center z-40 md:hidden p-1 gap-1">
        <BottomNavItem targetView="dashboard" icon={<DashboardIcon className="h-6 w-6 text-blue-400" />} label="홈" />
        <BottomNavItem targetView="customers" icon={<UsersIcon className="h-6 w-6 text-teal-400" />} label="고객" />
        <BottomNavItem targetView="telephone" icon={<PhoneIcon className="h-6 w-6 text-yellow-400" />} label="TA" />
        <BottomNavItem targetView="schedule" icon={<CalendarIcon className="h-6 w-6 text-blue-400" />} label="일정" />
        <BottomNavItem targetView="performance" icon={<ChartBarIcon className="h-6 w-6 text-purple-400" />} label="실적" />
        <BottomNavItem targetView="touch" icon={<MessageIcon className="h-6 w-6 text-pink-400" />} label="기능" />
    </nav>
  );


  const renderView = () => {
    switch (view) {
      case 'dashboard':
        return <Dashboard 
                  customers={customers} 
                  appointments={appointments} 
                  todos={todos}
                  goals={goals}
                  isLoading={isLoading} 
                  onNavigate={setView} 
                  onSelectCustomer={(customer, tab) => setSelectedCustomer({ customer, initialTab: tab })}
                  onRequestAppointmentAction={handleRequestAppointmentAction}
                  onDeleteAppointment={deleteAppointment}
                  onSelectAppointment={setSelectedAppointment}
                  onOpenAddAppointmentModal={handleOpenAddAppointmentModal}
                  onOpenAddReminderModal={() => setIsAddReminderModalOpen(true)}
                  onEditReminder={(customer) => setReminderToEdit(customer)}
                  onAddTodo={addTodo}
                  onToggleTodo={toggleTodo}
                  onDeleteTodo={deleteTodo}
                  onUpdateTodo={updateTodo}
                  onAddGoal={addGoal}
                  onUpdateGoal={updateGoal}
                  onDeleteGoal={deleteGoal}
                  quickMemos={quickMemos}
                  onAddQuickMemo={addQuickMemo}
                  onUpdateQuickMemo={updateQuickMemo}
                  onDeleteQuickMemo={deleteQuickMemo}
                  onDeleteMultipleQuickMemos={deleteMultipleQuickMemos}
                  onUpdateCustomer={updateCustomer}
                  onClearMultipleFollowUpDates={clearMultipleFollowUpDates}
                  onDeleteMultipleAppointments={deleteMultipleAppointments}
                  predictions={performancePredictions}
                  onAddPrediction={addPerformancePrediction}
                  onUpdatePrediction={updatePerformancePrediction}
                  onDeletePrediction={deletePerformancePrediction}
                  performanceRecords={performanceRecords}
                  onAddPerformanceRecord={handleAddPerformanceRecord}
                  onUpdatePerformanceRecord={updatePerformanceRecord}
                  onDeletePerformanceRecord={deletePerformanceRecord}
                  onAddAppointment={handleAddAppointment}
                  onUpdateAppointment={handleUpdateAppointmentAndConsultation}
                  onEditAppointment={(app) => setAppointmentModal({ isOpen: true, appointment: app })}
                  onRequestAction={handleRequestAction}
                  updateCustomerTags={updateCustomerTags}
                  onSetOnAppointmentAddSuccess={handleSetOnAppointmentAddSuccess}
                  habits={habits}
                  habitLogs={habitLogs}
                  onAddHabit={addHabit}
                  onUpdateHabit={updateHabit}
                  onDeleteHabit={deleteHabit}
                  onLogHabit={logHabit}
                  onOpenRejectionModal={(customer) => setRejectionModalState({ isOpen: true, customer })}
                  onOpenConsultationRecordModal={handleOpenConsultationRecordModal}
                  onLogCall={(customer) => setLogCallModalState({ isOpen: true, customer })}
                />
      case 'customers':
        return <CustomerList 
                  customers={customers} 
                  appointments={appointments}
                  customerTypes={customerTypes}
                  onSelectCustomer={(customer, tab) => setSelectedCustomer({ customer, initialTab: tab })}
                  onAddCustomerClick={() => setIsAddProspectModalOpen(true)}
                  onDeleteMultiple={(ids) => {
                    deleteMultipleCustomers(ids);
                    deleteAppointmentsByCustomerIds(ids);
                  }}
                  onDeleteMultipleAppointments={deleteMultipleAppointments}
                  onLogCall={(customer) => setLogCallModalState({ isOpen: true, customer: customer })}
                  onLogTouch={handleLogTouch}
                  onBulkLogTouch={bulkLogTouch}
                  onBulkUpdateTags={updateCustomerTags}
                  onBulkUpdateType={bulkUpdateCustomerType}
                  onNavigate={setView}
                  onOpenCustomerTypeModal={() => setIsCustomerTypeModalOpen(true)}
                  startCallingList={startCallingList}
                  onOpenTagManagementModal={() => setIsTagManagementModalOpen(true)}
                  onEditUnregisteredAppointment={(app) => setAppointmentModal({ isOpen: true, appointment: app })}
                  scripts={scripts}
                  onSaveScript={saveScript}
                  onDeleteScript={deleteScript}
                />
      case 'telephone':
        return <TelephoneApproach 
                 scripts={scripts} 
                 customers={customers} 
                 appointments={appointments}
                 onSaveScript={saveScript} 
                 onDeleteScript={deleteScript}
                 onSelectCustomer={(customer) => setSelectedCustomer({ customer, initialTab: 'details' })}
                 onLogCall={(customer) => setLogCallModalState({ isOpen: true, customer: customer })}
                 callingListCustomerIds={callingListCustomerIds}
                 completedInCallingList={completedInCallingList}
                 endCallingList={endCallingList}
                 onAddAppointment={handleAddAppointment}
                />
      case 'schedule':
        return <ScheduleCalendar
                  isMobile={isMobile}
                  appointments={appointments}
                  customers={customers}
                  predictions={performancePredictions}
                  performanceRecords={performanceRecords}
                  onAddAppointment={handleAddAppointment}
                  onOpenAddAppointmentModal={handleOpenAddAppointmentModal}
                  onEditAppointment={(app) => setAppointmentModal({ isOpen: true, appointment: app })}
                  onDeleteAppointment={deleteAppointment}
                  onDeleteMultipleAppointments={deleteMultipleAppointments}
                  onRequestAppointmentAction={handleRequestAppointmentAction}
                  todos={todos}
                  onAddTodo={addTodo} onToggleTodo={toggleTodo} onDeleteTodo={deleteTodo} onUpdateTodo={updateTodo}
                  dailyReviews={dailyReviews} onSaveDailyReview={saveDailyReview} onDeleteDailyReview={deleteDailyReview} onDeleteMultipleDailyReviews={deleteMultipleDailyReviews}
                  onOpenAIAddAppointmentModal={() => setIsAIModalOpen(true)}
                  onRescheduleFromPostponed={handleRescheduleFromPostponed}
                  onSelectCustomer={(customer, tab) => setSelectedCustomer({ customer, initialTab: tab })}
                  onEditConsultation={(customerId, customerName, consultation) => setEditingConsultation({ customerId, customerName, consultation })}
                  onDeleteConsultation={deleteConsultation}
                  onDeleteMultipleConsultations={deleteMultipleConsultations}
                  onAddPrediction={addPerformancePrediction}
                  onUpdatePrediction={updatePerformancePrediction}
                  onOpenConsultationRecordModal={handleOpenConsultationRecordModal}
                 />
      case 'touch':
        return <TouchRecommendation 
                    customers={customers}
                    appointments={appointments} 
                    performanceRecords={performanceRecords}
                    performancePredictions={performancePredictions}
                    profileInfo={profileInfo} 
                    onSaveProfileInfo={saveProfileInfo} 
                    onSetTheme={setTheme} 
                    currentTheme={theme}
                    favoriteGreetings={greetings}
                    onAddFavoriteGreeting={addFavoriteGreeting}
                    onDeleteFavoriteGreeting={deleteFavoriteGreeting}
                    onSetFontSize={setFontSize}
                    currentFontSize={fontSize}
                    onSetFontFamily={setFontFamily}
                    currentFontFamily={fontFamily}
                    onClearDemoData={() => setIsClearConfirmOpen(true)}
                    onOpenGuideModal={() => setIsGuideModalOpen(true)}
                    templates={templates}
                    onAddTemplate={addTemplate}
                    onUpdateTemplate={updateTemplate}
                    onDeleteTemplate={deleteTemplate}
                    onSelectCustomer={(customer, tab) => setSelectedCustomer({ customer, initialTab: tab })}
                    geocodeAndUpdateCustomers={geocodeAndUpdateCustomers}
                    onOpenNearbyCustomersModal={() => setIsNearbyCustomersModalOpen(true)}
                    onOpenGoalBoardModal={() => setIsGoalBoardModalOpen(true)}
                    onExport={handleExport}
                    onImport={handleImportClick}
                />
      case 'performance':
        return <PerformanceManagement 
                  records={performanceRecords}
                  onAdd={handleAddPerformanceRecord}
                  onUpdate={updatePerformanceRecord}
                  onDelete={deletePerformanceRecord}
                  predictions={performancePredictions}
                  onAddPrediction={addPerformancePrediction}
                  onUpdatePrediction={updatePerformancePrediction}
                  onDeletePrediction={deletePerformancePrediction}
                  customers={customers}
                  goals={goals}
                  onAddGoal={addGoal}
                  onUpdateGoal={updateGoal}
                  onDeleteGoal={deleteGoal}
                  appointments={appointments}
                  onAddAppointment={handleAddAppointment}
                  onUpdateAppointment={handleUpdateAppointmentAndConsultation}
                  onUpdateCustomer={updateCustomer}
                  onEditAppointment={(app) => setAppointmentModal({ isOpen: true, appointment: app })}
                  onRequestAction={handleRequestAction}
                  onRequestAppointmentAction={handleRequestAppointmentAction}
                  updateCustomerTags={updateCustomerTags}
                  onSelectCustomer={(customer, tab) => setSelectedCustomer({ customer, initialTab: tab })}
                  onSetOnAppointmentAddSuccess={handleSetOnAppointmentAddSuccess}
                  onOpenRejectionModal={(customer) => setRejectionModalState({ isOpen: true, customer })}
                  onOpenConsultationRecordModal={handleOpenConsultationRecordModal}
                />
      case 'consultations':
        return <ConsultationList 
                  customers={customers} 
                  onSelectCustomer={(customer, tab) => setSelectedCustomer({ customer, initialTab: tab })}
                  onEdit={(customerId, customerName, consultation) => setEditingConsultation({ customerId, customerName, consultation })}
                  onDelete={deleteConsultation}
                  onDeleteMultiple={deleteMultipleConsultations}
                  meetingTypeOptions={customerMeetingTypes}
                 />
      default:
        return <Dashboard 
                customers={customers} 
                appointments={appointments} 
                todos={todos}
                goals={goals}
                isLoading={isLoading} 
                onNavigate={setView} 
                onSelectCustomer={(customer, tab) => setSelectedCustomer({ customer, initialTab: tab })}
                onRequestAppointmentAction={handleRequestAppointmentAction}
                onDeleteAppointment={deleteAppointment}
                onSelectAppointment={setSelectedAppointment}
                onOpenAddAppointmentModal={handleOpenAddAppointmentModal}
                onOpenAddReminderModal={() => setIsAddReminderModalOpen(true)}
                onEditReminder={(customer) => setReminderToEdit(customer)}
                onAddTodo={addTodo}
                onToggleTodo={toggleTodo}
                onDeleteTodo={deleteTodo}
                onUpdateTodo={updateTodo}
                onAddGoal={addGoal}
                onUpdateGoal={updateGoal}
                onDeleteGoal={deleteGoal}
                quickMemos={quickMemos}
                onAddQuickMemo={addQuickMemo}
                onUpdateQuickMemo={updateQuickMemo}
                onDeleteQuickMemo={deleteQuickMemo}
                onDeleteMultipleQuickMemos={deleteMultipleQuickMemos}
                onUpdateCustomer={updateCustomer}
                onClearMultipleFollowUpDates={clearMultipleFollowUpDates}
                onDeleteMultipleAppointments={deleteMultipleAppointments}
                predictions={performancePredictions}
                onAddPrediction={addPerformancePrediction}
                onUpdatePrediction={updatePerformancePrediction}
                onDeletePrediction={deletePerformancePrediction}
                performanceRecords={performanceRecords}
                onAddPerformanceRecord={handleAddPerformanceRecord}
                onUpdatePerformanceRecord={updatePerformanceRecord}
                onDeletePerformanceRecord={deletePerformanceRecord}
                onAddAppointment={handleAddAppointment}
                onUpdateAppointment={handleUpdateAppointmentAndConsultation}
                onEditAppointment={(app) => setAppointmentModal({ isOpen: true, appointment: app })}
                onRequestAction={handleRequestAction}
                updateCustomerTags={updateCustomerTags}
                onSetOnAppointmentAddSuccess={handleSetOnAppointmentAddSuccess}
                habits={habits}
                habitLogs={habitLogs}
                onAddHabit={addHabit}
                onUpdateHabit={updateHabit}
                onDeleteHabit={deleteHabit}
                onLogHabit={logHabit}
                onOpenRejectionModal={(customer) => setRejectionModalState({ isOpen: true, customer })}
                onOpenConsultationRecordModal={handleOpenConsultationRecordModal}
                onLogCall={(customer) => setLogCallModalState({ isOpen: true, customer })}
              />
    }
  };
  
  if (!isUnlocked) {
    return <PasswordLock onUnlock={handleUnlock} />;
  }

  return (
    <div className="flex h-screen bg-[var(--background-primary)] text-[var(--text-secondary)]">
      <nav 
        className={`bg-[var(--background-secondary)] p-4 border-r border-[var(--border-color)] flex-col justify-between hidden md:flex transition-all duration-300 ${
          isSidebarCollapsed ? 'w-20' : 'w-48'
        }`}
      >
        <div>
            <div className={`flex items-center mb-8 ${isSidebarCollapsed ? 'justify-center' : 'justify-between'}`}>
                {!isSidebarCollapsed && (
                  <h1 className="text-2xl font-bold text-[var(--text-primary)] px-2 truncate">JW's CRM</h1>
                )}
                <button 
                  onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                  className="p-1 rounded-md hover:bg-[var(--background-tertiary)] text-[var(--text-muted)] transition-colors"
                  title={isSidebarCollapsed ? "메뉴 펼치기" : "메뉴 접기"}
                >
                  {isSidebarCollapsed ? <ChevronRightIcon className="h-5 w-5" /> : <ChevronLeftIcon className="h-5 w-5" />}
                </button>
            </div>
            <div className="space-y-2">
                <NavItem targetView="dashboard" icon={<DashboardIcon className="h-6 w-6 text-blue-400" />} label="홈" collapsed={isSidebarCollapsed} />
                <NavItem targetView="customers" icon={<UsersIcon className="h-6 w-6 text-teal-400" />} label="고객" collapsed={isSidebarCollapsed} />
                <NavItem targetView="telephone" icon={<PhoneIcon className="h-6 w-6 text-yellow-400" />} label="TA" collapsed={isSidebarCollapsed} />
                <NavItem targetView="schedule" icon={<CalendarIcon className="h-6 w-6 text-blue-400" />} label="일정" collapsed={isSidebarCollapsed} />
                <NavItem targetView="performance" icon={<ChartBarIcon className="h-6 w-6 text-purple-400" />} label="실적" collapsed={isSidebarCollapsed} />
                <NavItem targetView="touch" icon={<MessageIcon className="h-6 w-6 text-pink-400" />} label="기능" collapsed={isSidebarCollapsed} />
            </div>
        </div>
        <div className="space-y-2">
            <button 
              onClick={handleImportClick} 
              className={`w-full flex items-center py-2 text-sm font-medium rounded-lg text-[var(--text-secondary)] hover:bg-[var(--background-tertiary)] hover:text-[var(--text-primary)] transition-colors ${isSidebarCollapsed ? 'justify-center px-2' : 'px-4'}`}
              title={isSidebarCollapsed ? "데이터 가져오기" : undefined}
            >
                <UploadCloudIcon className="w-5 h-5" /> 
                {!isSidebarCollapsed && <span className="ml-3">가져오기</span>}
            </button>
            <input type="file" ref={importFileRef} onChange={handleFileChange} className="hidden" accept=".json,.txt" />
            <button 
              onClick={handleExport} 
              className={`w-full flex items-center py-2 text-sm font-medium rounded-lg text-[var(--text-secondary)] hover:bg-[var(--background-tertiary)] hover:text-[var(--text-primary)] transition-colors ${isSidebarCollapsed ? 'justify-center px-2' : 'px-4'}`}
              title={isSidebarCollapsed ? "데이터 내보내기" : undefined}
            >
                <DownloadIcon className="w-5 h-5" /> 
                {!isSidebarCollapsed && <span className="ml-3">내보내기</span>}
            </button>
        </div>
      </nav>

      <div className="flex-1 flex flex-col overflow-hidden">
          <header className="relative z-10 px-4 md:px-6 py-3 flex-shrink-0 border-b border-[var(--border-color)]">
              <div className="flex justify-between items-center w-full gap-4">
                  <div className="flex-1 max-w-lg min-w-0">
                      <GlobalSearchBar onSearch={handleSearch} isSearching={isSearching} />
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                      <div className="hidden md:flex items-center gap-3">
                          <div className="w-9 h-9 bg-[var(--background-accent)] rounded-full flex items-center justify-center text-[var(--text-on-accent)] font-bold text-lg flex-shrink-0">
                            {(profileInfo?.name?.[0] || 'P')}
                          </div>
                          <div>
                            <p className="font-bold text-md text-[var(--text-primary)] truncate">{profileInfo?.name || '사용자'}</p>
                            <p className="text-xs text-[var(--text-muted)] truncate">{profileInfo?.organization || '소속 없음'}</p>
                          </div>
                      </div>
                      
                      <div className="hidden md:block w-px h-8 bg-[var(--border-color)] mx-2"></div>
                      
                      <div className="flex items-center gap-0 md:gap-1">
                          <button onClick={() => setIsAddProspectModalOpen(true)} title="고객 추가" className="p-2 rounded-full hover:bg-[var(--background-tertiary)] text-[var(--text-secondary)] transition-colors">
                              <span className="sr-only">고객 추가</span>
                              <UserAddIcon className="h-6 w-6 text-teal-400" />
                          </button>
                          <button onClick={() => setIsAIModalOpen(true)} title="AI로 일정 추가" className="p-2 rounded-full hover:bg-[var(--background-tertiary)] text-[var(--text-secondary)] transition-colors">
                              <span className="sr-only">AI로 일정 추가</span>
                              <CalendarPlusIcon className="h-6 w-6 text-blue-400" />
                          </button>
                          <button onClick={handleExport} title="데이터 내보내기" className="p-2 rounded-full hover:bg-[var(--background-tertiary)] text-[var(--text-secondary)] transition-colors">
                              <span className="sr-only">데이터 내보내기</span>
                              <DownloadIcon className="h-6 w-6 text-green-400" />
                          </button>
                          <button onClick={handleImportClick} title="데이터 가져오기" className="p-2 rounded-full hover:bg-[var(--background-tertiary)] text-[var(--text-secondary)] transition-colors">
                              <span className="sr-only">데이터 가져오기</span>
                              <UploadCloudIcon className="h-6 w-6 text-indigo-400" />
                          </button>
                      </div>
                  </div>
              </div>
          </header>
          <main ref={mainScrollRef} className={`flex-1 p-2 md:p-6 overflow-y-auto custom-scrollbar ${isMobile ? 'pb-20' : ''}`}>
            {isLoading ? <div className="flex justify-center items-center h-full"><Spinner /></div> : renderView()}
          </main>
      </div>

      {isUpdateAvailable && <UpdateNotification onUpdate={handleUpdate} />}
      {notification && <Notification message={notification.message} type={notification.type} onClose={() => setNotification(null)} />}
      <EventNotifier customers={customers} onSelectCustomer={(customer) => setSelectedCustomer({customer, initialTab: 'details'})} />
      
      {isAddProspectModalOpen && <AddProspectModal 
        onClose={() => setIsAddProspectModalOpen(false)} 
        onAddCustomer={addCustomer} 
        onUpdateCustomer={updateCustomer}
        onAddPerformanceRecord={handleAddPerformanceRecord}
        onAddSuccess={() => {
            setIsAddProspectModalOpen(false);
            setNotification({ message: '데이터가 성공적으로 처리되었습니다.', type: 'success' });
        }}
        customerTypes={customerTypes}
        onAddCustomerType={addCustomerType}
        customers={customers}
       />}
      {selectedCustomer && <CustomerDetailModal 
        customer={selectedCustomer.customer} 
        customers={customers}
        customerTypes={customerTypes} 
        onClose={() => setSelectedCustomer(null)} 
        onSave={handleUpdateCustomerAndCloseModal} 
        onDelete={handleDeleteCustomerAndCloseModal} 
        onUpdateCustomer={updateCustomer} 
        onUpdateConsultation={updateConsultation} 
        onDeleteConsultation={deleteConsultation} 
        onDeleteMultipleConsultations={deleteMultipleConsultations} 
        initialTab={selectedCustomer.initialTab} 
        allTags={allTags} 
        newContractSeed={newContractSeed?.customerId === selectedCustomer.customer.id ? newContractSeed.contractData : undefined} 
        onClearNewContractSeed={() => setNewContractSeed(null)} 
        onShowNotification={(message, type) => setNotification({ message, type })} 
        onSelectCustomer={(customer: Customer) => setSelectedCustomer({ customer, initialTab: 'details' })}
        meetingTypeOptions={customerMeetingTypes}
      />}
      {logCallModalState.isOpen && logCallModalState.customer && <LogCallResultModal customer={logCallModalState.customer} onClose={() => setLogCallModalState({isOpen: false, customer: null})} onSave={handleLogCallResult} />}
      {appointmentModal.isOpen && <AddAppointmentModal customers={customers} modalState={appointmentModal} onClose={() => setAppointmentModal({isOpen: false})} onAdd={handleAddAppointment} onUpdate={handleUpdateAppointmentAndConsultation} onDelete={deleteAppointment} onAddException={addAppointmentException} onEndRecurrence={endRecurrence} />}
      {selectedAppointment && (
        <AppointmentDetailModal
          appointment={selectedAppointment}
          customers={customers}
          onClose={() => setSelectedAppointment(null)}
          onEdit={(app) => { setSelectedAppointment(null); setAppointmentModal({isOpen: true, appointment: app}); }}
          onDelete={deleteAppointment}
          onAddException={addAppointmentException}
          onEndRecurrence={endRecurrence}
          onSelectCustomer={handleSelectCustomerFromAppointmentModal}
        />
      )}
      {isReviewModalOpen && <AppointmentReviewModal appointments={appointmentsToReview} onClose={() => setIsReviewModalOpen(false)} onSave={updateMultipleAppointmentStatuses} />}
      {isSearchResultsModalOpen && <SearchResultsModal 
        isOpen={isSearchResultsModalOpen} 
        onClose={() => setIsSearchResultsModalOpen(false)} 
        results={searchResults} 
        isLoading={isSearching} 
        onSelectCustomer={(customer) => { setSelectedCustomer({customer, initialTab: 'details'}); }} 
        onSelectAppointment={(app) => { setSelectedAppointment(app); }} 
        onSelectConsultation={(customer, consultation) => { setSelectedCustomer({customer, initialTab: 'consultations'}); }}
        onSelectContract={(customer, contract) => { setSelectedCustomer({customer, initialTab: 'contracts'}); }}
        onSelectTodo={(todo) => { setView('schedule'); }}
        onSelectQuickMemo={(memo) => { setView('dashboard'); }}
        onSelectDailyReview={() => { setView('schedule'); }}
      />}
      {isAIModalOpen && <AIAppointmentModal customers={customers} onClose={() => { setIsAIModalOpen(false); setAiAppointmentSeed(null); }} onAddAppointment={handleAddAppointmentFromAI} seedData={aiAppointmentSeed} />}
      {editingConsultation && <EditConsultationModal isOpen={true} onClose={() => setEditingConsultation(null)} onSave={(consultation) => updateConsultation(editingConsultation.customerId, consultation)} consultation={editingConsultation.consultation} customerName={editingConsultation.customerName} meetingTypeOptions={customerMeetingTypes}/>}
      {isCustomerTypeModalOpen && <CustomerTypeManagementModal isOpen={isCustomerTypeModalOpen} onClose={() => setIsCustomerTypeModalOpen(false)} customers={customers} customerTypes={customerTypes} onAdd={addCustomerType} onUpdate={updateCustomerType} onDelete={deleteCustomerType} />}
      {(isAddReminderModalOpen || reminderToEdit) && <AddReminderModal isOpen={isAddReminderModalOpen || !!reminderToEdit} onClose={() => { setIsAddReminderModalOpen(false); setReminderToEdit(null); }} customers={customers} onSave={handleSaveReminder} reminderToEdit={reminderToEdit} />}
      {isTagManagementModalOpen && <TagManagementModal isOpen={isTagManagementModalOpen} onClose={() => setIsTagManagementModalOpen(false)} customers={customers} onBulkUpdate={bulkUpdateTags} />}
      {showImportPreview && <ImportPreviewModal isOpen={showImportPreview} onClose={() => setShowImportPreview(false)} onConfirm={confirmImport} summary={importSummary} />}
      {isClearConfirmOpen && <ConfirmationModal
            isOpen={isClearConfirmOpen}
            onClose={() => setIsClearConfirmOpen(false)}
            onConfirm={handleClearDemoData}
            title="예시 데이터 삭제 확인"
            message="모든 예시 고객, 일정, 실적 등의 데이터를 삭제하고 앱을 초기화하시겠습니까? 이 작업은 되돌릴 수 없습니다."
        />}
      {migrationProgress && (
          <MigrationProgressModal
              isOpen={true}
              current={migrationProgress.current}
              total={migrationProgress.total}
          />
      )}
      {pcCompletionWizardState.isOpen && (
        <PcCompletionWizardModal
            isOpen={pcCompletionWizardState.isOpen}
            onClose={() => setPcCompletionWizardState({ isOpen: false, appointment: null })}
            appointment={pcCompletionWizardState.appointment}
            customer={customers.find(c => c.id === pcCompletionWizardState.appointment?.customerId) || null}
            onSave={handlePcCompletionSave}
            customers={customers}
        />
      )}
      {apCompletionWizardState.isOpen && (
        <ApCompletionWizardModal
            isOpen={apCompletionWizardState.isOpen}
            onClose={() => setApCompletionWizardState({ isOpen: false, appointment: null })}
            appointment={apCompletionWizardState.appointment}
            customer={customers.find(c => c.id === apCompletionWizardState.appointment?.customerId) || null}
            onSave={handleApCompletionSave}
        />
      )}
      {rejectionModalState.isOpen && (
        <RejectionReasonModal
            isOpen={rejectionModalState.isOpen}
            onClose={() => {
                setRejectionModalState({ isOpen: false, customer: null });
            }}
            onSave={handleSaveRejection}
            customer={rejectionModalState.customer}
        />
      )}
      {isGuideModalOpen && <UsageGuideModal isOpen={isGuideModalOpen} onClose={handleGuideClose} />}
      <ActionToast
        toast={actionToast}
        onUndo={handleUndoToastAction}
        onConfirm={handleConfirmToastAction}
        onSecondaryConfirm={handleSecondaryConfirmToastAction}
      />
      {selectCustomerForContractModalState.isOpen && (
        <SelectCustomerForContractModal
            isOpen={selectCustomerForContractModalState.isOpen}
            onClose={() => setSelectCustomerForContractModalState({ isOpen: false, record: null, matchingCustomers: [] })}
            onSelect={handleSelectCustomerForContract}
            onCreateNew={handleCreateNewCustomerForContract}
            record={selectCustomerForContractModalState.record}
            matchingCustomers={selectCustomerForContractModalState.matchingCustomers}
        />
      )}
      {isNearbyCustomersModalOpen && (
        <NearbyCustomersModal
            isOpen={isNearbyCustomersModalOpen}
            onClose={() => setIsNearbyCustomersModalOpen(false)}
            customers={customers}
            onSelectCustomer={(customer) => {
                setIsNearbyCustomersModalOpen(false);
                setSelectedCustomer({ customer, initialTab: 'details' });
            }}
        />
      )}
      {isGoalBoardModalOpen && (
        <GoalBoardModal
          isOpen={isGoalBoardModalOpen}
          onClose={() => setIsGoalBoardModalOpen(false)}
          goalBoards={goalBoards}
          onAdd={addGoalBoard}
          onUpdate={updateGoalBoard}
          onDelete={deleteGoalBoard}
        />
      )}
      {isRecordModalOpen && recordModalData && (
        <ConsultationRecordModal
            isOpen={isRecordModalOpen}
            onClose={() => setIsRecordModalOpen(false)}
            onSave={handleSaveConsultationRecord}
            customerName={recordModalData.customerName}
            defaultDate={recordModalData.date}
            defaultMeetingType={recordModalData.meetingType}
        />
      )}
      <BottomNavBar />
    </div>
  );
};

export default App;
