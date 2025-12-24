import React, { useState, useEffect, useRef } from 'react';
import type { Customer } from '../types';
import { CakeIcon, GiftIcon, XIcon, CalendarIcon } from './icons';

// Daily notification type
interface DailyEventNotification {
  id: string;
  customer: Customer;
  type: 'birthday' | 'anniversary';
}

// Weekly event type
interface WeeklyEvent {
  customer: Customer;
  type: 'birthday' | 'anniversary';
  date: Date;
}

interface EventNotifierProps {
  customers: Customer[];
  onSelectCustomer: (customer: Customer, initialTab?: 'details' | 'consultations' | 'contracts' | 'callHistory') => void;
}

const isToday = (dateString?: string): boolean => {
  if (!dateString) return false;
  const today = new Date();
  const eventDate = new Date(dateString);
  return today.getMonth() === eventDate.getMonth() && today.getDate() === eventDate.getDate();
};

const getWeekNumber = (d: Date): number => {
    d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
    return weekNo;
};

// FIX: Changed component definition to use React.FC to resolve a TypeScript error where the 'key' prop was not recognized and to fix "Cannot find namespace 'JSX'" error.
const DailyNotificationToast: React.FC<{ notification: DailyEventNotification; onSelect: (customer: Customer) => void; onRemove: (id: string) => void; }> = ({ notification, onSelect, onRemove }) => {
  const { customer, type } = notification;
  const isBirthday = type === 'birthday';
  
  return (
    <div className="bg-white rounded-lg shadow-lg p-4 w-80 animate-fade-in-up border border-gray-200">
      <div className="flex items-start">
        <div className={`flex-shrink-0 p-2 rounded-full mr-4 ${isBirthday ? 'bg-pink-100' : 'bg-red-100'}`}>
          {isBirthday ? <CakeIcon className="h-6 w-6 text-pink-500" /> : <GiftIcon className="h-6 w-6 text-red-500" />}
        </div>
        <div className="flex-1">
          <p className="font-semibold text-gray-800">
            {isBirthday ? '오늘의 생일' : '오늘의 기념일'}
          </p>
          <p className="text-sm text-gray-600 mt-1">
            오늘은 <span className="font-bold">{customer.name}</span>님의 소중한 {isBirthday ? '생일' : '기념일'}입니다!
          </p>
          <button
            onClick={() => {
              onSelect(customer);
              onRemove(notification.id);
            }}
            className="mt-2 text-sm text-indigo-600 hover:underline font-medium"
          >
            고객 정보 보기
          </button>
        </div>
        <button onClick={() => onRemove(notification.id)} className="text-gray-400 hover:text-gray-600 ml-2">
          <XIcon className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
};


const EventNotifier: React.FC<EventNotifierProps> = ({ customers, onSelectCustomer }) => {
  const [dailyNotifications, setDailyNotifications] = useState<DailyEventNotification[]>([]);
  const [weeklyEvents, setWeeklyEvents] = useState<WeeklyEvent[]>([]);
  const [showWeeklyReminder, setShowWeeklyReminder] = useState(false);
  
  const dailyNotifiedIds = useRef<Set<string>>(new Set());

  useEffect(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // --- Daily Event Logic ---
    const todayEvents: DailyEventNotification[] = [];
    customers.forEach(customer => {
      if (customer.birthday && isToday(customer.birthday)) {
        const id = `${customer.id}-birthday`;
        if (!dailyNotifiedIds.current.has(id)) {
          todayEvents.push({ id, customer, type: 'birthday' });
          dailyNotifiedIds.current.add(id);
        }
      }
      // FIX: The 'anniversary' property does not exist on Customer. Use 'namedAnniversaries' instead.
      customer.namedAnniversaries?.forEach(ann => {
        if (isToday(ann.date)) {
            const id = `${customer.id}-anniversary-${ann.id}`;
            if (!dailyNotifiedIds.current.has(id)) {
                todayEvents.push({ id, customer, type: 'anniversary' });
                dailyNotifiedIds.current.add(id);
            }
        }
      });
    });

    if (todayEvents.length > 0) {
        setDailyNotifications(prev => [...prev, ...todayEvents]);
    }

    // --- Weekly Event Logic ---
    const isMonday = today.getDay() === 1; // 0=Sun, 1=Mon
    const currentYear = today.getFullYear();
    const currentWeek = getWeekNumber(today);
    const weeklyReminderKey = `weeklyReminderShown_${currentYear}_${currentWeek}`;

    if (isMonday && !sessionStorage.getItem(weeklyReminderKey)) {
        const startOfWeek = new Date(today);
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6);
        endOfWeek.setHours(23, 59, 59, 999);

        const eventsThisWeek: WeeklyEvent[] = [];
        
        customers.forEach(customer => {
            if (customer.birthday) {
                const birthDate = new Date(customer.birthday);
                const thisYearBirthday = new Date(currentYear, birthDate.getMonth(), birthDate.getDate());
                if (thisYearBirthday >= startOfWeek && thisYearBirthday <= endOfWeek) {
                    eventsThisWeek.push({ customer, type: 'birthday', date: thisYearBirthday });
                }
            }
            // FIX: The 'anniversary' property does not exist on Customer. Use 'namedAnniversaries' instead.
            customer.namedAnniversaries?.forEach(ann => {
                const anniDate = new Date(ann.date);
                const thisYearAnniversary = new Date(currentYear, anniDate.getMonth(), anniDate.getDate());
                if (thisYearAnniversary >= startOfWeek && thisYearAnniversary <= endOfWeek) {
                    eventsThisWeek.push({ customer, type: 'anniversary', date: thisYearAnniversary });
                }
            });
        });

        if (eventsThisWeek.length > 0) {
            eventsThisWeek.sort((a, b) => a.date.getTime() - b.date.getTime());
            setWeeklyEvents(eventsThisWeek);
            setShowWeeklyReminder(true);
            sessionStorage.setItem(weeklyReminderKey, 'true');
        }
    }
  }, [customers]);

  const removeDailyNotification = (id: string) => {
    setDailyNotifications(prev => prev.filter(n => n.id !== id));
  };

  const closeWeeklyReminder = () => {
    setShowWeeklyReminder(false);
  };
  
  if (dailyNotifications.length === 0 && !showWeeklyReminder) {
    return null;
  }


  const WeeklyReminderToast = () => (
    <div className="bg-white rounded-lg shadow-lg p-4 w-80 animate-fade-in-up border border-gray-200">
        <div className="flex justify-between items-center mb-3">
            <h3 className="font-semibold text-gray-800 flex items-center">
                <CalendarIcon className="h-6 w-6 mr-2 text-indigo-500" />
                이번 주 리마인더
            </h3>
            <button onClick={closeWeeklyReminder} className="text-gray-400 hover:text-gray-600">
                <XIcon className="h-5 w-5" />
            </button>
        </div>
        <div className="max-h-48 overflow-y-auto pr-2 -mr-2">
            <ul className="space-y-2">
                {weeklyEvents.map((event, index) => (
                    <li key={index} className="flex items-center text-sm">
                        {event.type === 'birthday' ? 
                            <CakeIcon className="h-4 w-4 text-pink-500 mr-2 shrink-0" /> : 
                            <GiftIcon className="h-4 w-4 text-red-500 mr-2 shrink-0" />}
                        <span className="text-gray-600">
                            {`${event.date.getMonth() + 1}/${event.date.getDate()}`}: 
                            <button 
                              onClick={() => {
                                  onSelectCustomer(event.customer);
                                  closeWeeklyReminder();
                              }}
                              className="font-semibold text-indigo-700 ml-1 hover:underline"
                            >
                                {event.customer.name}
                            </button>
                            님 {event.type === 'birthday' ? '생일' : '기념일'}
                        </span>
                    </li>
                ))}
            </ul>
        </div>
    </div>
  );

  return (
    <div className="fixed bottom-4 right-4 z-50 space-y-3">
      {showWeeklyReminder && <WeeklyReminderToast />}
      {dailyNotifications.map(notification => (
        <DailyNotificationToast key={notification.id} notification={notification} onSelect={onSelectCustomer} onRemove={removeDailyNotification} />
      ))}
    </div>
  );
};

export default EventNotifier;
