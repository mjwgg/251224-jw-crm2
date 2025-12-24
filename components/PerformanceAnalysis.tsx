import React, { useState, useMemo } from 'react';
import type { PerformanceRecord, Appointment, Customer, Contract } from '../types';
import { DownloadIcon } from './icons';

interface PerformanceAnalysisProps {
    records: PerformanceRecord[];
    appointments: Appointment[];
    customers: Customer[];
    onSelectCustomer: (customer: Customer) => void;
}

const StatCard: React.FC<{ title: string; value: string; subValue?: string; className?: string }> = ({ title, value, subValue, className = '' }) => (
    <div className={`p-4 bg-[var(--background-secondary)] rounded-lg text-center shadow-md border border-[var(--border-color)] ${className}`}>
        <p className="text-sm text-[var(--text-muted)]">{title}</p>
        <p className="text-2xl font-bold text-[var(--text-primary)] mt-1">{value}</p>
        {subValue && <p className="text-xs text-[var(--text-muted)] mt-1">{subValue}</p>}
    </div>
);

const AnalysisSection: React.FC<{ title: string; children: React.ReactNode; className?: string }> = ({ title, children, className = '' }) => (
    <section className={`mt-8 ${className}`}>
        <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-4 pb-2 border-b-2 border-[var(--border-color-strong)]">{title}</h2>
        {children}
    </section>
);

const COVERAGE_COLORS: Record<string, string> = {
    '종합건강': '#3b82f6',
    '치매재가간병': '#8b5cf6',
    '태아어린이': '#10b981',
    '운전자상해': '#f97316',
    '종신정기': '#14b8a6',
    '단기납': '#6366f1',
    '연금': '#f59e0b',
    '경영인정기': '#ec4899',
    '달러': '#22c55e',
    '기타': '#6b7280',
};

const PerformanceAnalysis: React.FC<PerformanceAnalysisProps> = ({ records, appointments, customers, onSelectCustomer }) => {
    const [period, setPeriod] = useState<'month' | 'quarter' | 'year' | 'all'>('all');
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedCoverage, setSelectedCoverage] = useState<string | null>(null);

    const handlePeriodChange = (p: 'month' | 'quarter' | 'year' | 'all') => {
        setPeriod(p);
        setCurrentDate(new Date());
    };

    const handleDateNavigate = (direction: 'prev' | 'next') => {
        const newDate = new Date(currentDate);
        const offset = direction === 'prev' ? -1 : 1;
        if (period === 'month') {
            newDate.setMonth(newDate.getMonth() + offset);
        } else if (period === 'quarter') {
            newDate.setMonth(newDate.getMonth() + (offset * 3));
        } else if (period === 'year') {
            newDate.setFullYear(newDate.getFullYear() + offset);
        }
        setCurrentDate(newDate);
    };

    const periodText = useMemo(() => {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        switch (period) {
            case 'month': return `${year}년 ${month + 1}월`;
            case 'quarter': return `${year}년 ${Math.floor(month / 3) + 1}분기`;
            case 'year': return `${year}년`;
            case 'all': return '전체 기간';
        }
    }, [period, currentDate]);

    const { filteredRecords, filteredAppointments, filteredContracts } = useMemo(() => {
        if (period === 'all') {
            const allContracts = customers.reduce((acc, c) => {
                if (c.contracts) {
                    return acc.concat(c.contracts.map(contract => ({ ...contract, customerId: c.id, customerName: c.name })));
                }
                return acc;
            }, [] as (Contract & { customerId: string, customerName: string })[]);
            return { filteredRecords: records, filteredAppointments: appointments, filteredContracts: allContracts };
        }

        let startDate, endDate;
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();

        switch (period) {
            case 'month':
                startDate = new Date(year, month, 1);
                endDate = new Date(year, month + 1, 0, 23, 59, 59);
                break;
            case 'quarter':
                const quarter = Math.floor(month / 3);
                startDate = new Date(year, quarter * 3, 1);
                endDate = new Date(year, quarter * 3 + 3, 0, 23, 59, 59);
                break;
            case 'year':
                startDate = new Date(year, 0, 1);
                endDate = new Date(year, 11, 31, 23, 59, 59);
                break;
        }

        const filterByDate = (dateStr?: string) => {
            if (!dateStr) return false;
            try {
                const itemDate = new Date(dateStr);
                return itemDate >= startDate && itemDate <= endDate;
            } catch { return false; }
        };

        const fr = records.filter(r => filterByDate(r.applicationDate));
        const fa = appointments.filter(a => filterByDate(a.date));
        const allContracts = customers.reduce((acc, c) => {
            if (c.contracts) {
                return acc.concat(c.contracts.map(contract => ({ ...contract, customerId: c.id, customerName: c.name })));
            }
            return acc;
        }, [] as (Contract & { customerId: string; customerName: string; })[]);
        const fc_contracts = allContracts.filter(c => filterByDate(c.contractDate));

        return { filteredRecords: fr, filteredAppointments: fa, filteredContracts: fc_contracts };
    }, [records, appointments, customers, period, currentDate]);

    const summary = useMemo(() => {
        const totalRecognizedPerformance = filteredRecords.reduce((sum, record) => sum + record.recognizedPerformance, 0);
        const totalContracts = filteredRecords.length;

        const relevantAppointments = filteredAppointments.filter(a => ['AP', 'PC', 'TA'].includes(a.meetingType));

        const scheduledAppointments = relevantAppointments.filter(a => a.status !== 'cancelled');
        const completedAppointments = scheduledAppointments.filter(a => a.status === 'completed');

        const apCount = scheduledAppointments.filter(a => a.meetingType === 'AP').length;
        const pcCount = scheduledAppointments.filter(a => a.meetingType === 'PC').length;
        const taCount = scheduledAppointments.filter(a => a.meetingType === 'TA').length;

        const meetingCompletionRate = scheduledAppointments.length > 0 ? (completedAppointments.length / scheduledAppointments.length) * 100 : 0;
        const apToPcConversionRate = apCount > 0 ? (pcCount / apCount) * 100 : 0;
        const pcConversionRate = pcCount > 0 ? (totalContracts / pcCount) * 100 : 0;

        const totalMonthlyPremium = filteredContracts.reduce((sum, contract) => sum + contract.monthlyPremium, 0);
        const averagePremiumPerContract = filteredContracts.length > 0 ? totalMonthlyPremium / filteredContracts.length : 0;

        const contractedCustomerIds = new Set(filteredContracts.map(c => c.customerId));
        const numberOfContractedCustomers = contractedCustomerIds.size;
        const averagePremiumPerCustomer = numberOfContractedCustomers > 0 ? totalMonthlyPremium / numberOfContractedCustomers : 0;
        const averageContractsPerCustomer = numberOfContractedCustomers > 0 ? filteredContracts.length / numberOfContractedCustomers : 0;
        
        let durationInWeeks = 1;
        if (period !== 'all') {
            let startDate, endDate;
            const year = currentDate.getFullYear();
            const month = currentDate.getMonth();
            switch (period) {
                case 'month':
                    startDate = new Date(year, month, 1);
                    endDate = new Date(year, month + 1, 0);
                    break;
                case 'quarter':
                    const quarter = Math.floor(month / 3);
                    startDate = new Date(year, quarter * 3, 1);
                    endDate = new Date(year, quarter * 3 + 3, 0);
                    break;
                case 'year':
                    startDate = new Date(year, 0, 1);
                    endDate = new Date(year, 11, 31);
                    break;
            }
            if (startDate && endDate) {
                durationInWeeks = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24 * 7);
            }
        } else {
            const allDates = [...records.map(r => new Date(r.applicationDate).getTime()), ...appointments.map(a => new Date(a.date).getTime())].filter(t => !isNaN(t));
            if (allDates.length > 1) {
                const minDate = Math.min(...allDates);
                const maxDate = Math.max(...allDates);
                durationInWeeks = (maxDate - minDate) / (1000 * 60 * 60 * 24 * 7);
            }
        }

        if (durationInWeeks < 1) durationInWeeks = 1;

        const weeklyAverageAP = apCount / durationInWeeks;
        const weeklyAveragePC = pcCount / durationInWeeks;
        const weeklyAverageTA = taCount / durationInWeeks;

        return {
            totalRecognizedPerformance,
            totalContracts,
            apCount,
            pcCount,
            taCount,
            pcConversionRate,
            meetingCompletionRate,
            apToPcConversionRate,
            totalMonthlyPremium,
            averagePremiumPerContract,
            averagePremiumPerCustomer,
            averageContractsPerCustomer,
            weeklyAverageAP,
            weeklyAveragePC,
            weeklyAverageTA,
        };
    }, [filteredRecords, filteredAppointments, filteredContracts, period, currentDate, records, appointments]);

    const trendData = useMemo(() => {
        const labels: string[] = [];
        const performanceValues: number[] = [];
        const premiumValues: number[] = [];

        if (period === 'month') {
            labels.push('1-10일', '11-20일', '21-말일');
            performanceValues.push(0, 0, 0);
            premiumValues.push(0, 0, 0);

            filteredRecords.forEach(record => {
                const day = new Date(record.applicationDate).getDate();
                const index = day <= 10 ? 0 : day <= 20 ? 1 : 2;
                performanceValues[index] += record.recognizedPerformance;
            });
            filteredContracts.forEach(contract => {
                const day = new Date(contract.contractDate).getDate();
                const index = day <= 10 ? 0 : day <= 20 ? 1 : 2;
                premiumValues[index] += contract.monthlyPremium;
            });
        } else if (period === 'quarter') {
            const startMonth = Math.floor(currentDate.getMonth() / 3) * 3;
            labels.push(`${startMonth + 1}월`, `${startMonth + 2}월`, `${startMonth + 3}월`);
            performanceValues.push(0, 0, 0);
            premiumValues.push(0, 0, 0);

            filteredRecords.forEach(record => {
                const month = new Date(record.applicationDate).getMonth();
                const index = month - startMonth;
                if (index >= 0 && index < 3) {
                    performanceValues[index] += record.recognizedPerformance;
                }
            });
            filteredContracts.forEach(contract => {
                const month = new Date(contract.contractDate).getMonth();
                const index = month - startMonth;
                if (index >= 0 && index < 3) {
                    premiumValues[index] += contract.monthlyPremium;
                }
            });
        } else if (period === 'year') {
            for (let i = 0; i < 12; i++) {
                labels.push(`${i + 1}월`);
                performanceValues.push(0);
                premiumValues.push(0);
            }
            filteredRecords.forEach(record => {
                const monthIndex = new Date(record.applicationDate).getMonth();
                performanceValues[monthIndex] += record.recognizedPerformance;
            });
            filteredContracts.forEach(contract => {
                const monthIndex = new Date(contract.contractDate).getMonth();
                premiumValues[monthIndex] += contract.monthlyPremium;
            });
        } else { // 'all'
            const yearMap = new Map<number, { perf: number; prem: number }>();
            const allContracts: Contract[] = customers.reduce((acc, c) => acc.concat(c.contracts || []), [] as Contract[]);
            
            [...records.map(r => r.applicationDate), ...allContracts.map(c => c.contractDate)]
                .filter(d => d)
                .forEach(d => {
                    const year = new Date(d!).getFullYear();
                    if (!yearMap.has(year)) {
                        yearMap.set(year, { perf: 0, prem: 0 });
                    }
                });
            
            records.forEach(record => {
                const year = new Date(record.applicationDate).getFullYear();
                if (yearMap.has(year)) {
                    yearMap.get(year)!.perf += record.recognizedPerformance;
                }
            });
            allContracts.forEach(contract => {
                const year = new Date(contract.contractDate).getFullYear();
                if (yearMap.has(year)) {
                    yearMap.get(year)!.prem += contract.monthlyPremium;
                }
            });
            
            const sortedYears = Array.from(yearMap.keys()).sort();
            sortedYears.forEach(year => {
                labels.push(`${year}년`);
                performanceValues.push(yearMap.get(year)!.perf);
                premiumValues.push(yearMap.get(year)!.prem);
            });
        }

        const maxPerformance = Math.max(...performanceValues, 1);
        const maxPremium = Math.max(...premiumValues, 1);

        return {
            labels,
            performance: performanceValues.map(val => (val / maxPerformance) * 100),
            premium: premiumValues.map(val => (val / maxPremium) * 100),
            performanceValues,
            premiumValues,
        };
    }, [filteredRecords, filteredContracts, period, currentDate, customers, records]);

    const customerAnalysis = useMemo(() => {
        const customerIdsWithContracts = new Set(filteredContracts.map(c => c.customerId));
        const contractedCustomers = customers.filter(c => customerIdsWithContracts.has(c.id));
        
        const ageGroups: Record<string, { male: number; female: number; other: number; total: number }> = {
            '20대': { male: 0, female: 0, other: 0, total: 0 },
            '30대': { male: 0, female: 0, other: 0, total: 0 },
            '40대': { male: 0, female: 0, other: 0, total: 0 },
            '50대': { male: 0, female: 0, other: 0, total: 0 },
            '60대 이상': { male: 0, female: 0, other: 0, total: 0 },
            '미상': { male: 0, female: 0, other: 0, total: 0 },
        };
        const occupations: Record<string, number> = {};
        const acquisitionConversions: Record<string, { meetings: number, contracts: number }> = {};
        
        const calculateAge = (birthday: string): number | null => {
            if (!birthday) return null;
            const birthDate = new Date(birthday);
            const today = new Date();
            let age = today.getFullYear() - birthDate.getFullYear();
            const m = today.getMonth() - birthDate.getMonth();
            if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;
            return age >= 0 ? age : null;
        };

        contractedCustomers.forEach(c => {
            const age = calculateAge(c.birthday);
            let ageGroup: string;
            if (age === null) ageGroup = '미상';
            else if (age < 30) ageGroup = '20대';
            else if (age < 40) ageGroup = '30대';
            else if (age < 50) ageGroup = '40대';
            else if (age < 60) ageGroup = '50대';
            else ageGroup = '60대 이상';

            if (c.gender === '남성') {
                ageGroups[ageGroup].male++;
            } else if (c.gender === '여성') {
                ageGroups[ageGroup].female++;
            } else {
                ageGroups[ageGroup].other++;
            }
            ageGroups[ageGroup].total++;
            
            if (c.occupation && c.occupation !== '미확인') {
                occupations[c.occupation] = (occupations[c.occupation] || 0) + 1;
            }
        });

        filteredAppointments.forEach(a => {
            const customer = customers.find(c => c.id === a.customerId);
            const source = customer?.acquisitionSource || '기타';
            if (!acquisitionConversions[source]) acquisitionConversions[source] = { meetings: 0, contracts: 0 };
            acquisitionConversions[source].meetings++;
        });

        filteredRecords.forEach(r => {
            const customer = customers.find(c => c.name === r.contractorName);
            const source = customer?.acquisitionSource || '기타';
            if (!acquisitionConversions[source]) acquisitionConversions[source] = { meetings: 0, contracts: 0 };
            acquisitionConversions[source].contracts++;
        });

        return {
            ageDistribution: Object.entries(ageGroups),
            occupationDistribution: Object.entries(occupations).sort((a, b) => b[1] - a[1]).slice(0, 10),
            acquisitionConversions: Object.entries(acquisitionConversions).map(([source, data]) => ({
                source,
                ...data,
                rate: data.meetings > 0 ? ((data.contracts / data.meetings) * 100).toFixed(1) + '%' : '0.0%'
            })).sort((a,b) => b.contracts - a.contracts),
        };
    }, [filteredContracts, customers, filteredAppointments, filteredRecords]);

    const keymanAnalysis = useMemo(() => {
        const introducerCounts: Record<string, Set<string>> = {};
        customers.forEach(c => {
            if (c.acquisitionSource === '소개' && c.acquisitionSourceDetail) {
                if (!introducerCounts[c.acquisitionSourceDetail]) {
                    introducerCounts[c.acquisitionSourceDetail] = new Set();
                }
                introducerCounts[c.acquisitionSourceDetail].add(c.id);
            }
        });
        return Object.entries(introducerCounts)
            .map(([name, customers]) => ({ name, count: customers.size }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 10);
    }, [customers]);

    const coverageAnalysis = useMemo(() => {
        const distribution: Record<string, number> = {};
        let total = 0;

        filteredContracts.forEach(contract => {
            const category = contract.coverageCategory || '기타';
            distribution[category] = (distribution[category] || 0) + 1;
            total++;
        });

        const data = Object.entries(distribution)
            .map(([name, count]) => ({
                name,
                count,
                percentage: total > 0 ? (count / total) * 100 : 0,
                color: COVERAGE_COLORS[name as keyof typeof COVERAGE_COLORS] || COVERAGE_COLORS['기타'],
            }))
            .sort((a, b) => b.count - a.count);

        return { data, total };
    }, [filteredContracts]);

    const handleExportToHTML = () => {
        const donutChartSVG = (() => {
            const size = 180;
            const strokeWidth = 25;
            const radius = (size - strokeWidth) / 2;
            const circumference = 2 * Math.PI * radius;
            let accumulatedPercentage = 0;

            const chartSegments = coverageAnalysis.data.map(segment => {
                const dashArrayValue = `${(segment.percentage / 100) * circumference} ${circumference}`;
                const rotation = accumulatedPercentage * 3.6;
                accumulatedPercentage += segment.percentage;

                return `<circle cx="${size / 2}" cy="${size / 2}" r="${radius}" fill="transparent" stroke="${segment.color}" stroke-width="${strokeWidth}" stroke-dasharray="${dashArrayValue}" transform="rotate(${rotation - 90} ${size / 2} ${size / 2})"></circle>`;
            }).join('');

            return `
                <div style="display: flex; justify-content: center; margin: 20px 0;">
                    <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
                        ${chartSegments}
                        <text x="50%" y="50%" text-anchor="middle" dy=".3em" style="font-size: 24px; font-weight: bold; fill: #212529;">${coverageAnalysis.total}</text>
                        <text x="50%" y="50%" text-anchor="middle" dy="1.8em" style="font-size: 12px; fill: #6c757d;">총 계약</text>
                    </svg>
                </div>
            `;
        })();

        const htmlContent = `
            <!DOCTYPE html>
            <html lang="ko">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>성과 분석 리포트 - ${periodText}</title>
                <style>
                    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; background-color: #f8f9fa; margin: 0; padding: 20px; }
                    .container { max-width: 900px; margin: 0 auto; background-color: #fff; padding: 30px; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
                    h1, h2, h3 { color: #212529; border-bottom: 2px solid #dee2e6; padding-bottom: 10px; margin-top: 30px; }
                    h1 { font-size: 2.5em; text-align: center; border: none; }
                    h2 { font-size: 1.8em; }
                    h3 { font-size: 1.4em; border-bottom: 1px solid #e9ecef; }
                    .header-info { text-align: center; color: #6c757d; margin-bottom: 40px; }
                    .summary-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 20px; margin-bottom: 30px; }
                    .stat-card { padding: 20px; border-radius: 8px; text-align: center; background-color: #f1f3f5; }
                    .stat-card-title { font-size: 0.9em; color: #495057; }
                    .stat-card-value { font-size: 1.5em; font-weight: bold; color: #0d6efd; margin-top: 5px; }
                    .stat-card-sub { font-size: 0.8em; color: #6c757d; }
                    table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                    th, td { padding: 12px; border: 1px solid #dee2e6; text-align: left; }
                    th { background-color: #f8f9fa; font-weight: 600; }
                    tbody tr:nth-child(odd) { background-color: #f8f9fa; }
                    .text-right { text-align: right; }
                    .bar-chart-container { display: flex; flex-direction: column; gap: 8px; }
                    .bar-item { display: grid; grid-template-columns: 80px 1fr 100px; align-items: center; gap: 10px; font-size: 0.9em; }
                    .bar-bg { background-color: #e9ecef; border-radius: 4px; height: 20px; }
                    .bar { background-color: #0d6efd; height: 20px; border-radius: 4px; }
                    .coverage-legend { list-style: none; padding: 0; display: flex; flex-wrap: wrap; gap: 15px; }
                    .coverage-legend li { display: flex; align-items: center; }
                    .color-box { width: 14px; height: 14px; border-radius: 3px; margin-right: 8px; }
                </style>
            </head>
            <body>
                <div class="container">
                    <h1>성과 분석 리포트</h1>
                    <p class="header-info">기간: ${periodText}<br>생성일: ${new Date().toLocaleDateString()}</p>
                    <h2>종합 요약</h2>
                    <div class="summary-grid">
                        <div class="stat-card">
                            <div class="stat-card-title">총 인정 실적</div>
                            <div class="stat-card-value">${(summary.totalRecognizedPerformance / 10000).toLocaleString()}만원</div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-card-title">총 계약 건수</div>
                            <div class="stat-card-value">${summary.totalContracts}건</div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-card-title">AP/PC/TA</div>
                            <div class="stat-card-value">${summary.apCount}/${summary.pcCount}/${summary.taCount}건</div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-card-title">계약 성공율</div>
                            <div class="stat-card-value">${summary.pcConversionRate.toFixed(1)}%</div>
                        </div>
                    </div>
                    <h2>실적 추이</h2>
                    <h3>인정 실적</h3>
                    <div class="bar-chart-container">
                        ${trendData.labels.map((label, i) => `
                            <div class="bar-item">
                                <span class="text-right">${label}</span>
                                <div class="bar-bg"><div class="bar" style="width: ${trendData.performance[i]}%;"></div></div>
                                <span>${(trendData.performanceValues[i] / 10000).toLocaleString('ko-KR', { maximumFractionDigits: 0 })}만원</span>
                            </div>
                        `).join('')}
                    </div>
                     <h3>월 보험료</h3>
                    <div class="bar-chart-container">
                        ${trendData.labels.map((label, i) => `
                            <div class="bar-item">
                                <span class="text-right">${label}</span>
                                <div class="bar-bg"><div class="bar" style="width: ${trendData.premium[i]}%;"></div></div>
                                <span>${(trendData.premiumValues[i] / 10000).toLocaleString('ko-KR', { maximumFractionDigits: 0 })}만원</span>
                            </div>
                        `).join('')}
                    </div>
                    <h2>계약 고객 분석</h2>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
                        <div>
                            <h3>연령대별 분포</h3>
                            <table>
                                <thead><tr><th>연령대</th><th class="text-right">남성</th><th class="text-right">여성</th><th class="text-right">기타</th><th class="text-right">합계</th></tr></thead>
                                <tbody>
                                    ${customerAnalysis.ageDistribution.map(([group, data]) => `<tr><td>${group}</td><td class="text-right">${data.male}명</td><td class="text-right">${data.female}명</td><td class="text-right">${data.other}명</td><td class="text-right">${data.total}명</td></tr>`).join('')}
                                </tbody>
                            </table>
                        </div>
                        <div>
                             <h3>직업별 분포 (Top 10)</h3>
                             <table>
                                <thead><tr><th>직업</th><th>인원</th></tr></thead>
                                <tbody>
                                    ${customerAnalysis.occupationDistribution.map(([occupation, count]) => `<tr><td>${occupation}</td><td class="text-right">${count}명</td></tr>`).join('')}
                                </tbody>
                            </table>
                        </div>
                    </div>
                     <h3>취득경로별 계약 전환율</h3>
                     <table>
                        <thead><tr><th>경로</th><th>미팅</th><th>계약</th><th>전환율</th></tr></thead>
                        <tbody>
                            ${customerAnalysis.acquisitionConversions.map(item => `
                                <tr>
                                    <td>${item.source}</td>
                                    <td class="text-right">${item.meetings}</td>
                                    <td class="text-right">${item.contracts}</td>
                                    <td class="text-right">${item.rate}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                     <h2>보장 구분별 성과 분석</h2>
                     ${donutChartSVG}
                     <div>
                        <h3>범례</h3>
                        <ul class="coverage-legend">
                            ${coverageAnalysis.data.map(item => `
                                <li>
                                    <span class="color-box" style="background-color: ${item.color};"></span>
                                    <span>${item.name}: ${item.count}건 (${item.percentage.toFixed(1)}%)</span>
                                </li>
                            `).join('')}
                        </ul>
                    </div>
                    <h2>키맨 고객 분석 (핵심 소개자)</h2>
                    <table>
                        <thead><tr><th>순위</th><th>이름</th><th>소개 인원</th></tr></thead>
                        <tbody>
                            ${keymanAnalysis.map((introducer, index) => `
                                <tr>
                                    <td>${index + 1}</td>
                                    <td>${introducer.name}</td>
                                    <td class="text-right">${introducer.count}명</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </body>
            </html>
        `;
        const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
        const link = document.createElement('a');
        const safePeriodText = periodText.replace(/[^a-z0-9ㄱ-힣]/gi, '_');
        link.href = URL.createObjectURL(blob);
        link.download = `성과분석_리포트_${safePeriodText}.html`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(link.href);
    };

    const DonutChart: React.FC<{ data: typeof coverageAnalysis.data }> = ({ data }) => {
        const size = 180;
        const strokeWidth = 25;
        const radius = (size - strokeWidth) / 2;
        const circumference = 2 * Math.PI * radius;
        let accumulatedPercentage = 0;

        return (
            <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
                {data.map((segment) => {
                    const dashArrayValue = `${(segment.percentage / 100) * circumference} ${circumference}`;
                    const rotation = accumulatedPercentage * 3.6;
                    accumulatedPercentage += segment.percentage;

                    return (
                        <circle
                            key={segment.name}
                            cx={size / 2}
                            cy={size / 2}
                            r={radius}
                            fill="transparent"
                            stroke={segment.color}
                            strokeWidth={strokeWidth}
                            strokeDasharray={dashArrayValue}
                            transform={`rotate(${rotation - 90} ${size / 2} ${size / 2})`}
                            className="cursor-pointer transition-transform hover:scale-105"
                            onClick={() => setSelectedCoverage(prev => prev === segment.name ? null : segment.name)}
                        />
                    );
                })}
                <text x="50%" y="50%" textAnchor="middle" dy=".3em" className="text-2xl font-bold fill-[var(--text-primary)]">
                    {coverageAnalysis.total}
                </text>
                <text x="50%" y="50%" textAnchor="middle" dy="1.8em" className="text-xs fill-[var(--text-muted)]">
                    총 계약
                </text>
            </svg>
        );
    };

    return (
        <div className="animate-fade-in">
            <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-2">성과 분석 리포트</h1>
            <p className="text-sm text-[var(--text-muted)] mb-4">기간: {periodText} | 생성일: ${new Date().toLocaleDateString()}</p>
            
            <div className="bg-[var(--background-secondary)] p-4 rounded-lg shadow-md border border-[var(--border-color)] mb-6">
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-1 bg-[var(--background-tertiary)] p-1 rounded-lg">
                        {(['month', 'quarter', 'year', 'all'] as const).map(p => (
                            <button key={p} onClick={() => handlePeriodChange(p)} className={`px-3 py-1.5 text-sm font-medium rounded-md ${period === p ? 'bg-[var(--background-secondary)] text-[var(--text-accent)] shadow' : 'text-[var(--text-secondary)]'}`}>
                                {{ month: '월간', quarter: '분기', year: '연간', all: '전체' }[p]}
                            </button>
                        ))}
                    </div>
                    {period !== 'all' && (
                        <div className="flex items-center gap-2">
                            <button onClick={() => handleDateNavigate('prev')} className="px-3 py-2 bg-[var(--background-tertiary)] rounded-md hover:bg-[var(--background-primary)]">&lt;</button>
                            <span className="font-semibold text-center w-28">{periodText}</span>
                            <button onClick={() => handleDateNavigate('next')} className="px-3 py-2 bg-[var(--background-tertiary)] rounded-md hover:bg-[var(--background-primary)]">&gt;</button>
                        </div>
                    )}
                     <button
                        onClick={handleExportToHTML}
                        className="flex items-center gap-2 px-3 py-2 bg-[var(--background-tertiary)] text-[var(--text-secondary)] rounded-lg border border-[var(--border-color-strong)] text-sm font-medium hover:bg-[var(--background-primary)]"
                    >
                        <DownloadIcon className="h-5 w-5"/>
                        HTML로 내보내기
                    </button>
                </div>
            </div>

            <AnalysisSection title="종합 요약">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <StatCard title="총 인정 실적" value={`${(summary.totalRecognizedPerformance / 10000).toLocaleString()}만원`} />
                    <StatCard title="총 월 보험료" value={`${(summary.totalMonthlyPremium / 10000).toLocaleString(undefined, {maximumFractionDigits: 1})}만원`} />
                    <StatCard title="총 계약 건수" value={`${summary.totalContracts}건`} />
                    <StatCard title="계약당 평균 보험료" value={`${(summary.averagePremiumPerContract / 10000).toLocaleString(undefined, {maximumFractionDigits: 1})}만원`} />
                    <StatCard title="가입고객 평균" value={`${(summary.averagePremiumPerCustomer / 10000).toLocaleString(undefined, {maximumFractionDigits: 1})}만원`} subValue={`평균 ${summary.averageContractsPerCustomer.toFixed(1)}건`} />
                    <StatCard title="AP/PC/TA" value={`${summary.apCount}/${summary.pcCount}/${summary.taCount}건`} />
                    <StatCard title="주간 평균 활동" value={`${summary.weeklyAverageAP.toFixed(1)}/${summary.weeklyAveragePC.toFixed(1)}/${summary.weeklyAverageTA.toFixed(1)}`} subValue="(AP/PC/TA)" />
                    <StatCard title="PC→계약 전환율" value={`${summary.pcConversionRate.toFixed(1)}%`} subValue="(PC 대비 계약 건수)" />
                </div>
            </AnalysisSection>

            <AnalysisSection title={`실적 추이 (${period === 'all' ? '전체' : periodText})`}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div>
                        <h3 className="font-semibold text-center text-[var(--text-secondary)] mb-2">인정 실적</h3>
                        <div className="space-y-2 p-2 bg-[var(--background-secondary)] rounded-lg border border-[var(--border-color)]">
                            {trendData.labels.map((label, i) => (
                                <div key={label} className="grid grid-cols-[auto_1fr_auto] items-center gap-2 text-xs">
                                    <span className="text-right text-[var(--text-muted)] w-16">{label}</span>
                                    <div className="bg-[var(--background-tertiary)] rounded-full h-4">
                                        <div
                                            className="bg-[var(--background-accent)] h-4 rounded-full transition-all duration-300"
                                            style={{ width: `${trendData.performance[i]}%` }}
                                            title={`${(trendData.performanceValues[i] / 10000).toLocaleString('ko-KR', { maximumFractionDigits: 0 })}만원`}
                                        />
                                    </div>
                                    <span className="text-left font-semibold text-[var(--text-primary)] w-24">
                                        {(trendData.performanceValues[i] / 10000).toLocaleString('ko-KR', { maximumFractionDigits: 0 })}만원
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                     <div>
                        <h3 className="font-semibold text-center text-[var(--text-secondary)] mb-2">월 보험료</h3>
                        <div className="space-y-2 p-2 bg-[var(--background-secondary)] rounded-lg border border-[var(--border-color)]">
                            {trendData.labels.map((label, i) => (
                                <div key={label} className="grid grid-cols-[auto_1fr_auto] items-center gap-2 text-xs">
                                    <span className="text-right text-[var(--text-muted)] w-16">{label}</span>
                                    <div className="bg-[var(--background-tertiary)] rounded-full h-4">
                                        <div
                                            className="bg-[var(--background-accent)] h-4 rounded-full transition-all duration-300"
                                            style={{ width: `${trendData.premium[i]}%` }}
                                            title={`${(trendData.premiumValues[i] / 10000).toLocaleString('ko-KR', { maximumFractionDigits: 0 })}만원`}
                                        />
                                    </div>
                                    <span className="text-left font-semibold text-[var(--text-primary)] w-24">
                                        {(trendData.premiumValues[i] / 10000).toLocaleString('ko-KR', { maximumFractionDigits: 0 })}만원
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </AnalysisSection>

            <AnalysisSection title="계약 고객 분석">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="p-4 bg-[var(--background-secondary)] rounded-lg border border-[var(--border-color)]">
                        <h3 className="font-semibold text-[var(--text-primary)] mb-2">연령대별 분포</h3>
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b-2 border-[var(--border-color-strong)]">
                                    <th className="py-1 text-left font-medium text-[var(--text-muted)]">연령대</th>
                                    <th className="py-1 text-right font-medium text-[var(--text-muted)]">남성</th>
                                    <th className="py-1 text-right font-medium text-[var(--text-muted)]">여성</th>
                                    <th className="py-1 text-right font-medium text-[var(--text-muted)]">합계</th>
                                </tr>
                            </thead>
                            <tbody>
                                {customerAnalysis.ageDistribution.map(([group, data]) => (
                                    <tr key={group} className="border-b border-[var(--border-color)]">
                                        <td className="py-1.5">{group}</td>
                                        <td className="py-1.5 text-right">{data.male}명</td>
                                        <td className="py-1.5 text-right">{data.female}명</td>
                                        <td className="py-1.5 text-right font-semibold">{data.total}명</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <div className="p-4 bg-[var(--background-secondary)] rounded-lg border border-[var(--border-color)]">
                        <h3 className="font-semibold text-[var(--text-primary)] mb-2">직업별 분포 (Top 10)</h3>
                        {customerAnalysis.occupationDistribution.map(([occupation, count]) => (
                            <div key={occupation} className="flex justify-between text-sm py-1 border-b border-[var(--border-color)]">
                                <span className="truncate">{occupation}</span>
                                <span className="font-medium flex-shrink-0 ml-2">{count}명</span>
                            </div>
                        ))}
                    </div>
                    <div className="p-4 bg-[var(--background-secondary)] rounded-lg border border-[var(--border-color)]">
                        <h3 className="font-semibold text-[var(--text-primary)] mb-2">취득경로별 계약 전환율</h3>
                        <div className="text-xs -mx-4">
                            <div className="flex font-semibold text-[var(--text-muted)] px-4">
                                <span className="flex-1">경로</span>
                                <span className="w-10 text-center">미팅</span>
                                <span className="w-10 text-center">계약</span>
                                <span className="w-12 text-center">전환율</span>
                            </div>
                            {customerAnalysis.acquisitionConversions.map(item => (
                                <div key={item.source} className="flex items-center py-1 border-b border-[var(--border-color)] px-4">
                                    <span className="flex-1 truncate">{item.source}</span>
                                    <span className="w-10 text-center">{item.meetings}</span>
                                    <span className="w-10 text-center">{item.contracts}</span>
                                    <span className={`w-12 text-center font-semibold ${item.contracts > 0 ? 'text-[var(--text-accent)]' : ''}`}>{item.rate}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </AnalysisSection>
            
            <AnalysisSection title="보장 구분별 성과 분석">
                <div className="p-4 bg-[var(--background-secondary)] rounded-lg border border-[var(--border-color)]">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                        <div className="flex justify-center items-center">
                            <DonutChart data={coverageAnalysis.data} />
                        </div>
                        <div>
                            <h4 className="font-semibold mb-2">범례</h4>
                            <ul className="space-y-1.5 text-sm">
                                {coverageAnalysis.data.map(item => (
                                    <li key={item.name} className="flex justify-between items-center cursor-pointer hover:bg-[var(--background-tertiary)] p-1 rounded-md" onClick={() => setSelectedCoverage(prev => prev === item.name ? null : item.name)}>
                                        <div className="flex items-center">
                                            <span className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: item.color }}></span>
                                            <span>{item.name}</span>
                                        </div>
                                        <span className="font-medium text-[var(--text-primary)]">{item.count}건 ({item.percentage.toFixed(1)}%)</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>

                    {selectedCoverage && (
                        <div className="mt-6 pt-4 border-t border-[var(--border-color)] animate-fade-in">
                            <div className="flex justify-between items-center mb-2">
                                <h3 className="text-lg font-semibold text-[var(--text-primary)]">{selectedCoverage} 계약 목록</h3>
                                <button onClick={() => setSelectedCoverage(null)} className="text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)]">닫기</button>
                            </div>
                            <div className="overflow-x-auto max-h-60 custom-scrollbar">
                                <table className="min-w-full text-sm">
                                    <thead className="bg-[var(--background-tertiary)] sticky top-0">
                                        <tr>
                                            <th className="p-2 text-left">계약자</th>
                                            <th className="p-2 text-left">상품명</th>
                                            <th className="p-2 text-left">계약일</th>
                                            <th className="p-2 text-right">월 보험료</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredContracts
                                            .filter(c => (c.coverageCategory || '기타') === selectedCoverage)
                                            .map(contract => (
                                                <tr key={contract.id} className="border-b border-[var(--border-color)] hover:bg-[var(--background-primary)]">
                                                    <td className="p-2">
                                                        <button onClick={() => {
                                                            const customer = customers.find(c => c.id === contract.customerId);
                                                            if (customer) onSelectCustomer(customer);
                                                        }} className="hover:underline text-[var(--text-accent)]">
                                                            {contract.customerName}
                                                        </button>
                                                    </td>
                                                    <td className="p-2">{contract.productName}</td>
                                                    <td className="p-2">{contract.contractDate}</td>
                                                    <td className="p-2 text-right">{contract.monthlyPremium.toLocaleString()}원</td>
                                                </tr>
                                            ))
                                        }
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>
            </AnalysisSection>

            <AnalysisSection title="키맨 고객 분석 (핵심 소개자)">
                <div className="p-4 bg-[var(--background-secondary)] rounded-lg border border-[var(--border-color)]">
                    <h3 className="font-semibold text-[var(--text-primary)] mb-2">Top 10 소개자 랭킹</h3>
                     <div className="text-sm">
                        <div className="flex font-semibold text-[var(--text-muted)] border-b-2 border-[var(--border-color-strong)] pb-2">
                            <span className="w-12">순위</span>
                            <span className="flex-1">이름</span>
                            <span className="w-20 text-right">소개 인원</span>
                        </div>
                        {keymanAnalysis.map((introducer, index) => (
                            <div key={introducer.name} className="flex items-center py-2 border-b border-[var(--border-color)]">
                                <span className="w-12">{index + 1}</span>
                                <span className="flex-1 font-medium text-[var(--text-primary)]">{introducer.name}</span>
                                <span className="w-20 text-right">{introducer.count}명</span>
                            </div>
                        ))}
                    </div>
                </div>
            </AnalysisSection>
        </div>
    );
};

export default PerformanceAnalysis;
