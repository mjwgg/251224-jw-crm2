

import { getItem, setItem } from './storageService';

export const MEETING_TYPE_COLORS_KEY = 'meeting_type_colors';

// Moved from ScheduleCalendar.tsx
export const DEFAULT_MEETING_TYPE_COLORS: Record<string, { bg: string; text: string }> = {
    // Customer types
    'AP': { bg: 'bg-yellow-400', text: 'text-yellow-900' },
    'PC': { bg: 'bg-blue-400', text: 'text-blue-900' },
    'TA': { bg: 'bg-orange-400', text: 'text-orange-900' },
    'N': { bg: 'bg-purple-400', text: 'text-purple-900' },
    '증권전달': { bg: 'bg-indigo-400', text: 'text-indigo-900' },
    '기타': { bg: 'bg-gray-400', text: 'text-gray-900' },
    'JOINT': { bg: 'bg-cyan-400', text: 'text-cyan-900' },
    'RP': { bg: 'bg-pink-400', text: 'text-pink-900' },
    'Follow Up': { bg: 'bg-lime-400', text: 'text-lime-900' },
    'S.P': { bg: 'bg-red-400', text: 'text-red-900' },
    '카톡개별연락': { bg: 'bg-sky-400', text: 'text-sky-900' },
    // Personal types (Updated)
    '교육': { bg: 'bg-green-400', text: 'text-green-900' },
    '회의': { bg: 'bg-teal-400', text: 'text-teal-900' },
    '업무': { bg: 'bg-slate-500', text: 'text-white' },
    '개인': { bg: 'bg-fuchsia-400', text: 'text-fuchsia-900' },
    '운동': { bg: 'bg-rose-400', text: 'text-rose-900' },
    // System types
    '기념일': { bg: 'bg-fuchsia-400', text: 'text-fuchsia-900' },
};

export const getUserColors = (): Record<string, string> => {
    return getItem<Record<string, string>>(MEETING_TYPE_COLORS_KEY) || {};
};

export const saveUserColors = (colors: Record<string, string>): void => {
    setItem(MEETING_TYPE_COLORS_KEY, colors);
};

export const resetUserColors = (): void => {
    // FIX: Use storageService abstraction to remove item.
    setItem(MEETING_TYPE_COLORS_KEY, undefined);
};

// Function to calculate luminance and determine text color
export const getTextColorForBackground = (hexColor: string): string => {
    if (!hexColor) return '#000000';
    
    // Expand shorthand form (e.g. "03F") to full form (e.g. "0033FF")
    const shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
    hexColor = hexColor.replace(shorthandRegex, (m, r, g, b) => r + r + g + g + b + b);
    
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hexColor);
    if (!result) return '#000000';
    
    const r = parseInt(result[1], 16);
    const g = parseInt(result[2], 16);
    const b = parseInt(result[3], 16);
    
    // Using the luminance formula
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    
    return luminance > 0.5 ? '#000000' : '#FFFFFF';
};

// Helper to convert Tailwind bg class to a hex color for the color picker
// This is a simplified version and might not cover all Tailwind colors.
const tailwindBgToHex: Record<string, string> = {
    'bg-yellow-400': '#facc15',
    'bg-blue-400': '#60a5fa',
    'bg-orange-400': '#fb923c',
    'bg-purple-400': '#c084fc',
    'bg-indigo-400': '#818cf8',
    'bg-gray-400': '#9ca3af',
    'bg-cyan-400': '#22d3ee',
    'bg-pink-400': '#f472b6',
    'bg-lime-400': '#a3e635',
    'bg-red-400': '#f87171',
    'bg-sky-400': '#38bdf8',
    'bg-green-400': '#4ade80',
    'bg-teal-400': '#2dd4bf',
    'bg-rose-400': '#fb7185',
    'bg-slate-400': '#94a3b8',
    'bg-slate-500': '#64748b',
    'bg-amber-400': '#fbbf24',
    'bg-violet-400': '#a78bfa',
    'bg-emerald-400': '#34d399',
    'bg-fuchsia-400': '#e879f9',
};

export const getDefaultHexColor = (type: string): string => {
    const colorInfo = DEFAULT_MEETING_TYPE_COLORS[type];
    if (colorInfo) {
        return tailwindBgToHex[colorInfo.bg] || '#9ca3af';
    }
    return '#9ca3af'; // default to gray
};
