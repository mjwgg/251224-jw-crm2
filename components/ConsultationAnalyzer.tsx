
import React, { useState, useRef, useEffect } from 'react';
import type { Consultation, MeetingType } from '../types';
import { getItem, setItem } from '../services/storageService';

interface ConsultationAnalyzerProps {
    onNotesChange: (notes: string) => void;
    initialDate?: string;
    onDateChange: (date: string) => void;
    meetingType: string; // Changed from MeetingType to string to support dynamic types
    onMeetingTypeChange?: (type: string) => void; // Changed from MeetingType to string
    meetingTypeOptions?: string[]; // Changed from MeetingType[] to string[]
    analysisType?: 'customer' | 'personal';
    initialNotes?: string;
    customerId: string; // To create a unique draft key
}

const ConsultationAnalyzer: React.FC<ConsultationAnalyzerProps> = ({ 
    onNotesChange,
    initialDate, 
    onDateChange,
    meetingType, 
    onMeetingTypeChange,
    meetingTypeOptions,
    analysisType = 'customer', 
    initialNotes,
    customerId
}) => {
    const DRAFT_STORAGE_KEY = `consultation_draft_${customerId}`;
    
    // Save draft on a timer
    useEffect(() => {
        if (!initialNotes) {
            return;
        }

        const handler = setTimeout(() => {
            if (initialNotes) {
                const draft = { notes: initialNotes, meetingType: meetingType };
                setItem(DRAFT_STORAGE_KEY, draft);
            }
        }, 2000);

        return () => {
            clearTimeout(handler);
        };
    }, [initialNotes, meetingType, DRAFT_STORAGE_KEY]);

    return (
        <div className="bg-[var(--background-primary)] p-4 rounded-lg border border-[var(--border-color)]">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-2">
                <div>
                    <label htmlFor="consultationDate" className="block text-sm font-medium text-[var(--text-secondary)]">상담 일자</label>
                    <input
                        type="date" id="consultationDate" value={initialDate}
                        onChange={(e) => onDateChange(e.target.value)}
                        className="mt-1 block w-full px-3 py-2 bg-[var(--background-tertiary)] border border-[var(--border-color-strong)] text-[var(--text-primary)] rounded-md shadow-sm focus:outline-none focus:ring-[var(--background-accent)] focus:border-[var(--background-accent)] sm:text-sm"
                    />
                </div>
                 <div>
                    <label htmlFor="meetingType" className="block text-sm font-medium text-[var(--text-secondary)]">미팅 유형</label>
                    {meetingTypeOptions && onMeetingTypeChange ? (
                        <select
                            id="meetingType"
                            value={meetingType}
                            onChange={(e) => onMeetingTypeChange(e.target.value)}
                            className="mt-1 block w-full px-3 py-2 bg-[var(--background-tertiary)] border border-[var(--border-color-strong)] text-[var(--text-primary)] rounded-md shadow-sm focus:outline-none focus:ring-[var(--background-accent)] focus:border-[var(--background-accent)] sm:text-sm"
                        >
                            {meetingTypeOptions.map(type => (
                                <option key={type} value={type}>{type}</option>
                            ))}
                        </select>
                    ) : (
                        <input id="meetingType" type="text" value={meetingType} readOnly className="mt-1 block w-full px-3 py-2 bg-[var(--background-tertiary)]/50 border border-[var(--border-color-strong)] rounded-md shadow-sm sm:text-sm" />
                    )}
                </div>
            </div>
            <div>
                <textarea
                    className="w-full h-24 p-2 border rounded-md bg-[var(--background-tertiary)] border-[var(--border-color-strong)] text-[var(--text-primary)]"
                    placeholder="미팅 후 메모를 여기에 입력하세요..."
                    value={initialNotes || ''}
                    onChange={(e) => onNotesChange(e.target.value)}
                />
            </div>
        </div>
    );
};

export default ConsultationAnalyzer;
