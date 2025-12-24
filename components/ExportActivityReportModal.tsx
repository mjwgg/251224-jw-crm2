import React, { useState, useMemo } from 'react';
import * as XLSX from 'xlsx';
import type { Appointment, PerformanceRecord, PerformancePrediction } from '../types';
import BaseModal from './ui/BaseModal';
import { XIcon, DownloadIcon } from './icons';
import Spinner from './ui/Spinner';

interface Period {
    label: string;
    start: Date;
    end: Date;
}

const getWeekPeriods = (count = 12): Period[] => {
    const periods: Period[] = [];
    let currentDate = new Date();
    currentDate.setHours(0, 0, 0, 0);

    for (let i = 0; i < count; i++) {
        const dayOfWeek = currentDate.getDay(); // 0=Sun, 1=Mon
        const offsetToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
        
        const startOfWeek = new Date(currentDate);
        startOfWeek.setDate(currentDate.getDate() + offsetToMonday);

        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6);
        endOfWeek.setHours(23, 59, 59, 999);

        const month = startOfWeek.getMonth() + 1;
        const firstDayOfMonth = new Date(startOfWeek.getFullYear(), startOfWeek.getMonth(), 1);
        const pastDaysOfMonth = (startOfWeek.getTime() - firstDayOfMonth.getTime()) / 86400000;
        const weekOfMonth = Math.floor(pastDaysOfMonth / 7) + 1;

        const label = `${month}월 ${weekOfMonth}주차 (${startOfWeek.getMonth() + 1}.${startOfWeek.getDate()}~${endOfWeek.getMonth() + 1}.${endOfWeek.getDate()})`;
        
        periods.push({ label, start: startOfWeek, end: endOfWeek });
        
        currentDate.setDate(startOfWeek.getDate() - 1);
    }
    return periods;
};

const getMonthPeriods = (count = 12): Period[] => {
    const periods: Period[] = [];
    let currentDate = new Date();
    currentDate.setDate(1);

    for (let i = 0; i < count; i++) {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        
        const startOfMonth = new Date(year, month, 1);
        const endOfMonth = new Date(year, month + 1, 0);
        endOfMonth.setHours(23, 59, 59, 999);

        const label = `${year}년 ${month + 1}월`;
        
        periods.push({ label, start: startOfMonth, end: endOfMonth });
        
        currentDate.setMonth(currentDate.getMonth() - 1);
    }
    return periods;
};

const getWeeksForMonth = (year: number, month: number): { label: string, start: Date, end: Date }[] => {
    const weeks = [];
    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);

    let currentStart = new Date(firstDayOfMonth);
    const dayOfWeek = currentStart.getDay();
    const offsetToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    currentStart.setDate(currentStart.getDate() + offsetToMonday);

    let weekOfMonth = 1;
    while (currentStart <= lastDayOfMonth) {
        const currentEnd = new Date(currentStart);
        currentEnd.setDate(currentStart.getDate() + 6);
        currentEnd.setHours(23, 59, 59, 999);
        
        if (currentStart.getMonth() !== month) {
            const startDayOfMonth = new Date(currentStart.getFullYear(), currentStart.getMonth(), 1);
            const pastDaysOfMonth = Math.floor((currentStart.getTime() - startDayOfMonth.getTime()) / 86400000);
            weekOfMonth = Math.floor(pastDaysOfMonth / 7) + 1;
        } else {
            const pastDaysOfMonth = currentStart.getDate() - 1;
            weekOfMonth = Math.floor(pastDaysOfMonth / 7) + 1;
        }

        const label = `${month + 1}월 ${weekOfMonth}주차 (${currentStart.getMonth() + 1}.${currentStart.getDate()}~${currentEnd.getMonth() + 1}.${currentEnd.getDate()})`;

        weeks.push({ label, start: new Date(currentStart), end: currentEnd });

        currentStart.setDate(currentStart.getDate() + 7);
    }

    return weeks;
};

interface ExportActivityReportModalProps {
    isOpen: boolean;
    onClose: () => void;
    appointments: Appointment[];
    performanceRecords: PerformanceRecord[];
    performancePredictions: PerformancePrediction[];
}

const ExportActivityReportModal: React.FC<ExportActivityReportModalProps> = ({ isOpen, onClose, appointments, performanceRecords, performancePredictions }) => {
    const [reportType, setReportType] = useState<'week' | 'month'>('week');
    const [selectedPeriodIndex, setSelectedPeriodIndex] = useState(0);
    const [isLoading, setIsLoading] = useState(false);
    const [includePersonalSchedules, setIncludePersonalSchedules] = useState(false);

    const weekPeriods = useMemo(() => getWeekPeriods(), []);
    const monthPeriods = useMemo(() => getMonthPeriods(), []);

    const periods = reportType === 'week' ? weekPeriods : monthPeriods;

    const handleExport = () => {
        setIsLoading(true);

        const wb = XLSX.utils.book_new();
        
        const borderStyle = {
            top: { style: "thin", color: { rgb: "000000" } },
            bottom: { style: "thin", color: { rgb: "000000" } },
            left: { style: "thin", color: { rgb: "000000" } },
            right: { style: "thin", color: { rgb: "000000" } }
        };

        const headerFill = { fgColor: { rgb: "DDEBF7" } };
        const categoryFill = { fgColor: { rgb: "F2F2F2" } };
        const totalFill = { fgColor: { rgb: "D9D9D9" } };
        const typeFills: { [key: string]: { fgColor: { rgb: string } } } = {
            'TA': { fgColor: { rgb: "FFF2CC" } },
            'AP': { fgColor: { rgb: "DDEBF7" } },
            'PC': { fgColor: { rgb: "E2F0D9" } },
            'N': { fgColor: { rgb: "EAD1DC" } },
            '기타': { fgColor: { rgb: "F2F2F2" } }
        };


        const applyStylesToRange = (ws: XLSX.WorkSheet, startRow: number, endRow: number, startCol: number, endCol: number) => {
            for (let R = startRow; R <= endRow; ++R) {
                for (let C = startCol; C <= endCol; ++C) {
                    const cell_address = { c: C, r: R };
                    const cell_ref = XLSX.utils.encode_cell(cell_address);
                    if (!ws[cell_ref]) ws[cell_ref] = { t: 's', v: '' };
                    if (!ws[cell_ref].s) ws[cell_ref].s = {};
                    ws[cell_ref].s.border = borderStyle;
                    if (!ws[cell_ref].s.alignment) ws[cell_ref].s.alignment = {};
                    ws[cell_ref].s.alignment.wrapText = true;
                    ws[cell_ref].s.alignment.vertical = 'top';
                }
            }
        };

        if (reportType === 'week') {
            const selectedPeriod = periods[selectedPeriodIndex];
            const { start, end } = selectedPeriod;

            const daysOfWeek = ['월요일', '화요일', '수요일', '목요일', '금요일', '토요일', '일요일'];
            const plannerData: { [key: string]: string }[] = [];
            for (let hour = 8; hour <= 21; hour++) {
                plannerData.push({ '시간': `${hour}:00`, ...Object.fromEntries(daysOfWeek.map(day => [day, ''])) });
            }
            
            const dayDates: Date[] = [];
            for (let i = 0; i < 7; i++) {
                const day = new Date(start);
                day.setDate(start.getDate() + i);
                dayDates.push(day);
            }
            const dayDateStrings = dayDates.map(d => d.toISOString().split('T')[0]);

            const filteredAppointments = appointments.filter(app => {
                const appDate = new Date(app.date);
                const baseCondition = appDate >= start && appDate <= end && app.status !== 'cancelled';
                if (!baseCondition) return false;

                if (includePersonalSchedules) {
                    return true;
                } else {
                    return !!app.customerId;
                }
            });

            const details: any[] = [];
            const summaryActivityTypes = ['TA', 'AP', 'PC', 'N', '기타'];
            const allActivityTypes = ['TA', 'AP', 'PC', 'N', '기타', 'JOINT', 'RP', 'Follow Up', 'S.P'];
            const summary: Record<string, { planned: number; completed: number }> = {};
            allActivityTypes.forEach(type => summary[type] = { planned: 0, completed: 0 });

            filteredAppointments.forEach(app => {
                const dayIndex = dayDateStrings.indexOf(app.date);
                if (dayIndex === -1) return;

                const dayName = daysOfWeek[dayIndex];
                const hour = parseInt(app.time.split(':')[0], 10);
                const statusText = app.status === 'completed' ? '결과' : '예정';
                const content = `${app.customerName || app.title} / ${app.meetingType} / ${statusText}`;

                if (hour >= 8 && hour <= 21) {
                    const rowIndex = hour - 8;
                    if (plannerData[rowIndex][dayName]) {
                        plannerData[rowIndex][dayName] += `\n${content}`;
                    } else {
                        plannerData[rowIndex][dayName] = content;
                    }
                }
                
                details.push({
                    '구분': app.meetingType, '일시': `${app.date} ${app.time}`, '고객명': app.customerName || app.title, '내용 (메모)': app.notes || '', '상태': statusText,
                });

                const type = app.meetingType as any;
                if (summary[type] && app.customerId) {
                    summary[type].planned++;
                    if (app.status === 'completed') summary[type].completed++;
                } else if (summary['기타']) {
                    summary['기타'].planned++;
                    if (app.status === 'completed') summary['기타'].completed++;
                }
            });

            performancePredictions.forEach(pred => {
                const predDate = new Date(pred.pcDate);
                if (predDate >= start && predDate <= end) summary.N.planned++;
            });
            performanceRecords.forEach(rec => {
                const recDate = new Date(rec.applicationDate);
                if (recDate >= start && recDate <= end) summary.N.completed++;
            });

            const plannerWs = XLSX.utils.aoa_to_sheet([[]]);
            
            XLSX.utils.sheet_add_aoa(plannerWs, [[selectedPeriod.label]], { origin: 'A1' });
            if (!plannerWs['!merges']) plannerWs['!merges'] = [];
            plannerWs['!merges'].push({ s: { r: 0, c: 0 }, e: { r: 0, c: 7 } });
            const titleCell = plannerWs['A1'];
            if(titleCell) {
                titleCell.s = { font: { bold: true, sz: 14 }, alignment: { horizontal: 'center' } };
            }
            
            const plannerHeader = { '시간': '시간', ...Object.fromEntries(dayDates.map((d, i) => [daysOfWeek[i], `${daysOfWeek[i]}\n(${d.getMonth() + 1}/${d.getDate()})`])) };
            XLSX.utils.sheet_add_json(plannerWs, [plannerHeader, ...plannerData], { origin: 'A2', skipHeader: true });
            
            const summaryHeader = ['구분', ...summaryActivityTypes, '합계'];
            const plannedRow: { [key: string]: any } = { '구분': '활동예정' };
            const completedRow: { [key: string]: any } = { '구분': '활동결과' };
            let plannedTotal = 0;
            let completedTotal = 0;

            summaryActivityTypes.forEach(type => {
                const planned = summary[type]?.planned || 0;
                const completed = summary[type]?.completed || 0;
                plannedRow[type] = planned;
                completedRow[type] = completed;
                plannedTotal += planned;
                completedTotal += completed;
            });

            plannedRow['합계'] = plannedTotal;
            completedRow['합계'] = completedTotal;

            const summaryDataForSheet = [plannedRow, completedRow];
            const summaryStartRow = 2 + plannerData.length + 2;
            XLSX.utils.sheet_add_json(plannerWs, summaryDataForSheet, { origin: {r: summaryStartRow, c: 0}, header: summaryHeader });

            applyStylesToRange(plannerWs, 1, 1 + plannerData.length, 0, 7);
            applyStylesToRange(plannerWs, summaryStartRow, summaryStartRow + 2, 0, summaryHeader.length - 1);

            for (let C = 0; C <= 7; ++C) {
                const cell_ref = XLSX.utils.encode_cell({ c: C, r: 1 });
                if (!plannerWs[cell_ref]) continue;
                if (!plannerWs[cell_ref].s) plannerWs[cell_ref].s = {};
                plannerWs[cell_ref].s.fill = headerFill;
                plannerWs[cell_ref].s.font = { bold: true };
                plannerWs[cell_ref].s.alignment = { horizontal: 'center', vertical: 'center', wrapText: true };
            }

            for (let C = 0; C < summaryHeader.length; ++C) {
                const cell_ref = XLSX.utils.encode_cell({ c: C, r: summaryStartRow });
                if (!plannerWs[cell_ref]) continue;
                if (!plannerWs[cell_ref].s) plannerWs[cell_ref].s = {};
                const headerText = summaryHeader[C];
                if (typeFills[headerText]) {
                    plannerWs[cell_ref].s.fill = typeFills[headerText];
                } else if (headerText === '합계') {
                    plannerWs[cell_ref].s.fill = totalFill;
                } else if (headerText === '구분') {
                    plannerWs[cell_ref].s.fill = categoryFill;
                }
                plannerWs[cell_ref].s.font = { bold: true };
                plannerWs[cell_ref].s.alignment = { horizontal: 'center' };
            }
            
            [summaryStartRow + 1, summaryStartRow + 2].forEach(R => {
                const cell_ref = XLSX.utils.encode_cell({ c: 0, r: R });
                if (plannerWs[cell_ref]) {
                    if(!plannerWs[cell_ref].s) plannerWs[cell_ref].s = {};
                    plannerWs[cell_ref].s.fill = categoryFill;
                    plannerWs[cell_ref].s.font = { bold: true };
                }
            });

            plannerWs['!cols'] = [{ wch: 8 }, ...daysOfWeek.map(() => ({ wch: 20 }))];
            
            XLSX.utils.book_append_sheet(wb, plannerWs, "주간 플래너");

            if (details.length > 0) {
                details.sort((a,b) => a['일시'].localeCompare(b['일시']));
                const detailsWs = XLSX.utils.json_to_sheet(details);
                detailsWs['!cols'] = Object.keys(details[0]).map(key => ({ wch: Math.max(key.length, ...details.map(row => row[key]?.toString().length || 0)) + 2 }));
                XLSX.utils.book_append_sheet(wb, detailsWs, "상세내역");
            }
            
            const fileName = `활동내역서_${selectedPeriod.label.replace(/[^0-9a-zA-Zㄱ-힣]/g, '')}.xlsx`;
            XLSX.writeFile(wb, fileName);

        } else { // Monthly report
            const selectedMonth = periods[selectedPeriodIndex];
            const plannerWs = XLSX.utils.aoa_to_sheet([[]]);
            let currentRow = 0;

            const year = selectedMonth.start.getFullYear();
            const month = selectedMonth.start.getMonth();

            const weeks = getWeeksForMonth(year, month).reverse();
            const allDetailsForMonth: any[] = [];
            
            const summaryActivityTypes = ['TA', 'AP', 'PC', 'N', '기타'];
            const allActivityTypes = [...summaryActivityTypes, 'JOINT', 'RP', 'Follow Up', 'S.P'];
            const daysOfWeek = ['월요일', '화요일', '수요일', '목요일', '금요일', '토요일', '일요일'];

            weeks.forEach((week, weekIndex) => {
                const { start, end, label } = week;
                
                const plannerData: { [key: string]: string }[] = [];
                for (let hour = 8; hour <= 21; hour++) {
                    plannerData.push({ '시간': `${hour}:00`, ...Object.fromEntries(daysOfWeek.map(day => [day, ''])) });
                }
                const dayDates: Date[] = [];
                for (let i = 0; i < 7; i++) {
                    const day = new Date(start);
                    day.setDate(start.getDate() + i);
                    dayDates.push(day);
                }
                const dayDateStrings = dayDates.map(d => d.toISOString().split('T')[0]);

                const filteredAppointments = appointments.filter(app => {
                    const appDate = new Date(app.date);
                    const baseCondition = appDate >= start && appDate <= end && app.status !== 'cancelled';
                    if (!baseCondition) return false;
                    if (includePersonalSchedules) return true;
                    return !!app.customerId;
                });
                
                const summary: Record<string, { planned: number; completed: number }> = {};
                allActivityTypes.forEach(type => summary[type] = { planned: 0, completed: 0 });

                filteredAppointments.forEach(app => {
                    const dayIndex = dayDateStrings.indexOf(app.date);
                    if (dayIndex === -1) return;
                    const dayName = daysOfWeek[dayIndex];
                    const hour = parseInt(app.time.split(':')[0], 10);
                    const statusText = app.status === 'completed' ? '결과' : '예정';
                    const content = `${app.customerName || app.title} / ${app.meetingType} / ${statusText}`;
                    if (hour >= 8 && hour <= 21) {
                        const rowIndex = hour - 8;
                        if (plannerData[rowIndex][dayName]) plannerData[rowIndex][dayName] += `\n${content}`;
                        else plannerData[rowIndex][dayName] = content;
                    }
                    
                    allDetailsForMonth.push({ '구분': app.meetingType, '일시': `${app.date} ${app.time}`, '고객명': app.customerName || app.title, '내용 (메모)': app.notes || '', '상태': statusText });
                    
                    const type = app.meetingType as any;
                    if (summary[type] && app.customerId) {
                        summary[type].planned++;
                        if (app.status === 'completed') summary[type].completed++;
                    } else if (summary['기타']) {
                        summary['기타'].planned++;
                        if (app.status === 'completed') summary['기타'].completed++;
                    }
                });

                performancePredictions.forEach(pred => {
                    const predDate = new Date(pred.pcDate);
                    if (predDate >= start && predDate <= end) summary.N.planned++;
                });
                performanceRecords.forEach(rec => {
                    const recDate = new Date(rec.applicationDate);
                    if (recDate >= start && recDate <= end) summary.N.completed++;
                });

                const weekStartRow = currentRow;
                XLSX.utils.sheet_add_aoa(plannerWs, [[label]], { origin: { r: weekStartRow, c: 0 } });
                if (!plannerWs['!merges']) plannerWs['!merges'] = [];
                plannerWs['!merges'].push({ s: { r: weekStartRow, c: 0 }, e: { r: weekStartRow, c: 7 } });
                const titleCell = plannerWs[XLSX.utils.encode_cell({c:0, r:weekStartRow})];
                if(titleCell) {
                    titleCell.s = { font: { bold: true, sz: 14 }, alignment: { horizontal: 'center' } };
                }

                const plannerHeaderRow = weekStartRow + 1;
                const headerRow = { '시간': '시간', ...Object.fromEntries(dayDates.map((d, i) => [daysOfWeek[i], `${daysOfWeek[i]}\n(${d.getMonth() + 1}/${d.getDate()})`])) };
                XLSX.utils.sheet_add_json(plannerWs, [headerRow, ...plannerData], { origin: { r: plannerHeaderRow, c: 0 }, skipHeader: true });
                const plannerEndRow = plannerHeaderRow + plannerData.length;

                const summaryHeader = ['구분', ...summaryActivityTypes, '합계'];
                const plannedRow: { [key: string]: any } = { '구분': '활동예정' };
                const completedRow: { [key: string]: any } = { '구분': '활동결과' };
                let plannedTotal = 0;
                let completedTotal = 0;
                summaryActivityTypes.forEach(type => {
                    const planned = summary[type]?.planned || 0;
                    const completed = summary[type]?.completed || 0;
                    plannedRow[type] = planned;
                    completedRow[type] = completed;
                    plannedTotal += planned;
                    completedTotal += completed;
                });
                plannedRow['합계'] = plannedTotal;
                completedRow['합계'] = completedTotal;
                const summaryDataForSheet = [plannedRow, completedRow];
                
                const summaryStartRow = plannerEndRow + 2;
                XLSX.utils.sheet_add_json(plannerWs, summaryDataForSheet, { origin: { r: summaryStartRow, c: 0 }, header: summaryHeader });
                const summaryEndRow = summaryStartRow + summaryDataForSheet.length;

                applyStylesToRange(plannerWs, plannerHeaderRow, plannerEndRow, 0, 7);
                applyStylesToRange(plannerWs, summaryStartRow, summaryEndRow, 0, summaryHeader.length - 1);

                for (let C = 0; C <= 7; ++C) {
                    const cell_ref = XLSX.utils.encode_cell({ c: C, r: plannerHeaderRow });
                    if (!plannerWs[cell_ref]) continue;
                    if (!plannerWs[cell_ref].s) plannerWs[cell_ref].s = {};
                    plannerWs[cell_ref].s.fill = headerFill;
                    plannerWs[cell_ref].s.font = { bold: true };
                    plannerWs[cell_ref].s.alignment = { horizontal: 'center', vertical: 'center', wrapText: true };
                }
    
                for (let C = 0; C < summaryHeader.length; ++C) {
                    const cell_ref = XLSX.utils.encode_cell({ c: C, r: summaryStartRow });
                    if (!plannerWs[cell_ref]) continue;
                    if (!plannerWs[cell_ref].s) plannerWs[cell_ref].s = {};
                    const headerText = summaryHeader[C];
                    if (typeFills[headerText]) {
                        plannerWs[cell_ref].s.fill = typeFills[headerText];
                    } else if (headerText === '합계') {
                        plannerWs[cell_ref].s.fill = totalFill;
                    } else if (headerText === '구분') {
                        plannerWs[cell_ref].s.fill = categoryFill;
                    }
                    plannerWs[cell_ref].s.font = { bold: true };
                    plannerWs[cell_ref].s.alignment = { horizontal: 'center' };
                }
                
                [summaryStartRow + 1, summaryStartRow + 2].forEach(R => {
                    const cell_ref = XLSX.utils.encode_cell({ c: 0, r: R });
                    if (plannerWs[cell_ref]) {
                        if(!plannerWs[cell_ref].s) plannerWs[cell_ref].s = {};
                        plannerWs[cell_ref].s.fill = categoryFill;
                        plannerWs[cell_ref].s.font = { bold: true };
                    }
                });
                
                currentRow = summaryEndRow + 3;
            });
            
            plannerWs['!cols'] = [{ wch: 8 }, ...daysOfWeek.map(() => ({ wch: 20 }))];
            
            XLSX.utils.book_append_sheet(wb, plannerWs, `${month + 1}월 활동보고서`);

            if (allDetailsForMonth.length > 0) {
                allDetailsForMonth.sort((a,b) => a['일시'].localeCompare(b['일시']));
                const detailsWs = XLSX.utils.json_to_sheet(allDetailsForMonth);
                detailsWs['!cols'] = Object.keys(allDetailsForMonth[0]).map(key => ({ wch: Math.max(key.length, ...allDetailsForMonth.map(row => row[key]?.toString().length || 0)) + 2 }));
                XLSX.utils.book_append_sheet(wb, detailsWs, "상세내역");
            }

            const fileName = `활동내역서_${selectedMonth.label.replace(/[^0-9a-zA-Zㄱ-힣]/g, '')}.xlsx`;
            XLSX.writeFile(wb, fileName);
        }
        
        setIsLoading(false);
        onClose();
    };

    return (
        <BaseModal isOpen={isOpen} onClose={onClose} className="max-w-lg w-full">
             <div className="p-4 border-b border-[var(--border-color)] flex justify-between items-center">
                <h2 className="text-xl font-bold text-[var(--text-primary)]">활동내역서 내보내기</h2>
                <button onClick={onClose} className="text-[var(--text-muted)] hover:text-[var(--text-primary)]"><XIcon className="h-6 w-6" /></button>
            </div>
            <div className="p-6 space-y-4">
                <div className="flex justify-center p-1 bg-[var(--background-tertiary)] rounded-lg">
                    <button onClick={() => setReportType('week')} className={`w-1/2 px-4 py-2 text-sm font-medium rounded-md ${reportType === 'week' ? 'bg-[var(--background-secondary)] text-[var(--text-accent)] shadow' : 'text-[var(--text-secondary)]'}`}>주간 보고서</button>
                    <button onClick={() => setReportType('month')} className={`w-1/2 px-4 py-2 text-sm font-medium rounded-md ${reportType === 'month' ? 'bg-[var(--background-secondary)] text-[var(--text-accent)] shadow' : 'text-[var(--text-secondary)]'}`}>월간 보고서</button>
                </div>
                 <div>
                    <label htmlFor="period-select" className="block text-sm font-medium text-[var(--text-secondary)]">기간 선택</label>
                    <select
                        id="period-select"
                        value={selectedPeriodIndex}
                        onChange={(e) => setSelectedPeriodIndex(Number(e.target.value))}
                        className="mt-1 block w-full p-2 border border-[var(--border-color-strong)] rounded-md bg-[var(--background-tertiary)]"
                    >
                        {periods.map((p, index) => (
                            <option key={p.label} value={index}>{p.label}</option>
                        ))}
                    </select>
                </div>
                <div className="pt-4 border-t border-[var(--border-color)]">
                    <div className="flex items-center">
                        <input
                            id="include-personal-schedules"
                            type="checkbox"
                            checked={includePersonalSchedules}
                            onChange={(e) => setIncludePersonalSchedules(e.target.checked)}
                            className="h-4 w-4 rounded border-[var(--border-color-strong)] text-[var(--background-accent)] focus:ring-[var(--background-accent)]"
                        />
                        <label htmlFor="include-personal-schedules" className="ml-2 text-sm text-[var(--text-secondary)]">
                            개인일정 포함하기
                        </label>
                    </div>
                </div>
            </div>
             <div className="p-4 bg-[var(--background-tertiary)] border-t border-[var(--border-color)] flex justify-end">
                <button
                    onClick={handleExport}
                    disabled={isLoading}
                    className="flex items-center gap-2 px-6 py-2 bg-[var(--background-accent)] text-[var(--text-on-accent)] rounded-md text-sm font-medium hover:bg-[var(--background-accent-hover)]"
                >
                    {isLoading ? <Spinner small /> : <DownloadIcon className="h-5 w-5"/>}
                    {isLoading ? '생성 중...' : '내보내기'}
                </button>
            </div>
        </BaseModal>
    );
};

export default ExportActivityReportModal;