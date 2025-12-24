import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import type { Appointment, MeetingType, Todo, DailyReview, Goal, Customer, Consultation, PerformancePrediction, PerformanceRecord } from '../types';
import { TrashIcon, PlusIcon, CalendarIcon, ListBulletIcon, CheckIcon, ClipboardIcon, SparklesIcon, CalendarDownloadIcon, XIcon, PencilIcon, DocumentTextIcon, CalendarPlusIcon, SearchIcon, AdjustmentsHorizontalIcon } from './icons';
import { getItem, setItem } from '../services/storageService';
import GoalsTracker from './GoalsTracker';
import MemoListView from './MemoListView';
import DailyReviewList from './DailyReviewList';
import TodoList from './TodoList';
import AddPerformancePredictionModal from './AddPerformancePredictionModal';
import BaseModal from './ui/BaseModal';
import ConfirmationModal from './ui/ConfirmationModal';
import ConsultationList from './ConsultationList';
import { getUserColors, getTextColorForBackground, DEFAULT_MEETING_TYPE_COLORS } from '../services/colorService';
import { useLunarCalendar } from '../hooks/useData';

const smoothScrollToElement = (container: HTMLElement, element: HTMLElement, duration: number) => {
    const targetPosition = element.getBoundingClientRect().top - container.getBoundingClientRect().top + container.scrollTop;
    const startPosition = container.scrollTop;
    const distance = targetPosition - startPosition;
    let startTime: number | null = null;

    const easeInOutQuad = (t: number, b: number, c: number, d: number) => {
        t /= d / 2;
        if (t < 1) return c / 2 * t * t + b;
        t--;
        return -c / 2 * (t * (t - 2) - 1) + b;
    };

    const animation = (currentTime: number) => {
        if (startTime === null) startTime = currentTime;
        const timeElapsed = currentTime - startTime;
        const run = easeInOutQuad(timeElapsed, startPosition, distance, duration);
        container.scrollTop = run;
        if (timeElapsed < duration) {
            requestAnimationFrame(animation);
        } else {
            container.scrollTop = targetPosition;
        }
    };

    requestAnimationFrame(animation);
};

interface ScheduleCalendarProps {
  appointments: Appointment[];
  customers: Customer[];
  onAddAppointment: (appointment: Omit<Appointment, 'id' | 'status'>, consultationData?: any, recurrence?: any) => void;
  onOpenAddAppointmentModal: (date: string, time: string) => void;
  onEditAppointment: (appointment: Appointment) => void;
  onDeleteAppointment: (appointmentId: string) => void;
  onDeleteMultipleAppointments: (appointmentIds: string[]) => Promise<void>;
  onRequestAppointmentAction: (appointment: Appointment, actionType: 'completed' | 'postponed' | 'cancelled') => void;
  todos: Todo[];
  onAddTodo: (text: string, priority: Todo['priority'], date?: string) => void;
  onToggleTodo: (id: string) => void;
  onDeleteTodo: (id: string) => void;
  onUpdateTodo: (id: string, data: { text: string; priority: Todo['priority'] }) => void;
  dailyReviews: DailyReview[];
  onSaveDailyReview: (review: DailyReview) => void;
  onDeleteDailyReview: (date: string) => void;
  onDeleteMultipleDailyReviews: (dates: string[]) => void;
  onOpenAIAddAppointmentModal: () => void;
  onRescheduleFromPostponed: (appointment: Appointment) => void;
  onSelectCustomer: (customer: Customer, initialTab?: 'details' | 'consultations' | 'contracts' | 'callHistory') => void;
  onEditConsultation: (customerId: string, customerName: string, consultation: Consultation) => void;
  onDeleteConsultation: (customerId: string, consultationId: string) => void;
  onDeleteMultipleConsultations: (consultations: Array<{ customerId: string; consultationId: string }>) => void;
  onAddPrediction: (prediction: Omit<PerformancePrediction, 'id'>) => Promise<void>;
  onUpdatePrediction: (prediction: PerformancePrediction) => Promise<void>;
  predictions: PerformancePrediction[];
  performanceRecords: PerformanceRecord[];
  isMobile: boolean;
}

const formatTime = (timeStr: string): string => {
    if (!timeStr) return '';
    const [hourStr, minuteStr] = timeStr.split(':');
    const hour = parseInt(hourStr, 10);
    const minute = parseInt(minuteStr, 10);
    if (minute === 30) {
        return `${hour}시 반`;
    }
    return `${hour}시`;
};

const formatTimeForCalendar = (timeStr: string): string => {
    if (!timeStr) return '';
    const [hourStr, minuteStr] = timeStr.split(':');
    const hour = parseInt(hourStr, 10);
    const minute = parseInt(minuteStr, 10);
    if (minute === 30) {
        return `${hour}시 반`;
    }
    return `${hour}시`;
};

const stringToColor = (str: string) => {
  let hash = 0;
  if (str.length === 0) return { bg: 'bg-gray-400', text: 'text-white' };
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
    hash = hash & hash; // Convert to 32bit integer
  }
  const colors = [
    { bg: 'bg-red-400', text: 'text-white' },
    { bg: 'bg-orange-400', text: 'text-white' },
    { bg: 'bg-amber-400', text: 'text-black' },
    { bg: 'bg-lime-400', text: 'text-black' },
    { bg: 'bg-green-400', text: 'text-white' },
    { bg: 'bg-emerald-400', text: 'text-white' },
    { bg: 'bg-teal-400', text: 'text-white' },
    { bg: 'bg-cyan-400', text: 'text-white' },
    { bg: 'bg-sky-400', text: 'text-white' },
    { bg: 'bg-blue-400', text: 'text-white' },
    { bg: 'bg-indigo-400', text: 'text-white' },
    { bg: 'bg-violet-400', text: 'text-white' },
    { bg: 'bg-purple-400', text: 'text-white' },
    { bg: 'bg-fuchsia-400', text: 'text-white' },
    { bg: 'bg-pink-400', text: 'text-white' },
  ];
  const index = Math.abs(hash) % colors.length;
  return colors[index];
};

interface ActivityDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  appointments: Appointment[];
}

const ActivityDetailModal: React.FC<ActivityDetailModalProps> = ({ isOpen, onClose, title, appointments }) => {
  if (!isOpen) return null;

  return (
    <BaseModal isOpen={isOpen} onClose={onClose} className="max-w-xl w-full h-[70vh] flex flex-col">
      <div className="p-6 border-b border-[var(--border-color)] flex justify-between items-center">
        <h2 className="text-2xl font-bold text-[var(--text-primary)]">{title}</h2>
        <button onClick={onClose} className="text-[var(--text-muted)] hover:text-[var(--text-primary)]"><XIcon className="h-6 w-6" /></button>
      </div>
      <div className="p-4 flex-1 min-h-0 overflow-y-auto custom-scrollbar">
        {appointments.length > 0 ? (
          <div className="space-y-3">
            {appointments.map(app => {
              const isCompleted = app.status === 'completed';
              return (
              <div key={app.id} className={`bg-[var(--background-tertiary)] p-3 rounded-lg border border-[var(--border-color)] ${isCompleted ? 'opacity-60' : ''}`}>
                  <div className="flex justify-between items-start">
                      <div className={isCompleted ? 'line-through' : ''}>
                          <p className="font-bold text-[var(--text-primary)]">{app.customerName}</p>
                          <p className="text-sm text-[var(--text-secondary)]">{app.date} {app.time}</p>
                      </div>
                      <div className="flex items-center gap-2">
                          <span className="px-2 py-1 text-xs font-semibold rounded-full bg-[var(--background-accent-subtle)] text-[var(--text-accent)]">{app.meetingType}</span>
                           {isCompleted ? (
                               <span className="flex items-center px-2 py-1 text-xs font-semibold rounded-full text-green-300">
                                   <CheckIcon className="h-4 w-4 mr-1" /> 완료
                               </span>
                           ) : (
                               <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                                    app.status === 'postponed' ? 'bg-yellow-500/30 text-yellow-300' :
                                    app.status === 'cancelled' ? 'bg-gray-500/20 text-gray-300' :
                                    'bg-blue-500/20 text-blue-300'
                                }`}>
                                  { {scheduled: '예정', postponed: '연기', cancelled: '취소'}[app.status] }
                                </span>
                           )}
                      </div>
                  </div>
                  {app.location && <p className={`text-sm text-[var(--text-muted)] mt-1 ${isCompleted ? 'line-through' : ''}`}>장소: {app.location}</p>}
                  {app.notes && <p className={`text-sm text-[var(--text-secondary)] mt-1 truncate ${isCompleted ? 'line-through' : ''}`}>메모: {app.notes}</p>}
              </div>
            )})}
          </div>
        ) : (
          <div className="flex items-center justify-center h-full text-center text-[var(--text-muted)]">
              <p>해당하는 활동이 없습니다.</p>
          </div>
        )}
      </div>
       <div className="p-4 bg-[var(--background-primary)] border-t border-[var(--border-color)] flex justify-end">
          <button onClick={onClose} className="px-4 py-2 bg-[var(--background-tertiary)] border border-[var(--border-color-strong)] rounded-md text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--background-tertiary)]/80">
              닫기
          </button>
      </div>
    </BaseModal>
  );
};


const summaryActivityTypes: MeetingType[] = ['TA', 'AP', 'PC', 'N', '기타', '증권전달'];

interface ActivitySummaryProps {
    appointments: Appointment[];
    customers: Customer[];
    predictions: PerformancePrediction[];
    performanceRecords: PerformanceRecord[];
    currentDate: Date;
    onOpenDetails: (title: string, appointments: Appointment[]) => void;
}

const ActivitySummary: React.FC<ActivitySummaryProps> = ({ appointments, customers, predictions, performanceRecords, currentDate, onOpenDetails }) => {
    const [viewMode, setViewMode] = useState<'week' | 'month'>('week');
    
    const typeColors: Record<string, string> = {
        'TA': 'bg-yellow-500/20', 'AP': 'bg-yellow-500/20',
        'PC': 'bg-blue-500/20', 'N': 'bg-blue-500/20', '기타': 'bg-blue-500/20',
        'JOINT': 'bg-gray-500/20', 'RP': 'bg-gray-500/20', 'Follow Up': 'bg-gray-500/20',
        'S.P': 'bg-orange-500/20',
        '증권전달': 'bg-purple-500/20',
        '카톡개별연락': 'bg-teal-500/20',
    };
    
    const summaryTypeLabels: { [key in MeetingType]?: string } = {
        'JOINT': '동반',
        'Follow Up': 'F.U',
        'S.P': '교육',
        '증권전달': '증권',
        '카톡개별연락': '카톡',
    };

    const { planned, results, periodText, filteredAppointments, filteredPredictions, filteredRecords } = useMemo(() => {
        let startDate: Date;
        let endDate: Date;
        let periodText: string;

        if (viewMode === 'month') {
            startDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
            endDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0, 23, 59, 59);
            periodText = `${currentDate.getFullYear()}년 ${currentDate.getMonth() + 1}월`;
        } else { // week
            const dayOfWeek = currentDate.getDay(); // 0 = Sunday
            const offset = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
            startDate = new Date(currentDate);
            startDate.setDate(currentDate.getDate() - offset);
            startDate.setHours(0,0,0,0);

            endDate = new Date(startDate);
            endDate.setDate(startDate.getDate() + 6);
            endDate.setHours(23,59,59,999);
            periodText = `${startDate.getMonth() + 1}월 ${startDate.getDate()}일 - ${endDate.getMonth() + 1}월 ${endDate.getDate()}`;
        }

        const filterByDate = (dateStr?: string) => {
            if (!dateStr) return false;
            try {
                const itemDate = new Date(dateStr);
                return itemDate >= startDate && itemDate <= endDate;
            } catch { return false; }
        };

        const filteredAppointments = appointments.filter(app => app.customerId && filterByDate(app.date));
        const filteredPredictions = predictions.filter(p => filterByDate(p.pcDate));
        const filteredRecords = performanceRecords.filter(r => filterByDate(r.applicationDate));


        const planned: Record<string, number> = {};
        const results: Record<string, number> = {};
        summaryActivityTypes.forEach(type => {
            planned[type] = 0;
            results[type] = 0;
        });

        filteredAppointments.forEach(app => {
            if (summaryActivityTypes.includes(app.meetingType as MeetingType) && app.meetingType !== 'N') {
                if (app.status !== 'cancelled') {
                    planned[app.meetingType]++;
                }
                if (app.status === 'completed') {
                    results[app.meetingType]++;
                }
            }
        });
        
        planned['N'] = filteredPredictions.length;
        results['N'] = filteredRecords.length;
        
        return { planned, results, periodText, filteredAppointments, filteredPredictions, filteredRecords };

    }, [appointments, predictions, performanceRecords, currentDate, viewMode]);

    const handleStatClick = (type: MeetingType | 'all', scope: 'planned' | 'results') => {
        const title = `${periodText} ${type === 'all' ? '' : type} ${scope === 'planned' ? '예정' : '결과'} 활동`;
        
        let appsToShow: Appointment[] = [];

        const appointmentBasedTypes = type === 'all' 
            ? summaryActivityTypes.filter(t => t !== 'N') 
            : (type !== 'N' ? [type] : []);

        if (appointmentBasedTypes.length > 0) {
            appsToShow = appsToShow.concat(filteredAppointments.filter(app => {
                const typeMatch = appointmentBasedTypes.includes(app.meetingType as MeetingType);
                const scopeMatch = scope === 'planned' ? app.status !== 'cancelled' : app.status === 'completed';
                return typeMatch && scopeMatch;
            }));
        }

        if (type === 'N' || type === 'all') {
            if (scope === 'planned') {
                const predictionApps: Appointment[] = filteredPredictions.map(p => ({
                    id: p.id,
                    customerId: customers.find(c => c.name === p.customerName)?.id,
                    customerName: p.customerName,
                    date: p.pcDate,
                    time: '',
                    meetingType: 'N',
                    notes: `[계약임박] 상품: ${p.productName}, 예상 실적: ${p.recognizedPerformance.toLocaleString()}원`,
                    status: 'scheduled',
                }));
                appsToShow = appsToShow.concat(predictionApps);
            }
            if (scope === 'results') {
                const recordApps: Appointment[] = filteredRecords.map(r => ({
                    id: r.id,
                    customerId: customers.find(c => c.name === r.contractorName)?.id,
                    customerName: r.contractorName,
                    date: r.applicationDate,
                    time: '',
                    meetingType: 'N',
                    notes: `[계약완료] 상품: ${r.productName}, 인정 실적: ${r.recognizedPerformance.toLocaleString()}원`,
                    status: 'completed',
                }));
                appsToShow = appsToShow.concat(recordApps);
            }
        }

        onOpenDetails(title, appsToShow);
    };


    return (
        <div className="bg-[var(--background-secondary)] p-4 rounded-lg shadow-lg border border-[var(--border-color)] text-[var(--text-primary)]">
            <div className="flex justify-between items-center mb-4 flex-wrap gap-2">
                 <h2 className="text-xl font-semibold text-[var(--text-primary)]">활동 요약</h2>
                 <div className="flex items-center gap-2">
                    <button onClick={() => handleStatClick('all', 'planned')} className="text-sm font-medium text-[var(--text-accent)] hover:underline">
                        전체보기
                    </button>
                    <button onClick={() => setViewMode('week')} className={`px-3 py-1 text-sm rounded-md ${viewMode === 'week' ? 'bg-[var(--background-accent)] text-[var(--text-on-accent)]' : 'bg-[var(--background-tertiary)]'}`}>주간</button>
                    <button onClick={() => setViewMode('month')} className={`px-3 py-1 text-sm rounded-md ${viewMode === 'month' ? 'bg-[var(--background-accent)] text-[var(--text-on-accent)]' : 'bg-[var(--background-tertiary)]'}`}>월간</button>
                 </div>
            </div>
            <div className="overflow-x-auto">
                <table className="min-w-full border-collapse border border-[var(--border-color)] text-center text-[var(--text-secondary)]">
                    <thead>
                        <tr>
                            <th className="border border-[var(--border-color)] p-2 bg-[var(--background-tertiary)] w-16 whitespace-nowrap">구분</th>
                            {summaryActivityTypes.map(type => (
                                <th key={type} className={`border border-[var(--border-color)] p-2 text-xs md:text-sm whitespace-nowrap ${typeColors[type] || 'bg-[var(--background-tertiary)]'}`}>{summaryTypeLabels[type] || type}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td className="border border-[var(--border-color)] p-2 font-medium bg-[var(--background-tertiary)]/50 text-xs md:text-sm">예정</td>
                            {summaryActivityTypes.map(type => (
                                <td key={type} className="border border-[var(--border-color)] p-2 text-xs md:text-sm cursor-pointer hover:bg-[var(--background-primary)]" onClick={() => handleStatClick(type, 'planned')}>{planned[type]}</td>
                            ))}
                        </tr>
                        <tr>
                            <td className="border border-[var(--border-color)] p-2 font-medium bg-[var(--background-tertiary)]/50 text-xs md:text-sm">결과</td>
                            {summaryActivityTypes.map(type => (
                                <td key={type} className="border border-[var(--border-color)] p-2 text-xs md:text-sm cursor-pointer hover:bg-[var(--background-primary)]" onClick={() => handleStatClick(type, 'results')}>{results[type]}</td>
                            ))}
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    );
};

const priorityMap: { [key in Todo['priority']]: { color: string, order: number, label: string } } = {
    high: { color: 'bg-red-500', order: 1, label: '높음' },
    medium: { color: 'bg-yellow-500', order: 2, label: '보통' },
    low: { color: 'bg-blue-500', order: 3, label: '낮음' },
};

const DailyReviewEditor: React.FC<{
    selectedDate: Date;
    reviews: DailyReview[];
    onSave: (review: DailyReview) => void;
}> = ({ selectedDate, reviews, onSave }) => {
    const selectedDateStr = useMemo(() => new Date(selectedDate.getTime() - (selectedDate.getTimezoneOffset() * 60000)).toISOString().split('T')[0], [selectedDate]);
    const currentReview = useMemo(() => reviews.find(r => r.date === selectedDateStr), [reviews, selectedDateStr]);
    const [content, setContent] = useState('');

    useEffect(() => {
        setContent(currentReview?.content || '');
    }, [currentReview]);

    const handleSaveClick = () => {
        onSave({ date: selectedDateStr, content: content.trim() });
        alert('총평이 저장되었습니다.');
    };

    return (
        <div className="bg-[var(--background-secondary)] p-4 rounded-lg shadow-lg border border-[var(--border-color)]">
            <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-3">총평</h3>
            <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="오늘 하루의 전반적인 소감, 개선할 점, 잘하거나 감사한 내용 등을 자유롭게 기록해보세요."
                className="w-full h-28 p-3 border border-[var(--border-color-strong)] rounded-md shadow-sm focus:ring-[var(--background-accent)] focus:border-[var(--background-accent)] bg-[var(--background-tertiary)] text-[var(--text-primary)]"
                rows={4}
            />
            <div className="mt-3 flex justify-end">
                <button
                    onClick={handleSaveClick}
                    className="px-4 py-2 bg-[var(--background-accent)] text-[var(--text-on-accent)] rounded-md font-semibold hover:bg-[var(--background-accent-hover)] disabled:opacity-50"
                    disabled={content.trim() === (currentReview?.content || '')}
                >
                    저장하기
                </button>
            </div>
        </div>
    );
};

interface DailyDetailViewProps {
    selectedDate: Date;
    events: Appointment[];
    todos: Todo[];
    onNewAppointmentClick: (date: string, time: string) => void;
    onEventClick: (event: Appointment) => void;
    onDeleteAppointment: (appointmentId: string) => void;
    onRequestAppointmentAction: (appointment: Appointment, actionType: 'completed' | 'postponed' | 'cancelled') => void;
    onAddTodo: (text: string, priority: Todo['priority'], date: string) => void;
    onToggleTodo: (id: string) => void;
    onDeleteTodo: (id: string) => void;
    onUpdateTodo: (id: string, data: { text: string; priority: Todo['priority'] }) => void;
    getAppointmentColorClasses: (app: Appointment) => { className?: string, style?: React.CSSProperties };
    onOpenAddPredictionModal: (seed: Partial<PerformancePrediction> | null) => void;
    dailyReviews: DailyReview[];
    onSaveDailyReview: (review: DailyReview) => void;
}

const DailyDetailView: React.FC<DailyDetailViewProps> = ({ selectedDate, events, todos, onNewAppointmentClick, onEventClick, onDeleteAppointment, onRequestAppointmentAction, onAddTodo, onToggleTodo, onDeleteTodo, onUpdateTodo, getAppointmentColorClasses, onOpenAddPredictionModal, dailyReviews, onSaveDailyReview }) => {
    
    const selectedDateStr = useMemo(() => new Date(selectedDate.getTime() - (selectedDate.getTimezoneOffset() * 60000)).toISOString().split('T')[0], [selectedDate]);

    const eventsForDay = useMemo(() => {
        return events
            .filter(event => {
                const isForSelectedDay = ((event as any).occurrenceDate || event.date) === selectedDateStr;
                const isCompletedTA = event.meetingType === 'TA' && event.status === 'completed';
                return isForSelectedDay && !isCompletedTA;
            })
            .sort((a, b) => a.time.localeCompare(b.time));
    }, [events, selectedDateStr]);

    return (
        <div className="flex flex-col">
            <div className="bg-[var(--background-secondary)] p-4 rounded-lg shadow-lg border border-[var(--border-color)] mb-6">
                <div className="flex justify-between items-center mb-3">
                    <h3 className="text-lg font-semibold text-[var(--text-primary)]">일정 ({eventsForDay.length})</h3>
                    <button onClick={() => onNewAppointmentClick(selectedDateStr, '09:00')} className="flex items-center px-3 py-1 bg-[var(--background-accent-subtle)] text-[var(--text-accent)] rounded-md text-sm font-medium hover:bg-opacity-80">
                        <PlusIcon className="h-4 w-4 mr-1" />
                        일정 추가
                    </button>
                </div>
                <div className="space-y-2">
                    {eventsForDay.length > 0 ? (
                        eventsForDay.map(app => {
                            const colorProps = getAppointmentColorClasses(app);
                            const isCompleted = app.status === 'completed';
                            return (
                            <div 
                                key={(app as any).occurrenceId || app.id} 
                                style={colorProps.style}
                                className={`p-3 rounded-md flex items-start justify-between group ${colorProps.className || ''} ${isCompleted ? 'opacity-60' : ''}`}
                            >
                                <div className="flex-grow truncate cursor-pointer mr-2" onClick={() => onEventClick(app)}>
                                    <div className={`flex items-start ${isCompleted ? 'line-through' : ''}`}>
                                        {isCompleted && <CheckIcon className="h-5 w-5 mr-1.5 flex-shrink-0 mt-0.5" />}
                                        <div className="flex-grow truncate">
                                            <p className="font-semibold">{formatTimeForCalendar(app.time)} - {app.title || app.customerName}</p>
                                            <div className={`mt-1 space-y-0.5 text-sm ${colorProps.style ? '' : 'opacity-80'}`}>
                                                {app.location && <p className="truncate" title={app.location}><strong>장소:</strong> {app.location}</p>}
                                                {app.customerId && <p><strong>유형:</strong> {app.meetingType}</p>}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-1 ml-2 flex-shrink-0">
                                    {app.status === 'scheduled' && app.customerId ? (
                                        <>
                                            <button onClick={(e) => { e.stopPropagation(); onRequestAppointmentAction(app, 'completed'); }} className="px-2 py-1 text-xs font-medium text-green-800 bg-green-200 rounded-md hover:bg-green-300">완료</button>
                                            {app.meetingType === 'PC' ? (
                                                <button onClick={(e) => { 
                                                    e.stopPropagation();
                                                    const seed: Partial<PerformancePrediction> = {
                                                        customerName: app.customerName || '',
                                                        pcDate: (app as any).occurrenceDate || app.date,
                                                    };
                                                    onOpenAddPredictionModal(seed);
                                                }} className="px-2 py-1 text-xs font-medium text-yellow-800 bg-yellow-200 rounded-md hover:bg-yellow-300">예측</button>
                                            ) : app.meetingType !== 'AP' && (
                                                <button onClick={(e) => { e.stopPropagation(); onRequestAppointmentAction(app, 'postponed'); }} className="px-2 py-1 text-xs font-medium text-yellow-800 bg-yellow-200 rounded-md hover:bg-yellow-300">연기</button>
                                            )}
                                            <button onClick={(e) => { e.stopPropagation(); onRequestAppointmentAction(app, 'cancelled'); }} className="px-2 py-1 text-xs font-medium text-gray-800 bg-gray-200 rounded-md hover:bg-gray-300">취소</button>
                                        </>
                                    ) : isCompleted ? (
                                        <span className={`flex items-center px-2 py-1 text-xs font-semibold rounded-full shrink-0 cursor-default`}>
                                            <CheckIcon className="h-4 w-4 mr-1" /> 완료
                                        </span>
                                    ) : app.status !== 'scheduled' && (
                                            <span className="text-xs font-semibold px-2">
                                            {{postponed: '연기', cancelled: '취소'}[app.status]}
                                            </span>
                                    )}
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            if (window.confirm('해당 일정을 삭제하시겠습니까?')) {
                                                onDeleteAppointment(app.id);
                                            }
                                        }}
                                        className={`p-1 rounded-full ${colorProps.style ? 'text-white/70 hover:bg-black/20' : 'text-[var(--text-muted)] hover:bg-[var(--background-tertiary)]'}`}
                                        aria-label="일정 삭제"
                                    >
                                        <TrashIcon className="h-4 w-4" />
                                    </button>
                                </div>
                            </div>
                        )})
                    ) : (
                        <p className="text-center text-[var(--text-muted)] py-4">선택한 날짜에 일정이 없습니다.</p>
                    )}
                </div>
            </div>

            <div className="bg-[var(--background-secondary)] p-4 rounded-lg shadow-lg border border-[var(--border-color)] flex flex-col mb-6">
                <TodoList
                    todos={todos}
                    onAddTodo={onAddTodo}
                    onToggleTodo={onToggleTodo}
                    onDeleteTodo={onDeleteTodo}
                    onUpdateTodo={onUpdateTodo}
                    date={selectedDateStr}
                    title="할 일"
                />
            </div>

            <DailyReviewEditor
                selectedDate={selectedDate}
                reviews={dailyReviews}
                onSave={onSaveDailyReview}
            />
        </div>
    );
};

const getKoreanHolidays = (year: number): { [key: string]: string } => {
    const holidays: { [key: string]: string } = {
        '01-01': '신정',
        '03-01': '삼일절',
        '06-06': '현충일',
        '08-15': '광복절',
        '10-03': '개천절',
        '10-09': '한글날',
        '12-25': '성탄절',
    };

    if (year === 2024) {
        holidays['02-09'] = '설날 연휴';
        holidays['02-10'] = '설날';
        holidays['02-11'] = '설날 연휴';
        holidays['02-12'] = '설날 대체공휴일';
        holidays['05-05'] = '어린이날';
        holidays['05-06'] = '어린이날 대체공휴일';
        holidays['05-15'] = '부처님 오신 날';
        holidays['09-16'] = '추석 연휴';
        holidays['09-17'] = '추석';
        holidays['09-18'] = '추석 연휴';
    } else if (year === 2025) {
        holidays['01-28'] = '설날 연휴';
        holidays['01-29'] = '설날';
        holidays['01-30'] = '설날 연휴';
        holidays['05-05'] = '어린이날, 부처님 오신 날';
        holidays['10-05'] = '추석 연휴';
        holidays['10-06'] = '추석';
        holidays['10-07'] = '추석 연휴';
        holidays['10-08'] = '추석 대체공휴일';
    }
    // Add more years as needed for lunar holidays
    return holidays;
};

// --- Recurrence Expansion Logic ---
const generateOccurrences = (
  appointmentRules: Appointment[],
  viewStart: Date,
  viewEnd: Date,
  calendar: any
): (Appointment & { occurrenceDate: string; occurrenceId: string })[] => {
  const occurrences: (Appointment & { occurrenceDate: string; occurrenceId: string })[] = [];
  const toYYYYMMDD = (d: Date) => new Date(d.getTime() - (d.getTimezoneOffset() * 60000)).toISOString().split('T')[0];

  const filteredAppointmentRules = appointmentRules.filter(app => app.meetingType !== 'TA');
  
  for (const app of filteredAppointmentRules) {
    if (!app.date || !app.date.includes('-')) continue;

    if (!app.recurrenceType || app.recurrenceType === 'none') {
      const appDate = new Date(app.date + 'T00:00:00'); // Treat as local date
      if (isNaN(appDate.getTime())) continue;
      if (appDate >= viewStart && appDate <= viewEnd) {
         const dateStr = toYYYYMMDD(appDate);
         if (!(app.exceptions || []).includes(dateStr)) {
            occurrences.push({ ...app, occurrenceDate: dateStr, occurrenceId: app.id });
         }
      }
    } else {
      const seriesStartDate = new Date(app.date + 'T00:00:00'); // Treat as local date
      if (isNaN(seriesStartDate.getTime())) continue;

      const seriesEndDate = app.recurrenceEndDate ? new Date(app.recurrenceEndDate + 'T23:59:59') : null; // local
      const exceptions = new Set(app.exceptions || []);
      const interval = app.recurrenceInterval || 1;
      
      let safety = 0;
      if (app.recurrenceType === 'yearly') {
          let currentYear = viewStart.getFullYear();
          if (seriesStartDate.getFullYear() > currentYear) {
              currentYear = seriesStartDate.getFullYear();
          }

          while (safety < 100) { // Max 100 years to prevent infinite loops
              safety++;
              
              let occurrenceDateForYear: Date | null = null;

              if (app.isLunar) {
                  if (calendar) {
                    const [, sMonth, sDay] = app.date.split('-').map(Number);
                    if (sMonth && sDay) {
                        const solarDate = calendar.lunarToSolar(currentYear, sMonth, sDay, false);
                        if (solarDate) {
                            occurrenceDateForYear = new Date(solarDate.year, solarDate.month - 1, solarDate.day);
                        }
                    }
                  }
              } else {
                  occurrenceDateForYear = new Date(currentYear, seriesStartDate.getMonth(), seriesStartDate.getDate()); // Local date
              }

              if (occurrenceDateForYear) {
                  if (occurrenceDateForYear > viewEnd) break;
                  if (seriesEndDate && occurrenceDateForYear > seriesEndDate) break;
                  
                  if (occurrenceDateForYear >= seriesStartDate && occurrenceDateForYear >= viewStart) {
                      const occurrenceDateStr = toYYYYMMDD(occurrenceDateForYear);
                      if (!exceptions.has(occurrenceDateStr)) {
                          occurrences.push({
                              ...app,
                              occurrenceDate: occurrenceDateStr,
                              occurrenceId: `${app.id}_${occurrenceDateStr}`,
                          });
                      }
                  }
              }
              currentYear += interval;
          }
      } else {
          let currentDate = new Date(seriesStartDate.getTime());
          
          if (currentDate < viewStart) {
              currentDate = new Date(viewStart.getTime());
          }

          while (currentDate <= viewEnd && safety < 1095) {
            safety++;
            if (seriesEndDate && currentDate > seriesEndDate) break;
            if (currentDate < seriesStartDate) {
                currentDate.setDate(currentDate.getDate() + 1);
                continue;
            }

            let shouldAdd = false;
            if (app.recurrenceType === 'weekly') {
                if (app.recurrenceDays?.includes(currentDate.getDay())) {
                    const firstDayOfSeriesWeek = new Date(seriesStartDate);
                    firstDayOfSeriesWeek.setDate(seriesStartDate.getDate() - (seriesStartDate.getDay() === 0 ? 6 : seriesStartDate.getDay() - 1));
                    firstDayOfSeriesWeek.setHours(0, 0, 0, 0);

                    const firstDayOfCurrentWeek = new Date(currentDate);
                    firstDayOfCurrentWeek.setDate(currentDate.getDate() - (currentDate.getDay() === 0 ? 6 : currentDate.getDay() - 1));
                    firstDayOfCurrentWeek.setHours(0, 0, 0, 0);
                    
                    if (firstDayOfCurrentWeek.getTime() >= firstDayOfSeriesWeek.getTime()) {
                        const diffMillis = firstDayOfCurrentWeek.getTime() - firstDayOfSeriesWeek.getTime();
                        const diffWeeks = Math.floor(diffMillis / (1000 * 60 * 60 * 24 * 7));
                        if (diffWeeks % interval === 0) {
                            shouldAdd = true;
                        }
                    }
                }
            } else if (app.recurrenceType === 'daily') {
                const diffMillis = currentDate.getTime() - seriesStartDate.getTime();
                const diffDays = Math.round(diffMillis / (1000 * 60 * 60 * 24));
                if (diffDays >= 0 && diffDays % interval === 0) {
                    shouldAdd = true;
                }
            } else if (app.recurrenceType === 'monthly') {
                const yearDiff = currentDate.getFullYear() - seriesStartDate.getFullYear();
                const monthDiff = yearDiff * 12 + currentDate.getMonth() - seriesStartDate.getMonth();
                if (monthDiff >= 0 && monthDiff % interval === 0 && currentDate.getDate() === seriesStartDate.getDate()) {
                    shouldAdd = true;
                }
            }
            
            if (shouldAdd) {
                const currentDateStr = toYYYYMMDD(currentDate);
                if (!exceptions.has(currentDateStr)) {
                    occurrences.push({
                        ...app,
                        occurrenceDate: currentDateStr,
                        occurrenceId: `${app.id}_${currentDateStr}`,
                    });
                }
            }
            currentDate.setDate(currentDate.getDate() + 1); // Use local setDate
          }
      }
    }
  }
  return occurrences;
};

// New DailyTimelineView Component
interface DailyTimelineViewProps {
    selectedDate: Date;
    appointmentsByDate: Map<string, Appointment[]>;
    getAppointmentColorClasses: (app: Appointment) => { className?: string, style?: React.CSSProperties };
    onEventClick: (event: Appointment) => void;
    onNewAppointmentClick: (date: string, time: string) => void;
}

const DailyTimelineView: React.FC<DailyTimelineViewProps> = ({ selectedDate, appointmentsByDate, getAppointmentColorClasses, onEventClick, onNewAppointmentClick }) => {
    const startHour = 8;
    const endHour = 21;
    const hourHeight = 80; // pixels

    const dateStr = useMemo(() => new Date(selectedDate.getTime() - (selectedDate.getTimezoneOffset() * 60000)).toISOString().split('T')[0], [selectedDate]);
    const appointmentsForDay = useMemo(() => appointmentsByDate.get(dateStr) || [], [appointmentsByDate, dateStr]);

    const timeSlots = useMemo(() => Array.from({ length: endHour - startHour + 1 }, (_, i) => startHour + i), [startHour, endHour]);

    const layoutAppointments = useMemo(() => {
        const timeToMinutes = (timeStr: string) => {
            const [h, m] = timeStr.split(':').map(Number);
            return h * 60 + m;
        };
        
        const events = appointmentsForDay
          .map(app => ({
            ...app,
            start: timeToMinutes(app.time),
            end: app.endTime ? timeToMinutes(app.endTime) : timeToMinutes(app.time) + 60,
          }))
          .sort((a, b) => a.start - b.start);

        if (events.length === 0) return [];

        let eventLayouts: any[] = events.map(e => ({ ...e, col: 0, max_col: 1}));

        for (let i=0; i < eventLayouts.length; i++) {
            const currentEvent = eventLayouts[i];
            let col = 0;
            let placed = false;
            while (!placed) {
                let overlaps = false;
                for (let j=0; j < i; j++) {
                    const prevEvent = eventLayouts[j];
                    if ( (currentEvent.start < prevEvent.end && currentEvent.end > prevEvent.start) && prevEvent.col === col) {
                        overlaps = true;
                        break;
                    }
                }
                if (!overlaps) {
                    currentEvent.col = col;
                    placed = true;
                } else {
                    col++;
                }
            }
        }

        for (let i=0; i < eventLayouts.length; i++) {
            let max_col = 0;
            for(let j=0; j < eventLayouts.length; j++) {
                if (eventLayouts[i].start < eventLayouts[j].end && eventLayouts[i].end > eventLayouts[j].start) {
                    max_col = Math.max(max_col, eventLayouts[j].col);
                }
            }
            eventLayouts[i].max_col = max_col + 1;
        }

        return eventLayouts.map(event => ({
          ...event,
          top: ((event.start - startHour * 60) / 60) * hourHeight,
          height: Math.max(((event.end - event.start) / 60) * hourHeight - 2, 20),
          width: 100 / event.max_col,
          left: (100 / event.max_col) * event.col,
        }));

    }, [appointmentsForDay]);

    return (
        <div className="flex bg-[var(--background-secondary)] p-4 rounded-lg shadow-lg border border-[var(--border-color)]">
            <div className="w-16 flex-shrink-0">
                {timeSlots.map(hour => (
                    <div key={hour} style={{ height: `${hourHeight}px` }} className="text-right pr-2 text-sm text-[var(--text-muted)] -translate-y-3">
                        {hour}:00
                    </div>
                ))}
            </div>

            <div className="relative flex-grow">
                {timeSlots.map(hour => (
                    <div key={hour} style={{ height: `${hourHeight}px` }} className="relative border-t border-[var(--border-color)]">
                        <div 
                            className="absolute top-0 left-0 right-0 h-1/2 cursor-pointer hover:bg-[var(--background-accent-subtle)]" 
                            onClick={() => onNewAppointmentClick(dateStr, `${String(hour).padStart(2, '0')}:00`)} 
                        />
                        <div 
                            className="absolute bottom-0 left-0 right-0 h-1/2 border-t border-dashed border-[var(--border-color)] cursor-pointer hover:bg-[var(--background-accent-subtle)]" 
                            onClick={() => onNewAppointmentClick(dateStr, `${String(hour).padStart(2, '0')}:30`)}
                        />
                    </div>
                ))}

                {layoutAppointments.map(app => {
                    const colorProps = getAppointmentColorClasses(app);
                    const isCompleted = app.status === 'completed';

                    // FIX: Added a return statement to the map function.
                    return (
                        <div
                            key={app.occurrenceId || app.id}
                            style={{
                                top: `${app.top}px`,
                                height: `${app.height}px`,
                                left: `${app.left}%`,
                                width: `calc(${app.width}% - 2px)`,
                                ...colorProps.style
                            }}
                            className={`absolute p-2 rounded-lg flex flex-col justify-start cursor-pointer transition-shadow hover:shadow-lg z-10 overflow-hidden ${colorProps.className || ''} ${isCompleted ? 'opacity-60' : ''}`}
                            onClick={() => onEventClick(app)}
                        >
                            <p className={`font-semibold text-sm truncate ${isCompleted ? 'line-through' : ''}`}>
                                {app.title || app.customerName}
                            </p>
                            <p className={`text-xs opacity-80 ${isCompleted ? 'line-through' : ''}`}>{app.time}{app.endTime ? ` - ${app.endTime}` : ''}</p>
                            {app.location && <p className={`text-xs opacity-80 truncate ${isCompleted ? 'line-through' : ''}`}>{app.location}</p>}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};


export const ScheduleCalendar: React.FC<ScheduleCalendarProps> = ({ appointments, customers, predictions, performanceRecords, onAddAppointment, onOpenAddAppointmentModal, onEditAppointment, onDeleteAppointment, onDeleteMultipleAppointments, onRequestAppointmentAction, todos, onAddTodo, onToggleTodo, onDeleteTodo, onUpdateTodo, dailyReviews, onSaveDailyReview, onDeleteDailyReview, onDeleteMultipleDailyReviews, onOpenAIAddAppointmentModal, onRescheduleFromPostponed, onSelectCustomer, onEditConsultation, onDeleteConsultation, onDeleteMultipleConsultations, onAddPrediction, onUpdatePrediction, isMobile }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<'calendar' | 'reviewList'>('calendar');
  const [calendarView, setCalendarView] = useState<'month' | 'week' | 'day'>('week');
  const [activityDetailModalData, setActivityDetailModalData] = useState<{ isOpen: boolean; title: string; appointments: Appointment[] }>({ isOpen: false, title: '', appointments: [] });
  
  const [isPostponedModalOpen, setIsPostponedModalOpen] = useState(false);
  const [selectedPostponedIds, setSelectedPostponedIds] = useState<Set<string>>(new Set());
  const [isDeletePostponedConfirmOpen, setIsDeletePostponedConfirmOpen] = useState(false);
  const postponedHeaderCheckboxRef = useRef<HTMLInputElement>(null);
  const [userColors, setUserColors] = useState<Record<string, string>>({});
  const [isPredictionModalOpen, setIsPredictionModalOpen] = useState(false);
  const [predictionSeed, setPredictionSeed] = useState<Partial<PerformancePrediction> | null>(null);
  const [editingPrediction, setEditingPrediction] = useState<PerformancePrediction | null>(null);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [eventTypeFilter, setEventTypeFilter] = useState<'all' | 'customer' | 'personal'>('all');
  const [meetingTypeFilter, setMeetingTypeFilter] = useState<string>('all');
  const [showLunarCalendar, setShowLunarCalendar] = useState<boolean>(() => {
    return getItem<boolean>('schedule-show-lunar') ?? false;
  });
  
  // Resizable Splitter State and Logic
  const SPLITTER_WIDTH = 8; // in pixels
  const MIN_PANE_WIDTH = 350; // in pixels
  const LAYOUT_STORAGE_KEY = 'schedule-calendar-layout-width';
  
  const detailsViewRef = useRef<HTMLDivElement>(null);

  const [leftPaneWidth, setLeftPaneWidth] = useState<number>(() => {
    try {
      const savedWidth = localStorage.getItem(LAYOUT_STORAGE_KEY);
      return savedWidth ? parseFloat(savedWidth) : 60; // Default to 60%
    } catch (e) {
      return 60;
    }
  });
  const isResizing = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isResizing.current = true;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }, []);
  
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing.current || !containerRef.current) return;

      const containerRect = containerRef.current.getBoundingClientRect();
      let newLeftWidth = e.clientX - containerRect.left;

      // Apply constraints in pixels
      const minWidthPx = MIN_PANE_WIDTH;
      const maxWidthPx = containerRect.width - MIN_PANE_WIDTH - SPLITTER_WIDTH;

      if (newLeftWidth < minWidthPx) newLeftWidth = minWidthPx;
      if (newLeftWidth > maxWidthPx) newLeftWidth = maxWidthPx;

      const newLeftWidthPercent = (newLeftWidth / containerRect.width) * 100;
      setLeftPaneWidth(newLeftWidthPercent);
    };

    const handleMouseUp = () => {
      if (isResizing.current) {
        isResizing.current = false;
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
        // Use a function for setLeftPaneWidth to get the latest value to save
        setLeftPaneWidth(currentWidth => {
          localStorage.setItem(LAYOUT_STORAGE_KEY, String(currentWidth));
          return currentWidth;
        });
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  const updateColors = useCallback(() => {
    setUserColors(getUserColors());
  }, []);

  const calendar = useLunarCalendar();

  useEffect(() => {
    updateColors();
    window.addEventListener('colors-updated', updateColors);
    return () => {
        window.removeEventListener('colors-updated', updateColors);
    };
  }, [updateColors]);
  
  const handleOpenPredictionModal = (seed: Partial<PerformancePrediction> | null, predictionToEdit: PerformancePrediction | null = null) => {
      setPredictionSeed(seed);
      setEditingPrediction(predictionToEdit);
      setIsPredictionModalOpen(true);
  };

  const getAppointmentColorClasses = useCallback((app: Appointment): { className?: string, style?: React.CSSProperties } => {
      if (app.status === 'cancelled') return { className: 'bg-[var(--background-tertiary)] text-[var(--text-muted)] line-through' };
      
      const type = app.meetingType;
      if (type) {
          const userColor = userColors[type];
          if (userColor) {
              return {
                  style: {
                      backgroundColor: userColor,
                      color: getTextColorForBackground(userColor)
                  }
              };
          }

          if (DEFAULT_MEETING_TYPE_COLORS[type]) {
              const { bg, text } = DEFAULT_MEETING_TYPE_COLORS[type];
              return { className: `${bg} ${text}` };
          }
      }
      
      const title = app.title || app.customerName || '';
      const { bg, text } = stringToColor(title);
      return { className: `${bg} ${text}` };
  }, [userColors]);
  
  const allEvents = useMemo(() => {
      const baseAppointments = [...appointments];
      
      const personalMemosAsAppointments: Appointment[] = appointments
        .filter(app => !app.customerId && app.title && app.notes)
        .map(app => ({...app, isPersonalMemo: true})) as any;

      const consultationAppointments: Appointment[] = customers.flatMap(customer =>
          customer.consultations.map(consult => ({
              id: `consult-${consult.id}`,
              customerId: customer.id,
              customerName: customer.name,
              title: `[상담] ${customer.name}`,
              date: new Date(consult.date).toISOString().split('T')[0],
              time: '09:00', // Default time
              meetingType: consult.meetingType,
              notes: consult.notes,
              status: 'completed',
              isConsultation: true,
          } as any))
      );
      
      const birthdayAndAnniversaryAppointments: Appointment[] = customers.flatMap(customer => {
        const events: Appointment[] = [];
        if (customer.birthday) {
            events.push({
                id: `birthday-${customer.id}`,
                title: `${customer.name} 생일`,
                date: customer.birthday,
                time: '00:00',
                status: 'scheduled',
                recurrenceType: 'yearly',
                isLunar: customer.isBirthdayLunar || false,
                customerId: customer.id,
                customerName: customer.name,
                meetingType: '기념일',
                notes: `${customer.name}님 생일`,
            });
        }
        if (customer.namedAnniversaries) {
            customer.namedAnniversaries.forEach(ann => {
                if(ann.date) {
                    events.push({
                        id: `anniversary-${ann.id}`,
                        title: `${customer.name} ${ann.name}`,
                        date: ann.date,
                        time: '00:00',
                        status: 'scheduled',
                        recurrenceType: 'yearly',
                        isLunar: ann.isLunar || false,
                        customerId: customer.id,
                        customerName: customer.name,
                        meetingType: '기념일',
                        notes: `${customer.name}님 ${ann.name}`,
                    });
                }
            });
        }
        return events;
      });

      return [...baseAppointments, ...consultationAppointments, ...birthdayAndAnniversaryAppointments];
  }, [appointments, customers]);

  const { filteredEvents, meetingTypesForFilter } = useMemo(() => {
      const lowercasedSearchTerm = searchTerm.toLowerCase();

      const customerTypes = new Set<string>();
      const personalTypes = new Set<string>();

      allEvents.forEach(event => {
          if (event.customerId && !event.customerId.startsWith('unregistered-')) {
              customerTypes.add(event.meetingType);
          } else {
              personalTypes.add(event.meetingType);
          }
      });
      
      let typesForFilter: string[] = [];
      if (eventTypeFilter === 'customer') {
          typesForFilter = Array.from(customerTypes).sort();
      } else if (eventTypeFilter === 'personal') {
          typesForFilter = Array.from(personalTypes).sort();
      } else {
          typesForFilter = Array.from(new Set([...customerTypes, ...personalTypes])).sort();
      }

      const events = allEvents.filter(event => {
          if (eventTypeFilter === 'customer' && (!event.customerId || event.customerId.startsWith('unregistered-'))) return false;
          if (eventTypeFilter === 'personal' && (event.customerId && !event.customerId.startsWith('unregistered-'))) return false;

          if (meetingTypeFilter !== 'all' && event.meetingType !== meetingTypeFilter) return false;

          if (lowercasedSearchTerm) {
              return (
                  (event.customerName && event.customerName.toLowerCase().includes(lowercasedSearchTerm)) ||
                  (event.title && event.title.toLowerCase().includes(lowercasedSearchTerm)) ||
                  (event.notes && event.notes.toLowerCase().includes(lowercasedSearchTerm)) ||
                  (event.location && event.location.toLowerCase().includes(lowercasedSearchTerm))
              );
          }

          return true;
      });
      
      events.sort((a,b) => (a.date + a.time).localeCompare(b.date + b.time));
      
      return { filteredEvents: events, meetingTypesForFilter: typesForFilter };
  }, [allEvents, searchTerm, eventTypeFilter, meetingTypeFilter]);
  
  const isFilterActive = useMemo(() => {
    return searchTerm.trim() !== '' || eventTypeFilter !== 'all' || meetingTypeFilter !== 'all';
  }, [searchTerm, eventTypeFilter, meetingTypeFilter]);

  useEffect(() => {
    if (!meetingTypesForFilter.includes(meetingTypeFilter)) {
        setMeetingTypeFilter('all');
    }
  }, [meetingTypesForFilter, meetingTypeFilter]);

  const appointmentsByDate = useMemo(() => {
    let viewStart: Date, viewEnd: Date;
    if (calendarView === 'month') {
        viewStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
        const startDayOfWeek = viewStart.getDay();
        const offsetStart = startDayOfWeek === 0 ? 6 : startDayOfWeek - 1;
        viewStart.setDate(viewStart.getDate() - offsetStart);

        viewEnd = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
        const endDayOfWeek = viewEnd.getDay();
        const offsetEnd = (7 - endDayOfWeek) % 7;
        viewEnd.setDate(viewEnd.getDate() + offsetEnd);
    } else { // week or day
        viewStart = new Date(currentDate);
        const dayOfWeek = viewStart.getDay();
        const offset = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
        viewStart.setDate(viewStart.getDate() - offset);
        viewEnd = new Date(viewStart);
        viewEnd.setDate(viewEnd.getDate() + 6);
    }
    viewStart.setHours(0, 0, 0, 0);
    viewEnd.setHours(23, 59, 59, 999);

    const occurrences = generateOccurrences(filteredEvents, viewStart, viewEnd, calendar);
    
    const map = new Map<string, Appointment[]>();
    occurrences.forEach(app => {
      const dateKey = app.occurrenceDate;
      if (!map.has(dateKey)) {
        map.set(dateKey, []);
      }
      map.get(dateKey)!.push(app);
    });

    map.forEach(dayAppointments => {
        dayAppointments.sort((a,b) => a.time.localeCompare(b.time));
    });
    return map;
  }, [filteredEvents, currentDate, calendarView, calendar]);

  const weekDaysForView = useMemo(() => {
    const start = new Date(currentDate);
    const dayOfWeek = start.getDay();
    const offset = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    start.setDate(start.getDate() - offset);
    const days = [];
    for (let i = 0; i < 7; i++) {
        const day = new Date(start);
        day.setDate(start.getDate() + i);
        days.push(day);
    }
    return days;
  }, [currentDate]);
  
  const postponedAppointments = useMemo(() => {
    return appointments
        .filter(app => app.status === 'postponed')
        .sort((a, b) => a.date.localeCompare(b.date));
  }, [appointments]);

  useEffect(() => {
    if (postponedHeaderCheckboxRef.current) {
        const numSelected = selectedPostponedIds.size;
        const numTotal = postponedAppointments.length;
        if (numTotal === 0) {
            postponedHeaderCheckboxRef.current.checked = false;
            postponedHeaderCheckboxRef.current.indeterminate = false;
            return;
        }
        postponedHeaderCheckboxRef.current.checked = numSelected === numTotal;
        postponedHeaderCheckboxRef.current.indeterminate = numSelected > 0 && numSelected < numTotal;
    }
  }, [selectedPostponedIds, postponedAppointments]);

  const handlePeriodChange = (amount: number) => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      if (calendarView === 'month') {
        newDate.setDate(1); // Avoids issues with month-end dates
        newDate.setMonth(newDate.getMonth() + amount);
      } else if (calendarView === 'week') {
        newDate.setDate(newDate.getDate() + (amount * 7));
      } else { // day
        newDate.setDate(newDate.getDate() + amount);
      }
      if (calendarView === 'day') {
        setSelectedDate(newDate); // Sync selected date in day view
      }
      return newDate;
    });
  };
  
  const goToToday = () => {
    const today = new Date();
    setCurrentDate(today);
    setSelectedDate(today);
  };

  const handleEventClick = (event: any) => {
      if (event.isConsultation) {
          const realConsultationId = event.id.replace('consult-', '');
          const customer = customers.find(c => c.id === event.customerId);
          const consultation = customer?.consultations.find(c => c.id === realConsultationId);
          if (customer && consultation) {
              onEditConsultation(customer.id, customer.name, consultation);
          }
      } else {
          onEditAppointment(event);
      }
  };

  const handleDeleteEvent = (event: any) => {
      if (event.isConsultation) {
        onDeleteConsultation(event.customerId, event.id.replace('consult-', ''));
      } else {
        onDeleteAppointment(event.id);
      }
  }

  const handleDateSelect = useCallback((date: Date) => {
    setSelectedDate(date);
    setTimeout(() => {
        if (detailsViewRef.current) {
            // Find the scrollable parent dynamically
            let scrollableParent = detailsViewRef.current.parentElement;
            while (scrollableParent) {
                const style = window.getComputedStyle(scrollableParent);
                if (style.overflowY === 'auto' || style.overflowY === 'scroll') {
                    break;
                }
                if (scrollableParent.tagName.toLowerCase() === 'body') {
                    scrollableParent = null; // Don't scroll the whole body
                    break;
                }
                scrollableParent = scrollableParent.parentElement;
            }

            if (scrollableParent) {
                // Use custom smooth scroll with a faster duration (300ms)
                smoothScrollToElement(scrollableParent, detailsViewRef.current, 300);
            } else {
                // Fallback to native browser behavior if a scrollable parent isn't found
                detailsViewRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        }
    }, 0);
  }, []);
  
  const calendarHeaderTitle = useMemo(() => {
      if (calendarView === 'month') {
          return `${currentDate.getFullYear()}년 ${currentDate.getMonth() + 1}월`;
      } else if (calendarView === 'week') {
          const startOfWeek = new Date(currentDate);
          const dayOfWeek = startOfWeek.getDay();
          const offset = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
          startOfWeek.setDate(startOfWeek.getDate() - offset);

          const year = startOfWeek.getFullYear();
          const month = startOfWeek.getMonth();
          const dateInMonth = startOfWeek.getDate();
          
          const weekOfMonth = Math.ceil(dateInMonth / 7);
          
          const shortYear = year.toString().slice(-2);
          
          return `${shortYear}년 ${month + 1}월 ${weekOfMonth}주차`;
      } else { // day
          return currentDate.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' });
      }
  }, [currentDate, calendarView]);
  
    const handleSelectAllPostponed = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.checked) {
            setSelectedPostponedIds(new Set(postponedAppointments.map(c => c.id)));
        } else {
            setSelectedPostponedIds(new Set());
        }
    };

    const handleSelectOnePostponed = (id: string) => {
        setSelectedPostponedIds(prev => {
            const newSet = new Set(prev);
            if (newSet.has(id)) {
                newSet.delete(id);
            } else {
                newSet.add(id);
            }
            return newSet;
        });
    };

    const handleDeleteSelectedPostponed = () => {
        onDeleteMultipleAppointments(Array.from(selectedPostponedIds));
        setSelectedPostponedIds(new Set());
        setIsDeletePostponedConfirmOpen(false);
    };

    const handleOpenActivityDetails = (title: string, appointments: Appointment[]) => {
        setActivityDetailModalData({ isOpen: true, title, appointments });
    };

    const SearchResultsView = () => (
      <div className="animate-fade-in mt-6">
          <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-4">
              검색 결과 ({filteredEvents.length}건)
          </h2>
          {filteredEvents.length > 0 ? (
              <div className="space-y-3">
                  {filteredEvents.map(event => (
                      <div key={(event as any).occurrenceId || event.id} className="p-3 bg-[var(--background-tertiary)] rounded-lg border border-[var(--border-color)]">
                          <div className="flex justify-between items-start">
                              <div>
                                  <p className="font-bold text-[var(--text-primary)]">{event.title || event.customerName}</p>
                                  <p className="text-sm text-[var(--text-muted)]">{event.date} {event.time}</p>
                              </div>
                              <div className="flex items-center gap-2">
                                  <span className="px-2 py-1 text-xs font-semibold rounded-full bg-[var(--background-accent-subtle)] text-[var(--text-accent)]">{event.meetingType}</span>
                                  <button onClick={() => handleEventClick(event)} className="p-1 text-[var(--text-muted)] hover:text-[var(--text-accent)]" aria-label="수정"><PencilIcon className="h-4 w-4"/></button>
                                  <button onClick={() => handleDeleteEvent(event)} className="p-1 text-[var(--text-muted)] hover:text-[var(--text-danger)]" aria-label="삭제"><TrashIcon className="h-4 w-4"/></button>
                              </div>
                          </div>
                          {event.notes && (
                              <pre className="mt-2 pt-2 border-t border-[var(--border-color)] text-sm text-[var(--text-secondary)] whitespace-pre-wrap font-sans bg-[var(--background-primary)] p-2 rounded-md">
                                  {event.notes}
                              </pre>
                          )}
                      </div>
                  ))}
              </div>
          ) : (
              <div className="text-center py-10 text-[var(--text-muted)]">
                  <p>해당 조건에 맞는 일정이 없습니다.</p>
              </div>
          )}
      </div>
    );

  const DailyDetails = (
      <div ref={detailsViewRef} className="scroll-mt-[4.5rem] md:scroll-mt-0">
          <div className="sticky top-0 bg-[var(--background-secondary)] p-2 z-10 mb-4 rounded-t-lg">
                <h2 className="text-xl font-semibold text-[var(--text-primary)]">
                  {selectedDate.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' })}
              </h2>
          </div>
          <DailyDetailView 
              selectedDate={selectedDate}
              events={filteredEvents}
              todos={todos}
              onNewAppointmentClick={onOpenAddAppointmentModal}
              onEventClick={handleEventClick}
              onDeleteAppointment={onDeleteAppointment}
              onRequestAppointmentAction={onRequestAppointmentAction}
              onAddTodo={onAddTodo}
              onToggleTodo={onToggleTodo}
              onDeleteTodo={onDeleteTodo}
              onUpdateTodo={onUpdateTodo}
              getAppointmentColorClasses={getAppointmentColorClasses}
              onOpenAddPredictionModal={handleOpenPredictionModal}
              dailyReviews={dailyReviews}
              onSaveDailyReview={onSaveDailyReview}
          />
      </div>
  );

  const renderDaysOfWeek = ({ isWeeklyView }: { isWeeklyView: boolean }) => {
    const days = ['월', '화', '수', '목', '금', '토', '일'];
    return (
      <div className={`grid grid-cols-7 divide-x divide-[var(--border-color)] text-center font-semibold text-[var(--text-secondary)] border-x border-t border-[var(--border-color)]`}>
        {days.map(day => (
          <div key={day} className={`py-2 bg-[var(--background-tertiary)] ${day === '일' ? 'text-[var(--text-danger)]' : ''} ${day === '토' ? 'text-[var(--text-accent)]' : ''}`}>{day}</div>
        ))}
      </div>
    );
  };
  
  const renderMonthCells = () => {
    const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
    const dayOfWeekOfFirst = firstDayOfMonth.getDay();
    const blanksCount = dayOfWeekOfFirst === 0 ? 6 : dayOfWeekOfFirst - 1;
    const blanks = Array(blanksCount).fill(null);
    const daysArr = Array.from({ length: daysInMonth }, (_, i) => i + 1);
    const today = new Date();
    const isCurrentMonth = today.getFullYear() === currentDate.getFullYear() && today.getMonth() === currentDate.getMonth();
    const holidaysForYear = getKoreanHolidays(currentDate.getFullYear());

    return (
      <div className="grid grid-cols-7 divide-x divide-y divide-[var(--border-color)] border-x border-b border-[var(--border-color)]">
        {blanks.map((_, i) => <div key={`blank-${i}`} className="bg-[var(--background-primary)]"></div>)}
        {daysArr.map(day => {
          const dayDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
          const dateStr = new Date(dayDate.getTime() - (dayDate.getTimezoneOffset() * 60000)).toISOString().split('T')[0];
          
          const isToday = isCurrentMonth && day === today.getDate();
          const dayOfWeek = dayDate.getDay();
          const isSelected = selectedDate.getFullYear() === dayDate.getFullYear() &&
                             selectedDate.getMonth() === dayDate.getMonth() &&
                             selectedDate.getDate() === dayDate.getDate();

          const monthDay = `${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          const holidayName = holidaysForYear[monthDay];
          const isHoliday = !!holidayName;
          const appointmentsForDay = appointmentsByDate.get(dateStr);
          const hasAppointments = appointmentsForDay && appointmentsForDay.length > 0;

          let lunarDateText = '';
            if (showLunarCalendar) {
                try {
                    // Use Intl API for lunar date display
                    const formatter = new Intl.DateTimeFormat('ko-KR-u-ca-chinese', { month: 'numeric', day: 'numeric' });
                    const parts = formatter.formatToParts(dayDate);
                    const monthPart = parts.find(p => p.type === 'month');
                    const dayPart = parts.find(p => p.type === 'day');
                    if (monthPart && dayPart) {
                        // The month value can be '윤2' for leap months, which is good.
                        // The day value is just a number.
                        // Format to (음 M.D)
                        lunarDateText = `(음 ${monthPart.value}.${dayPart.value})`;
                    }
                } catch (e) { console.error('Intl Lunar conversion failed:', e); }
            }

          let dayColorClass = 'text-[var(--text-primary)]';
          if (isHoliday || dayOfWeek === 0) dayColorClass = 'text-[var(--text-danger)] font-semibold';
          else if (dayOfWeek === 6) dayColorClass = 'text-[var(--text-accent)]';
          
          return (
            <div 
              key={day} 
              className={`p-1 min-h-[5rem] md:min-h-[7rem] relative flex flex-col transition-colors duration-200 ${isSelected && !isMobile ? 'bg-[var(--background-accent-subtle)] ring-2 ring-[var(--background-accent)] z-10' : 'bg-[var(--background-secondary)] hover:bg-[var(--background-tertiary)] cursor-pointer'}`}
              onClick={() => handleDateSelect(dayDate)}
            >
              <div className="flex justify-end">
                <div className={`flex items-center justify-center ${isToday ? 'bg-[var(--background-accent)] text-[var(--text-on-accent)] rounded-full h-7 w-7' : ''}`}>
                    <span className={`text-sm ${isToday ? '' : dayColorClass}`}>{day}</span>
                </div>
              </div>
              <div className="h-4 text-center">
                {isHoliday ? (
                  <div className="text-[10px] text-[var(--text-danger)] font-semibold truncate">{holidayName}</div>
                ) : (
                  hasAppointments && !isToday && <div className="w-1.5 h-1.5 bg-[var(--background-accent)] rounded-full mx-auto" title={`${appointmentsForDay.length}개의 일정`}></div>
                )}
              </div>
              
              {lunarDateText && (
                  <div className="text-[10px] text-center text-[var(--text-muted)]">{lunarDateText}</div>
              )}

              <div className="flex-1 mt-1 space-y-0.5 overflow-hidden">
                {appointmentsByDate.get(dateStr)?.slice(0, 2).map(app => {
                    const colorProps = getAppointmentColorClasses(app);
                    const isCompleted = app.status === 'completed';
                    return (
                        <div 
                            key={(app as any).occurrenceId || app.id} 
                            style={colorProps.style}
                            className={`px-1 rounded text-[10px] sm:text-xs leading-tight overflow-hidden ${colorProps.className || ''} ${isCompleted ? 'opacity-60' : ''}`}
                            title={`${app.time} ${app.title || app.customerName} @ ${app.location} (${app.meetingType})`}
                        >
                            <p className={`font-semibold truncate flex items-center ${isCompleted ? 'line-through' : ''}`}>
                                {isCompleted && <CheckIcon className="h-3 w-3 mr-0.5 shrink-0" />}
                                <span>{(app.title || app.customerName)} {formatTimeForCalendar(app.time)}</span>
                            </p>
                            <p className={`truncate opacity-80 ${isCompleted ? 'line-through' : ''}`}>{app.location}{app.location && app.meetingType ? ', ' : ''}{app.meetingType}</p>
                        </div>
                    );
                })}
                {(appointmentsByDate.get(dateStr)?.length || 0) > 2 && (
                    <div className="text-[10px] text-center text-[var(--text-muted)] font-medium">+ {(appointmentsByDate.get(dateStr)?.length || 0) - 2}개 더보기</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderWeekCells = () => {
    const today = new Date();
    const mondayOfWeek = weekDaysForView[0];
    const weekOfMonth = Math.ceil(mondayOfWeek.getDate() / 7);
    const month = mondayOfWeek.getMonth() + 1;

    const weekInfoCell = (
      <div key="week-info" className="p-2 min-h-[10rem] flex flex-col justify-center items-center bg-[var(--background-tertiary)]">
        <div className="text-center">
          <p className="text-lg font-bold text-[var(--text-accent)]">{month}월</p>
          <p className="text-2xl font-bold text-[var(--text-primary)]">{weekOfMonth}주차</p>
        </div>
      </div>
    );
    
    const dayCells = weekDaysForView.map(dayDate => {
        const dateStr = new Date(dayDate.getTime() - (dayDate.getTimezoneOffset() * 60000)).toISOString().split('T')[0];
        const day = dayDate.getDate();
        const isToday = today.getFullYear() === dayDate.getFullYear() && today.getMonth() === dayDate.getMonth() && today.getDate() === day;
        const isSelected = selectedDate.getFullYear() === dayDate.getFullYear() && selectedDate.getMonth() === dayDate.getMonth() && selectedDate.getDate() === day;
        const dayOfWeekShort = dayDate.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase();
        const dayOfWeek = dayDate.getDay();

        const holidaysForYear = getKoreanHolidays(dayDate.getFullYear());
        const monthDay = `${String(dayDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const isHoliday = !!holidaysForYear[monthDay];

        let headerColorClass = 'text-[var(--text-secondary)]';
        if (isHoliday || dayOfWeek === 0) headerColorClass = 'text-[var(--text-danger)]';
        else if (dayOfWeek === 6) headerColorClass = 'text-[var(--text-accent)]';

        return (
            <div
                key={dateStr}
                className={`p-2 min-h-[10rem] flex flex-col transition-colors duration-200 ${isSelected && !isMobile ? 'bg-[var(--background-accent-subtle)] ring-2 ring-[var(--background-accent)] z-10' : 'bg-[var(--background-secondary)] hover:bg-[var(--background-tertiary)] cursor-pointer'}`}
                onClick={() => handleDateSelect(dayDate)}
            >
                <div className="flex justify-between items-center pb-1">
                    <span className={`font-bold text-sm ${isToday ? 'text-white' : headerColorClass}`}>{dayOfWeekShort}</span>
                    <span className={`font-bold text-lg ${isToday ? 'bg-[var(--background-accent)] text-[var(--text-on-accent)] rounded-full h-7 w-7 flex items-center justify-center' : headerColorClass}`}>{day}</span>
                </div>

                <div className="flex-1 mt-2 space-y-1 overflow-y-auto custom-scrollbar">
                   {appointmentsByDate.get(dateStr)?.map(app => {
                        const colorProps = getAppointmentColorClasses(app);
                        const isCompleted = app.status === 'completed';
                        return (
                            <div
                                key={(app as any).occurrenceId || app.id}
                                style={colorProps.style}
                                className={`p-1.5 rounded text-xs leading-tight overflow-hidden cursor-pointer hover:opacity-80 ${colorProps.className || ''} ${isCompleted ? 'opacity-60' : ''}`}
                                onClick={(e) => { e.stopPropagation(); handleEventClick(app); }}
                                title={`${app.time} ${app.title || app.customerName} @ ${app.location} (${app.meetingType})`}
                            >
                                <p className={`font-semibold truncate flex items-center ${isCompleted ? 'line-through' : ''}`}>
                                    {isCompleted && <CheckIcon className="h-3 w-3 mr-1 shrink-0" />}
                                    <span>{(app.title || app.customerName)} {formatTimeForCalendar(app.time)}</span>
                                </p>
                                <p className={`truncate opacity-80 ${isCompleted ? 'line-through' : ''}`}>{app.location}{app.location && app.meetingType ? ', ' : ''}{app.meetingType}</p>
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    });

    return (
        <div className="grid grid-cols-4 divide-x divide-y divide-[var(--border-color)] border border-[var(--border-color)] rounded-lg overflow-hidden">
            {weekInfoCell}
            {dayCells[0]}
            {dayCells[1]}
            {dayCells[2]}
            {dayCells[3]}
            {dayCells[4]}
            {dayCells[5]}
            {dayCells[6]}
        </div>
    );
  };

  return (
    <div>
        <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold text-[var(--text-primary)]">🗓️ 일정 관리</h1>
            <div className="flex items-center gap-2">
                <button
                    onClick={onOpenAIAddAppointmentModal}
                    className="flex items-center justify-center bg-[var(--background-accent)] hover:bg-[var(--background-accent-hover)] text-[var(--text-on-accent)] font-bold py-2 px-3 rounded-lg transition-colors text-sm"
                >
                    <CalendarPlusIcon className="h-5 w-5 mr-2" />
                    <span>AI로 일정 추가</span>
                </button>
            </div>
        </div>

        <div className="flex border-b border-[var(--border-color)] mb-4">
            <button onClick={() => setViewMode('calendar')} className={`px-4 py-2 text-sm font-medium ${viewMode === 'calendar' ? 'text-[var(--text-accent)] border-b-2 border-[var(--background-accent)]' : 'text-[var(--text-muted)]'}`}>캘린더</button>
            <button onClick={() => setViewMode('reviewList')} className={`px-4 py-2 text-sm font-medium ${viewMode === 'reviewList' ? 'text-[var(--text-accent)] border-b-2 border-[var(--background-accent)]' : 'text-[var(--text-muted)]'}`}>총평</button>
        </div>
        
        {viewMode === 'calendar' && (
            <div ref={containerRef} className={isMobile ? '' : 'xl:flex xl:h-[calc(100vh-240px)]'}>
                <div 
                    className="flex-shrink-0" 
                    style={isMobile ? {width: '100%'} : { width: `${leftPaneWidth}%`}}
                >
                    <div className={isMobile ? '' : 'h-full overflow-y-auto custom-scrollbar pr-1 xl:pr-3'}>
                        <div className="bg-[var(--background-secondary)] p-4 rounded-lg shadow-lg border border-[var(--border-color)] mb-2">
                            <div className="flex items-center justify-between flex-wrap gap-2">
                                <h2 className="text-xl font-bold text-[var(--text-primary)] text-center">
                                    {calendarHeaderTitle}
                                </h2>
                                <div className="flex items-center gap-2">
                                    <button onClick={goToToday} className="px-4 py-2 text-sm font-medium border border-[var(--border-color-strong)] bg-[var(--background-tertiary)] text-[var(--text-secondary)] rounded-md hover:bg-[var(--background-primary)]">오늘</button>
                                    <div className="flex items-center p-1 bg-[var(--background-tertiary)] rounded-lg">
                                        <button onClick={() => setCalendarView('month')} className={`px-3 py-1 text-sm rounded-md ${calendarView === 'month' ? 'bg-[var(--background-secondary)] text-[var(--text-accent)] shadow' : 'text-[var(--text-secondary)]'}`}>월</button>
                                        <button onClick={() => setCalendarView('week')} className={`px-3 py-1 text-sm rounded-md ${calendarView === 'week' ? 'bg-[var(--background-secondary)] text-[var(--text-accent)] shadow' : 'text-[var(--text-secondary)]'}`}>주</button>
                                        <button onClick={() => setCalendarView('day')} className={`px-3 py-1 text-sm rounded-md ${calendarView === 'day' ? 'bg-[var(--background-secondary)] text-[var(--text-accent)] shadow' : 'text-[var(--text-secondary)]'}`}>일</button>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button onClick={() => handlePeriodChange(-1)} className="px-3 py-2 bg-[var(--background-tertiary)] rounded-md hover:bg-[var(--background-primary)]">&lt;</button>
                                        <button onClick={() => handlePeriodChange(1)} className="px-3 py-2 bg-[var(--background-tertiary)] rounded-md hover:bg-[var(--background-primary)]">&gt;</button>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        {calendarView === 'month' && (
                          <div className="flex justify-end items-center mb-4 px-4">
                              <div className="flex items-center gap-2">
                                  <input
                                      type="checkbox"
                                      id="showLunarCalendar"
                                      checked={showLunarCalendar}
                                      onChange={(e) => {
                                          setShowLunarCalendar(e.target.checked);
                                          setItem('schedule-show-lunar', e.target.checked);
                                      }}
                                      className="h-4 w-4 rounded border-[var(--border-color-strong)] bg-[var(--background-tertiary)] text-[var(--background-accent)] focus:ring-[var(--background-accent)]"
                                  />
                                  <label htmlFor="showLunarCalendar" className="text-sm text-[var(--text-secondary)] cursor-pointer">
                                      음력표시
                                  </label>
                              </div>
                          </div>
                        )}

                        {!isFilterActive ? (
                            <>
                                <div className="mb-8">
                                    {calendarView === 'month' ? (
                                        <div className="rounded-lg overflow-hidden">
                                            {renderDaysOfWeek({isWeeklyView: false})}
                                            {renderMonthCells()}
                                        </div>
                                    ) : calendarView === 'week' ? (
                                        renderWeekCells()
                                    ) : (
                                        <DailyTimelineView
                                            selectedDate={currentDate}
                                            appointmentsByDate={appointmentsByDate}
                                            getAppointmentColorClasses={getAppointmentColorClasses}
                                            onEventClick={handleEventClick}
                                            onNewAppointmentClick={onOpenAddAppointmentModal}
                                        />
                                    )}
                                </div>
                                {calendarView !== 'day' && !isMobile && <ActivitySummary appointments={appointments} customers={customers} predictions={predictions} performanceRecords={performanceRecords} currentDate={currentDate} onOpenDetails={handleOpenActivityDetails}/>}
                                {calendarView !== 'day' && isMobile && (
                                    <div className="mb-6">
                                        <ActivitySummary appointments={appointments} customers={customers} predictions={predictions} performanceRecords={performanceRecords} currentDate={currentDate} onOpenDetails={handleOpenActivityDetails}/>
                                    </div>
                                )}
                            </>
                        ) : null}

                        {/* Filter Bar */}
                        <div className="bg-[var(--background-secondary)] p-4 rounded-lg shadow-md border border-[var(--border-color)] mt-6 space-y-3">
                            <div className="flex items-center gap-2">
                                <SearchIcon className="h-5 w-5 text-[var(--text-muted)]"/>
                                <input type="text" placeholder="검색 (고객명, 내용, 장소...)" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full p-2 bg-transparent focus:outline-none"/>
                            </div>
                            <div className="flex items-center gap-4 flex-wrap">
                                <div className="flex items-center p-1 bg-[var(--background-tertiary)] rounded-lg">
                                    {(['all', 'customer', 'personal'] as const).map(type => (
                                        <button key={type} onClick={() => setEventTypeFilter(type)} className={`px-3 py-1.5 text-sm font-medium rounded-md ${eventTypeFilter === type ? 'bg-[var(--background-secondary)] text-[var(--text-accent)] shadow' : 'text-[var(--text-secondary)]'}`}>
                                            {{ all: '전체', customer: '고객 일정', personal: '개인 일정'}[type]}
                                        </button>
                                    ))}
                                </div>
                                <select value={meetingTypeFilter} onChange={e => setMeetingTypeFilter(e.target.value)} className="p-2 border border-[var(--border-color-strong)] rounded-md bg-[var(--background-tertiary)] text-[var(--text-primary)]">
                                    <option value="all">유형 전체</option>
                                    {meetingTypesForFilter.map(type => <option key={type} value={type}>{type}</option>)}
                                </select>
                            </div>
                        </div>
                        
                        {isFilterActive && <SearchResultsView />}
                    </div>

                    {isMobile && (
                      <div className="mt-8">
                        {DailyDetails}
                      </div>
                    )}
                </div>
                
                {!isMobile && (
                    <>
                        <div
                            onMouseDown={handleMouseDown}
                            className="hidden xl:flex flex-shrink-0 w-2 cursor-col-resize items-center justify-center group"
                            role="separator"
                            aria-orientation="vertical"
                        >
                            <div className="w-0.5 h-full bg-[var(--border-color)] group-hover:bg-[var(--background-accent)] transition-colors duration-200"></div>
                        </div>
                        <div className="flex-1 min-w-0 xl:pl-3">
                           {DailyDetails}
                        </div>
                    </>
                )}
            </div>
        )}
        
        {viewMode === 'reviewList' && <DailyReviewList reviews={dailyReviews} onSaveDailyReview={onSaveDailyReview} onDeleteDailyReview={onDeleteDailyReview} onDeleteMultipleDailyReviews={onDeleteMultipleDailyReviews} />}
        
        {isPredictionModalOpen && (
            <AddPerformancePredictionModal
                isOpen={isPredictionModalOpen}
                onClose={() => {
                    setIsPredictionModalOpen(false);
                    setEditingPrediction(null);
                    setPredictionSeed(null);
                }}
                onSave={async (data) => {
                    if (editingPrediction && editingPrediction.id) {
                        await onUpdatePrediction({ ...editingPrediction, ...data });
                    } else {
                        await onAddPrediction(data);
                    }
                }}
                prediction={editingPrediction || predictionSeed}
                isAiMode={false}
            />
        )}

        {isPostponedModalOpen && (
            <BaseModal isOpen={isPostponedModalOpen} onClose={() => setIsPostponedModalOpen(false)} className="max-w-2xl w-full">
                <div className="p-6 border-b border-[var(--border-color)] flex justify-between items-center">
                    <h2 className="text-2xl font-bold text-[var(--text-primary)]">연기된 일정 목록</h2>
                    <button onClick={() => setIsPostponedModalOpen(false)} className="text-[var(--text-muted)] hover:text-[var(--text-primary)]"><XIcon className="h-6 w-6" /></button>
                </div>
                <div className="p-6 flex-1 min-h-0 overflow-y-auto custom-scrollbar">
                    <div className="flex items-center justify-between p-2">
                         <div className="flex items-center gap-3">
                            <input
                                ref={postponedHeaderCheckboxRef}
                                type="checkbox"
                                onChange={handleSelectAllPostponed}
                                className="h-5 w-5 rounded border-[var(--border-color-strong)] bg-[var(--background-tertiary)] text-[var(--background-accent)] focus:ring-[var(--background-accent)]"
                            />
                            <label className="text-sm font-medium text-[var(--text-secondary)]">전체 선택</label>
                        </div>
                        {selectedPostponedIds.size > 0 && (
                            <button onClick={() => setIsDeletePostponedConfirmOpen(true)} className="flex items-center gap-1 text-sm text-[var(--text-danger)] font-medium hover:text-[var(--text-danger)]/80">
                                <TrashIcon className="h-4 w-4" /> 선택 삭제 ({selectedPostponedIds.size})
                            </button>
                        )}
                    </div>
                     <div className="mt-2 space-y-2">
                         {postponedAppointments.map(app => (
                            <div key={app.id} className="p-3 bg-[var(--background-tertiary)] rounded-md border-[var(--border-color)]">
                                 <div className="flex items-center gap-3">
                                    <input
                                        type="checkbox"
                                        checked={selectedPostponedIds.has(app.id)}
                                        onChange={() => handleSelectOnePostponed(app.id)}
                                        className="h-5 w-5 rounded border-[var(--border-color-strong)] bg-[var(--background-tertiary)] text-[var(--background-accent)] focus:ring-[var(--background-accent)]"
                                    />
                                     <div>
                                        <p className="font-semibold text-[var(--text-primary)]">{app.customerName}</p>
                                        <p className="text-sm text-[var(--text-muted)]">연기된 날짜: {app.date}</p>
                                    </div>
                                    <div className="ml-auto">
                                        <button onClick={() => onRescheduleFromPostponed(app)} className="px-3 py-1.5 bg-green-500 text-white rounded-md text-xs font-medium">재등록</button>
                                    </div>
                                 </div>
                            </div>
                        ))}
                     </div>
                </div>
            </BaseModal>
        )}
        <ConfirmationModal
            isOpen={isDeletePostponedConfirmOpen}
            onClose={() => setIsDeletePostponedConfirmOpen(false)}
            onConfirm={handleDeleteSelectedPostponed}
            title="일정 삭제 확인"
            message={`선택한 ${selectedPostponedIds.size}개의 연기된 일정을 삭제하시겠습니까?`}
        />
        {activityDetailModalData.isOpen && (
            <ActivityDetailModal
                isOpen={activityDetailModalData.isOpen}
                onClose={() => setActivityDetailModalData({ isOpen: false, title: '', appointments: [] })}
                title={activityDetailModalData.title}
                appointments={activityDetailModalData.appointments}
            />
        )}
    </div>
  );
};
