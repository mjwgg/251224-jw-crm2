
import React, { useState, useMemo } from 'react';
import type { Appointment, Customer } from '../types';
import BaseModal from './ui/BaseModal';
import { CalendarIcon, ClockIcon, BriefcaseIcon, DocumentTextIcon, PencilIcon, TrashIcon, SparklesIcon, XIcon, InfoIcon, CalendarDownloadIcon, UsersIcon, PhoneIcon } from './icons';

interface AppointmentDetailModalProps {
  appointment: Appointment & { occurrenceDate?: string };
  customers: Customer[];
  onClose: () => void;
  onEdit: (appointment: Appointment) => void;
  onDelete: (appointmentId: string) => Promise<void>;
  onAddException: (appointmentId: string, exceptionDate: string) => Promise<void>;
  onEndRecurrence: (appointmentId: string, endDate: string) => Promise<void>;
  onSelectCustomer: (customer: Customer) => void;
}

const formatRecurrence = (app: Appointment): string => {
    if (!app.recurrenceType || app.recurrenceType === 'none') {
        return '반복 없음';
    }
    const interval = app.recurrenceInterval || 1;
    let text = '';
    switch (app.recurrenceType) {
        case 'daily':
            text = interval > 1 ? `${interval}일마다` : '매일';
            break;
        case 'weekly':
            const days = ['일', '월', '화', '수', '목', '금', '토'];
// @FIX: Used a type-safe map/filter operation to process recurrenceDays. This resolves a potential runtime error if recurrenceDays is not an array of numbers.
            const numericRecurrenceDays: number[] = Array.isArray(app.recurrenceDays) ? app.recurrenceDays.map((v): number => Number(v)).filter(n => !isNaN(n) && n >= 0 && n < 7) : [];
            const selectedDays = numericRecurrenceDays.map(d => days[d]).join(', ');
            text = interval > 1 ? `${interval}주마다 ${selectedDays}요일` : `매주 ${selectedDays}요일`;
            break;
        case 'monthly':
            text = interval > 1 ? `${interval}개월마다` : '매월';
            break;
        case 'yearly':
            text = interval > 1 ? `${interval}년마다` : '매년';
            if (app.isLunar) text += ' (음력)';
            break;
    }
    if (app.recurrenceEndDate) {
        text += ` (${app.recurrenceEndDate}까지)`;
    }
    return text;
};

const DetailItem: React.FC<{ icon: React.ReactNode; label: string; children: React.ReactNode }> = ({ icon, label, children }) => (
    <div className="flex items-start">
        <div className="flex-shrink-0 w-8 text-center text-[var(--text-muted)] pt-1">{icon}</div>
        <div className="ml-4 flex-grow">
            <p className="text-sm font-medium text-[var(--text-muted)]">{label}</p>
            <div className="text-base text-[var(--text-primary)] font-medium mt-1">{children}</div>
        </div>
    </div>
);

export const AppointmentDetailModal: React.FC<AppointmentDetailModalProps> = ({ appointment, customers, onClose, onEdit, onDelete, onAddException, onEndRecurrence, onSelectCustomer }) => {
    const [deleteConfirmation, setDeleteConfirmation] = useState(false);
    const isPersonalMemo = !appointment.customerId;
    const occurrenceDate = appointment.occurrenceDate || appointment.date;

    const customer = useMemo(() => {
        if (!appointment.customerId || !customers) return null;
        return customers.find(c => c.id === appointment.customerId);
    }, [appointment.customerId, customers]);

    const generateICS = (app: Appointment) => {
        const toICSDate = (date: Date) => {
            return date.getUTCFullYear() +
                ('0' + (date.getUTCMonth() + 1)).slice(-2) +
                ('0' + date.getUTCDate()).slice(-2) + 'T' +
                ('0' + date.getUTCHours()).slice(-2) +
                ('0' + date.getUTCMinutes()).slice(-2) +
                ('0' + date.getUTCSeconds()).slice(-2) + 'Z';
        };

        const startDate = new Date(`${app.date}T${app.time}`);
        const endDate = new Date(startDate.getTime() + 60 * 60 * 1000); // Assume 1 hour duration

        let icsString = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//MyCRM//NONSGML v1.0//EN
BEGIN:VEVENT
UID:${app.id}@mycrm.app
DTSTAMP:${toICSDate(new Date())}
DTSTART:${toICSDate(startDate)}
DTEND:${toICSDate(endDate)}
SUMMARY:${app.title || app.customerName || '일정'}
LOCATION:${app.location || ''}
DESCRIPTION:${(app.notes || '').replace(/\n/g, '\\n')}
`;

        if (app.recurrenceType && app.recurrenceType !== 'none') {
            const freqMap = { daily: 'DAILY', weekly: 'WEEKLY', monthly: 'MONTHLY', yearly: 'YEARLY' };
            let rrule = `RRULE:FREQ=${freqMap[app.recurrenceType]}`;
            if (app.recurrenceInterval && app.recurrenceInterval > 1) {
                rrule += `;INTERVAL=${app.recurrenceInterval}`;
            }
            if (app.recurrenceType === 'weekly' && Array.isArray(app.recurrenceDays) && app.recurrenceDays.length > 0) {
                const dayMap = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];
                const days: number[] = (app.recurrenceDays || []).map(v => Number(v)).filter(n => !isNaN(n));
                rrule += `;BYDAY=${days.map(d => dayMap[d]).join(',')}`;
            }
            if (app.recurrenceEndDate) {
                const untilDate = new Date(`${app.recurrenceEndDate}T23:59:59`);
                rrule += `;UNTIL=${toICSDate(untilDate)}`;
            }
            icsString += rrule + '\n';
        }

        icsString += `END:VEVENT
END:VCALENDAR`;
        return icsString;
    };

    const handleExport = () => {
        const icsContent = generateICS(appointment);
        const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
        const link = document.createElement('a');
        const filename = (appointment.title || appointment.customerName || 'appointment').replace(/[^a-z0-9]/gi, '_').toLowerCase();
        link.href = URL.createObjectURL(blob);
        link.download = `${filename}.ics`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(link.href);
    };

    const handleDeleteClick = async () => {
        if (appointment.recurrenceType && appointment.recurrenceType !== 'none') {
            setDeleteConfirmation(true);
        } else {
            if (window.confirm('이 일정을 삭제하시겠습니까?')) {
                await onDelete(appointment.id);
                onClose();
            }
        }
    };

    const handleSeriesDelete = async () => {
        await onDelete(appointment.id);
        setDeleteConfirmation(false);
        onClose();
    };

    const handleOccurrenceDelete = async () => {
        await onAddException(appointment.id, occurrenceDate);
        setDeleteConfirmation(false);
        onClose();
    };

    const handleFutureDelete = async () => {
        const dayBefore = new Date(occurrenceDate);
        dayBefore.setDate(dayBefore.getDate() - 1);
        const endDateStr = new Date(dayBefore.getTime() - (dayBefore.getTimezoneOffset() * 60000)).toISOString().split('T')[0];
        await onEndRecurrence(appointment.id, endDateStr);
        setDeleteConfirmation(false);
        onClose();
    };

    return (
        <>
        <BaseModal isOpen={true} onClose={onClose} className="max-w-2xl w-full">
            <div className="p-4 border-b border-[var(--border-color)] flex justify-between items-center flex-shrink-0">
                <h2 className="text-xl font-bold text-[var(--text-primary)]">일정 상세 정보</h2>
                <button onClick={onClose} className="text-[var(--text-muted)] hover:text-[var(--text-primary)]"><XIcon className="h-6 w-6" /></button>
            </div>
            
            <div className="p-6 space-y-6 overflow-y-auto custom-scrollbar flex-1 min-h-0">
                <h3 className="text-xl font-bold text-[var(--text-accent)]">{appointment.title || appointment.customerName}</h3>
                
                {customer && (
                    <DetailItem icon={<UsersIcon className="h-6 w-6" />} label="고객 정보">
                        <div className="flex items-center gap-4 flex-wrap">
                            <span className="font-bold">{customer.name}</span>
                            {customer.contact && customer.contact !== '미확인' && (
                                <a href={`tel:${customer.contact.replace(/\D/g, '')}`} className="flex items-center gap-1 text-sm text-[var(--text-accent)] hover:underline">
                                    <PhoneIcon className="h-4 w-4" />
                                    {customer.contact}
                                </a>
                            )}
                            <button onClick={() => onSelectCustomer(customer)} className="text-sm font-semibold text-[var(--text-accent)] hover:underline px-3 py-1 bg-[var(--background-accent-subtle)] rounded-md">
                                상세정보 보기
                            </button>
                        </div>
                    </DetailItem>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <DetailItem icon={<CalendarIcon className="h-6 w-6" />} label="날짜">
                        {occurrenceDate}
                    </DetailItem>
                    <DetailItem icon={<ClockIcon className="h-6 w-6" />} label="시간">
                        {appointment.time}
                    </DetailItem>
                    {appointment.location && (
                        <DetailItem icon={<InfoIcon className="h-6 w-6" />} label="장소">
                           {appointment.location}
                        </DetailItem>
                    )}
                    <DetailItem icon={<BriefcaseIcon className="h-6 w-6" />} label="유형">
                        {appointment.meetingType}
                    </DetailItem>
                </div>

                <DetailItem icon={<InfoIcon className="h-6 w-6" />} label="반복">
                    {formatRecurrence(appointment)}
                </DetailItem>

                {appointment.notes && (
                    <DetailItem icon={<DocumentTextIcon className="h-6 w-6" />} label="메모">
                        <pre className="whitespace-pre-wrap font-sans bg-[var(--background-tertiary)] p-3 rounded-md text-sm">{appointment.notes}</pre>
                    </DetailItem>
                )}
                
                {isPersonalMemo && (appointment.summary || (appointment.keywords && appointment.keywords.length > 0)) && (
                     <DetailItem icon={<SparklesIcon className="h-6 w-6" />} label="AI 분석">
                        <div className="space-y-3 bg-[var(--background-tertiary)] p-3 rounded-md">
                            {appointment.summary && <p className="text-sm italic">"{appointment.summary}"</p>}
                            {appointment.keywords && appointment.keywords.length > 0 && <p className="text-sm"><strong className="font-semibold">키워드:</strong> {appointment.keywords.join(', ')}</p>}
                            {appointment.actionItems && appointment.actionItems.length > 0 && (
                                <div>
                                    <p className="text-sm font-semibold">실행 항목:</p>
                                    <ul className="list-disc list-inside ml-2 text-sm">
                                        {appointment.actionItems.map((item, index) => <li key={index}>{item}</li>)}
                                    </ul>
                                </div>
                            )}
                        </div>
                     </DetailItem>
                )}
            </div>

            <div className="p-4 bg-[var(--background-tertiary)] border-t border-[var(--border-color)] flex justify-between items-center flex-shrink-0">
                <div className="flex gap-2">
                    <button onClick={handleDeleteClick} className="flex items-center gap-2 px-4 py-2 bg-[var(--background-danger)] text-white rounded-md text-sm font-medium hover:bg-[var(--background-danger-hover)]">
                        <TrashIcon className="h-5 w-5" /> 삭제
                    </button>
                    <button onClick={handleExport} className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-md text-sm font-medium hover:bg-green-700">
                        <CalendarDownloadIcon className="h-5 w-5" /> ICS 내보내기
                    </button>
                </div>
                <div className="flex gap-4">
                    <button onClick={onClose} className="px-4 py-2 bg-[var(--background-tertiary)] border border-[var(--border-color-strong)] rounded-md text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--background-primary)]">닫기</button>
                    <button onClick={() => onEdit(appointment)} className="flex items-center gap-2 px-6 py-2 bg-[var(--background-accent)] text-[var(--text-on-accent)] rounded-md text-sm font-medium hover:bg-[var(--background-accent-hover)]">
                        <PencilIcon className="h-5 w-5" /> 수정
                    </button>
                </div>
            </div>
        </BaseModal>
        {deleteConfirmation && (
            <div className="fixed inset-0 bg-[var(--background-overlay)] z-[60] flex items-center justify-center p-4">
                <div className="bg-[var(--background-secondary)] rounded-lg shadow-xl max-w-sm w-full p-6 text-center">
                    <h3 className="text-lg font-semibold text-[var(--text-primary)]">삭제 옵션</h3>
                    <p className="text-sm text-[var(--text-muted)] mt-2 mb-6">이 반복 일정의 어떤 부분을 삭제하시겠습니까?</p>
                    <div className="space-y-3">
                        <button onClick={handleOccurrenceDelete} className="w-full px-4 py-2 bg-[var(--background-tertiary)] text-[var(--text-secondary)] text-sm font-medium rounded-md hover:bg-[var(--background-primary)] border border-[var(--border-color-strong)]">이 일정만 삭제</button>
                        <button onClick={handleFutureDelete} className="w-full px-4 py-2 bg-[var(--background-tertiary)] text-[var(--text-secondary)] text-sm font-medium rounded-md hover:bg-[var(--background-primary)] border border-[var(--border-color-strong)]">이 일정 및 향후 일정 수정</button>
                        <button onClick={handleSeriesDelete} className="w-full px-4 py-2 bg-[var(--background-danger)] text-white text-sm font-medium rounded-md hover:bg-[var(--background-danger-hover)]">모든 일정 삭제</button>
                        <button onClick={() => setDeleteConfirmation(false)} className="w-full mt-4 text-sm text-[var(--text-muted)] hover:underline">취소</button>
                    </div>
                </div>
            </div>
        )}
        </>
    );
};
