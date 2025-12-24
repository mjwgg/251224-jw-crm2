import React, { useState, useMemo, useCallback, useEffect } from 'react';
import type { PerformanceRecord, PerformancePrediction, Customer, Goal, Appointment, Contract, RejectionReason, RecontactProbability, CustomerType, MeetingType } from '../../types';
// FIX: Import 'SparklesIcon' to resolve 'Cannot find name' errors.
import { PlusIcon, TrashIcon, PencilIcon, UsersIcon, CalendarIcon, CheckIcon, SearchIcon, ClipboardIcon, MessageIcon, XIcon, CycleIcon, ChevronUpIcon, ChevronDownIcon, ArchiveBoxIcon, PhoneIcon, LocationMarkerIcon, BriefcaseIcon, DocumentTextIcon, SparklesIcon, InfoIcon } from '../icons';
import AddPerformanceRecordModal from '../AddPerformanceRecordModal';
import AddPerformancePredictionModal from '../AddPerformancePredictionModal';
import GoalsTracker from '../GoalsTracker';
import BaseModal from '../ui/BaseModal';
import AddInterestedProspectModal from '../AddInterestedProspectModal';
import PerformanceAnalysis from '../PerformanceAnalysis';

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
  // FIX: Added missing onOpenConsultationRecordModal prop to fix 'Cannot find name' error.
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

const KanbanCard: React.FC<KanbanCardProps> = ({ title, subtitle, details, draggable, onDragStart, onClick, actions }) => (
    <div 
      className={`p-3 bg-[var(--background-tertiary)] rounded-md shadow-sm border border-[var(--border-color-strong)] ${draggable ? 'cursor-grab' : ''}`}
      draggable={draggable}
      onDragStart={onDragStart}
    >
      <div className="cursor-pointer" onClick={onClick}>
        <div className="font-bold text-[var(--text-primary)] truncate flex items-center gap-2" title={typeof title === 'string' ? title : undefined}>
          {title}
        </div>
        {subtitle && <p className="text-sm text-[var(--text-muted)] truncate" title={subtitle}>{subtitle}</p>}
        <div className="mt-2 space-y-1">
          {details.map((detail, index) => (
              <div key={index} className="flex items-center text-xs text-[var(--text-secondary)]">
                  {detail.icon}
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
        <th scope="col" className={`px-2 md:px-4 py-3 text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider whitespace-nowrap ${className}`}>
            <button className="flex items-center" onClick={() => requestSort(sortKey)}>
                {label}
                {sortConfig?.key === sortKey ? (
                    sortConfig.direction === 'ascending' ? <ChevronUpIcon className="h-4 w-4 ml-1" /> : <ChevronDownIcon className="h-4 w-4 ml-1" />
                ) : (
                    <div className="h-4 w-4 ml-1 opacity-30 group-hover:opacity-100"><ChevronUpIcon className="h-4 w-4"/></div> // Placeholder for alignment
                )}
            </button>
        </th>
    );

    return (
        <div className="rounded-lg overflow-hidden border border-[var(--border-color)]">
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
  const [currentDate, setCurrentDate] = useState(new Date());
  
  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<PerformanceRecord | null>(null);
  const [isRecordAiMode, setIsRecordAiMode] = useState(false);

  const [isPredictionModalOpen, setIsPredictionModalOpen] = useState(false);
  const [editingPrediction, setEditingPrediction] = useState<PerformancePrediction | null>(null);
  const [isPredictionAiMode, setIsPredictionAiMode] = useState(false);

  const [closingRate, setClosingRate] = useState(70);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  // Drag and Drop State
  const [draggedItem, setDraggedItem] = useState<{ item: any; sourceType: string } | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);
  const [interestedCustomerActionModalState, setInterestedCustomerActionModalState] = useState<{ isOpen: boolean; customer: Customer | null }>({ isOpen: false, customer: null });
  const [sourceAppointmentForRecord, setSourceAppointmentForRecord] = useState<Appointment | null>(null);
  
  const [isAddInterestedModalOpen, setIsAddInterestedModalOpen] = useState(false);
  const [selectedInterestedIds, setSelectedInterestedIds] = useState<Set<string>>(new Set());
  
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

  const [recordPromptModalState, setRecordPromptModalState] = useState<{ isOpen: boolean; title: string; prompt: string }>({ isOpen: false, title: '', prompt: '' });

    const handleOpenRecordPrompt = (type: 'ta' | 'ap' | 'pc', item: Customer | Appointment) => {
    let title = '';
    let prompt = '';

    if (type === 'ta' && 'contact' in item) {
      const customer = item as Customer;
      title = 'TA 기록 프롬프트';
      prompt = `
# 고객 정보
- 이름: ${customer.name}
- 나이: ${calculateAge(customer.birthday)}세
- 연락처: ${customer.contact}
- 직업: ${customer.occupation}

# 통화 목표
- AP 약속 잡기
- 고객의 현재 상황 및 니즈 파악 (관심사, 가족관계 등)
- 신뢰 관계 형성

# 예상 질문 및 답변
- Q: 어떻게 알고 전화하셨나요? A: (취득 경로: ${customer.acquisitionSource || '미입력'})
- Q: 지금 바쁜데요. A: "네, 고객님. 바쁘신 와중에 죄송합니다. 1분만 시간 괜찮으실까요?"

# 통화 후 기록할 내용
- 통화 결과: (미팅 약속 / 거절 / 부재중 / 재통화)
- 주요 대화 내용 요약:
- 고객의 반응 및 성향:
- 다음 Follow-up 일정 및 내용:
      `.trim();
    } else if (type === 'ap' && 'meetingType' in item) {
      const app = item as Appointment;
      title = 'AP 기록 프롬프트';
      prompt = `
# 미팅 정보
- 고객명: ${app.customerName}
- 일시: ${app.date} ${app.time}
- 장소: ${app.location}

# 미팅 목표
- Rapport 형성 (아이스브레이킹, 공감대 형성)
- 고객의 재무 목표 및 니즈 심층 파악 (Fact Finding)
- 회사의 강점 및 나의 전문성 어필
- 다음 PC 미팅에 대한 기대감 형성 및 약속 잡기

# 준비물 및 체크리스트
- [ ] 회사 소개 자료
- [ ] Fact Finding 질문지
- [ ] 개인 프로필 (PR 자료)
- [ ] 고객 맞춤형 관심 기사/자료

# 미팅 후 기록할 내용
- 상담 결과 요약:
- 파악된 고객 니즈 및 재무 목표:
- 고객의 주요 반응 및 질문:
- 다음 PC 미팅 일정 및 준비할 내용:
      `.trim();
    } else if (type === 'pc' && 'meetingType' in item) {
      const app = item as Appointment;
      title = 'PC 기록 프롬프트';
      prompt = `
# 제안 정보
- 고객명: ${app.customerName}
- 일시: ${app.date} ${app.time}
- 장소: ${app.location}

# 제안 목표
- AP에서 파악된 니즈 기반의 맞춤 솔루션 제시
- 상품의 핵심 가치와 기대효과 명확히 전달
- 고객의 예상 질문에 대한 명쾌한 답변 준비
- 계약 체결 (Closing)

# 제안 내용
- 제안 상품:
- 월 보험료:
- 주요 보장 내용:
- 상품의 특장점 (고객 니즈 연결):

# 미팅 후 기록할 내용
- 계약 체결 여부:
- 고객의 긍정/부정 반응 및 주요 피드백:
- 계약 체결 시, 추가 안내 사항 및 필요 서류:
- 계약 미체결 시, 거절 사유 및 Follow-up 전략:
      `.trim();
    }

    setRecordPromptModalState({ isOpen: true, title, prompt });
  };

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

            // Perform action immediately
            const updatedAppointment = { ...appointment, status: 'completed' as const };
            onUpdateAppointment(updatedAppointment);
            
            const tagsBefore = [...customer.tags];
            const newTags = Array.from(new Set([...customer.tags, '거절고객']));
            const updatedCustomer = { ...customer, tags: newTags };
            onUpdateCustomer(updatedCustomer);

            // Define undo action
            const onUndo = () => {
                onUpdateAppointment({ ...appointment, status: 'scheduled' }); // Revert status
                onUpdateCustomer({ ...customer, tags: tagsBefore }); // Revert tags
            };

            onRequestAction({
                message: `${customer.name}님을 거절 고객으로 처리했습니다.`,
                onUndo: onUndo,
                onConfirm: () => {}, // No-op on timeout. Action already done.
                onSecondaryConfirm: () => {
                    onOpenRejectionModal(updatedCustomer); // Open modal with updated customer
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
  
  const goalProgress = useMemo(() => {
    return goals.map(goal => {
      let current = 0;
      const target = typeof goal.target === 'number' ? goal.target : parseFloat(goal.target) || 0;

      if (goal.category === 'monthly') {
          const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
          const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0, 23, 59, 59);

          switch(goal.label) {
              case '월간 월 보험료':
                  current = records
                      .filter(r => { const d = new Date(r.applicationDate); return d >= startOfMonth && d <= endOfMonth; })
                      .reduce((sum, r) => sum + r.premium, 0);
                  break;
              case '신규 계약 건수':
                  current = records
                      .filter(r => { const d = new Date(r.applicationDate); return d >= startOfMonth && d <= endOfMonth; })
                      .length;
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
                      return a.status === 'completed' && a.meetingType === meetingType && appDate >= startOfWeek && appDate <= endOfWeek;
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
  }, [goals, records, customers, appointments, currentDate]);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const uniqueInsuranceCompanies = useMemo(() => {
    const companies = new Set<string>();
    customers.forEach(customer => {
      customer.contracts?.forEach(contract => {
        companies.add(contract.insuranceCompany);
      });
    });
    return Array.from(companies).sort();
  }, [customers]);

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
        <div className="bg-[var(--background-secondary)] p-4 rounded-lg shadow-md border border-[var(--border-color)] mb-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 items-end">
                <input type="text" name="customerName" value={contractFilters.customerName} onChange={handleContractFilterChange} placeholder="계약자명" className="w-full p-2 border border-[var(--border-color-strong)] rounded-md bg-[var(--background-tertiary)]"/>
                <input type="text" name="productName" value={contractFilters.productName} onChange={handleContractFilterChange} placeholder="상품명" className="w-full p-2 border border-[var(--border-color-strong)] rounded-md bg-[var(--background-tertiary)]"/>
                <div className="grid grid-cols-2 gap-2">
                    <input type="date" name="dateStart" value={contractFilters.dateStart} onChange={handleContractFilterChange} className="w-full p-2 border border-[var(--border-color-strong)] rounded-md bg-[var(--background-tertiary)]"/>
                    <input type="date" name="dateEnd" value={contractFilters.dateEnd} onChange={handleContractFilterChange} className="w-full p-2 border border-[var(--border-color-strong)] rounded-md bg-[var(--background-tertiary)]"/>
                </div>
            </div>
            <div className="text-right mt-4">
                <button onClick={resetContractFilters} className="px-4 py-2 bg-[var(--background-tertiary)] text-[var(--text-secondary)] rounded-md text-sm font-medium">필터 초기화</button>
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
      today.setDate(today.getDate() + 1); // Default to tomorrow
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
    const todayStr = new Date(today.getTime() - (today.getTimezoneOffset() * 60000)).toISOString().split('T')[0];

    const apAppointments = appointments.filter(a => a.meetingType === 'AP' && a.status === 'scheduled' && a.date >= todayStr);
    const pcAppointments = appointments.filter(a => a.meetingType === 'PC' && a.status === 'scheduled' && a.date >= todayStr);

    const closedWon = records.filter(r => {
      const appDate = new Date(r.applicationDate);
      return appDate.getMonth() === today.getMonth() && appDate.getFullYear() === today.getFullYear();
    });

    const interestedCustomers = customers.filter(c => c.tags.includes('관심고객'));
    
    const rejectedCustomers = customers.filter(c => c.tags.includes('거절고객') && c.status !== 'archived');
    
    return { apAppointments, pcAppointments, closedWon, interestedCustomers, rejectedCustomers };
  }, [appointments, records, customers]);

  const kanbanBoard = (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
      {/* Interested Customers */}
      <div 
        className={`p-3 bg-[var(--background-secondary)] rounded-lg border-2 ${dragOverColumn === 'interestedCustomers' ? 'border-[var(--background-accent)]' : 'border-transparent'}`}
        onDragOver={(e) => handleDragOver(e, 'interestedCustomers')}
        onDragLeave={handleDragLeave}
        onDrop={() => handleDrop('interestedCustomers')}
      >
        <div className="flex justify-between items-center mb-3">
          <h3 className="font-bold text-[var(--text-primary)] flex items-center gap-2">
            <SparklesIcon className="h-5 w-5 text-yellow-400"/>
            <span>관심고객</span>
            <div className="relative group">
              <InfoIcon className="h-4 w-4 text-[var(--text-muted)] cursor-pointer" />
              <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-2 bg-[var(--background-secondary)] text-[var(--text-secondary)] text-xs rounded-md shadow-lg border border-[var(--border-color)] opacity-0 group-hover:opacity-100 transition-opacity scale-0 group-hover:scale-100 origin-bottom pointer-events-none z-10">
                앞으로 꾸준히 연락하며 관리할 잠재 고객 목록입니다. TA(전화 영업)의 주요 대상이 됩니다.
              </span>
            </div>
          </h3>
          <button onClick={handleOpenAddInterestedModal} className="p-1.5 bg-[var(--background-accent-subtle)] rounded-md hover:bg-opacity-80"><PlusIcon className="h-4 w-4 text-[var(--text-accent)]"/></button>
        </div>
        <div className="space-y-2">
          {kanbanData.interestedCustomers.map(customer => (
              <KanbanCard
                key={customer.id}
                title={customer.name}
                subtitle={`${calculateAge(customer.birthday)}세 / ${customer.occupation}`}
                details={[
                  { icon: <PhoneIcon className="h-3 w-3 mr-1.5 text-gray-400"/>, text: customer.contact },
                  { icon: <LocationMarkerIcon className="h-3 w-3 mr-1.5 text-gray-400"/>, text: customer.homeAddress },
                  { icon: <BriefcaseIcon className="h-3 w-3 mr-1.5 text-gray-400"/>, text: customer.workAddress },
                ]}
                draggable={false} // This column is for manual actions
                onDragStart={() => {}}
                onClick={() => setInterestedCustomerActionModalState({ isOpen: true, customer })}
                actions={
                  <button onClick={(e) => { e.stopPropagation(); updateCustomerTags([customer.id], [], ['관심고객']); }} className="p-1 text-[var(--text-muted)] hover:text-[var(--text-danger)]" title="관심고객에서 제외"><XIcon className="h-4 w-4"/></button>
                }
              />
          ))}
        </div>
      </div>
      {/* AP */}
      <div 
        className={`p-3 bg-[var(--background-secondary)] rounded-lg border-2 ${dragOverColumn === 'apAppointments' ? 'border-[var(--background-accent)]' : 'border-transparent'}`}
        onDragOver={(e) => handleDragOver(e, 'apAppointments')}
        onDragLeave={handleDragLeave}
        onDrop={() => handleDrop('apAppointments')}
      >
        <h3 className="font-bold text-[var(--text-primary)] mb-3 flex items-center gap-2">
            <ClipboardIcon className="h-5 w-5 text-cyan-400"/>
            <span>미팅예정 (AP)</span>
            <div className="relative group">
              <InfoIcon className="h-4 w-4 text-[var(--text-muted)] cursor-pointer" />
              <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-2 bg-[var(--background-secondary)] text-[var(--text-secondary)] text-xs rounded-md shadow-lg border border-[var(--border-color)] opacity-0 group-hover:opacity-100 transition-opacity scale-0 group-hover:scale-100 origin-bottom pointer-events-none z-10">
                고객과의 첫 만남(초회상담) 약속이 잡힌 상태입니다. 고객의 니즈를 파악하고 신뢰를 쌓는 중요한 단계입니다.
              </span>
            </div>
        </h3>
        <div className="space-y-2">
          {kanbanData.apAppointments.map(app => (
             <KanbanCard
                key={app.id}
                title={app.customerName}
                subtitle={`${app.date} ${app.time}`}
                details={[
                  { icon: <LocationMarkerIcon className="h-3 w-3 mr-1.5 text-gray-400"/>, text: app.location },
                  { icon: <DocumentTextIcon className="h-3 w-3 mr-1.5 text-gray-400"/>, text: app.notes },
                ]}
                draggable={true}
                onDragStart={(e) => handleDragStart(app, 'apAppointments')}
                onClick={() => onEditAppointment(app)}
                actions={
                  <button onClick={(e) => { e.stopPropagation(); onRequestAppointmentAction(app, 'completed'); }} className="px-2 py-1 text-xs font-medium text-green-800 bg-green-200 rounded-md hover:bg-green-300" title="완료 처리">완료</button>
                }
              />
          ))}
        </div>
      </div>
      {/* PC */}
       <div 
        className={`p-3 bg-[var(--background-secondary)] rounded-lg border-2 ${dragOverColumn === 'pcAppointments' ? 'border-[var(--background-accent)]' : 'border-transparent'}`}
        onDragOver={(e) => handleDragOver(e, 'pcAppointments')}
        onDragLeave={handleDragLeave}
        onDrop={() => handleDrop('pcAppointments')}
      >
        <h3 className="font-bold text-[var(--text-primary)] mb-3 flex items-center gap-2">
            <CalendarIcon className="h-5 w-5 text-purple-400"/>
            <span>제안/설계 (PC)</span>
             <div className="relative group">
              <InfoIcon className="h-4 w-4 text-[var(--text-muted)] cursor-pointer" />
              <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-2 bg-[var(--background-secondary)] text-[var(--text-secondary)] text-xs rounded-md shadow-lg border border-[var(--border-color)] opacity-0 group-hover:opacity-100 transition-opacity scale-0 group-hover:scale-100 origin-bottom pointer-events-none z-10">
                고객에게 맞는 상품을 제안하거나 구체적인 가입 설계를 전달하는 단계입니다. 계약 체결을 목표로 합니다.
              </span>
            </div>
        </h3>
        <div className="space-y-2">
           {kanbanData.pcAppointments.map(app => (
              <KanbanCard
                key={app.id}
                title={app.customerName}
                subtitle={`${app.date} ${app.time}`}
                details={[
                  { icon: <LocationMarkerIcon className="h-3 w-3 mr-1.5 text-gray-400"/>, text: app.location },
                  { icon: <DocumentTextIcon className="h-3 w-3 mr-1.5 text-gray-400"/>, text: app.notes },
                ]}
                draggable={true}
                onDragStart={(e) => handleDragStart(app, 'pcAppointments')}
                onClick={() => onEditAppointment(app)}
                actions={
                    <button onClick={(e) => { e.stopPropagation(); onRequestAppointmentAction(app, 'completed'); }} className="px-2 py-1 text-xs font-medium text-green-800 bg-green-200 rounded-md hover:bg-green-300" title="완료 처리">완료</button>
                }
              />
          ))}
        </div>
      </div>
       {/* Closed Won */}
      <div 
        className={`p-3 bg-[var(--background-secondary)] rounded-lg border-2 ${dragOverColumn === 'closedWon' ? 'border-[var(--background-accent)]' : 'border-transparent'}`}
        onDragOver={(e) => handleDragOver(e, 'closedWon')}
        onDragLeave={handleDragLeave}
        onDrop={() => handleDrop('closedWon')}
      >
        <h3 className="font-bold text-[var(--text-primary)] mb-3 flex items-center gap-2">
            <CheckIcon className="h-5 w-5 text-green-400"/>
            <span>계약 완료</span>
            <div className="relative group">
              <InfoIcon className="h-4 w-4 text-[var(--text-muted)] cursor-pointer" />
              <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-2 bg-[var(--background-secondary)] text-[var(--text-secondary)] text-xs rounded-md shadow-lg border border-[var(--border-color)] opacity-0 group-hover:opacity-100 transition-opacity scale-0 group-hover:scale-100 origin-bottom pointer-events-none z-10">
                고객과의 계약 체결이 성공적으로 완료된 상태입니다. 이번 달 실적으로 집계됩니다.
              </span>
            </div>
        </h3>
        <div className="space-y-2">
           {kanbanData.closedWon.map(rec => (
              <KanbanCard
                key={rec.id}
                title={rec.contractorName}
                subtitle={rec.applicationDate}
                details={[
                  { icon: <BriefcaseIcon className="h-3 w-3 mr-1.5 text-gray-400"/>, text: rec.productName },
                  { icon: <DocumentTextIcon className="h-3 w-3 mr-1.5 text-gray-400"/>, text: `${rec.premium.toLocaleString()}원` },
                ]}
                draggable={false}
                onDragStart={() => {}}
                onClick={() => {
                  const customer = customers.find(c => c.name === rec.contractorName);
                  if(customer) onSelectCustomer(customer, 'contracts');
                }}
              />
          ))}
        </div>
      </div>
      {/* Rejected */}
      <div 
        className={`p-3 bg-[var(--background-secondary)] rounded-lg border-2 ${dragOverColumn === 'rejectedCustomers' ? 'border-[var(--background-accent)]' : 'border-transparent'}`}
        onDragOver={(e) => handleDragOver(e, 'rejectedCustomers')}
        onDragLeave={handleDragLeave}
        onDrop={() => handleDrop('rejectedCustomers')}
      >
        <h3 className="font-bold text-[var(--text-primary)] mb-3 flex items-center gap-2">
            <XIcon className="h-5 w-5 text-red-400"/>
            <span>거절</span>
            <div className="relative group">
              <InfoIcon className="h-4 w-4 text-[var(--text-muted)] cursor-pointer" />
              <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-2 bg-[var(--background-secondary)] text-[var(--text-secondary)] text-xs rounded-md shadow-lg border border-[var(--border-color)] opacity-0 group-hover:opacity-100 transition-opacity scale-0 group-hover:scale-100 origin-bottom pointer-events-none z-10">
                고객이 제안을 거절한 상태입니다. 거절 사유를 기록하고, 나중에 다시 연락할지(재접촉 가능성) 판단하여 관리합니다.
              </span>
            </div>
        </h3>
         <div className="space-y-2">
           {kanbanData.rejectedCustomers.map(customer => (
              <KanbanCard
                key={customer.id}
                title={customer.name}
                subtitle={`거절일: ${customer.rejectionDate || '미지정'}`}
                details={[
                  { icon: <DocumentTextIcon className="h-3 w-3 mr-1.5 text-gray-400"/>, text: `사유: ${customer.rejectionReason || '미입력'}`},
                  { icon: <CycleIcon className="h-3 w-3 mr-1.5 text-gray-400"/>, text: `재접촉 확률: ${customer.recontactProbability || '미입력'}`},
                ]}
                draggable={false}
                onDragStart={() => {}}
                onClick={() => onSelectCustomer(customer)}
                actions={
                   <button onClick={(e) => { e.stopPropagation(); setEditingRejectedCustomer(customer); setIsEditRejectionModalOpen(true); }} className="p-1 text-[var(--text-muted)] hover:text-[var(--text-accent)]" title="거절 정보 수정"><PencilIcon className="h-4 w-4"/></button>
                }
              />
          ))}
        </div>
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
                    <div className="max-h-[60vh] overflow-y-auto custom-scrollbar pr-2 rounded-lg border border-[var(--border-color)]">
                        <table className="min-w-full divide-y divide-[var(--border-color)]">
                            <thead className="bg-[var(--background-tertiary)] sticky top-0">
                                <tr>
                                    <th className="px-4 py-2 text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">계약자</th>
                                    <th className="px-4 py-2 text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">생년월일</th>
                                    <th className="px-4 py-2 text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">청약일</th>
                                    <th className="px-4 py-2 text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">보험료</th>
                                    <th className="px-4 py-2 text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">보험사/상품명</th>
                                    <th className="px-4 py-2 text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">인정실적</th>
                                    <th className="px-4 py-2 text-right text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">작업</th>
                                </tr>
                            </thead>
                            <tbody className="bg-[var(--background-secondary)] divide-y divide-[var(--border-color)]">
                                {records.map(r => (
                                    <tr key={r.id}>
                                        <td className="px-4 py-2 whitespace-nowrap text-sm font-medium text-[var(--text-primary)]">{r.contractorName}</td>
                                        <td className="px-4 py-2 whitespace-nowrap text-sm text-[var(--text-secondary)]">{r.dob}</td>
                                        <td className="px-4 py-2 whitespace-nowrap text-sm text-[var(--text-secondary)]">{r.applicationDate}</td>
                                        <td className="px-4 py-2 whitespace-nowrap text-sm text-[var(--text-secondary)]">{(r.premium || 0).toLocaleString()}원</td>
                                        <td className="px-4 py-2 whitespace-nowrap text-sm text-[var(--text-secondary)]">{r.insuranceCompany} / {r.productName}</td>
                                        <td className="px-4 py-2 whitespace-nowrap text-sm text-[var(--text-secondary)] font-semibold">{(r.recognizedPerformance || 0).toLocaleString()}원</td>
                                        <td className="px-4 py-2 whitespace-nowrap text-right text-sm font-medium">
                                            <button onClick={() => handleOpenRecordModal(r)} className="p-1 text-[var(--text-muted)] hover:text-[var(--text-accent)]"><PencilIcon className="h-4 w-4" /></button>
                                            <button onClick={() => onDelete(r.id)} className="p-1 text-[var(--text-muted)] hover:text-[var(--text-danger)]"><TrashIcon className="h-4 w-4" /></button>
                                        </td>
                                    </tr>
                                ))}
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
                    <div className="max-h-[60vh] overflow-y-auto custom-scrollbar pr-2 rounded-lg border border-[var(--border-color)]">
                        <table className="min-w-full divide-y divide-[var(--border-color)]">
                            <thead className="bg-[var(--background-tertiary)] sticky top-0">
                                <tr>
                                    <th className="px-4 py-2 text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">고객명</th>
                                    <th className="px-4 py-2 text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">PC일정</th>
                                    <th className="px-4 py-2 text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">상품명</th>
                                    <th className="px-4 py-2 text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">예상 보험료</th>
                                    <th className="px-4 py-2 text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">예상 인정실적</th>
                                    <th className="px-4 py-2 text-right text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">작업</th>
                                </tr>
                            </thead>
                            <tbody className="bg-[var(--background-secondary)] divide-y divide-[var(--border-color)]">
                                {predictions.map(p => (
                                    <tr key={p.id}>
                                        <td className="px-4 py-2 whitespace-nowrap text-sm font-medium text-[var(--text-primary)]">{p.customerName}</td>
                                        <td className="px-4 py-2 whitespace-nowrap text-sm text-[var(--text-secondary)]">{p.pcDate}</td>
                                        <td className="px-4 py-2 whitespace-nowrap text-sm text-[var(--text-secondary)]">{p.productName}</td>
                                        <td className="px-4 py-2 whitespace-nowrap text-sm text-[var(--text-secondary)]">{(p.premium || 0).toLocaleString()}원</td>
                                        <td className="px-4 py-2 whitespace-nowrap text-sm text-[var(--text-secondary)] font-semibold">{(p.recognizedPerformance || 0).toLocaleString()}원</td>
                                        <td className="px-4 py-2 whitespace-nowrap text-right text-sm font-medium">
                                            <button onClick={() => handleOpenPredictionModal(p)} className="p-1 text-[var(--text-muted)] hover:text-[var(--text-accent)]"><PencilIcon className="h-4 w-4" /></button>
                                            <button onClick={() => onDeletePrediction(p.id)} className="p-1 text-[var(--text-muted)] hover:text-[var(--text-danger)]"><TrashIcon className="h-4 w-4" /></button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
      )}

      {activeTab === 'kanban' && kanbanBoard}
      
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