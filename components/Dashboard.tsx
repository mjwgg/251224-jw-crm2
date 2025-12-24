
import React, { useMemo, useRef, useState, useCallback, useEffect } from 'react';
import type { Customer, Appointment, Todo, AppView, Goal, QuickMemo, PerformancePrediction, PerformanceRecord, MeetingType, Habit, HabitLog, CustomerType } from '../types';
import { CakeIcon, GiftIcon, CalendarIcon, ClockIcon, MessageIcon, CheckIcon, XIcon, BriefcaseIcon, PhoneIcon, PencilIcon, TrashIcon, ClipboardIcon, PlusIcon, EyeIcon, EyeOffIcon, ListBulletIcon, SparklesIcon, ChartBarIcon, DocumentTextIcon, DragHandleIcon, LightBulbIcon, ChevronDownIcon, ChevronUpIcon, SearchIcon, BookmarkIcon, ChevronLeftIcon, ChevronRightIcon } from './icons';
import TodoList from './TodoList';
import GoalsTracker from './GoalsTracker';
import BaseModal from './ui/BaseModal';
import { RecontactModal } from './RecontactModal';
import ConfirmationModal from './ui/ConfirmationModal';
import PerformanceManagement from './PerformanceManagement';
import AddPerformancePredictionModal from './AddPerformancePredictionModal';
import { getUserColors, getTextColorForBackground, DEFAULT_MEETING_TYPE_COLORS } from '../services/colorService';
import TodoListModal from './TodoListModal';
import AddInterestedProspectModal from './AddInterestedProspectModal';
import HabitTracker from './HabitTracker';
import Tag from './ui/Tag';
import { useLunarCalendar } from '../hooks/useData';

const memoColors = {
    default: { bg: 'bg-[var(--background-tertiary)]', border: 'border-[var(--border-color)]', dot: 'bg-gray-400' },
    red: { bg: 'bg-red-500/10', border: 'border-red-500/30', dot: 'bg-red-500' },
    yellow: { bg: 'bg-yellow-500/10', border: 'border-yellow-500/30', dot: 'bg-yellow-500' },
    green: { bg: 'bg-green-500/10', border: 'border-green-500/30', dot: 'bg-green-500' },
    blue: { bg: 'bg-blue-500/10', border: 'border-blue-500/30', dot: 'bg-blue-500' },
};
type MemoColor = keyof typeof memoColors;

type WidgetId = 'todaysBriefing' | 'appointments' | 'todos' | 'quickMemo' | 'goals' | 'predictions' | 'calendarWeek' | 'activitySummary' | 'monthlyPerformance' | 'todaysHabits';

interface WidgetLayout {
  id: WidgetId;
  visible: boolean;
}

const WIDGET_CONFIG: { id: WidgetId, colSpan: 1 | 2 | 3 }[] = [
  { id: 'todaysHabits', colSpan: 2 },
  { id: 'appointments', colSpan: 1 },
  { id: 'todos', colSpan: 1 },
  { id: 'todaysBriefing', colSpan: 2 },
  { id: 'quickMemo', colSpan: 2 },
  { id: 'goals', colSpan: 2 },
  { id: 'predictions', colSpan: 2 },
  { id: 'calendarWeek', colSpan: 2 },
  { id: 'activitySummary', colSpan: 2 },
  { id: 'monthlyPerformance', colSpan: 2 },
];

const WIDGET_METADATA: Record<WidgetId, { name: string; icon: React.ReactNode }> = {
    todaysBriefing: { name: '오늘의 브리핑', icon: <LightBulbIcon className="w-5 h-5 text-yellow-400" /> },
    appointments: { name: '오늘의 일정', icon: <CalendarIcon className="w-5 h-5 text-blue-400" /> },
    todos: { name: '오늘의 할 일', icon: <CheckIcon className="w-5 h-5 text-green-400" /> },
    quickMemo: { name: '간편 메모', icon: <PencilIcon className="w-5 h-5 text-purple-400" /> },
    goals: { name: '나의 목표', icon: <ListBulletIcon className="w-5 h-5 text-indigo-400" /> },
    predictions: { name: '실적 예측', icon: <SparklesIcon className="w-5 h-5 text-amber-400" /> },
    calendarWeek: { name: '캘린더', icon: <CalendarIcon className="w-5 h-5 text-blue-400" /> },
    activitySummary: { name: '활동 요약', icon: <ChartBarIcon className="h-5 v-5 text-rose-400" /> },
    monthlyPerformance: { name: '월간 실적', icon: <ChartBarIcon className="h-5 w-5 text-rose-400" /> },
    todaysHabits: { name: '오늘의 습관', icon: <CheckIcon className="h-5 w-5 mr-2 text-green-400" /> },
};

const DEFAULT_LAYOUT: WidgetLayout[] = WIDGET_CONFIG
  .map(w => ({
    id: w.id,
    visible: !['monthlyPerformance', 'goals', 'predictions', 'calendarWeek'].includes(w.id),
  }));

type BriefingItem = {
  id: string;
  type: 'birthday' | 'anniversary' | 'expiry' | 'recontact_call' | 'recontact_rejection' | 'followUp' | 'rejectionRecontact';
  date: Date;
  customer: Customer;
  title: string;
  subtitle: string;
  dDay: number;
  notes?: string;
  setupDate?: string;
};

interface DashboardProps {
  customers: Customer[];
  appointments: Appointment[];
  todos: Todo[];
  goals: Goal[];
  isLoading: boolean;
  onNavigate: (view: AppView) => void;
  onSelectCustomer: (customer: Customer, initialTab?: 'details' | 'consultations' | 'contracts' | 'callHistory' | 'introductions') => void;
  onRequestAppointmentAction: (appointment: Appointment, actionType: 'completed' | 'postponed' | 'cancelled') => void;
  onDeleteAppointment: (appointmentId: string) => void;
  onSelectAppointment: (appointment: Appointment) => void;
  onOpenAddAppointmentModal: (date: string, time: string) => void;
  onOpenAddReminderModal: () => void;
  onEditReminder: (customer: Customer) => void;
  onAddTodo: (text: string, priority: Todo['priority'], date?: string) => void;
  onToggleTodo: (id: string) => void;
  onDeleteTodo: (id: string) => void;
  onAddPrediction: (prediction: Omit<PerformancePrediction, 'id'>) => Promise<void>;
  onUpdatePrediction: (prediction: PerformancePrediction) => Promise<void>;
  onDeletePrediction: (predictionId: string) => Promise<void>;
  performanceRecords: PerformanceRecord[];
  onAddPerformanceRecord: (record: (Omit<PerformanceRecord, 'id'> & { customerType?: CustomerType; }) | (Omit<PerformanceRecord, 'id'> & { customerType?: CustomerType; })[]) => Promise<void>;
  onUpdatePerformanceRecord: (record: PerformanceRecord) => Promise<void>;
  onDeletePerformanceRecord: (recordId: string) => Promise<void>;
  onAddAppointment: (appointment: Omit<Appointment, 'id' | 'status'>, consultationData?: any, resonance?: any) => Promise<void>;
  onUpdateAppointment: (appointment: Appointment, consultationData?: any, resonance?: any) => Promise<void>;
  onEditAppointment: (appointment: Appointment) => void;
  onRequestAction: (toastData: any) => void;
  updateCustomerTags: (customerIds: string[], tagsToAdd: string[], tagsToRemove: string[]) => Promise<void>;
  onSetOnAppointmentAddSuccess: (callback: (() => void) | null) => void;
  habits: Habit[];
  habitLogs: HabitLog[];
  onAddHabit: (habit: Omit<Habit, 'id' | 'createdAt'>) => void;
  onUpdateHabit: (habit: Habit) => void;
  onDeleteHabit: (habitId: string) => void;
  onLogHabit: (habitId: string, date: string, completed: boolean) => void;
  onOpenRejectionModal: (customer: Customer) => void;
  onOpenConsultationRecordModal: (customerId: string, customerName: string, date: string, meetingType: MeetingType) => void;
  onLogCall: (customer: Customer) => void;
  onUpdateTodo: (id: string, data: { text: string; priority: Todo['priority'] }) => void;
  quickMemos: QuickMemo[];
  onAddQuickMemo: (text: string, color: string) => Promise<void>;
  onUpdateQuickMemo: (memo: QuickMemo) => Promise<void>;
  onDeleteQuickMemo: (id: string) => Promise<void>;
  onDeleteMultipleQuickMemos: (ids: string[]) => Promise<void>;
  onAddGoal: (goal: Omit<Goal, 'id'>) => Promise<void>;
  onUpdateGoal: (goal: Goal) => Promise<void>;
  onDeleteGoal: (goalId: string) => Promise<void>;
  onUpdateCustomer: (customer: Customer) => Promise<void>;
  onClearMultipleFollowUpDates: (ids: string[]) => Promise<void>;
  onDeleteMultipleAppointments: (ids: string[]) => Promise<void>;
  predictions: PerformancePrediction[];
}

const toLocalISO = (d: Date) => {
    if (isNaN(d.getTime())) return "0000-00-00";
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const formatTimeForCalendar = (timeStr: string): string => {
    if (!timeStr) return '';
    const [hourStr, minuteStr] = timeStr.split(':');
    const hour = parseInt(hourStr, 10);
    const minute = parseInt(minuteStr, 10);
    if (minute === 30) return `${hour}시 반`;
    return `${hour}시`;
};

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
      const appDate = new Date(app.date + 'T00:00:00');
      if (isNaN(appDate.getTime())) continue;
      if (appDate >= viewStart && appDate <= viewEnd) {
         const dateStr = toYYYYMMDD(appDate);
         if (!(app.exceptions || []).includes(dateStr)) {
            occurrences.push({ ...app, occurrenceDate: dateStr, occurrenceId: app.id });
         }
      }
    } else {
        const seriesStartDate = new Date(app.date + 'T00:00:00');
        if (isNaN(seriesStartDate.getTime())) continue;
        const seriesEndDate = app.recurrenceEndDate ? new Date(app.recurrenceEndDate + 'T23:59:59') : null;
        let currentDate = new Date(seriesStartDate.getTime());
        if (currentDate < viewStart) currentDate = new Date(viewStart.getTime());
        let safety = 0;
        while (currentDate <= viewEnd && safety < 500) {
            safety++;
            if (seriesEndDate && currentDate > seriesEndDate) break;
            let shouldAdd = false;
            if (app.recurrenceType === 'daily') shouldAdd = true;
            else if (app.recurrenceType === 'weekly' && app.recurrenceDays?.includes(currentDate.getDay())) shouldAdd = true;
            else if (app.recurrenceType === 'monthly' && currentDate.getDate() === seriesStartDate.getDate()) shouldAdd = true;
            if (shouldAdd) {
                const dateStr = toYYYYMMDD(currentDate);
                if (!(app.exceptions || []).includes(dateStr)) {
                    occurrences.push({ ...app, occurrenceDate: dateStr, occurrenceId: `${app.id}_${dateStr}` });
                }
            }
            currentDate.setDate(currentDate.getDate() + 1);
        }
    }
  }
  return occurrences;
};

export const Dashboard: React.FC<DashboardProps> = (props) => {
  const { 
    customers, appointments, todos, goals, isLoading, onNavigate, onSelectCustomer, 
    onRequestAppointmentAction, onDeleteAppointment, onSelectAppointment, 
    onOpenAddAppointmentModal, onOpenAddReminderModal, onEditReminder, onAddTodo, 
    onToggleTodo, onDeleteTodo, onUpdateTodo, onAddGoal, onUpdateGoal, onDeleteGoal, 
    quickMemos, onAddQuickMemo, onUpdateQuickMemo, onDeleteQuickMemo, 
    onDeleteMultipleQuickMemos, onUpdateCustomer, onClearMultipleFollowUpDates, 
    onDeleteMultipleAppointments, predictions, onAddPrediction, onUpdatePrediction, 
    onDeletePrediction, performanceRecords, onAddPerformanceRecord, onUpdatePerformanceRecord, 
    onDeletePerformanceRecord, onAddAppointment, onUpdateAppointment, onEditAppointment, onRequestAction, 
    updateCustomerTags, onSetOnAppointmentAddSuccess, habits, habitLogs, onAddHabit, 
    onUpdateHabit, onDeleteHabit, onLogHabit, onOpenRejectionModal, 
    onOpenConsultationRecordModal, onLogCall 
  } = props;

  const calendar = useLunarCalendar();
  const [activeTab, setActiveTab] = useState<'summary' | 'activity' | 'habits'>('summary');
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isRecontactModalOpen, setIsRecontactModalOpen] = useState(false);
  
  const [newMemoText, setNewMemoText] = useState('');
  const [newMemoColor, setNewMemoColor] = useState<MemoColor>('default');
  const [memoFilterTag, setMemoFilterTag] = useState<string | null>(null);
  const [memoSearchTerm, setMemoSearchTerm] = useState('');
  const [memoPage, setMemoPage] = useState(1);
  const MEMOS_PER_PAGE = 5;

  const [layout, setLayout] = useState<WidgetLayout[]>(() => {
    try {
      const savedLayout = localStorage.getItem('dashboard-layout');
      if (savedLayout) {
        const parsed = JSON.parse(savedLayout);
        if (Array.isArray(parsed)) {
          return (parsed as WidgetLayout[]).filter(w => (w.id as string) !== 'adBanner' && (w.id as string) !== 'youtubePreview');
        }
      }
    } catch (e) {}
    return DEFAULT_LAYOUT;
  });

  const [draggedItemIndex, setDraggedItemIndex] = useState<number | null>(null);
  const [openBriefingSections, setOpenBriefingSections] = useState<Set<string>>(new Set(['overdue', 'today']));

  const todayStr = useMemo(() => toLocalISO(new Date()), []);
  const completedHabitsToday = useMemo(() => {
    const set = new Set<string>();
    habitLogs.forEach(log => { if (log.date === todayStr && log.completed) set.add(log.habitId); });
    return set;
  }, [habitLogs, todayStr]);

  const handleToggleHabit = (habitId: string, isCompleted: boolean) => onLogHabit(habitId, todayStr, !isCompleted);

  const handleDragStart = (e: React.DragEvent<HTMLLIElement>, index: number) => { setDraggedItemIndex(index); e.dataTransfer.effectAllowed = 'move'; };
  const handleDragOver = (e: React.DragEvent<HTMLLIElement>) => e.preventDefault();
  const handleDrop = (targetIndex: number) => {
      if (draggedItemIndex === null) return;
      setLayout(prevLayout => {
          const newLayout = [...prevLayout];
          const [draggedItem] = newLayout.splice(draggedItemIndex, 1);
          newLayout.splice(targetIndex, 0, draggedItem);
          return newLayout;
      });
      setDraggedItemIndex(null);
  };

  const [userColors, setUserColors] = useState<Record<string, string>>({});
  useEffect(() => {
    const updateColors = () => setUserColors(getUserColors());
    updateColors();
    window.addEventListener('colors-updated', updateColors);
    return () => window.removeEventListener('colors-updated', updateColors);
  }, []);

  const getAppointmentColorClasses = useCallback((app: Appointment): { className?: string, style?: React.CSSProperties } => {
      if (app.status === 'cancelled') return { className: 'bg-[var(--background-tertiary)] text-[var(--text-muted)] line-through' };
      const type = app.meetingType;
      if (type) {
          const userColor = userColors[type];
          if (userColor) return { style: { backgroundColor: userColor, color: getTextColorForBackground(userColor) } };
          if (DEFAULT_MEETING_TYPE_COLORS[type]) return { className: `${DEFAULT_MEETING_TYPE_COLORS[type].bg} ${DEFAULT_MEETING_TYPE_COLORS[type].text}` };
      }
      return { className: 'bg-[var(--background-accent-subtle)] text-[var(--text-accent)]' };
  }, [userColors]);

  useEffect(() => { localStorage.setItem('dashboard-layout', JSON.stringify(layout)); }, [layout]);

  const briefingItems = useMemo(() => {
      const items: BriefingItem[] = [];
      const today = new Date(); today.setHours(0, 0, 0, 0);
      const getDDayInfo = (dateString: string): { dDay: number; text: string } => {
          const targetDate = new Date(dateString + 'T00:00:00');
          const diffTime = targetDate.getTime() - today.getTime();
          const dDay = Math.round(diffTime / (1000 * 60 * 60 * 24));
          if (isNaN(dDay)) return { dDay: 0, text: '-' };
          if (dDay === 0) return { dDay, text: 'D-DAY' };
          if (dDay > 0) return { dDay, text: `D-${dDay}` };
          return { dDay, text: `${-dDay}일 지남` };
      };
      customers.forEach(customer => {
        if (customer.birthday) {
          try {
            let eventDate: Date | null = null;
            const [by, bm, bd] = customer.birthday.split('-').map(Number);
            if (customer.isBirthdayLunar && calendar && bm && bd) {
                const solar = calendar.lunarToSolar(today.getFullYear(), bm, bd, false);
                if (solar) eventDate = new Date(solar.year, solar.month - 1, solar.day);
            } else if (bm && bd) {
                eventDate = new Date(today.getFullYear(), bm - 1, bd);
            }
            if (eventDate) {
              const { dDay, text } = getDDayInfo(toLocalISO(eventDate));
              if (dDay >= -30 && dDay <= 30) items.push({ id: `birth-${customer.id}`, type: 'birthday', date: eventDate, customer, title: `${customer.name}님 생일`, subtitle: text, dDay });
            }
          } catch(e) {}
        }
        if (customer.nextFollowUpDate) {
            const { dDay, text } = getDDayInfo(customer.nextFollowUpDate);
            if (dDay >= -30 && dDay <= 30) {
                const isRejection = !!customer.rejectionReason;
                const type = isRejection ? 'recontact_rejection' : 'recontact_call';

                let notes = isRejection ? `사유: ${customer.rejectionReason}${customer.rejectionNotes ? ` / ${customer.rejectionNotes}` : ''}` : '';
                let setupDate = isRejection ? customer.rejectionDate || '' : '';
                
                if (!isRejection && customer.callHistory && customer.callHistory.length > 0) {
                    const latestCall = customer.callHistory[0];
                    notes = latestCall.notes || '';
                    if (latestCall.date) {
                        try {
                           setupDate = latestCall.date.split('T')[0];
                        } catch(e) {}
                    }
                }

                items.push({ 
                    id: `recontact-${customer.id}`, 
                    type, 
                    date: new Date(customer.nextFollowUpDate), 
                    customer, 
                    title: `${customer.name}님 ${isRejection ? '거절 건 재접촉' : '통화 후 재접촉'}`, 
                    subtitle: text, 
                    dDay,
                    notes,
                    setupDate
                });
            }
        }
      });

      const dayOfWeek = today.getDay();
      const offset = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
      const endOfWeek = new Date(today);
      endOfWeek.setDate(today.getDate() - offset + 6);
      endOfWeek.setHours(23, 59, 59, 999);
      const endOfWeekStr = toLocalISO(endOfWeek);

      return { 
          // 기한 지남 목록에서 생일(birthday) 제외 및 최근 14일 이내로 제한
          overdue: items.filter(i => i.dDay < 0 && i.dDay >= -14 && i.type !== 'birthday'),
          today: items.filter(i => i.dDay === 0),
          thisWeek: items.filter(i => i.dDay > 0 && toLocalISO(i.date) <= endOfWeekStr),
          future: items.filter(i => toLocalISO(i.date) > endOfWeekStr)
      };
    }, [customers, calendar]);

  const todaysAppointments = useMemo(() => {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const endOfToday = new Date(today); endOfToday.setHours(23, 59, 59, 999);
    return generateOccurrences(appointments, today, endOfToday, calendar).sort((a, b) => a.time.localeCompare(b.time));
  }, [appointments, calendar]);

  const adBannerElement = (
    <div className="md:col-span-2 lg:col-span-2 h-full">
        <div className="bg-[var(--background-secondary)] p-0 rounded-2xl shadow-lg border border-[var(--border-color)] overflow-hidden h-full min-h-[100px] flex items-center justify-center relative group cursor-pointer animate-fade-in-up" onClick={() => window.location.href='tel:01022163426'}>
            <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 opacity-10 group-hover:opacity-20 transition-opacity"></div>
            <div className="text-center z-10 p-6">
                <p className="text-[var(--text-accent)] font-bold text-lg mb-2 break-keep">인카금융서비스 제이어스 사업단과<br className="hidden md:block"/> 미래를 함께하실 분을 모십니다</p>
                <button className="mt-2 px-4 py-1.5 bg-[var(--background-accent)] text-white text-xs font-bold rounded-full hover:bg-[var(--background-accent-hover)] transition-colors shadow-md">연락하기</button>
            </div>
            <span className="absolute top-2 right-2 text-[10px] text-[var(--text-muted)] border border-[var(--border-color)] px-1 rounded">AD</span>
        </div>
    </div>
  );

  const youtubeWidget = (
    <div className="lg:col-span-3">
        <div className="bg-[#1a1a1a] p-8 rounded-3xl shadow-2xl border border-white/10 flex flex-col md:flex-row items-center gap-8 animate-fade-in-up relative overflow-hidden group">
            {/* Background Decoration */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-red-600/10 rounded-full blur-3xl -mr-32 -mt-32"></div>
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-amber-500/5 rounded-full blur-2xl -ml-24 -mb-24"></div>

            <div className="flex-shrink-0 relative">
                <div className="w-20 h-20 bg-gradient-to-br from-red-600 to-red-800 rounded-2xl flex items-center justify-center shadow-[0_0_20px_rgba(220,38,38,0.4)] group-hover:scale-110 transition-transform duration-500">
                    <svg className="w-10 h-10 text-white fill-current" viewBox="0 0 24 24"><path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0-3.897.266-4.356 2.62-4.385 8.816.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0 3.897-.266 4.356-2.62 4.385-8.816-.029-6.185-.484-8.549-4.385-8.816zm-10.615 12.816v-8l8 3.993-8 4.007z" /></svg>
                </div>
            </div>

            <div className="flex-grow text-center md:text-left z-10">
                <h2 className="text-2xl md:text-3xl font-black text-white tracking-tighter mb-2 italic">천만설계사 유튜브</h2>
                <p className="text-gray-400 text-sm md:text-base font-medium max-w-lg leading-relaxed">
                    상위 1% 영업 전문가들의 노하우와 인사이트를 담았습니다.<br className="hidden md:block"/> 매일 새로운 전략으로 당신의 성공을 응원합니다.
                </p>
            </div>

            <div className="flex-shrink-0 w-full md:w-auto z-10">
                <a 
                    href="https://www.youtube.com/@천만설계사" 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="flex items-center justify-center gap-3 px-8 py-4 bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-500 hover:to-rose-600 text-white rounded-2xl font-black text-lg shadow-xl hover:shadow-red-600/20 transition-all active:scale-95 group/btn"
                >
                    시청하러 가기
                    <div className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center group-hover/btn:translate-x-1 transition-transform">
                        <ChevronRightIcon className="w-4 h-4 text-white" />
                    </div>
                </a>
            </div>
        </div>
    </div>
  );

  const allMemoTags = useMemo(() => {
    const tags = new Set<string>();
    quickMemos.forEach(m => m.tags?.forEach(t => tags.add(t)));
    return Array.from(tags).sort();
  }, [quickMemos]);

  const filteredMemos = useMemo(() => {
    let result = quickMemos;
    if (memoFilterTag) {
        result = result.filter(m => m.tags?.includes(memoFilterTag));
    }
    if (memoSearchTerm.trim()) {
        const lower = memoSearchTerm.toLowerCase();
        result = result.filter(m => m.text.toLowerCase().includes(lower));
    }
    return result;
  }, [quickMemos, memoFilterTag, memoSearchTerm]);

  const paginatedMemos = useMemo(() => {
      const start = (memoPage - 1) * MEMOS_PER_PAGE;
      return filteredMemos.slice(start, start + MEMOS_PER_PAGE);
  }, [filteredMemos, memoPage]);

  const totalMemoPages = Math.ceil(filteredMemos.length / MEMOS_PER_PAGE);

  const renderBriefingSection = (title: string, items: BriefingItem[], sectionId: string) => {
    if (items.length === 0) return null;
    const isOpen = openBriefingSections.has(sectionId);
    
    const getBadge = (type: BriefingItem['type']) => {
        if (type === 'recontact_rejection') return <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-600 mr-1.5 shrink-0">거절</span>;
        if (type === 'recontact_call') return <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-600 mr-1.5 shrink-0">통화</span>;
        return null;
    };

    return (
        <div key={sectionId} className="border-b border-[var(--border-color)] last:border-b-0">
            <button onClick={() => setOpenBriefingSections(prev => {
                const next = new Set(prev);
                if (next.has(sectionId)) next.delete(sectionId); else next.add(sectionId);
                return next;
            })} className="w-full flex justify-between items-center p-2 hover:bg-[var(--background-tertiary)]">
                <h3 className="text-sm font-bold text-[var(--text-muted)]">{title} ({items.length})</h3>
                {isOpen ? <ChevronUpIcon className="h-4 w-4" /> : <ChevronDownIcon className="h-4 w-4" />}
            </button>
            {isOpen && (
                <div className="p-2 space-y-1">
                    {items.map(item => (
                        <div key={item.id} onClick={() => onSelectCustomer(item.customer)} className="p-2.5 bg-[var(--background-tertiary)] rounded flex flex-col cursor-pointer border-l-2 border-[var(--background-accent)] group hover:bg-[var(--background-primary)] transition-colors">
                            <div className="flex justify-between items-center w-full">
                                <div className="min-w-0 flex-1 flex items-center">
                                    {getBadge(item.type)}
                                    <div className="truncate">
                                        <p className="font-semibold text-sm text-[var(--text-primary)] truncate">{item.title}</p>
                                        <p className="text-xs text-[var(--text-muted)] mt-0.5">{item.subtitle}</p>
                                    </div>
                                </div>
                                <div className="text-[10px] text-[var(--text-muted)] shrink-0 ml-2">
                                    {item.setupDate && `설정: ${item.setupDate}`}
                                </div>
                            </div>
                            {item.notes && (
                                <div className="mt-1.5 p-1.5 bg-[var(--background-secondary)] rounded text-[11px] text-[var(--text-secondary)] line-clamp-2 italic border border-[var(--border-color)]/30">
                                    {item.notes}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
  };

  const widgetComponents: Record<WidgetId, React.ReactNode> = {
        todaysBriefing: (
            <div className="bg-[var(--background-secondary)] p-5 rounded-2xl shadow-lg border border-[var(--border-color)] flex flex-col animate-fade-in-up h-full">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold text-[var(--text-primary)] flex items-center"><LightBulbIcon className="h-5 w-5 mr-2 text-yellow-400"/>오늘의 브리핑</h2>
                    <button onClick={() => setIsRecontactModalOpen(true)} className="px-3 py-1 bg-[var(--background-accent-subtle)] text-[var(--text-accent)] rounded-md text-xs font-medium">관리</button>
                </div>
                <div className="flex-1 overflow-y-auto custom-scrollbar">
                    <div className="border border-[var(--border-color)] rounded-xl overflow-hidden">
                        {renderBriefingSection('기한 지남', briefingItems.overdue, 'overdue')}
                        {renderBriefingSection('오늘', briefingItems.today, 'today')}
                        {renderBriefingSection('이번 주', briefingItems.thisWeek, 'thisWeek')}
                        {renderBriefingSection('향후 일정', briefingItems.future, 'future')}
                    </div>
                </div>
            </div>
        ),
        todaysHabits: (
            <div className="bg-[var(--background-secondary)] p-5 rounded-2xl shadow-lg border border-[var(--border-color)] h-full flex flex-col animate-fade-in-up">
              <h2 className="text-xl font-bold text-[var(--text-primary)] mb-4 flex items-center"><CheckIcon className="h-5 w-5 mr-2 text-green-400"/>오늘의 습관</h2>
              <div className="flex flex-wrap gap-2">
                {habits.map(habit => {
                  const isCompleted = completedHabitsToday.has(habit.id);
                  return (
                    <button key={habit.id} onClick={() => handleToggleHabit(habit.id, isCompleted)} className={`flex items-center gap-2 px-3 py-1.5 rounded-full border-2 transition-all ${isCompleted ? 'bg-[var(--background-accent-subtle)] border-transparent ring-2 ring-[var(--background-accent)]' : 'bg-[var(--background-tertiary)] border-transparent'}`}>
                      <div className={`w-4 h-4 rounded-full flex items-center justify-center border-2 transition-colors flex-shrink-0 ${isCompleted ? 'bg-[var(--background-accent)] border-[var(--background-accent)]' : 'border-[var(--border-color-strong)]'}`}>{isCompleted && <CheckIcon className="w-2.5 h-2.5 text-white" />}</div>
                      <span className={`text-sm font-medium ${isCompleted ? 'line-through text-[var(--text-muted)]' : 'text-[var(--text-primary)]'}`}>{habit.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>
        ),
        appointments: (
            <div className="bg-[var(--background-secondary)] p-5 rounded-2xl shadow-lg border border-[var(--border-color)] flex flex-col animate-fade-in-up h-full">
                <h2 className="text-xl font-bold text-[var(--text-primary)] mb-4 flex items-center justify-between">
                    <div className="flex items-center"><CalendarIcon className="h-5 w-5 mr-2 text-blue-400"/>오늘의 일정</div>
                    <button onClick={() => onOpenAddAppointmentModal(todayStr, '09:00')} className="p-1 text-[var(--text-accent)] hover:bg-[var(--background-accent-subtle)] rounded-full"><PlusIcon className="h-5 w-5"/></button>
                </h2>
                <div className="space-y-2 flex-1 overflow-y-auto custom-scrollbar">
                    {todaysAppointments.map(app => {
                        const colorProps = getAppointmentColorClasses(app);
                        const isCompleted = app.status === 'completed';
                        return (
                            <div key={app.occurrenceId || app.id} style={colorProps.style} className={`p-3 rounded-xl flex justify-between items-center ${colorProps.className || ''} ${isCompleted ? 'opacity-60' : ''}`}>
                                <div className="cursor-pointer flex-grow truncate mr-2" onClick={() => onSelectAppointment(app)}>
                                    <p className={`font-semibold text-base truncate ${isCompleted ? 'line-through' : ''}`}>{formatTimeForCalendar(app.time)} - {app.customerName || app.title}</p>
                                    <div className="flex gap-2 text-sm opacity-80 mt-1 truncate">
                                        {app.location && <span>📍 {app.location}</span>}
                                        {app.meetingType && <span>🏷️ {app.meetingType}</span>}
                                    </div>
                                </div>
                                <div className="flex items-center gap-1">
                                    {app.status === 'scheduled' && (
                                        <button onClick={(e) => { e.stopPropagation(); onRequestAppointmentAction(app, 'completed'); }} className="px-2 py-1 text-sm bg-green-200 text-green-800 rounded-lg font-bold hover:bg-green-300">완료</button>
                                    )}
                                    <button onClick={(e) => { e.stopPropagation(); if(confirm('삭제하시겠습니까?')) onDeleteAppointment(app.id); }} className="p-1 text-[var(--text-muted)] hover:text-red-500"><TrashIcon className="h-3 w-3"/></button>
                                </div>
                            </div>
                        );
                    })}
                    {todaysAppointments.length === 0 && <p className="text-[var(--text-muted)] text-center py-4 text-sm">오늘 일정이 없습니다.</p>}
                </div>
            </div>
        ),
        todos: (
            <div className="bg-[var(--background-secondary)] p-5 rounded-2xl shadow-lg border border-[var(--border-color)] flex flex-col animate-fade-in-up h-full">
                <TodoList todos={todos} onAddTodo={onAddTodo} onToggleTodo={onToggleTodo} onDeleteTodo={onDeleteTodo} onUpdateTodo={onUpdateTodo} maxVisibleItems={5} />
            </div>
        ),
        quickMemo: (
            <div className="bg-[var(--background-secondary)] p-5 rounded-2xl shadow-lg border border-[var(--border-color)] flex flex-col animate-fade-in-up h-full">
                <h2 className="text-xl font-bold text-[var(--text-primary)] mb-4 flex items-center"><PencilIcon className="h-5 w-5 mr-2 text-purple-400"/>간편 메모</h2>
                <div className="space-y-3">
                    <textarea
                        value={newMemoText}
                        onChange={(e) => setNewMemoText(e.target.value)}
                        rows={2}
                        placeholder="빠르게 메모하세요... (#태그 사용 가능)"
                        className="w-full p-2 border rounded-xl bg-[var(--background-tertiary)] border-[var(--border-color-strong)] text-[var(--text-primary)] text-sm"
                    />
                    <div className="flex justify-between items-center">
                        <div className="flex gap-2">
                            {(Object.keys(memoColors) as MemoColor[]).map(c => (
                                <button
                                    key={c}
                                    onClick={() => setNewMemoColor(c)}
                                    className={`w-6 h-6 rounded-full border-2 transition-transform hover:scale-110 ${memoColors[c].dot} ${newMemoColor === c ? 'ring-2 ring-offset-2 ring-purple-500' : 'border-transparent'}`}
                                />
                            ))}
                        </div>
                        <button onClick={() => { if(newMemoText.trim()) { onAddQuickMemo(newMemoText.trim(), newMemoColor).then(() => { setNewMemoText(''); setMemoPage(1); }); } }} className="px-4 py-1.5 bg-[var(--background-accent)] text-white rounded-lg text-xs font-bold">추가</button>
                    </div>
                </div>

                <div className="relative mt-4">
                    <input 
                        type="text" 
                        value={memoSearchTerm}
                        onChange={(e) => { setMemoSearchTerm(e.target.value); setMemoPage(1); }}
                        placeholder="메모 검색..." 
                        className="w-full pl-9 pr-3 py-2 border border-[var(--border-color-strong)] rounded-xl bg-[var(--background-tertiary)] text-[var(--text-primary)] text-sm focus:ring-1 focus:ring-purple-500 outline-none"
                    />
                    <SearchIcon className="absolute left-2.5 top-2.5 h-4 w-4 text-[var(--text-muted)]" />
                </div>

                {allMemoTags.length > 0 && (
                    <div className="flex gap-2 overflow-x-auto custom-scrollbar py-2 mt-1">
                        <button onClick={() => { setMemoFilterTag(null); setMemoPage(1); }} className={`px-2 py-1 text-xs rounded-full border whitespace-nowrap ${!memoFilterTag ? 'bg-purple-500 text-white border-transparent' : 'bg-[var(--background-tertiary)] text-[var(--text-secondary)] border-[var(--border-color)]'}`}>전체</button>
                        {allMemoTags.map(tag => (
                            <button key={tag} onClick={() => { setMemoFilterTag(memoFilterTag === tag ? null : tag); setMemoPage(1); }} className={`px-2 py-1 text-xs rounded-full border whitespace-nowrap ${memoFilterTag === tag ? 'bg-purple-500 text-white border-transparent' : 'bg-[var(--background-tertiary)] text-[var(--text-secondary)] border-[var(--border-color)]'}`}>#{tag}</button>
                        ))}
                    </div>
                )}

                <div className="flex-1 overflow-y-auto custom-scrollbar mt-3 space-y-2">
                    {paginatedMemos.map(memo => (
                        <div key={memo.id} className={`p-3 rounded-xl border group relative animate-fade-in ${memoColors[memo.color as MemoColor]?.bg || memoColors.default.bg} ${memoColors[memo.color as MemoColor]?.border || memoColors.default.border}`}>
                            <p className="text-sm text-[var(--text-primary)] whitespace-pre-wrap pr-6">{memo.text}</p>
                            {memo.tags && memo.tags.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-2">
                                    {memo.tags.map(tag => (
                                        <span key={tag} className="text-xs px-1.5 py-0.5 bg-black/5 text-[var(--text-muted)] rounded-md">#{tag}</span>
                                    ))}
                                </div>
                            )}
                            <button onClick={() => onDeleteQuickMemo(memo.id)} className="absolute top-2 right-2 p-1 text-[var(--text-muted)] hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                                <TrashIcon className="w-3 h-3" />
                            </button>
                        </div>
                    ))}
                    {filteredMemos.length === 0 && <p className="text-center text-[var(--text-muted)] py-4 text-sm">검색 결과가 없습니다.</p>}
                </div>

                {totalMemoPages > 1 && (
                    <div className="flex items-center justify-center gap-4 mt-3 pt-2 border-t border-[var(--border-color)]">
                        <button 
                            disabled={memoPage === 1} 
                            onClick={() => setMemoPage(p => p - 1)} 
                            className="p-1 disabled:opacity-30 text-[var(--text-muted)] hover:text-purple-500"
                        >
                            <ChevronLeftIcon className="h-5 w-5" />
                        </button>
                        <span className="text-sm font-medium">{memoPage} / {totalMemoPages}</span>
                        <button 
                            disabled={memoPage === totalMemoPages} 
                            onClick={() => setMemoPage(p => p + 1)} 
                            className="p-1 disabled:opacity-30 text-[var(--text-muted)] hover:text-purple-500"
                        >
                            <ChevronRightIcon className="h-5 w-5" />
                        </button>
                    </div>
                )}
            </div>
        ),
        goals: <div className="h-full"><GoalsTracker goals={goals} onAddGoal={onAddGoal} onUpdateGoal={onUpdateGoal} onDeleteGoal={onDeleteGoal} /></div>,
        predictions: (
            <div className="bg-[var(--background-secondary)] p-5 rounded-2xl shadow-lg border border-[var(--border-color)] flex flex-col animate-fade-in-up h-full">
                <h2 className="text-xl font-bold text-[var(--text-primary)] mb-4 flex items-center"><SparklesIcon className="h-5 w-5 mr-2 text-amber-400"/>실적 예측</h2>
                <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2">
                    {predictions.map(p => (
                        <div key={p.id} className="p-2.5 bg-[var(--background-tertiary)] border-l-4 border-amber-400 rounded-xl flex justify-between items-center text-sm">
                            <span className="font-semibold">{p.customerName}</span>
                            <span className="text-[var(--text-accent)] font-bold">{p.recognizedPerformance.toLocaleString()}원</span>
                        </div>
                    ))}
                    {predictions.length === 0 && <p className="text-center py-8 text-[var(--text-muted)] text-sm">이번 달 실적 예측이 없습니다.</p>}
                </div>
            </div>
        ),
        calendarWeek: <div />, 
        activitySummary: <div />, 
        monthlyPerformance: <div />,
  };

  return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-[var(--text-primary)]">🏠 홈</h1>
                <button onClick={() => setIsSettingsModalOpen(true)} className="p-2 text-[var(--text-muted)] hover:text-[var(--text-primary)]"><DragHandleIcon className="h-5 w-5" /></button>
            </div>
            <div className="flex border-b border-[var(--border-color)] mb-6">
                <button onClick={() => setActiveTab('summary')} className={`px-4 py-2 text-sm font-medium ${activeTab === 'summary' ? 'text-[var(--text-accent)] border-b-2 border-[var(--background-accent)]' : 'text-[var(--text-muted)]'}`}>요약</button>
                 <button onClick={() => setActiveTab('activity')} className={`px-4 py-2 text-sm font-medium ${activeTab === 'activity' ? 'text-[var(--text-accent)] border-b-2 border-[var(--background-accent)]' : 'text-[var(--text-muted)]'}`}>활동 관리</button>
                <button onClick={() => setActiveTab('habits')} className={`px-4 py-2 text-sm font-medium ${activeTab === 'habits' ? 'text-[var(--text-accent)] border-b-2 border-[var(--background-accent)]' : 'text-[var(--text-muted)]'}`}>습관 관리</button>
            </div>
            {activeTab === 'summary' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {layout.filter(w => w.visible).map(w => (
                        <React.Fragment key={w.id}>
                            {w.id === 'quickMemo' && adBannerElement}
                            <div className="h-full">
                                {widgetComponents[w.id]}
                            </div>
                        </React.Fragment>
                    ))}
                    {/* 유튜브 위젯을 항상 마지막에 고정적으로 렌더링 */}
                    {youtubeWidget}
                </div>
            )}
            
            {activeTab === 'activity' && (
                <PerformanceManagement
                    showOnlyKanban={true}
                    records={performanceRecords}
                    onAdd={onAddPerformanceRecord}
                    onUpdate={onUpdatePerformanceRecord}
                    onDelete={onDeletePerformanceRecord}
                    predictions={predictions}
                    onAddPrediction={onAddPrediction}
                    onUpdatePrediction={onUpdatePrediction}
                    onDeletePrediction={onDeletePrediction}
                    customers={customers}
                    goals={goals}
                    onAddGoal={onAddGoal}
                    onUpdateGoal={onUpdateGoal}
                    onDeleteGoal={onDeleteGoal}
                    appointments={appointments}
                    onAddAppointment={onAddAppointment}
                    onUpdateAppointment={onUpdateAppointment}
                    onUpdateCustomer={onUpdateCustomer}
                    onEditAppointment={onEditAppointment}
                    onRequestAction={onRequestAction}
                    onRequestAppointmentAction={onRequestAppointmentAction}
                    updateCustomerTags={updateCustomerTags}
                    onSelectCustomer={onSelectCustomer}
                    onSetOnAppointmentAddSuccess={onSetOnAppointmentAddSuccess}
                    onOpenRejectionModal={onOpenRejectionModal}
                    onOpenConsultationRecordModal={onOpenConsultationRecordModal}
                />
            )}
            
            {activeTab === 'habits' && (
                <HabitTracker habits={habits} habitLogs={habitLogs} onAddHabit={onAddHabit} onUpdateHabit={onUpdateHabit} onDeleteHabit={onDeleteHabit} onLogHabit={onLogHabit} />
            )}

            {isSettingsModalOpen && (
                <BaseModal isOpen={isSettingsModalOpen} onClose={() => setIsSettingsModalOpen(false)} className="max-w-md w-full">
                    <div className="p-4 border-b border-[var(--border-color)]"><h2 className="text-xl font-bold">대시보드 편집</h2></div>
                    <div className="p-4 max-h-96 overflow-y-auto custom-scrollbar">
                        <p className="text-xs text-[var(--text-muted)] mb-3">* 광고 배너와 유튜브 채널 카드는 고정 항목입니다.</p>
                        <ul className="space-y-2">
                            {layout.map((w, idx) => (
                                <li key={w.id} draggable onDragStart={e => handleDragStart(e, idx)} onDragOver={handleDragOver} onDrop={() => handleDrop(idx)} className="flex items-center justify-between p-3 bg-[var(--background-tertiary)] rounded-xl border border-[var(--border-color-strong)]">
                                    <div className="flex items-center">
                                        <DragHandleIcon className="h-5 w-5 mr-3 cursor-grab text-[var(--text-muted)]"/>
                                        <span className="text-sm font-medium">{WIDGET_METADATA[w.id].name}</span>
                                    </div>
                                    <button onClick={() => setLayout(layout.map((item, i) => i === idx ? { ...item, visible: !item.visible } : item))}>
                                        {w.visible ? <EyeIcon className="w-5 h-5 text-[var(--text-accent)]"/> : <EyeOffIcon className="h-5 w-5 text-[var(--text-muted)]"/>}
                                    </button>
                                </li>
                            ))}
                        </ul>
                    </div>
                    <div className="p-4 bg-[var(--background-primary)] border-t border-[var(--border-color)]"><button onClick={() => setIsSettingsModalOpen(false)} className="w-full px-4 py-2 bg-[var(--background-accent)] text-white rounded-lg font-bold">완료</button></div>
                </BaseModal>
            )}

            {isRecontactModalOpen && (
                <RecontactModal 
                    isOpen={isRecontactModalOpen}
                    onClose={() => setIsRecontactModalOpen(false)}
                    customers={customers}
                    onUpdateCustomer={onUpdateCustomer}
                    onClearMultipleFollowUpDates={onClearMultipleFollowUpDates}
                    onOpenAddReminder={onOpenAddReminderModal}
                />
            )}
        </div>
    );
};

export default Dashboard;
