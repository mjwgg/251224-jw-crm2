import React, { useMemo, useState } from 'react';
import type { Habit, HabitLog } from '../types';
import { PlusIcon, CheckIcon, ChartBarIcon } from './icons';
import ManageHabitsModal from './ManageHabitsModal';
import HabitStatsModal from './HabitStatsModal';

interface HabitTrackerProps {
  habits: Habit[];
  habitLogs: HabitLog[];
  onAddHabit: (habit: Omit<Habit, 'id' | 'createdAt'>) => void;
  onUpdateHabit: (habit: Habit) => void;
  onDeleteHabit: (habitId: string) => void;
  onLogHabit: (habitId: string, date: string, completed: boolean) => void;
}

const getMonthCalendarDays = (date: Date): Date[] => {
    const year = date.getFullYear();
    const month = date.getMonth();
    
    // Start from the first day of the month
    const firstDayOfMonth = new Date(year, month, 1);
    
    // Determine the day of the week (0=Sun, 1=Mon, ..., 6=Sat)
    const dayOfWeek = firstDayOfMonth.getDay();
    
    // Calculate the start date of the calendar view (Monday of the first week)
    const startDate = new Date(firstDayOfMonth);
    const offset = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // We want Monday to be the first day of the week
    startDate.setDate(startDate.getDate() - offset);

    const days = [];
    // Generate 42 days (6 weeks) for the calendar grid
    for (let i = 0; i < 42; i++) {
        const day = new Date(startDate);
        day.setDate(startDate.getDate() + i);
        days.push(day);
    }
    return days;
};


const habitColors = [
  'bg-orange-400', 'bg-yellow-400', 'bg-green-400', 'bg-blue-400', 'bg-purple-400', 'bg-pink-400', 'bg-teal-400', 'bg-indigo-400'
];
const textColor = 'text-black';

const HabitTracker: React.FC<HabitTrackerProps> = ({ habits, habitLogs, onAddHabit, onUpdateHabit, onDeleteHabit, onLogHabit }) => {
  const [isManageModalOpen, setIsManageModalOpen] = useState(false);
  const [viewDate, setViewDate] = useState(new Date());
  const [viewingStatsForHabit, setViewingStatsForHabit] = useState<Habit | null>(null);

  const todayStr = useMemo(() => {
    const today = new Date();
    return new Date(today.getTime() - (today.getTimezoneOffset() * 60000)).toISOString().split('T')[0];
  }, []);

  const completedHabitsToday = useMemo(() => {
    const set = new Set<string>();
    habitLogs.forEach(log => {
      if (log.date === todayStr && log.completed) {
        set.add(log.habitId);
      }
    });
    return set;
  }, [habitLogs, todayStr]);

  const calendarDays = useMemo(() => getMonthCalendarDays(viewDate), [viewDate]);
  
  const logsByHabitAndDate = useMemo(() => {
      const map = new Map<string, Set<string>>(); // key: habitId, value: Set of 'YYYY-MM-DD'
      habitLogs.forEach(log => {
          if (log.completed) {
              if (!map.has(log.habitId)) {
                  map.set(log.habitId, new Set());
              }
              map.get(log.habitId)!.add(log.date);
          }
      });
      return map;
  }, [habitLogs]);

  const handleToggle = (habitId: string, isCompleted: boolean) => {
    onLogHabit(habitId, todayStr, !isCompleted);
  };
  
  const handleCalendarToggle = (habitId: string, date: Date) => {
      const dateStr = new Date(date.getTime() - (date.getTimezoneOffset() * 60000)).toISOString().split('T')[0];
      const isCompleted = logsByHabitAndDate.get(habitId)?.has(dateStr) || false;
      onLogHabit(habitId, dateStr, !isCompleted);
  };

  const handleKeyDown = (e: React.KeyboardEvent, habitId: string, isCompleted: boolean) => {
    if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handleToggle(habitId, isCompleted);
    }
  };
  
  const handleCalendarKeyDown = (e: React.KeyboardEvent, habitId: string, date: Date) => {
    if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handleCalendarToggle(habitId, date);
    }
  };
  
  const handlePeriodChange = (offset: number) => {
    setViewDate(current => {
        const newDate = new Date(current);
        newDate.setDate(1); // Avoids issues with month-end dates
        newDate.setMonth(newDate.getMonth() + offset);
        return newDate;
    });
  };

  return (
    <div className="animate-fade-in">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold text-[var(--text-primary)]">습관 관리</h2>
        <button
          onClick={() => setIsManageModalOpen(true)}
          className="flex items-center gap-2 px-3 py-2 bg-[var(--background-accent-subtle)] text-[var(--text-accent)] rounded-md text-sm font-medium hover:bg-opacity-80"
        >
          <PlusIcon className="h-4 w-4" />
          습관 추가/관리
        </button>
      </div>
      <div className="bg-[var(--background-secondary)] p-4 rounded-lg shadow-md border border-[var(--border-color)]">
        <h3 className="text-xl font-semibold text-[var(--text-primary)] mb-4 flex items-center">
            <CheckIcon className="h-6 w-6 mr-3 text-green-400"/>
            오늘의 습관
        </h3>
        {habits.length === 0 ? (
          <div className="text-center py-10 text-[var(--text-muted)]">
            <p className="text-lg font-semibold">아직 등록된 습관이 없습니다.</p>
            <p className="text-sm mt-2">'새 습관 추가' 버튼을 눌러 당신의 성공을 이끌 첫 습관을 만들어보세요.</p>
          </div>
        ) : (
          <div className="flex flex-wrap gap-3">
            {habits.map(habit => {
              const isCompleted = completedHabitsToday.has(habit.id);
              return (
                <div
                  key={habit.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => handleToggle(habit.id, isCompleted)}
                  onKeyDown={(e) => handleKeyDown(e, habit.id, isCompleted) }
                  className={`flex items-center gap-2 px-3 py-2 rounded-full cursor-pointer transition-all duration-200 border-2 ${
                    isCompleted
                      ? 'bg-[var(--background-accent-subtle)] border-transparent ring-2 ring-[var(--background-accent)]'
                      : 'bg-[var(--background-tertiary)] border-transparent hover:border-[var(--background-accent)]'
                  }`}
                >
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center border-2 transition-colors flex-shrink-0 ${
                    isCompleted 
                      ? 'bg-[var(--background-accent)] border-[var(--background-accent)]' 
                      : 'border-[var(--border-color-strong)]'
                  }`}>
                    {isCompleted && <CheckIcon className="w-3 h-3 text-white" />}
                  </div>
                  <span className={`text-sm font-medium ${isCompleted ? 'line-through text-[var(--text-muted)]' : 'text-[var(--text-primary)]'}`}>
                    {habit.name}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="mt-8">
        <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-[var(--text-primary)]">월별 보기</h2>
             <div className="flex items-center gap-2">
                <button onClick={() => handlePeriodChange(-1)} className="px-3 py-2 bg-[var(--background-tertiary)] rounded-md hover:bg-[var(--background-primary)]">&lt;</button>
                <span className="font-semibold text-center w-28">{viewDate.getFullYear()}년 {viewDate.getMonth() + 1}월</span>
                <button onClick={() => handlePeriodChange(1)} className="px-3 py-2 bg-[var(--background-tertiary)] rounded-md hover:bg-[var(--background-primary)]">&gt;</button>
                <button onClick={() => setViewDate(new Date())} className="px-4 py-2 text-sm font-medium border border-[var(--border-color-strong)] bg-[var(--background-tertiary)] text-[var(--text-secondary)] rounded-md hover:bg-[var(--background-primary)]">오늘</button>
            </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {habits.map((habit, index) => {
                const colorClass = habitColors[index % habitColors.length];
                const completedDates = logsByHabitAndDate.get(habit.id) || new Set();

                return (
                    <div key={habit.id} className="bg-[var(--background-secondary)] p-4 rounded-lg shadow-md border border-[var(--border-color)]">
                        <div className="flex justify-between items-center mb-3">
                          <h3 className="text-lg font-bold text-[var(--text-primary)]">{habit.name}</h3>
                          <button
                            onClick={() => setViewingStatsForHabit(habit)}
                            className="flex items-center gap-1.5 px-3 py-1 bg-[var(--background-tertiary)] text-[var(--text-secondary)] text-xs font-medium rounded-md hover:bg-[var(--background-primary)] border border-[var(--border-color-strong)]"
                          >
                            <ChartBarIcon className="h-4 w-4" />
                            상세 통계
                          </button>
                        </div>
                        <div className="grid grid-cols-7 gap-1 text-center text-xs font-semibold text-[var(--text-muted)] mb-2">
                            {['월', '화', '수', '목', '금', '토', '일'].map(day => <div key={day}>{day}</div>)}
                        </div>
                        <div className="grid grid-cols-7 gap-1">
                            {calendarDays.map((day, dayIndex) => {
                                const dateStr = new Date(day.getTime() - (day.getTimezoneOffset() * 60000)).toISOString().split('T')[0];
                                const isCompleted = completedDates.has(dateStr);
                                const isCurrentMonth = day.getMonth() === viewDate.getMonth();
                                const isToday = dateStr === todayStr;

                                return (
                                    <div
                                        key={dayIndex}
                                        role="button"
                                        tabIndex={0}
                                        onClick={() => handleCalendarToggle(habit.id, day)}
                                        onKeyDown={(e) => handleCalendarKeyDown(e, habit.id, day)}
                                        className={`w-full aspect-square rounded-lg flex items-center justify-center cursor-pointer transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[var(--background-accent)] ${!isCurrentMonth ? 'text-[var(--text-muted)] opacity-50' : 'text-[var(--text-primary)]'}`}
                                        aria-label={`${habit.name} - ${dateStr} - ${isCompleted ? '완료' : '미완료'}`}
                                    >
                                        <div className={`w-full h-full rounded-md flex items-center justify-center transition-all duration-200 ${isCompleted ? `${colorClass} ${textColor}` : 'bg-transparent'} ${isToday ? 'ring-2 ring-[var(--background-accent)]' : ''}`}>
                                            <span className="text-sm font-medium">{day.getDate()}</span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                );
            })}
        </div>
      </div>

      <ManageHabitsModal
        isOpen={isManageModalOpen}
        onClose={() => setIsManageModalOpen(false)}
        habits={habits}
        onAddHabit={onAddHabit}
        onUpdateHabit={onUpdateHabit}
        onDeleteHabit={onDeleteHabit}
      />
      <HabitStatsModal 
        isOpen={!!viewingStatsForHabit}
        onClose={() => setViewingStatsForHabit(null)}
        habit={viewingStatsForHabit}
        habitLogs={habitLogs}
      />
    </div>
  );
};

export default HabitTracker;
