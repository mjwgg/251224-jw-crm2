
import React, { useState, useEffect, useMemo } from 'react';
import type { Goal } from '../types';
import { PencilIcon, CheckIcon, PlusIcon, TrashIcon } from './icons';

interface GoalsTrackerProps {
  goals: Goal[];
  onAddGoal: (goal: Omit<Goal, 'id'>) => Promise<void>;
  onUpdateGoal: (goal: Goal) => Promise<void>;
  onDeleteGoal: (goalId: string) => Promise<void>;
}

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

const GoalItem: React.FC<{
  goal: Goal;
  isEditing: boolean;
  onChange: (id: string, field: keyof Omit<Goal, 'id'>, value: string | number) => void;
  onDelete: (id: string) => void;
  onLabelChange: (id: string, newLabel: string) => void;
  availableLabels: string[];
}> = ({ goal, isEditing, onChange, onDelete, onLabelChange, availableLabels }) => (
  <div className="flex justify-between items-center text-sm py-1.5 gap-2 border-b border-[var(--border-color)]/30 last:border-0">
    {isEditing ? (
      <select
        value={goal.label}
        onChange={(e) => onLabelChange(goal.id, e.target.value)}
        className="flex-grow p-1 border-b border-[var(--border-color-strong)] focus:outline-none focus:ring-0 focus:border-[var(--background-accent)] bg-transparent text-[var(--text-primary)]"
      >
        <option value={goal.label}>{goal.label}</option>
        {availableLabels.map(label => (
          <option key={label} value={label}>{label}</option>
        ))}
      </select>
    ) : (
      <span className="text-[var(--text-muted)] truncate pr-2">{goal.label}:</span>
    )}
    <div className="flex items-center gap-2 flex-shrink-0">
      {isEditing ? (
        <>
          <input
            type="number"
            value={goal.target}
            onChange={(e) => onChange(goal.id, 'target', Number(e.target.value) || 0)}
            className="w-24 text-right p-1 border-b border-[var(--border-color-strong)] focus:outline-none focus:ring-0 focus:border-[var(--background-accent)] bg-transparent text-[var(--text-primary)]"
          />
          <span className="w-12 p-1 text-[var(--text-primary)]">{goal.unit}</span>
          <button onClick={() => onDelete(goal.id)} className="p-1 text-[var(--text-muted)] hover:text-[var(--text-danger)]" aria-label="Delete goal">
            <TrashIcon className="h-4 w-4" />
          </button>
        </>
      ) : (
        <span className="font-bold text-base text-[var(--text-primary)]">
          {typeof goal.target === 'number' ? Number(goal.target).toLocaleString() : goal.target}
          <span className="text-xs font-normal text-[var(--text-muted)] ml-0.5">{goal.unit}</span>
        </span>
      )}
    </div>
  </div>
);


const GoalsTracker: React.FC<GoalsTrackerProps> = ({ goals, onAddGoal, onUpdateGoal, onDeleteGoal }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [editedGoals, setEditedGoals] = useState<Goal[]>(goals);

    useEffect(() => {
        if (!isEditing) {
            setEditedGoals(goals);
        }
    }, [goals, isEditing]);
    
    const goalsByCategory = useMemo(() => {
        const grouped: { [key in Goal['category']]?: Goal[] } = {};
        (isEditing ? editedGoals : goals).forEach(goal => {
            if (!grouped[goal.category]) {
                grouped[goal.category] = [];
            }
            grouped[goal.category]!.push(goal);
        });
        return grouped;
    }, [isEditing, editedGoals, goals]);

    const handleInputChange = (id: string, field: keyof Omit<Goal, 'id' | 'category' | 'label'>, value: string | number) => {
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
      const editedGoalIds = new Set(editedGoals.map(g => g.id));
      
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
        if (!editedGoalIds.has(originalId)) {
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

    return (
        <div className="bg-[var(--background-secondary)] p-5 rounded-lg shadow-lg border border-[var(--border-color)] animate-fade-in-up h-full">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-[var(--text-primary)]">나의 목표</h2>
                {isEditing ? (
                    <div className="flex items-center gap-2">
                        <button onClick={handleCancelClick} className="flex items-center px-2 py-1 bg-[var(--background-tertiary)] text-[var(--text-secondary)] rounded-md text-sm font-medium hover:bg-[var(--background-primary)]">
                           취소
                        </button>
                        <button onClick={handleSaveClick} className="flex items-center px-2 py-1 bg-[var(--background-success)] text-white rounded-md text-sm font-medium hover:bg-[var(--background-success-hover)]">
                            <CheckIcon className="h-3 w-3 mr-1" /> 저장
                        </button>
                    </div>
                ) : (
                    <button onClick={() => setIsEditing(true)} className="flex items-center px-3 py-1 bg-[var(--background-accent-subtle)] text-[var(--text-accent)] rounded-md text-sm font-medium hover:bg-opacity-80">
                        <PencilIcon className="h-3.5 w-3.5 mr-1.5" /> 수정
                    </button>
                )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-4 flex-1">
                {(['monthly', 'weekly', 'daily'] as const).map(category => {
                    const existingLabels = new Set((goalsByCategory[category] || []).map(g => g.label));
                    const availableLabelsForCategory = Object.keys(GOAL_DEFINITIONS).filter(
                        label => GOAL_DEFINITIONS[label].categories.includes(category) && !existingLabels.has(label)
                    );

                    return (
                        <div className="space-y-1" key={category}>
                            <h3 className="font-bold text-sm text-[var(--text-primary)] border-b border-[var(--border-color)] pb-2 mb-2">
                                { { monthly: '월간', weekly: '주간', daily: '일일' }[category] }
                            </h3>
                            {(goalsByCategory[category] || []).map(goal => (
                                <GoalItem 
                                    key={goal.id}
                                    goal={goal}
                                    isEditing={isEditing}
                                    onChange={handleInputChange}
                                    onDelete={handleDeleteGoal}
                                    onLabelChange={handleLabelChange}
                                    availableLabels={availableLabelsForCategory}
                                />
                            ))}
                            {isEditing && (
                                <button onClick={() => handleAddNewGoal(category)} className="w-full mt-2 flex items-center justify-center gap-1 text-sm text-[var(--text-accent)] hover:text-[var(--text-accent)]/80 p-2 rounded-md bg-[var(--background-accent-subtle)] hover:bg-opacity-70">
                                    <PlusIcon className="h-3.5 w-3.5"/> 추가
                                </button>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default GoalsTracker;
