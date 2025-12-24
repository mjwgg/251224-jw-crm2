import React, { useMemo } from 'react';
import type { Habit, HabitLog } from '../types';
import BaseModal from './ui/BaseModal';
import { XIcon } from './icons';

interface HabitStatsModalProps {
  isOpen: boolean;
  onClose: () => void;
  habit: Habit | null;
  habitLogs: HabitLog[];
}

const StatCard: React.FC<{ title: string; value: string | number; subtitle?: string; }> = ({ title, value, subtitle }) => (
  <div className="bg-[var(--background-primary)] p-4 rounded-lg text-center border border-[var(--border-color)]">
    <p className="text-sm text-[var(--text-muted)]">{title}</p>
    <p className="text-3xl font-bold text-[var(--text-primary)] mt-1">{value}</p>
    {subtitle && <p className="text-xs text-[var(--text-muted)] mt-1">{subtitle}</p>}
  </div>
);

const HabitStatsModal: React.FC<HabitStatsModalProps> = ({ isOpen, onClose, habit, habitLogs }) => {
  const stats = useMemo(() => {
    if (!habit) return null;

    const logsForHabit = habitLogs.filter(log => log.habitId === habit.id && log.completed);
    const logDates = new Set(logsForHabit.map(log => log.date));

    // Streaks calculation
    let longestStreak = 0;
    let currentStreak = 0;
    if (logsForHabit.length > 0) {
        const sortedDates = logsForHabit.map(log => new Date(log.date)).sort((a, b) => a.getTime() - b.getTime());
        
        if (sortedDates.length > 0) {
            let streak = 1;
            longestStreak = 1;
            for (let i = 1; i < sortedDates.length; i++) {
                const diff = (sortedDates[i].getTime() - sortedDates[i-1].getTime()) / (1000 * 3600 * 24);
                if (diff === 1) {
                    streak++;
                } else if (diff > 1) {
                    longestStreak = Math.max(longestStreak, streak);
                    streak = 1;
                }
            }
            longestStreak = Math.max(longestStreak, streak);
        } else {
            longestStreak = 0;
        }
        
        
        // Current streak
        const today = new Date();
        today.setHours(0,0,0,0);
        const todayStr = new Date(today.getTime() - (today.getTimezoneOffset() * 60000)).toISOString().split('T')[0];

        if(logDates.has(todayStr)) {
            currentStreak = 1;
            let yesterday = new Date(today);
            yesterday.setDate(today.getDate() - 1);
            while(true) {
                const yesterdayStr = new Date(yesterday.getTime() - (yesterday.getTimezoneOffset() * 60000)).toISOString().split('T')[0];
                if(logDates.has(yesterdayStr)) {
                    currentStreak++;
                    yesterday.setDate(yesterday.getDate() - 1);
                } else {
                    break;
                }
            }
        }
    }

    // Overall stats
    const totalCompletions = logsForHabit.length;
    const creationDate = new Date(habit.createdAt);
    creationDate.setHours(0,0,0,0);
    const today = new Date();
    today.setHours(0,0,0,0);
    const daysSinceCreation = Math.ceil((today.getTime() - creationDate.getTime()) / (1000 * 3600 * 24)) + 1;
    const overallRate = daysSinceCreation > 0 ? (totalCompletions / daysSinceCreation) * 100 : 0;
    
    // Monthly breakdown
    const monthlyData: { month: string, rate: number, completed: number, totalDays: number }[] = [];
    const currentYear = new Date().getFullYear();
    for(let i=0; i<12; i++) {
        const firstDay = new Date(currentYear, i, 1);
        const lastDay = new Date(currentYear, i + 1, 0);
        let totalDaysInMonth = lastDay.getDate();
        
        const now = new Date();
        if (now.getFullYear() === currentYear && now.getMonth() === i) {
            totalDaysInMonth = now.getDate();
        } else if (new Date(currentYear, i) > now) {
            totalDaysInMonth = 0;
        }

        let completedInMonth = 0;
        if (totalDaysInMonth > 0) {
            for(let d=1; d<=totalDaysInMonth; d++) {
                const date = new Date(currentYear, i, d);
                 const dateStr = new Date(date.getTime() - (date.getTimezoneOffset() * 60000)).toISOString().split('T')[0];
                if(logDates.has(dateStr)) {
                    completedInMonth++;
                }
            }
        }

        monthlyData.push({
            month: `${i+1}월`,
            completed: completedInMonth,
            totalDays: totalDaysInMonth,
            rate: totalDaysInMonth > 0 ? (completedInMonth / totalDaysInMonth) * 100 : 0
        });
    }

    return { logDates, longestStreak, currentStreak, totalCompletions, overallRate, monthlyData };

  }, [habit, habitLogs]);

  const yearViewData = useMemo(() => {
    if (!habit || !stats) return { days: [], firstDayOffset: 0 };
    
    const year = new Date().getFullYear();
    const firstDayOfYear = new Date(year, 0, 1);
    let dayOfWeek = firstDayOfYear.getDay(); // 0 = Sunday
    const firstDayOffset = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // We want Monday to be the first day

    const daysInYear = (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0 ? 366 : 365;
    
    const days = Array.from({ length: daysInYear }, (_, i) => {
        const day = new Date(year, 0, i + 1);
        const dateStr = new Date(day.getTime() - (day.getTimezoneOffset() * 60000)).toISOString().split('T')[0];
        const isFuture = day > new Date();
        return {
            date: day,
            isCompleted: stats.logDates.has(dateStr),
            isFuture: isFuture,
            isInThePast: !isFuture && new Date(dateStr).setHours(0,0,0,0) < new Date().setHours(0,0,0,0)
        }
    });

    return { days, firstDayOffset };
  }, [habit, stats]);

  if (!isOpen || !habit || !stats) return null;

  return (
    <BaseModal isOpen={isOpen} onClose={onClose} className="max-w-4xl w-full h-[90vh]">
      <div className="p-4 border-b border-[var(--border-color)] flex justify-between items-center">
        <h2 className="text-xl font-bold text-[var(--text-primary)]">'{habit.name}' 상세 통계</h2>
        <button onClick={onClose} className="text-[var(--text-muted)] hover:text-[var(--text-primary)]"><XIcon className="h-6 w-6" /></button>
      </div>
      <div className="p-6 flex-1 min-h-0 overflow-y-auto custom-scrollbar space-y-6">
        {/* Key Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard title="현재 연속 달성" value={stats.currentStreak} subtitle="일" />
            <StatCard title="최장 연속 달성" value={stats.longestStreak} subtitle="일" />
            <StatCard title="총 달성 횟수" value={stats.totalCompletions} subtitle="회" />
            <StatCard title="전체 달성률" value={`${stats.overallRate.toFixed(1)}%`} />
        </div>
        
        {/* Annual View */}
        <div>
            <h3 className="text-lg font-semibold mb-3">{new Date().getFullYear()}년 달성 현황</h3>
            <div className="p-3 bg-[var(--background-tertiary)] rounded-lg">
                <div className="grid grid-cols-[1.5rem_1fr] gap-x-2">
                    <div className="text-xs text-[var(--text-muted)] flex flex-col justify-between pt-4 pb-1">
                        <span>월</span><span>수</span><span>금</span>
                    </div>
                    <div>
                        <div className="grid grid-cols-53 text-xs text-[var(--text-muted)] mb-1">
                            {Array.from({length: 12}).map((_, i) => (
                                <div key={i} className={`text-center ${i === 0 ? 'col-span-3' : 'col-span-4'}`}>{i+1}월</div>
                            ))}
                        </div>
                        <div className="grid grid-flow-col grid-rows-7 grid-cols-53 gap-0.5">
                            {Array.from({ length: yearViewData.firstDayOffset }).map((_, i) => <div key={`blank-${i}`} />)}
                            {yearViewData.days.map((day, i) => (
                                <div 
                                    key={i}
                                    className={`aspect-square rounded-sm ${day.isFuture ? 'bg-[var(--background-primary)]' : day.isCompleted ? 'bg-[var(--background-accent)]' : (day.isInThePast ? 'bg-[var(--border-color)]' : 'bg-[var(--background-primary)]')}`}
                                    title={`${day.date.toLocaleDateString()}: ${day.isCompleted ? '달성' : '미달성'}`}
                                />
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>

        {/* Monthly Breakdown */}
        <div>
            <h3 className="text-lg font-semibold mb-3">월별 달성률</h3>
            <div className="p-3 bg-[var(--background-tertiary)] rounded-lg">
                <div className="space-y-2">
                    {stats.monthlyData.map(data => (
                        <div key={data.month} className="grid grid-cols-[3rem_1fr_5rem] items-center gap-2 text-sm">
                            <span className="font-medium">{data.month}</span>
                            <div className="w-full bg-[var(--border-color)] rounded-full h-4">
                                <div className="bg-[var(--background-accent)] h-4 rounded-full" style={{width: `${data.rate}%`}}></div>
                            </div>
                            <span className="text-xs text-right text-[var(--text-muted)]">{data.completed > 0 || data.totalDays > 0 ? `${data.completed} / ${data.totalDays}일 (${data.rate.toFixed(0)}%)` : '-'}</span>
                        </div>
                    ))}
                </div>
            </div>
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

export default HabitStatsModal;
