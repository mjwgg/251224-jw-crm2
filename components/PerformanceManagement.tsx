
import React, { useState, useMemo, useCallback, useEffect } from 'react';
import type { PerformanceRecord, PerformancePrediction, Customer, Goal, Appointment, Contract, RejectionReason, RecontactProbability, CustomerType, MeetingType } from '../types';
import { PlusIcon, TrashIcon, PencilIcon, UsersIcon, CalendarIcon, CheckIcon, SearchIcon, ClipboardIcon, MessageIcon, XIcon, CycleIcon, ChevronUpIcon, ChevronDownIcon, ArchiveBoxIcon, PhoneIcon, LocationMarkerIcon, BriefcaseIcon, DocumentTextIcon, SparklesIcon, InfoIcon, ChevronLeftIcon, ChevronRightIcon, ViewColumnsIcon, ViewRowsIcon, ListBulletIcon } from './icons';
import AddPerformanceRecordModal from './AddPerformanceRecordModal';
import AddPerformancePredictionModal from './AddPerformancePredictionModal';
import BaseModal from './ui/BaseModal';
import AddInterestedProspectModal from './AddInterestedProspectModal';
import PerformanceAnalysis from './PerformanceAnalysis';

const GOAL_DEFINITIONS: { [key: string]: { unit: string; categories: Goal['category'][] } } = {
  '월간 인정 실적': { unit: '원', categories: ['monthly'] },
  '월간 보험료': { unit: '원', categories: ['monthly', 'weekly'] },
  '신규 계약 건수': { unit: '건', categories: ['monthly', 'weekly'] },
  '신규 고객 확보': { unit: '명', categories: ['monthly'] },
  '주간 TA 시도': { unit: '콜', categories: ['weekly'] },
  '주간 AP 횟수': { unit: '건', categories: ['weekly'] },
  '주간 PC 횟수': { unit: '건', categories: ['weekly'] },
  '일간 TA 시도': { unit: '콜', categories: ['daily'] },
};


interface GoalAchievementDashboardProps {
  goalProgress: any[];
  goals: Goal[];
  onAddGoal: (goal: Omit<Goal, 'id'>) => Promise<void>;
  onUpdateGoal: (goal: Goal) => Promise<void>;
  onDeleteGoal: (goalId: string) => Promise<void>;
}


const GoalAchievementDashboard: React.FC<GoalAchievementDashboardProps> = ({ goalProgress, goals, onAddGoal, onUpdateGoal, onDeleteGoal }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedGoals, setEditedGoals] = useState<Goal[]>(goals);

  useEffect(() => {
    if (!isEditing) {
        setEditedGoals(goals);
    }
  }, [goals, isEditing]);

  const goalsByCategory = useMemo(() => {
    const data = isEditing ? editedGoals : goalProgress;
    const grouped: { [key in Goal['category']]?: any[] } = {};
    data.forEach(goal => {
        if (!grouped[goal.category]) {
            grouped[goal.category] = [];
        }
        grouped[goal.category]!.push(goal);
    });
    return grouped;
  }, [isEditing, editedGoals, goalProgress]);
  
    const handleInputChange = (id: string, field: keyof Omit<Goal, 'id'>, value: string | number) => {
        setEditedGoals(prev => prev.map(g => g.id === id ? { ...g, [field]: value } : g));
    };

    const handleLabelChange = (id: string, newLabel: string) => {
      const { unit } = GOAL_DEFINITIONS[newLabel];
      setEditedGoals(prev => prev.map(g => (g.id === id ? { ...g, label: newLabel, unit } : g)));
    };

    const handleAddNewGoal = (category: Goal['category']) => {
        const existingLabels = new Set(editedGoals.filter(g => g.category === category).map(g => g.label));
        const availableLabels = Object.keys(GOAL_DEFINITIONS).filter(
            label => GOAL_DEFINITIONS[label].categories.includes(category) && !existingLabels.has(label)
        );

        if (availableLabels.length > 0) {
            const label = availableLabels[0];
            const { unit } = GOAL_DEFINITIONS[label];
            const newGoal: Goal = {
                id: `new-${Date.now()}`,
                category,
                label,
                target: 0,
                unit,
            };
            setEditedGoals(prev => [...prev, newGoal]);
        } else {
            alert(`${category === 'monthly' ? '월간' : (category === 'weekly' ? '주간' : '일간')} 목표로 추가할 수 있는 항목이 더 이상 없습니다.`);
        }
    };
    
    const handleDeleteGoal = (id: string) => {
         setEditedGoals(prev => prev.filter(g => g.id !== id));
    };

    const handleSaveClick = async () => {
      const originalGoalIds = new Set(goals.map(g => g.id));
      const currentEditedGoalIds = new Set(editedGoals.map(g => g.id));
      
      const promises: Promise<any>[] = [];

      for (const goal of editedGoals) {
        if (goal.label.trim() === '' || !goal.target) continue;

        if (goal.id.startsWith('new-')) {
          const { id, ...newGoalData } = goal;
          promises.push(onAddGoal(newGoalData));
        } else {
          const originalGoal = goals.find(g => g.id === goal.id);
          if (JSON.stringify(originalGoal) !== JSON.stringify(goal)) {
            promises.push(onUpdateGoal(goal));
          }
        }
      }

      for (const originalId of originalGoalIds) {
        if (!currentEditedGoalIds.has(originalId)) {
          promises.push(onDeleteGoal(originalId));
        }
      }
      
      await Promise.all(promises);
      setIsEditing(false);
    };

    const handleCancelClick = () => {
        setEditedGoals(goals);
        setIsEditing(false);
    };

  const renderGoal = (goal: any) => {
    if (isEditing) {
        const availableLabels = Object.keys(GOAL_DEFINITIONS).filter(
            label => GOAL_DEFINITIONS[label].categories.includes(goal.category) && !editedGoals.some(g => g.category === goal.category && g.label === label && g.id !== goal.id)
        );

      return (
        <div key={goal.id} className="flex flex-col gap-2 py-2">
            <div className="flex items-center gap-2">
                <select
                    value={goal.label}
                    onChange={(e) => handleLabelChange(goal.id, e.target.value)}
                    className="flex-grow p-1 text-sm border-b border-[var(--border-color-strong)] focus:outline-none focus:ring-0 focus:border-[var(--background-accent)] bg-transparent text-[var(--text-primary)]"
                >
                    <option value={goal.label}>{goal.label}</option>
                    {availableLabels.map(label => (
                    <option key={label} value={label}>{label}</option>
                    ))}
                </select>
                <button onClick={() => handleDeleteGoal(goal.id)} className="p-1 text-[var(--text-muted)] hover:text-[var(--text-danger)]" aria-label="Delete goal">
                    <TrashIcon className="h-4 w-4" />
                </button>
            </div>
            <div className="flex items-center gap-2">
                <input
                    type="number"
                    value={goal.target}
                    onChange={(e) => handleInputChange(goal.id, 'target', Number(e.target.value) || 0)}
                    className="w-full text-right p-1 text-sm border-b border-[var(--border-color-strong)] focus:outline-none focus:ring-0 focus:border-[var(--background-accent)] bg-transparent text-[var(--text-primary)]"
                />
                <span className="w-12 p-1 text-sm text-[var(--text-primary)]">{goal.unit}</span>
            </div>
        </div>
      );
    }

    return (
      <div key={goal.id}>
        <div className="flex justify-between items-baseline text-sm mb-1">
          <span className="text-[var(--text-secondary)] truncate pr-2">{goal.label}</span>
          <span className="font-semibold text-[var(--text-primary)] flex-shrink-0">
            {(goal.current ?? 0).toLocaleString()}<span className="text-xs text-[var(--text-muted)]">{goal.unit}</span> / {(goal.target ?? 0).toLocaleString()}<span className="text-xs text-[var(--text-muted)]">{goal.unit}</span>
          </span>
        </div>
        <div className="w-full bg-[var(--background-tertiary)] rounded-full h-2.5" title={`${(goal.percentage ?? 0).toFixed(1)}%`}>
          <div 
            className="bg-[var(--background-accent)] h-2.5 rounded-full transition-transform duration-500" 
            style={{ width: `${Math.min(goal.percentage || 0, 100)}%` }}
          ></div>
        </div>
      </div>
    );
  };

  return (
    <div className="mb-8">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold text-[var(--text-primary)]">🎯 목표 달성 현황</h2>
        {isEditing ? (
            <div className="flex items-center gap-2">
                <button onClick={handleCancelClick} className="flex items-center px-3 py-1 bg-[var(--background-tertiary)] text-[var(--text-secondary)] rounded-md text-sm font-medium hover:bg-[var(--background-primary)]">
                    취소
                </button>
                <button onClick={handleSaveClick} className="flex items-center px-3 py-1 bg-[var(--background-success)] text-white rounded-md text-sm font-medium hover:bg-[var(--background-success-hover)]">
                    <CheckIcon className="h-4 w-4 mr-1" /> 저장
                </button>
            </div>
        ) : (
            <button onClick={() => setIsEditing(true)} className="flex items-center px-3 py-1 bg-[var(--background-tertiary)] text-[var(--text-accent)] rounded-md text-sm font-medium hover:bg-[var(--background-primary)]">
                <PencilIcon className="h-4 w-4 mr-1" /> 수정
            </button>
        )}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {(['monthly', 'weekly', 'daily'] as const).map(category => {
            const existingLabels = new Set((goalsByCategory[category] || []).map(g => g.label));
            const availableLabelsForCategory = Object.keys(GOAL_DEFINITIONS).filter(
                label => GOAL_DEFINITIONS[label].categories.includes(category) && !existingLabels.has(label)
            );

            return (
                <div className="space-y-1" key={category}>
                    <h3 className="font-bold text-[var(--text-primary)] border-b border-[var(--border-color)] pb-2 mb-2">
                        { { monthly: '월간 목표', weekly: '주간 목표', daily: '일일 목표' }[category] }
                    </h3>
                    {(goalsByCategory[category] || []).length > 0 ? (
                        (goalsByCategory[category] || []).map(renderGoal)
                    ) : (
                        !isEditing && <p className="text-sm text-center text-[var(--text-muted)] py-4">설정된 목표가 없습니다.</p>
                    )}
                       {isEditing && (
                        <button onClick={() => handleAddNewGoal(category)} className="w-full mt-2 flex items-center justify-center gap-1 text-sm text-[var(--text-accent)] hover:text-[var(--text-accent)]/80 p-2 rounded-md bg-[var(--background-accent-subtle)] hover:bg-opacity-70">
                            <PlusIcon className="h-4 w-4"/> 목표 추가
                        </button>
                       )}
                </div>
            );
        })}
      </div>
    </div>
  );
};


interface InterestedCustomerActionModalProps {
  isOpen: boolean;
  onClose: () => void;
  customer: Customer | null;
  onSchedule: (meetingType: 'AP' | 'PC') => void;
}

const InterestedCustomerActionModal: React.FC<InterestedCustomerActionModalProps> = ({ isOpen, onClose, customer, onSchedule }) => {
  if (!isOpen || !customer) return null;

  return (
    <BaseModal isOpen={isOpen} onClose={onClose} className="max-w-md w-full">
      <div className="p-6 text-center">
        <h3 className="text-xl font-semibold text-[var(--text-primary)]">다음 단계 선택</h3>
        <p className="mt-2 text-[var(--text-secondary)]">
          <strong>{customer.name}</strong>님과의 다음 활동을 선택해주세요.
        </p>
        <div className="mt-6 space-y-3">
          <button
            onClick={() => onSchedule('AP')}
            className="w-full py-3 px-4 bg-cyan-500 text-white rounded-lg font-semibold hover:bg-cyan-600 flex items-center justify-center gap-2"
          >
            <ClipboardIcon className="h-5 w-5"/>
            미팅예정 (AP)
          </button>
          <button
            onClick={() => onSchedule('PC')}
            className="w-full py-3 px-4 bg-purple-500 text-white rounded-lg font-semibold hover:bg-purple-600 flex items-center justify-center gap-2"
          >
            <CalendarIcon className="h-5 w-5"/>
            제안/설계 (PC)
          </button>
        </div>
      </div>
      <div className="p-4 bg-[var(--background-tertiary)] flex justify-center">
        <button onClick={onClose} className="py-2 px-4 bg-[var(--background-secondary)] text-[var(--text-secondary)] rounded-lg font-semibold hover:bg-[var(--background-primary)]">
          취소
        </button>
      </div>
    </BaseModal>
  );
};

interface EditRejectionInfoModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (customer: Customer) => void;
    customer: Customer | null;
}

const EditRejectionInfoModal: React.FC<EditRejectionInfoModalProps> = ({ isOpen, onClose, onSave, customer }) => {
    const [reason, setReason] = useState<RejectionReason>('기타');
    const [probability, setProbability] = useState<RecontactProbability>('하');
    const [notes, setNotes] = useState('');
    const [recontactDate, setRecontactDate] = useState('');

    useEffect(() => {
        if (customer) {
            setReason(customer.rejectionReason || '기타');
            setProbability(customer.recontactProbability || '하');
            setNotes(customer.rejectionNotes || '');
            setRecontactDate(customer.nextFollowUpDate || '');
        }
    }, [customer]);

    if (!isOpen || !customer) return null;

    const handleSave = () => {
        const updatedCustomer: Customer = {
            ...customer,
            rejectionReason: reason,
            recontactProbability: probability,
            rejectionNotes: notes,
            nextFollowUpDate: recontactDate || undefined,
        };
        onSave(updatedCustomer);
        onClose();
    };
    
    const handleArchive = () => {
        const archivedCustomer: Customer = {
            ...customer,
            status: 'archived',
        };
        onSave(archivedCustomer);
        onClose();
    }
    
    const rejectionReasons: RejectionReason[] = ['가격', '상품', '시기', '다른설계사', '가족', '기타'];
    const recontactProbabilities: RecontactProbability[] = ['상', '중', '하'];

    return (
        <BaseModal isOpen={isOpen} onClose={onClose} className="max-w-lg w-full">
            <div className="p-6 border-b border-[var(--border-color)] flex-shrink-0">
                <h2 className="text-2xl font-bold text-[var(--text-primary)]">{customer.name}님 거절 정보 수정</h2>
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
                    <label className="block text-sm font-medium text-[var(--text-secondary)]">다음 재접촉일</label>
                    <input type="date" value={recontactDate} onChange={(e) => setRecontactDate(e.target.value)} className="mt-1 block w-full bg-[var(--background-secondary)] border border-[var(--border-color-strong)] rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-[var(--background-accent)] focus:border-[var(--background-accent)]" />
                </div>
                <div>
                    <label className="block text-sm font-medium text-[var(--text-secondary)]">상세 내용</label>
                    <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={4} className="mt-1 block w-full bg-[var(--background-secondary)] border border-[var(--border-color-strong)] rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-[var(--background-accent)] focus:border-[var(--background-accent)]" />
                </div>
            </div>
            <div className="p-6 bg-[var(--background-tertiary)] border-t border-[var(--border-color)] flex justify-between items-center flex-shrink-0">
                <button onClick={handleArchive} className="flex items-center gap-2 px-4 py-2 bg-[var(--background-danger)] text-white rounded-md text-sm font-medium hover:bg-[var(--background-danger-hover)]">
                    <ArchiveBoxIcon className="h-5 w-5"/>
                    목록에서 숨기기
                </button>
                <div className="flex gap-2">
                    <button onClick={onClose} className="px-4 py-2 bg-[var(--background-secondary)] border border-[var(--border-color-strong)] rounded-md text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--background-primary)]">취소</button>
                    <button onClick={handleSave} className="px-6 py-2 bg-[var(--background-accent)] text-[var(--text-on-accent)] rounded-md text-sm font-medium hover:bg-[var(--background-accent-hover)]">저장</button>
                </div>
            </div>
        </BaseModal>
    );
};

interface ToastData {
  message: string;
  confirmLabel?: string;
  secondaryConfirmLabel?: string;
  onConfirm: (isButtonClick: boolean) => void;
  onSecondaryConfirm?: () => void;
  onUndo?: () => void;
}

interface PerformanceManagementProps {
  customers: Customer[];
  records: PerformanceRecord[];
  onAdd: (record: (Omit<PerformanceRecord, 'id'> & { customerType?: CustomerType; }) | (Omit<PerformanceRecord, 'id'> & { customerType?: CustomerType; })[]) => Promise<void>;
  onUpdate: (record: PerformanceRecord) => Promise<void>;
  onDelete: (recordId: string) => Promise<void>;
  predictions: PerformancePrediction[];
  onAddPrediction: (prediction: Omit<PerformancePrediction, 'id'>) => Promise<void>;
  onUpdatePrediction: (prediction: PerformancePrediction) => Promise<void>;
  onDeletePrediction: (predictionId: string) => Promise<void>;
  goals: Goal[];
  onAddGoal: (goal: Omit<Goal, 'id'>) => Promise<void>;
  onUpdateGoal: (goal: Goal) => Promise<void>;
  onDeleteGoal: (goalId: string) => Promise<void>;
  appointments: Appointment[];
  onAddAppointment: (appointment: Omit<Appointment, 'id' | 'status'>) => Promise<void>;
  onUpdateAppointment: (appointment: Appointment, consultationData?: any, recurrence?: any) => Promise<void>;
  onUpdateCustomer: (customer: Customer) => Promise<void>;
  onEditAppointment: (appointment: Appointment) => void;
  onRequestAction: (toastData: ToastData) => void;
  onRequestAppointmentAction: (appointment: Appointment, actionType: 'completed' | 'postponed' | 'cancelled') => void;
  updateCustomerTags: (customerIds: string[], tagsToAdd: string[], tagsToRemove: string[]) => Promise<void>;
  onSelectCustomer: (customer: Customer, initialTab?: 'details' | 'consultations' | 'contracts' | 'callHistory') => void;
  onSetOnAppointmentAddSuccess: (callback: (() => void) | null) => void;
  showOnlyKanban?: boolean;
  onOpenRejectionModal: (customer: Customer) => void;
  onOpenConsultationRecordModal: (customerId: string, customerName: string, date: string, meetingType: MeetingType) => void;
}

interface KanbanCardProps {
    title: React.ReactNode;
    subtitle?: string;
    details: { icon: React.ReactNode; text: React.ReactNode }[];
    draggable: boolean;
    onDragStart: React.DragEventHandler<HTMLDivElement>;
    onClick: () => void;
    actions?: React.ReactNode;
}

const calculateAge = (birthday: string): number | string => {
    if (!birthday) return '미입력';
    try {
        const birthDate = new Date(birthday);
        if (isNaN(birthDate.getTime())) return '미입력';
        const today = new Date();
        let age = today.getFullYear() - birthDate.getFullYear();
        const m = today.getMonth() - birthDate.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
            age--;
        }
        return age >= 0 ? age : '미입력';
    } catch {
        return '미입력';
    }
};

const formatActivityTimeKR = (timeStr: string): string => {
    if (!timeStr) return '';
    const [hourStr, minuteStr] = timeStr.split(':');
    const hour = parseInt(hourStr, 10);
    const minute = parseInt(minuteStr, 10);
    if (minute === 30) return `${hour}시 반`;
    if (minute === 0) return `${hour}시`;
    return `${hour}시 ${minute}분`;
};

const KanbanCard: React.FC<KanbanCardProps> = ({ title, subtitle, details, draggable, onDragStart, onClick, actions }) => (
    <div 
      className={`p-3 bg-[var(--background-tertiary)] rounded-xl shadow-sm border border-[var(--border-color-strong)] ${draggable ? 'cursor-grab' : ''}`}
      draggable={draggable}
      onDragStart={onDragStart}
    >
      <div className="cursor-pointer" onClick={onClick}>
        <div className="font-bold text-sm text-[var(--text-primary)] truncate flex items-center gap-2" title={typeof title === 'string' ? title : undefined}>
          {title}
        </div>
        {subtitle && <p className="text-xs text-[var(--text-muted)] truncate mt-0.5" title={subtitle}>{subtitle}</p>}
        <div className="mt-2 space-y-1">
          {details.map((detail, index) => (
              <div key={index} className="flex items-center text-xs text-[var(--text-secondary)]">
                  <span className="flex-shrink-0 mr-1.5">{detail.icon}</span>
                  <div className="truncate">{detail.text}</div>
              </div>
          ))}
        </div>
      </div>
      {actions && (
        <div className="mt-2 pt-2 border-t border-[var(--border-color)] flex items-center justify-end gap-1">
          {actions}
        </div>
      )}
    </div>
);

type ContractSortKeys = keyof (Contract & { customerName: string });

interface ContractListProps {
    contracts: (Contract & { customerName: string; customerId: string })[];
    onSelectCustomer: (customerId: string) => void;
    sortConfig: { key: ContractSortKeys; direction: string } | null;
    requestSort: (key: ContractSortKeys) => void;
}

const ContractList: React.FC<ContractListProps> = ({ contracts, onSelectCustomer, sortConfig, requestSort }) => {
    const SortableHeader: React.FC<{ sortKey: ContractSortKeys; label: string; className?: string }> = ({ sortKey, label, className = '' }) => (
        <th scope="col" className={`px-2 md:px-4 py-3 text-left text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider whitespace-nowrap ${className}`}>
            <button className="flex items-center" onClick={() => requestSort(sortKey)}>
                {label}
                {sortConfig?.key === sortKey ? (
                    sortConfig.direction === 'ascending' ? <ChevronUpIcon className="h-4 w-4 ml-1" /> : <ChevronDownIcon className="h-4 w-4 ml-1" />
                ) : (
                    <div className="h-4 w-4 ml-1 opacity-30 group-hover:opacity-100"><ChevronUpIcon className="h-4 w-4"/></div> 
                )}
            </button>
        </th>
    );

    return (
        <div className="rounded-xl overflow-hidden border border-[var(--border-color)]">
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-[var(--border-color)]">
                    <thead className="bg-[var(--background-tertiary)] group">
                        <tr>
                            <SortableHeader sortKey="customerName" label="계약자" />
                            <SortableHeader sortKey="contractDate" label="계약일" />
                            <SortableHeader sortKey="productName" label="상품명" />
                            <SortableHeader sortKey="monthlyPremium" label="월 보험료" className="text-right" />
                        </tr>
                    </thead>
                    <tbody className="bg-[var(--background-secondary)] divide-y divide-[var(--border-color)]">
                        {contracts.length > 0 ? (
                            contracts.map(contract => (
                                <tr key={contract.id} className="hover:bg-[var(--background-tertiary)]">
                                    <td className="px-2 md:px-4 py-4 whitespace-nowrap text-sm font-medium text-[var(--text-primary)]">
                                        <button onClick={() => onSelectCustomer(contract.customerId)} className="hover:underline">{contract.customerName}</button>
                                    </td>
                                    <td className="px-2 md:px-4 py-4 whitespace-nowrap text-sm text-[var(--text-secondary)]">{contract.contractDate}</td>
                                    <td className="px-2 md:px-4 py-4 whitespace-nowrap text-sm text-[var(--text-secondary)]">{contract.productName}</td>
                                    <td className="px-2 md:px-4 py-4 whitespace-nowrap text-sm text-[var(--text-secondary)] text-right">{contract.monthlyPremium.toLocaleString()}원</td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan={4} className="px-6 py-12 text-center text-[var(--text-muted)]">계약 정보가 없습니다.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};


export const PerformanceManagement: React.FC<PerformanceManagementProps> = ({ 
  customers,
  records, onAdd, onUpdate, onDelete,
  predictions, onAddPrediction, onUpdatePrediction, onDeletePrediction,
  goals, onAddGoal, onUpdateGoal, onDeleteGoal,
  appointments,
  onAddAppointment,
  onUpdateAppointment,
  onUpdateCustomer,
  onEditAppointment,
  onRequestAction,
  onRequestAppointmentAction,
  updateCustomerTags,
  onSelectCustomer,
  onSetOnAppointmentAddSuccess,
  showOnlyKanban = false,
  onOpenRejectionModal,
  onOpenConsultationRecordModal,
}) => {
  const [activeTab, setActiveTab] = useState(showOnlyKanban ? 'kanban' : 'status');
  const [kanbanViewMode, setKanbanViewMode] = useState<'board' | 'list'>('board');
  const [currentDate, setCurrentDate] = useState(new Date());
  
  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<PerformanceRecord | null>(null);
  const [isRecordAiMode, setIsRecordAiMode] = useState(false);

  const [isPredictionModalOpen, setIsPredictionModalOpen] = useState(false);
  const [editingPrediction, setEditingPrediction] = useState<PerformancePrediction | null>(null);
  const [isPredictionAiMode, setIsPredictionAiMode] = useState(false);

  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  const [draggedItem, setDraggedItem] = useState<{ item: any; sourceType: string } | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);
  const [interestedCustomerActionModalState, setInterestedCustomerActionModalState] = useState<{ isOpen: boolean; customer: Customer | null }>({ isOpen: false, customer: null });
  const [sourceAppointmentForRecord, setSourceAppointmentForRecord] = useState<Appointment | null>(null);
  
  const [isAddInterestedModalOpen, setIsAddInterestedModalOpen] = useState(false);
  
  // 펼침 상태 관리
  const [expandedStages, setExpandedStages] = useState<Record<string, boolean>>({
    interested: false,
    ap: false,
    pc: false,
    won: false,
    rejected: false,
  });

  const [contractFilters, setContractFilters] = useState({
    customerName: '',
    insuranceCompany: '',
    productName: '',
    dateStart: '',
    dateEnd: '',
  });

  const [contractSortConfig, setContractSortConfig] = useState<{
    key: ContractSortKeys;
    direction: 'ascending' | 'descending';
  } | null>({ key: 'contractDate', direction: 'descending' });

  const [editingRejectedCustomer, setEditingRejectedCustomer] = useState<Customer | null>(null);
  const [isEditRejectionModalOpen, setIsEditRejectionModalOpen] = useState(false);

    const handleDragStart = (item: any, sourceType: string) => {
        setDraggedItem({ item, sourceType });
    };

    const handleDragOver = (e: React.DragEvent<HTMLDivElement>, targetType: string) => {
        e.preventDefault();
        setDragOverColumn(targetType);
    };
    
    const handleDragLeave = () => {
        setDragOverColumn(null);
    };
  
    const handleStageMove = useCallback((item: any, sourceStage: string, targetStage: string) => {
        const appointment = item as Appointment;
        const customer = customers.find(c => c.id === appointment.customerId);

        if (targetStage === 'rejectedCustomers' && (sourceStage === 'apAppointments' || sourceStage === 'pcAppointments')) {
            if (!customer) return;

            const updatedAppointment = { ...appointment, status: 'completed' as const };
            onUpdateAppointment(updatedAppointment);
            
            const tagsBefore = [...customer.tags];
            const newTags = Array.from(new Set([...customer.tags, '거절고객']));
            const updatedCustomer = { ...customer, tags: newTags };
            onUpdateCustomer(updatedCustomer);

            const onUndo = () => {
                onUpdateAppointment({ ...appointment, status: 'scheduled' }); 
                onUpdateCustomer({ ...customer, tags: tagsBefore }); 
            };

            onRequestAction({
                message: `${customer.name}님을 거절 고객으로 처리했습니다.`,
                onUndo: onUndo,
                onConfirm: () => {}, 
                onSecondaryConfirm: () => {
                    onOpenRejectionModal(updatedCustomer); 
                },
                secondaryConfirmLabel: '거절사유 기록'
            });

            return;
        }

        if (sourceStage === 'pcAppointments' && targetStage === 'closedWon') {
            onRequestAppointmentAction(appointment, 'completed');
            return;
        }

        let actionType: 'AP_TO_PC' | 'AP_TO_WON' | null = null;
        if (sourceStage === 'apAppointments' && targetStage === 'pcAppointments') actionType = 'AP_TO_PC';
        else if (sourceStage === 'apAppointments' && targetStage === 'closedWon') actionType = 'AP_TO_WON';

        if (actionType) {
            let message = '';
            let confirmLabel: string | undefined = undefined;

            const onConfirm = (isButtonClick: boolean) => {
                const itemId = item.id;
                const apAppointment = appointments.find(a => a.id === itemId);
                if (!apAppointment) return;

                if (actionType === 'AP_TO_PC') {
                    onUpdateAppointment({ ...apAppointment, status: 'completed' });
                    if (isButtonClick && apAppointment.customerId) {
                        const customerForPC = customers.find(c => c.id === apAppointment.customerId);
                        if (customerForPC) {
                            const today = new Date(); today.setDate(today.getDate() + 1);
                            const newPcSeed = {
                                customerId: customerForPC.id, customerName: customerForPC.name,
                                date: today.toISOString().split('T')[0], time: '10:00',
                                meetingType: 'PC', status: 'scheduled', notes: `AP 후속 미팅`
                            };
                            onEditAppointment(newPcSeed as Appointment);
                        }
                    }
                } else if (actionType === 'AP_TO_WON') {
                    if (isButtonClick) {
                        setSourceAppointmentForRecord(apAppointment);
                        const customerForRecord = customers.find(c => c.id === apAppointment.customerId);
                        if (customerForRecord) {
                            const today = new Date();
                            const todayStr = new Date(today.getTime() - (today.getTimezoneOffset() * 60000)).toISOString().split('T')[0];
                            onAdd({ contractorName: customerForRecord.name, dob: customerForRecord.birthday, applicationDate: todayStr } as Omit<PerformanceRecord, 'id'>);
                        }
                    } else {
                        onUpdateAppointment({ ...apAppointment, status: 'completed' });
                    }
                }
            };
            
            switch (actionType) {
                case 'AP_TO_PC':
                    message = "미팅(AP)을 완료 처리했습니다.";
                    confirmLabel = "후속 일정 추가 (PC)";
                    break;
                case 'AP_TO_WON':
                    message = "미팅을 완료 처리했습니다.";
                    confirmLabel = "실적 추가";
                    break;
            }

            onRequestAction({ message, confirmLabel, onConfirm, onUndo: () => {} });
        }
    }, [appointments, onUpdateAppointment, onRequestAction, onEditAppointment, customers, onUpdateCustomer, onRequestAppointmentAction, onAdd, onOpenRejectionModal]);

    const handleDrop = (targetType: string) => {
        if (draggedItem) {
            handleStageMove(draggedItem.item, draggedItem.sourceType, targetType);
        }
        setDragOverColumn(null);
        setDraggedItem(null);
    };
    
    const toggleStageExpansion = (stage: string) => {
        setExpandedStages(prev => ({ ...prev, [stage]: !prev[stage] }));
    };
  
  const goalProgress = useMemo(() => {
    const targetYear = currentDate.getFullYear();
    const targetMonth = currentDate.getMonth() + 1;

    return goals.map(goal => {
      let current = 0;
      const target = typeof goal.target === 'number' ? goal.target : parseFloat(goal.target) || 0;

      if (goal.category === 'monthly') {
          switch(goal.label) {
              case '월간 인정 실적':
                  current = records
                      .filter(r => { 
                          if (!r.applicationDate) return false;
                          const [y, m] = r.applicationDate.split('-').map(Number);
                          return y === targetYear && m === targetMonth;
                      })
                      .reduce((sum, r) => sum + (r.recognizedPerformance || 0), 0);
                  break;
              case '월간 보험료':
                   current = records
                      .filter(r => { 
                          if (!r.applicationDate) return false;
                          const [y, m] = r.applicationDate.split('-').map(Number);
                          return y === targetYear && m === targetMonth;
                      })
                      .reduce((sum, r) => sum + (r.premium || 0), 0);
                  break;
              case '신규 계약 건수':
                   current = records
                      .filter(r => { 
                          if (!r.applicationDate) return false;
                          const [y, m] = r.applicationDate.split('-').map(Number);
                          return y === targetYear && m === targetMonth;
                      })
                      .length;
                  break;
              case '신규 고객 확보':
                   // 이번 달에 계약이 발생한 고유 고객 수 계산
                   const thisMonthRecords = records.filter(r => {
                       if (!r.applicationDate) return false;
                       const [y, m] = r.applicationDate.split('-').map(Number);
                       return y === targetYear && m === targetMonth;
                   });
                   const uniqueContractors = new Set(thisMonthRecords.map(r => `${r.contractorName}-${r.dob}`));
                   current = uniqueContractors.size;
                   break;
          }
      } else if (goal.category === 'weekly') {
          const now = new Date();
          const dayOfWeek = now.getDay();
          const offset = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
          const startOfWeek = new Date(now);
          startOfWeek.setDate(now.getDate() - offset);
          startOfWeek.setHours(0, 0, 0, 0);

          const endOfWeek = new Date(startOfWeek);
          endOfWeek.setDate(startOfWeek.getDate() + 6);
          endOfWeek.setHours(23, 59, 59, 999);

          const meetingTypeMap: { [key: string]: string } = {
              '주간 AP 횟수': 'AP'
          };
          const meetingType = meetingTypeMap[goal.label];
          if (meetingType) {
              current = appointments
                  .filter(a => {
                      const appDate = new Date(a.date);
                      return !isNaN(appDate.getTime()) && a.status === 'completed' && a.meetingType === meetingType && appDate >= startOfWeek && appDate <= endOfWeek;
                  })
                  .length;
          }
      } else if (goal.category === 'daily') {
        const now = new Date();
        const todayStr = new Date(now.getTime() - (now.getTimezoneOffset() * 60000)).toISOString().split('T')[0];
        
        const meetingTypeMap: { [key: string]: string } = {
            '일간 TA 시도': 'TA',
        };
        const meetingType = meetingTypeMap[goal.label];
        if (meetingType) {
            current = appointments
                .filter(a => a.date === todayStr && a.meetingType === meetingType && a.status === 'completed')
                .length;
        }
      }
      
      const percentage = target > 0 ? (current / target) * 100 : 0;
      
      return { ...goal, current, target, percentage };
    });
  }, [goals, records, currentDate, appointments]);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const allContracts = useMemo(() => {
    const contractsWithCustomerInfo: (Contract & { customerName: string; customerId: string })[] = [];
    customers.forEach(customer => {
        if (customer.contracts) {
            customer.contracts.forEach(contract => {
                contractsWithCustomerInfo.push({
                    ...contract,
                    customerName: customer.name,
                    customerId: customer.id
                });
            });
        }
    });

    const filtered = contractsWithCustomerInfo.filter(c => {
      return (
        (contractFilters.customerName === '' || c.customerName.toLowerCase().includes(contractFilters.customerName.toLowerCase())) &&
        (contractFilters.insuranceCompany === '' || c.insuranceCompany === contractFilters.insuranceCompany) &&
        (contractFilters.productName === '' || c.productName.toLowerCase().includes(contractFilters.productName.toLowerCase())) &&
        (contractFilters.dateStart === '' || c.contractDate >= contractFilters.dateStart) &&
        (contractFilters.dateEnd === '' || c.contractDate <= contractFilters.dateEnd)
      );
    });

    if (contractSortConfig !== null) {
      filtered.sort((a, b) => {
        const aVal = a[contractSortConfig.key];
        const bVal = b[contractSortConfig.key];
        
        if (aVal === undefined || aVal === null) return 1;
        if (bVal === undefined || bVal === null) return -1;
        
        if (aVal < bVal) {
          return contractSortConfig.direction === 'ascending' ? -1 : 1;
        }
        if (aVal > bVal) {
          return contractSortConfig.direction === 'ascending' ? 1 : -1;
        }
        return 0;
      });
    }

    return filtered;
  }, [customers, contractFilters, contractSortConfig]);

  const handleContractFilterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setContractFilters(prev => ({ ...prev, [name]: value }));
  };

  const resetContractFilters = () => {
    setContractFilters({
      customerName: '',
      insuranceCompany: '',
      productName: '',
      dateStart: '',
      dateEnd: '',
    });
  };

  const requestContractSort = (key: ContractSortKeys) => {
    let direction: 'ascending' | 'descending' = 'ascending';
    if (contractSortConfig && contractSortConfig.key === key && contractSortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setContractSortConfig({ key, direction });
  };
  
  const contractListView = (
    <div className="animate-fade-in">
        <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-4">전체 계약 목록</h2>
        <div className="bg-[var(--background-secondary)] p-4 rounded-2xl shadow-md border border-[var(--border-color)] mb-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 items-end">
                <input type="text" name="customerName" value={contractFilters.customerName} onChange={handleContractFilterChange} placeholder="계약자명" className="w-full p-2 border border-[var(--border-color-strong)] rounded-xl bg-[var(--background-tertiary)] text-[var(--text-primary)]"/>
                <input type="text" name="productName" value={contractFilters.productName} onChange={handleContractFilterChange} placeholder="상품명" className="w-full p-2 border border-[var(--border-color-strong)] rounded-xl bg-[var(--background-tertiary)] text-[var(--text-primary)]"/>
                <div className="grid grid-cols-2 gap-2">
                    <input type="date" name="dateStart" value={contractFilters.dateStart} onChange={handleContractFilterChange} className="w-full p-2 border border-[var(--border-color-strong)] rounded-xl bg-[var(--background-tertiary)] text-[var(--text-primary)]"/>
                    <input type="date" name="dateEnd" value={contractFilters.dateEnd} onChange={handleContractFilterChange} className="w-full p-2 border border-[var(--border-color-strong)] rounded-xl bg-[var(--background-tertiary)] text-[var(--text-primary)]"/>
                </div>
            </div>
            <div className="text-right mt-4">
                <button onClick={resetContractFilters} className="px-4 py-2 bg-[var(--background-tertiary)] text-[var(--text-secondary)] rounded-lg text-sm font-medium">필터 초기화</button>
            </div>
        </div>
        <ContractList 
          contracts={allContracts} 
          onSelectCustomer={(customerId) => {
            const customer = customers.find(c => c.id === customerId);
            if(customer) {
                onSelectCustomer(customer, 'contracts');
            }
          }}
          sortConfig={contractSortConfig}
          requestSort={requestContractSort}
        />
    </div>
  );

  const handleOpenRecordModal = useCallback((record: PerformanceRecord | null = null, aiMode = false) => {
    setEditingRecord(record);
    setIsRecordAiMode(aiMode);
    setIsRecordModalOpen(true);
  }, []);
  
  const handleOpenPredictionModal = useCallback((prediction: PerformancePrediction | null = null, aiMode = false) => {
    setEditingPrediction(prediction);
    setIsPredictionAiMode(aiMode);
    setIsPredictionModalOpen(true);
  }, []);
  
  const handleOpenAddInterestedModal = useCallback(() => {
    setIsAddInterestedModalOpen(true);
  }, []);

  const handleScheduleFromInterested = useCallback((customer: Customer, meetingType: 'AP' | 'PC') => {
      const today = new Date();
      today.setDate(today.getDate() + 1); 
      const tomorrowStr = new Date(today.getTime() - (today.getTimezoneOffset() * 60000)).toISOString().split('T')[0];

      onSetOnAppointmentAddSuccess(() => {
          updateCustomerTags([customer.id], [], ['관심고객']);
      });

      onEditAppointment({
          customerId: customer.id,
          customerName: customer.name,
          meetingType: meetingType,
          date: tomorrowStr,
          time: '10:00'
      } as Appointment);
      
      setInterestedCustomerActionModalState({ isOpen: false, customer: null });
  }, [onSetOnAppointmentAddSuccess, updateCustomerTags, onEditAppointment]);

  const kanbanData = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = new Date(today.getTime() - (today.getTimezoneOffset() * 60000)).toISOString().split('T')[0];

    const apAppointments = appointments.filter(a => a.meetingType === 'AP' && a.status === 'scheduled' && a.date >= todayStr);
    const pcAppointments = appointments.filter(a => a.meetingType === 'PC' && a.status === 'scheduled' && a.date >= todayStr);

    const closedWon = records.filter(r => {
      if (!r.applicationDate) return false;
      const appDate = new Date(r.applicationDate);
      return !isNaN(appDate.getTime()) && appDate.getMonth() === today.getMonth() && appDate.getFullYear() === today.getFullYear();
    });

    const interestedCustomers = customers.filter(c => c.tags.includes('관심고객'));
    const rejectedCustomers = customers.filter(c => c.tags.includes('거절고객') && c.status !== 'archived');
    
    return { apAppointments, pcAppointments, closedWon, interestedCustomers, rejectedCustomers };
  }, [appointments, records, customers]);

  const kanbanBoard = (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
      {/* Interested Customers */}
      <div 
        className={`p-3 bg-[var(--background-secondary)] rounded-2xl border-2 transition-colors ${dragOverColumn === 'interestedCustomers' ? 'border-[var(--background-accent)]' : 'border-transparent'}`}
        onDragOver={(e) => handleDragOver(e, 'interestedCustomers')}
        onDragLeave={handleDragLeave}
        onDrop={() => handleDrop('interestedCustomers')}
      >
        <div className="flex justify-between items-center mb-3">
          <h3 className="font-bold text-[var(--text-primary)] flex items-center gap-2">
            <SparklesIcon className="h-5 w-5 text-yellow-400"/>
            <span>관심고객</span>
          </h3>
          <button onClick={handleOpenAddInterestedModal} className="p-1.5 bg-[var(--background-accent-subtle)] rounded-lg hover:bg-opacity-80"><PlusIcon className="h-4 w-4 text-[var(--text-accent)]"/></button>
        </div>
        <div className="space-y-2">
          {(expandedStages.interested ? kanbanData.interestedCustomers : kanbanData.interestedCustomers.slice(0, 2)).map(customer => (
              <KanbanCard
                key={customer.id}
                title={customer.name}
                subtitle={`${calculateAge(customer.birthday)}세 / ${customer.occupation}`}
                details={[
                  { icon: <PhoneIcon className="h-3.5 w-3.5 text-gray-400"/>, text: customer.contact },
                  { icon: <LocationMarkerIcon className="h-3.5 w-3.5 text-gray-400"/>, text: customer.homeAddress },
                  { icon: <BriefcaseIcon className="h-3.5 w-3.5 text-gray-400"/>, text: customer.workAddress },
                ]}
                draggable={false} 
                onDragStart={() => {}}
                onClick={() => setInterestedCustomerActionModalState({ isOpen: true, customer })}
                actions={
                  <button onClick={(e) => { e.stopPropagation(); updateCustomerTags([customer.id], [], ['관심고객']); }} className="p-1 text-[var(--text-muted)] hover:text-[var(--text-danger)]" title="관심고객에서 제외"><XIcon className="h-4 w-4"/></button>
                }
              />
          ))}
          {kanbanData.interestedCustomers.length > 2 && (
            <button 
              onClick={() => toggleStageExpansion('interested')}
              className="w-full py-2 text-xs font-bold text-[var(--text-accent)] bg-[var(--background-tertiary)] rounded-xl hover:bg-[var(--background-primary)] border border-[var(--border-color-strong)] flex items-center justify-center gap-1"
            >
              {expandedStages.interested ? <><ChevronUpIcon className="h-3 w-3"/> 접기</> : <><ChevronDownIcon className="h-3 w-3"/> 더보기 ({kanbanData.interestedCustomers.length - 2})</>}
            </button>
          )}
        </div>
      </div>
      {/* AP */}
      <div 
        className={`p-3 bg-[var(--background-secondary)] rounded-2xl border-2 transition-colors ${dragOverColumn === 'apAppointments' ? 'border-[var(--background-accent)]' : 'border-transparent'}`}
        onDragOver={(e) => handleDragOver(e, 'apAppointments')}
        onDragLeave={handleDragLeave}
        onDrop={() => handleDrop('apAppointments')}
      >
        <h3 className="font-bold text-[var(--text-primary)] mb-3 flex items-center gap-2">
            <ClipboardIcon className="h-5 w-5 text-cyan-400"/>
            <span>미팅 (AP)</span>
        </h3>
        <div className="space-y-2">
          {(expandedStages.ap ? kanbanData.apAppointments : kanbanData.apAppointments.slice(0, 2)).map(app => (
             <KanbanCard
                key={app.id}
                title={app.customerName}
                subtitle={`${app.date.slice(5)} ${app.time}`}
                details={[
                  { icon: <LocationMarkerIcon className="h-3.5 w-3.5 text-gray-400"/>, text: app.location },
                  { icon: <DocumentTextIcon className="h-3.5 w-3.5 text-gray-400"/>, text: app.notes },
                ]}
                draggable={true}
                onDragStart={(e) => handleDragStart(app, 'apAppointments')}
                onClick={() => onEditAppointment(app)}
                actions={
                  <button onClick={(e) => { e.stopPropagation(); onRequestAppointmentAction(app, 'completed'); }} className="px-2 py-1 text-xs font-bold text-green-700 bg-green-100 rounded-lg border border-green-200 hover:bg-green-200">완료</button>
                }
              />
          ))}
          {kanbanData.apAppointments.length > 2 && (
            <button 
              onClick={() => toggleStageExpansion('ap')}
              className="w-full py-2 text-xs font-bold text-[var(--text-accent)] bg-[var(--background-tertiary)] rounded-xl hover:bg-[var(--background-primary)] border border-[var(--border-color-strong)] flex items-center justify-center gap-1"
            >
              {expandedStages.ap ? <><ChevronUpIcon className="h-3 w-3"/> 접기</> : <><ChevronDownIcon className="h-3 w-3"/> 더보기 ({kanbanData.apAppointments.length - 2})</>}
            </button>
          )}
        </div>
      </div>
      {/* PC */}
       <div 
        className={`p-3 bg-[var(--background-secondary)] rounded-2xl border-2 transition-colors ${dragOverColumn === 'pcAppointments' ? 'border-[var(--background-accent)]' : 'border-transparent'}`}
        onDragOver={(e) => handleDragOver(e, 'pcAppointments')}
        onDragLeave={handleDragLeave}
        onDrop={() => handleDrop('pcAppointments')}
      >
        <h3 className="font-bold text-[var(--text-primary)] mb-3 flex items-center gap-2">
            <CalendarIcon className="h-5 w-5 text-purple-400"/>
            <span>설계 (PC)</span>
        </h3>
        <div className="space-y-2">
           {(expandedStages.pc ? kanbanData.pcAppointments : kanbanData.pcAppointments.slice(0, 2)).map(app => (
              <KanbanCard
                key={app.id}
                title={app.customerName}
                subtitle={`${app.date.slice(5)} ${app.time}`}
                details={[
                  { icon: <LocationMarkerIcon className="h-3.5 w-3.5 text-gray-400"/>, text: app.location },
                  { icon: <DocumentTextIcon className="h-3.5 w-3.5 text-gray-400"/>, text: app.notes },
                ]}
                draggable={true}
                onDragStart={(e) => handleDragStart(app, 'pcAppointments')}
                onClick={() => onEditAppointment(app)}
                actions={
                    <button onClick={(e) => { e.stopPropagation(); onRequestAppointmentAction(app, 'completed'); }} className="px-2 py-1 text-xs font-bold text-green-700 bg-green-100 rounded-lg border border-green-200 hover:bg-green-200">완료</button>
                }
              />
          ))}
          {kanbanData.pcAppointments.length > 2 && (
            <button 
              onClick={() => toggleStageExpansion('pc')}
              className="w-full py-2 text-xs font-bold text-[var(--text-accent)] bg-[var(--background-tertiary)] rounded-xl hover:bg-[var(--background-primary)] border border-[var(--border-color-strong)] flex items-center justify-center gap-1"
            >
              {expandedStages.pc ? <><ChevronUpIcon className="h-3 w-3"/> 접기</> : <><ChevronDownIcon className="h-3 w-3"/> 더보기 ({kanbanData.pcAppointments.length - 2})</>}
            </button>
          )}
        </div>
      </div>
       {/* Closed Won */}
      <div 
        className={`p-3 bg-[var(--background-secondary)] rounded-2xl border-2 transition-colors ${dragOverColumn === 'closedWon' ? 'border-[var(--background-accent)]' : 'border-transparent'}`}
        onDragOver={(e) => handleDragOver(e, 'closedWon')}
        onDragLeave={handleDragLeave}
        onDrop={() => handleDrop('closedWon')}
      >
        <h3 className="font-bold text-[var(--text-primary)] mb-3 flex items-center gap-2">
            <CheckIcon className="h-5 w-5 text-green-400"/>
            <span>계약 완료</span>
        </h3>
        <div className="space-y-2">
           {(expandedStages.won ? kanbanData.closedWon : kanbanData.closedWon.slice(0, 2)).map(rec => (
              <KanbanCard
                key={rec.id}
                title={rec.contractorName}
                subtitle={rec.applicationDate.slice(5)}
                details={[
                  { icon: <BriefcaseIcon className="h-3.5 w-3.5 text-gray-400"/>, text: rec.productName },
                  { icon: <DocumentTextIcon className="h-3.5 w-3.5 text-gray-400"/>, text: `${(rec.premium || 0).toLocaleString()}원` },
                ]}
                draggable={false}
                onDragStart={() => {}}
                onClick={() => {
                  const customer = customers.find(c => c.name === rec.contractorName);
                  if(customer) onSelectCustomer(customer, 'contracts');
                }}
              />
          ))}
          {kanbanData.closedWon.length > 2 && (
            <button 
              onClick={() => toggleStageExpansion('won')}
              className="w-full py-2 text-xs font-bold text-[var(--text-accent)] bg-[var(--background-tertiary)] rounded-xl hover:bg-[var(--background-primary)] border border-[var(--border-color-strong)] flex items-center justify-center gap-1"
            >
              {expandedStages.won ? <><ChevronUpIcon className="h-3 w-3"/> 접기</> : <><ChevronDownIcon className="h-3 w-3"/> 더보기 ({kanbanData.closedWon.length - 2})</>}
            </button>
          )}
        </div>
      </div>
      {/* Rejected */}
      <div 
        className={`p-3 bg-[var(--background-secondary)] rounded-2xl border-2 transition-colors ${dragOverColumn === 'rejectedCustomers' ? 'border-[var(--background-accent)]' : 'border-transparent'}`}
        onDragOver={(e) => handleDragOver(e, 'rejectedCustomers')}
        onDragLeave={handleDragLeave}
        onDrop={() => handleDrop('rejectedCustomers')}
      >
        <h3 className="font-bold text-[var(--text-primary)] mb-3 flex items-center gap-2">
            <XIcon className="h-5 w-5 text-red-400"/>
            <span>거절</span>
        </h3>
         <div className="space-y-2">
           {(expandedStages.rejected ? kanbanData.rejectedCustomers : kanbanData.rejectedCustomers.slice(0, 2)).map(customer => (
              <KanbanCard
                key={customer.id}
                title={customer.name}
                subtitle={`거절일: ${customer.rejectionDate?.slice(5) || '미지정'}`}
                details={[
                  { icon: <DocumentTextIcon className="h-3.5 w-3.5 text-gray-400"/>, text: `사유: ${customer.rejectionReason || '미입력'}`},
                  { icon: <CycleIcon className="h-3.5 w-3.5 text-gray-400"/>, text: `재접촉: ${customer.recontactProbability || '미입력'}`},
                ]}
                draggable={false}
                onDragStart={() => {}}
                onClick={() => onSelectCustomer(customer)}
                actions={
                   <button onClick={(e) => { e.stopPropagation(); setEditingRejectedCustomer(customer); setIsEditRejectionModalOpen(true); }} className="p-1 text-[var(--text-muted)] hover:text-[var(--text-accent)]" title="거절 정보 수정"><PencilIcon className="h-4 w-4"/></button>
                }
              />
          ))}
          {kanbanData.rejectedCustomers.length > 2 && (
            <button 
              onClick={() => toggleStageExpansion('rejected')}
              className="w-full py-2 text-xs font-bold text-[var(--text-accent)] bg-[var(--background-tertiary)] rounded-xl hover:bg-[var(--background-primary)] border border-[var(--border-color-strong)] flex items-center justify-center gap-1"
            >
              {expandedStages.rejected ? <><ChevronUpIcon className="h-3 w-3"/> 접기</> : <><ChevronDownIcon className="h-3 w-3"/> 더보기 ({kanbanData.rejectedCustomers.length - 2})</>}
            </button>
          )}
        </div>
      </div>
    </div>
  );

  const pipelineList = (
    <div className="animate-fade-in bg-[var(--background-secondary)] rounded-2xl border border-[var(--border-color)] overflow-hidden shadow-md">
        <div className="overflow-x-auto relative">
            <table className="min-w-full divide-y divide-[var(--border-color)]">
                <thead className="bg-[var(--background-tertiary)]">
                    <tr>
                        <th className="px-4 py-3 text-left text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider w-24">단계</th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">고객명</th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">정보 1</th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">정보 2 (메모/상품)</th>
                        <th className="px-4 py-3 text-right text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider w-24 sticky right-0 bg-[var(--background-tertiary)] z-10 shadow-[-1px_0_0_var(--border-color)]">작업</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-color)]">
                    {/* Interested Customers in List */}
                    {kanbanData.interestedCustomers.map(customer => (
                        <tr key={customer.id} className="hover:bg-[var(--background-tertiary)] transition-colors group">
                            <td className="px-4 py-3">
                                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-yellow-100 text-yellow-700 border border-yellow-200">관심고객</span>
                            </td>
                            <td className="px-4 py-3">
                                <button onClick={() => onSelectCustomer(customer)} className="font-bold text-[var(--text-primary)] hover:underline truncate block max-w-full">{customer.name}</button>
                            </td>
                            <td className="px-4 py-3 text-sm text-[var(--text-secondary)] whitespace-nowrap">
                                <div className="flex flex-col">
                                    <span>{(customer.registrationDate || '').slice(5)} 등록</span>
                                    <span className="text-[10px] text-[var(--text-muted)] truncate">{customer.homeAddress !== '미확인' ? customer.homeAddress : ''}</span>
                                </div>
                            </td>
                            <td className="px-4 py-3 text-sm text-[var(--text-secondary)]">
                                <p className="truncate max-w-xs" title={customer.notes}>{customer.notes || '-'}</p>
                            </td>
                            <td className="px-4 py-3 text-right sticky right-0 bg-[var(--background-secondary)] group-hover:bg-[var(--background-tertiary)] z-10 shadow-[-1px_0_0_var(--border-color)]">
                                <button onClick={() => setInterestedCustomerActionModalState({ isOpen: true, customer })} className="p-2 text-[var(--text-muted)] hover:text-[var(--text-accent)]" title="다음 단계 진행"><CycleIcon className="h-5 w-5"/></button>
                            </td>
                        </tr>
                    ))}
                    {/* AP Appointments in List */}
                    {kanbanData.apAppointments.map(app => (
                        <tr key={app.id} className="hover:bg-[var(--background-tertiary)] transition-colors group">
                            <td className="px-4 py-3">
                                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-cyan-100 text-cyan-700 border border-cyan-200">미팅 (AP)</span>
                            </td>
                            <td className="px-4 py-3">
                                <span className="font-bold text-[var(--text-primary)] truncate block max-w-full">{app.customerName}</span>
                            </td>
                            <td className="px-4 py-3 text-sm text-[var(--text-secondary)] whitespace-nowrap">
                                <div className="flex flex-col">
                                    <span>{(app.date || '').slice(5)} {formatActivityTimeKR(app.time)}</span>
                                    <span className="text-[10px] text-[var(--text-muted)] truncate max-w-[150px]">{app.location || '-'}</span>
                                </div>
                            </td>
                            <td className="px-4 py-3 text-sm text-[var(--text-secondary)]">
                                <p className="truncate max-w-xs" title={app.notes}>{app.notes || '-'}</p>
                            </td>
                            <td className="px-4 py-3 text-right sticky right-0 bg-[var(--background-secondary)] group-hover:bg-[var(--background-tertiary)] z-10 shadow-[-1px_0_0_var(--border-color)]">
                                <div className="flex items-center justify-end gap-1.5 md:gap-2">
                                    <button 
                                        onClick={() => onRequestAppointmentAction(app, 'completed')}
                                        className="px-2 py-1 text-[10px] md:text-xs font-bold text-green-700 bg-green-100 rounded-lg border border-green-200 hover:bg-green-200 transition-colors"
                                    >
                                        완료
                                    </button>
                                    <button onClick={() => onEditAppointment(app)} className="p-1.5 text-[var(--text-muted)] hover:text-[var(--text-accent)]"><PencilIcon className="h-4 w-4"/></button>
                                </div>
                            </td>
                        </tr>
                    ))}
                    {/* PC Appointments in List */}
                    {kanbanData.pcAppointments.map(app => (
                        <tr key={app.id} className="hover:bg-[var(--background-tertiary)] transition-colors group">
                            <td className="px-4 py-3">
                                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-700 border border-purple-200">설계 (PC)</span>
                            </td>
                            <td className="px-4 py-3">
                                <span className="font-bold text-[var(--text-primary)] truncate block max-w-full">{app.customerName}</span>
                            </td>
                            <td className="px-4 py-3 text-sm text-[var(--text-secondary)] whitespace-nowrap">
                                <div className="flex flex-col">
                                    <span>{(app.date || '').slice(5)} {formatActivityTimeKR(app.time)}</span>
                                    <span className="text-[10px] text-[var(--text-muted)] truncate max-w-[150px]">{app.location || '-'}</span>
                                </div>
                            </td>
                            <td className="px-4 py-3 text-sm text-[var(--text-secondary)]">
                                <p className="truncate max-w-xs" title={app.notes}>{app.notes || '-'}</p>
                            </td>
                            <td className="px-4 py-3 text-right sticky right-0 bg-[var(--background-secondary)] group-hover:bg-[var(--background-tertiary)] z-10 shadow-[-1px_0_0_var(--border-color)]">
                                <div className="flex items-center justify-end gap-1.5 md:gap-2">
                                    <button 
                                        onClick={() => onRequestAppointmentAction(app, 'completed')}
                                        className="px-2 py-1 text-[10px] md:text-xs font-bold text-green-700 bg-green-100 rounded-lg border border-green-200 hover:bg-green-200 transition-colors"
                                    >
                                        완료
                                    </button>
                                    <button onClick={() => onEditAppointment(app)} className="p-1.5 text-[var(--text-muted)] hover:text-[var(--text-accent)]"><PencilIcon className="h-4 w-4"/></button>
                                </div>
                            </td>
                        </tr>
                    ))}
                    {/* Closed Won in List */}
                    {kanbanData.closedWon.map(record => (
                        <tr key={record.id} className="hover:bg-[var(--background-tertiary)] transition-colors group bg-green-50/30 dark:bg-green-900/5">
                            <td className="px-4 py-3">
                                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-green-100 text-green-700 border border-green-200">계약완료</span>
                            </td>
                            <td className="px-4 py-3">
                                <button onClick={() => {
                                    const customer = customers.find(c => c.name === record.contractorName && (c.birthday === record.dob || !record.dob));
                                    if(customer) onSelectCustomer(customer, 'contracts');
                                }} className="font-bold text-[var(--text-primary)] hover:underline truncate block max-w-full">{record.contractorName}</button>
                            </td>
                            <td className="px-4 py-3 text-sm text-[var(--text-secondary)] whitespace-nowrap">
                                <div className="flex flex-col">
                                    <span>{(record.applicationDate || '').slice(5)} 체결</span>
                                    <span className="text-[10px] text-[var(--text-muted)] truncate">{record.insuranceCompany}</span>
                                </div>
                            </td>
                            <td className="px-4 py-3 text-sm text-[var(--text-secondary)]">
                                <p className="truncate max-w-xs font-semibold text-green-600" title={`${record.productName} / ${(record.premium || 0).toLocaleString()}원`}>
                                    {record.productName} / {(record.premium || 0).toLocaleString()}원
                                </p>
                            </td>
                            <td className="px-4 py-3 text-right sticky right-0 bg-[var(--background-secondary)] group-hover:bg-[var(--background-tertiary)] z-10 shadow-[-1px_0_0_var(--border-color)]">
                                <button onClick={() => {
                                    const customer = customers.find(c => c.name === record.contractorName && (c.birthday === record.dob || !record.dob));
                                    if(customer) onSelectCustomer(customer, 'contracts');
                                }} className="p-2 text-[var(--text-muted)] hover:text-[var(--text-accent)]" title="상세보기"><DocumentTextIcon className="h-5 w-5"/></button>
                            </td>
                        </tr>
                    ))}
                    {/* Rejected Customers in List */}
                    {kanbanData.rejectedCustomers.map(customer => (
                        <tr key={customer.id} className="hover:bg-[var(--background-tertiary)] transition-colors group bg-red-50/30 dark:bg-red-900/5">
                            <td className="px-4 py-3">
                                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-700 border border-red-200">거절</span>
                            </td>
                            <td className="px-4 py-3">
                                <button onClick={() => onSelectCustomer(customer)} className="font-bold text-[var(--text-primary)] hover:underline truncate block max-w-full">{customer.name}</button>
                            </td>
                            <td className="px-4 py-3 text-sm text-[var(--text-secondary)] whitespace-nowrap">
                                <div className="flex flex-col">
                                    <span>{(customer.rejectionDate || '').slice(5) || '-'} 거절</span>
                                    <span className="text-[10px] text-[var(--text-muted)] truncate">사유: {customer.rejectionReason || '미기입'}</span>
                                </div>
                            </td>
                            <td className="px-4 py-3 text-sm text-[var(--text-secondary)]">
                                <p className="truncate max-w-xs italic text-[var(--text-muted)]" title={customer.rejectionNotes}>
                                    ({customer.recontactProbability}) {customer.rejectionNotes || '-'}
                                </p>
                            </td>
                            <td className="px-4 py-3 text-right sticky right-0 bg-[var(--background-secondary)] group-hover:bg-[var(--background-tertiary)] z-10 shadow-[-1px_0_0_var(--border-color)]">
                                <button onClick={(e) => { e.stopPropagation(); setEditingRejectedCustomer(customer); setIsEditRejectionModalOpen(true); }} className="p-2 text-[var(--text-muted)] hover:text-[var(--text-accent)]" title="정보 수정"><PencilIcon className="h-5 w-5"/></button>
                            </td>
                        </tr>
                    ))}
                    {kanbanData.interestedCustomers.length === 0 && kanbanData.apAppointments.length === 0 && kanbanData.pcAppointments.length === 0 && kanbanData.closedWon.length === 0 && kanbanData.rejectedCustomers.length === 0 && (
                        <tr>
                            <td colSpan={5} className="px-6 py-20 text-center text-[var(--text-muted)]">진행 중인 활동 파이프라인이 없습니다.</td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
    </div>
  );

  return (
    <div className="animate-fade-in">
        {!showOnlyKanban && (
             <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-[var(--text-primary)]">📊 영업 관리</h1>
            </div>
        )}

      {!showOnlyKanban && (
        <div className="flex border-b border-[var(--border-color)] mb-4">
            <button onClick={() => setActiveTab('status')} className={`px-4 py-2 text-sm font-medium ${activeTab === 'status' ? 'text-[var(--text-accent)] border-b-2 border-[var(--background-accent)]' : 'text-[var(--text-muted)]'}`}>실적 현황</button>
            <button onClick={() => setActiveTab('kanban')} className={`px-4 py-2 text-sm font-medium ${activeTab === 'kanban' ? 'text-[var(--text-accent)] border-b-2 border-[var(--background-accent)]' : 'text-[var(--text-muted)]'}`}>활동 관리</button>
            <button onClick={() => setActiveTab('contracts')} className={`px-4 py-2 text-sm font-medium ${activeTab === 'contracts' ? 'text-[var(--text-accent)] border-b-2 border-[var(--background-accent)]' : 'text-[var(--text-muted)]'}`}>계약 목록</button>
            <button onClick={() => setActiveTab('analysis')} className={`px-4 py-2 text-sm font-medium ${activeTab === 'analysis' ? 'text-[var(--text-accent)] border-b-2 border-[var(--background-accent)]' : 'text-[var(--text-muted)]'}`}>성과 분석</button>
        </div>
      )}

      {activeTab === 'status' && (
        <div className="animate-fade-in">
            <GoalAchievementDashboard
              goalProgress={goalProgress}
              goals={goals}
              onAddGoal={onAddGoal}
              onUpdateGoal={onUpdateGoal}
              onDeleteGoal={onDeleteGoal}
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-2xl font-semibold text-[var(--text-primary)]">실적 기록</h2>
                        <button onClick={() => handleOpenRecordModal(null, true)} className="flex items-center gap-2 px-3 py-2 bg-[var(--background-accent-subtle)] text-[var(--text-accent)] rounded-md text-sm font-medium hover:bg-opacity-80">
                            <PlusIcon className="h-4 w-4" /> 실적 추가
                        </button>
                    </div>
                    <div className="max-h-[60vh] overflow-y-auto custom-scrollbar pr-2 rounded-2xl border border-[var(--border-color)]">
                        <table className="min-w-full divide-y divide-[var(--border-color)]">
                            <thead className="bg-[var(--background-tertiary)] sticky top-0">
                                <tr>
                                    <th className="px-4 py-2 text-left text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">계약자</th>
                                    <th className="px-4 py-2 text-left text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">청약일</th>
                                    <th className="px-4 py-2 text-left text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">보험료</th>
                                    <th className="px-4 py-2 text-left text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">상품명</th>
                                    <th className="px-4 py-2 text-right text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">작업</th>
                                </tr>
                            </thead>
                            <tbody className="bg-[var(--background-secondary)] divide-y divide-[var(--border-color)]">
                                {records.map(r => (
                                    <tr key={r.id}>
                                        <td className="px-4 py-2 whitespace-nowrap text-sm font-medium text-[var(--text-primary)]">{r.contractorName}</td>
                                        <td className="px-4 py-2 whitespace-nowrap text-sm text-[var(--text-secondary)]">{(r.applicationDate || '').slice(2)}</td>
                                        <td className="px-4 py-2 whitespace-nowrap text-sm text-[var(--text-secondary)] font-bold text-green-600">{(r.premium || 0).toLocaleString()}원</td>
                                        <td className="px-4 py-2 text-sm text-[var(--text-secondary)] truncate max-w-[120px]" title={r.productName}>{r.productName}</td>
                                        <td className="px-4 py-2 whitespace-nowrap text-right text-sm font-medium">
                                            <button onClick={() => handleOpenRecordModal(r)} className="p-1 text-[var(--text-muted)] hover:text-[var(--text-accent)]"><PencilIcon className="h-4 w-4" /></button>
                                            <button onClick={() => onDelete(r.id)} className="p-1 text-[var(--text-muted)] hover:text-[var(--text-danger)]"><TrashIcon className="h-4 w-4" /></button>
                                        </td>
                                    </tr>
                                ))}
                                {records.length === 0 && <tr><td colSpan={5} className="py-10 text-center text-[var(--text-muted)] text-sm">기록된 실적이 없습니다.</td></tr>}
                            </tbody>
                        </table>
                    </div>
                </div>
                <div>
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-2xl font-semibold text-[var(--text-primary)]">실적 예측</h2>
                        <button onClick={() => handleOpenPredictionModal(null, true)} className="flex items-center gap-2 px-3 py-2 bg-[var(--background-accent-subtle)] text-[var(--text-accent)] rounded-md text-sm font-medium hover:bg-opacity-80">
                            <PlusIcon className="h-4 w-4" /> 예측 추가
                        </button>
                    </div>
                    <div className="max-h-[60vh] overflow-y-auto custom-scrollbar pr-2 rounded-2xl border border-[var(--border-color)]">
                        <table className="min-w-full divide-y divide-[var(--border-color)]">
                            <thead className="bg-[var(--background-tertiary)] sticky top-0">
                                <tr>
                                    <th className="px-4 py-2 text-left text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">고객명</th>
                                    <th className="px-4 py-2 text-left text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">PC일정</th>
                                    <th className="px-4 py-2 text-left text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">예상 보험료</th>
                                    <th className="px-4 py-2 text-right text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">작업</th>
                                </tr>
                            </thead>
                            <tbody className="bg-[var(--background-secondary)] divide-y divide-[var(--border-color)]">
                                {predictions.map(p => (
                                    <tr key={p.id}>
                                        <td className="px-4 py-2 whitespace-nowrap text-sm font-medium text-[var(--text-primary)]">{p.customerName}</td>
                                        <td className="px-4 py-2 whitespace-nowrap text-sm text-[var(--text-secondary)]">{(p.pcDate || '').slice(5)}</td>
                                        <td className="px-4 py-2 whitespace-nowrap text-sm text-[var(--text-secondary)] font-bold text-amber-600">{(p.premium || 0).toLocaleString()}원</td>
                                        <td className="px-4 py-2 whitespace-nowrap text-right text-sm font-medium">
                                            <button onClick={() => handleOpenPredictionModal(p)} className="p-1 text-[var(--text-muted)] hover:text-[var(--text-accent)]"><PencilIcon className="h-4 w-4" /></button>
                                            <button onClick={() => onDeletePrediction(p.id)} className="p-1 text-[var(--text-muted)] hover:text-[var(--text-danger)]"><TrashIcon className="h-4 w-4" /></button>
                                        </td>
                                    </tr>
                                ))}
                                {predictions.length === 0 && <tr><td colSpan={4} className="py-10 text-center text-[var(--text-muted)] text-sm">예측된 실적이 없습니다.</td></tr>}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
      )}

      {activeTab === 'kanban' && (
          <div className="animate-fade-in flex flex-col space-y-4">
              <div className="flex justify-between items-center mb-2">
                  <h2 className="text-2xl font-bold text-[var(--text-primary)]">활동 관리</h2>
                  <div className="flex items-center p-1 bg-[var(--background-tertiary)] rounded-xl border border-[var(--border-color-strong)]">
                      <button 
                          onClick={() => setKanbanViewMode('board')} 
                          className={`px-4 py-1.5 text-xs font-black rounded-lg transition-all flex items-center gap-1.5 ${kanbanViewMode === 'board' ? 'bg-[var(--background-secondary)] text-[var(--text-accent)] shadow-sm' : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'}`}
                      >
                          <ViewColumnsIcon className="h-4 w-4" />
                          칸반 보드
                      </button>
                      <button 
                          onClick={() => setKanbanViewMode('list')} 
                          className={`px-4 py-1.5 text-xs font-black rounded-lg transition-all flex items-center gap-1.5 ${kanbanViewMode === 'list' ? 'bg-[var(--background-secondary)] text-[var(--text-accent)] shadow-sm' : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'}`}
                      >
                          <ListBulletIcon className="h-4 w-4" />
                          리스트 보기
                      </button>
                  </div>
              </div>
              {kanbanViewMode === 'board' ? kanbanBoard : pipelineList}
          </div>
      )}
      
      {activeTab === 'contracts' && contractListView}
      {activeTab === 'analysis' && <PerformanceAnalysis records={records} appointments={appointments} customers={customers} onSelectCustomer={(c) => onSelectCustomer(c, 'contracts')} />}

      {isRecordModalOpen && <AddPerformanceRecordModal isOpen={isRecordModalOpen} onClose={() => { setIsRecordModalOpen(false); setSourceAppointmentForRecord(null); }} onSave={async (data) => { await onAdd(data); if (sourceAppointmentForRecord) { onRequestAppointmentAction(sourceAppointmentForRecord, 'completed'); } }} record={editingRecord} isAiMode={isRecordAiMode} customers={customers} />}
      {isPredictionModalOpen && <AddPerformancePredictionModal isOpen={isPredictionModalOpen} onClose={() => setIsPredictionModalOpen(false)} onSave={async (data) => { if (editingPrediction) { await onUpdatePrediction({ ...editingPrediction, ...data }); } else { await onAddPrediction(data); } }} prediction={editingPrediction} isAiMode={isPredictionAiMode} />}
      {isAddInterestedModalOpen && <AddInterestedProspectModal isOpen={isAddInterestedModalOpen} onClose={() => setIsAddInterestedModalOpen(false)} onAdd={(customerIds) => { updateCustomerTags(customerIds, ['관심고객'], []); }} customers={customers} appointments={appointments} />}
      <InterestedCustomerActionModal isOpen={interestedCustomerActionModalState.isOpen} onClose={() => setInterestedCustomerActionModalState({ isOpen: false, customer: null })} customer={interestedCustomerActionModalState.customer} onSchedule={ (mt) => { if(interestedCustomerActionModalState.customer) { handleScheduleFromInterested(interestedCustomerActionModalState.customer, mt) }} } />
       {isEditRejectionModalOpen && <EditRejectionInfoModal isOpen={isEditRejectionModalOpen} onClose={() => setIsEditRejectionModalOpen(false)} onSave={(c) => onUpdateCustomer(c)} customer={editingRejectedCustomer} />}
    </div>
  );
};

export default PerformanceManagement;
