import React, { useState, useEffect } from 'react';
import type { Habit } from '../types';
import BaseModal from './ui/BaseModal';
import { XIcon, PlusIcon, PencilIcon, TrashIcon, CheckIcon } from './icons';

interface ManageHabitsModalProps {
  isOpen: boolean;
  onClose: () => void;
  habits: Habit[];
  onAddHabit: (habit: Omit<Habit, 'id' | 'createdAt'>) => void;
  onUpdateHabit: (habit: Habit) => void;
  onDeleteHabit: (habitId: string) => void;
}

const ManageHabitsModal: React.FC<ManageHabitsModalProps> = ({
  isOpen,
  onClose,
  habits,
  onAddHabit,
  onUpdateHabit,
  onDeleteHabit,
}) => {
  const [newHabitName, setNewHabitName] = useState('');
  const [editingHabit, setEditingHabit] = useState<{ id: string; name: string } | null>(null);
  const [notificationPermission, setNotificationPermission] = useState(() => ('Notification' in window ? window.Notification.permission : 'default'));
  const [globalTime, setGlobalTime] = useState('');

  useEffect(() => {
    if (isOpen) {
      setNewHabitName('');
      setEditingHabit(null);
      if ('Notification' in window) {
        setNotificationPermission(window.Notification.permission);
      }
    }
  }, [isOpen]);

  const requestNotificationPermission = async () => {
    if ('Notification' in window) {
      const permission = await window.Notification.requestPermission();
      setNotificationPermission(permission);
      if (permission !== 'granted') {
        alert('알림 권한이 거부되었습니다. 원활한 기능 사용을 위해 브라우저 설정에서 알림을 허용해주세요.');
      }
    } else {
        alert('이 브라우저는 알림을 지원하지 않습니다.');
    }
  };

  const handleAdd = () => {
    if (newHabitName.trim()) {
      onAddHabit({ name: newHabitName.trim(), frequency: 'daily', notificationTime: globalTime || undefined });
      setNewHabitName('');
    }
  };

  const handleUpdate = () => {
    if (editingHabit && editingHabit.name.trim()) {
        const habitToUpdate = habits.find(h => h.id === editingHabit.id);
        if (habitToUpdate) {
             onUpdateHabit({ ...habitToUpdate, name: editingHabit.name.trim() });
        }
        setEditingHabit(null);
    }
  };

  const handleDelete = (habitId: string) => {
    if (window.confirm('이 습관을 삭제하시겠습니까? 관련된 모든 기록도 삭제됩니다.')) {
      onDeleteHabit(habitId);
    }
  };

  const applyGlobalTime = () => {
    if (!globalTime) {
      alert('전체 적용할 시간을 먼저 선택해주세요.');
      return;
    }
    const confirmApply = window.confirm(`모든 습관의 알림 시간을 ${globalTime}으로 설정하시겠습니까?`);
    if (confirmApply) {
        habits.forEach(habit => {
            onUpdateHabit({ ...habit, notificationTime: globalTime });
        });
        alert('모든 습관에 알림 시간이 적용되었습니다.');
    }
  };

  return (
    <BaseModal isOpen={isOpen} onClose={onClose} className="max-w-lg w-full">
      <div className="p-4 border-b border-[var(--border-color)] flex justify-between items-center">
        <h2 className="text-xl font-bold text-[var(--text-primary)]">습관 및 알림 관리</h2>
        <button onClick={onClose} className="text-[var(--text-muted)] hover:text-[var(--text-primary)]">
          <XIcon className="h-6 w-6" />
        </button>
      </div>
      <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto custom-scrollbar">
        {/* Notification settings */}
        <div className="p-3 bg-[var(--background-tertiary)] rounded-lg space-y-3">
            <h3 className="text-base font-semibold text-[var(--text-primary)]">알림 설정</h3>
            {notificationPermission !== 'granted' ? (
                <div className="flex items-center justify-between">
                    <p className="text-sm text-[var(--text-danger)]">알림 권한이 필요합니다.</p>
                    <button onClick={requestNotificationPermission} className="px-3 py-1 bg-[var(--background-accent)] text-white text-sm rounded-md">권한 요청</button>
                </div>
            ) : (
                <div className="flex items-end gap-2">
                    <div className="flex-grow">
                        <label className="block text-sm font-medium text-[var(--text-secondary)]">일괄 설정</label>
                        <input
                            type="time"
                            value={globalTime}
                            onChange={e => setGlobalTime(e.target.value)}
                            className="mt-1 w-full p-2 border border-[var(--border-color-strong)] rounded-md bg-[var(--background-primary)]"
                        />
                    </div>
                    <button onClick={applyGlobalTime} className="px-3 py-2 bg-[var(--background-secondary)] border border-[var(--border-color-strong)] rounded-md text-sm font-medium text-[var(--text-secondary)]">전체 적용</button>
                </div>
            )}
        </div>

        {/* Add new habit section */}
        <div className="flex items-center gap-2 pt-4 border-t border-[var(--border-color)]">
          <input
            type="text"
            value={newHabitName}
            onChange={(e) => setNewHabitName(e.target.value)}
            placeholder="새 습관 이름"
            className="flex-grow p-2 border border-[var(--border-color-strong)] rounded-md bg-[var(--background-tertiary)]"
            onKeyPress={(e) => e.key === 'Enter' && handleAdd()}
          />
          <button
            onClick={handleAdd}
            className="flex items-center justify-center px-4 py-2 bg-[var(--background-accent)] text-[var(--text-on-accent)] rounded-md text-sm font-medium hover:bg-[var(--background-accent-hover)] shrink-0"
          >
            <PlusIcon className="h-5 w-5 mr-1" />
            추가
          </button>
        </div>
        
        {/* Habit list section */}
        <div className="space-y-2 pt-4 border-t border-[var(--border-color)]">
          <h3 className="text-base font-semibold text-[var(--text-primary)] mb-2">습관 목록</h3>
          {habits.map((habit) => (
            <div key={habit.id} className="p-2 flex items-center justify-between bg-[var(--background-primary)] rounded-md">
              {editingHabit?.id === habit.id ? (
                <>
                  <input
                    type="text"
                    value={editingHabit.name}
                    onChange={(e) => setEditingHabit({ ...editingHabit, name: e.target.value })}
                    className="flex-grow p-1 border-b bg-transparent focus:border-[var(--background-accent)] outline-none text-[var(--text-primary)] font-medium border-[var(--border-color-strong)]"
                    onKeyPress={(e) => e.key === 'Enter' && handleUpdate()}
                    autoFocus
                  />
                   <div className="flex items-center gap-1 shrink-0 ml-2">
                      <button onClick={handleUpdate} className="p-2 text-green-500 hover:bg-green-500/10 rounded-full" aria-label="저장"><CheckIcon className="h-5 w-5"/></button>
                      <button onClick={() => setEditingHabit(null)} className="p-2 text-[var(--text-muted)] hover:bg-gray-500/10 rounded-full" aria-label="취소"><XIcon className="h-5 w-5"/></button>
                   </div>
                </>
              ) : (
                <>
                  <div className="flex-grow flex items-center gap-2">
                    <span className="font-medium text-[var(--text-primary)]">{habit.name}</span>
                    <input
                      type="time"
                      value={habit.notificationTime || ''}
                      onChange={(e) => onUpdateHabit({ ...habit, notificationTime: e.target.value })}
                      className="p-1 border border-[var(--border-color-strong)] rounded-md bg-[var(--background-tertiary)] w-28"
                      disabled={notificationPermission !== 'granted'}
                    />
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => setEditingHabit({ id: habit.id, name: habit.name })} className="p-2 text-[var(--text-muted)] hover:text-[var(--text-accent)]" aria-label="수정">
                      <PencilIcon className="h-5 w-5" />
                    </button>
                    <button onClick={() => handleDelete(habit.id)} className="p-2 text-[var(--text-muted)] hover:text-[var(--text-danger)]" aria-label="삭제">
                      <TrashIcon className="h-5 w-5" />
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      </div>
      <div className="p-4 bg-[var(--background-tertiary)] border-t border-[var(--border-color)] flex justify-end">
        <button onClick={onClose} className="px-4 py-2 bg-[var(--background-secondary)] border border-[var(--border-color-strong)] rounded-md text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--background-primary)]">
          닫기
        </button>
      </div>
    </BaseModal>
  );
};

export default ManageHabitsModal;
