

import React, { useState, useEffect, useMemo } from 'react';
import BaseModal from './ui/BaseModal';
import { XIcon } from './icons';
import { getItem } from '../services/storageService';
import { getUserColors, saveUserColors, resetUserColors, getDefaultHexColor, DEFAULT_MEETING_TYPE_COLORS } from '../services/colorService';

interface MeetingTypeColorSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const MeetingTypeColorSettingsModal: React.FC<MeetingTypeColorSettingsModalProps> = ({ isOpen, onClose }) => {
    const [colors, setColors] = useState<Record<string, string>>({});
    
    const allMeetingTypes = useMemo(() => {
        // Get default types from the service
        const defaultTypes = Object.keys(DEFAULT_MEETING_TYPE_COLORS);
        
        // Get custom types added by the user
        const customCustomerTypes = getItem<string[]>('customer_meeting_types') || [];
        const customPersonalTypes = getItem<string[]>('personal_meeting_types') || [];
        
        // Merge and remove duplicates
        // Updated list to match new personal types
        const combinedTypes = new Set([
            ...defaultTypes,
            ...customCustomerTypes,
            ...customPersonalTypes,
            'AP', 'PC', '기타', '증권전달', '교육', '회의', '업무', '개인', '운동' // Ensure common ones are present
        ]);
        
        return Array.from(combinedTypes).sort((a, b) => a.localeCompare(b));
    }, [isOpen]); // Refresh list when modal opens

    useEffect(() => {
        if (isOpen) {
            setColors(getUserColors());
        }
    }, [isOpen]);
    
    const handleColorChange = (type: string, color: string) => {
        setColors(prev => ({ ...prev, [type]: color }));
    };

    const handleSave = () => {
        saveUserColors(colors);
        window.dispatchEvent(new CustomEvent('colors-updated'));
        alert('색상 설정이 저장되었습니다.');
        onClose();
    };
    
    const handleReset = () => {
        if(window.confirm('모든 색상 설정을 기본값으로 되돌리시겠습니까?')) {
            resetUserColors();
            window.dispatchEvent(new CustomEvent('colors-updated'));
            alert('색상 설정이 초기화되었습니다.');
            onClose();
        }
    };

    return (
        <BaseModal isOpen={isOpen} onClose={onClose} className="max-w-xl w-full">
            <div className="p-6 border-b border-[var(--border-color)] flex justify-between items-center">
                <h2 className="text-2xl font-bold text-[var(--text-primary)]">미팅 유형별 색상 설정</h2>
                <button onClick={onClose} className="text-[var(--text-muted)] hover:text-[var(--text-primary)]"><XIcon className="h-6 w-6" /></button>
            </div>
            <div className="p-6 max-h-[60vh] overflow-y-auto custom-scrollbar space-y-3">
                <p className="text-sm text-[var(--text-muted)]">캘린더와 고객 카드에 표시될 각 미팅 유형의 배경색을 직접 설정할 수 있습니다. 글자색은 가독성에 따라 자동으로 조절됩니다.</p>
                {allMeetingTypes.map(type => (
                    <div key={type} className="flex items-center justify-between p-2 bg-[var(--background-tertiary)] rounded-md">
                        <span className="font-medium text-[var(--text-primary)]">{type}</span>
                        <input
                            type="color"
                            value={colors[type] || getDefaultHexColor(type)}
                            onChange={(e) => handleColorChange(type, e.target.value)}
                            className="w-24 h-8 p-1 bg-transparent border border-[var(--border-color-strong)] rounded-md cursor-pointer"
                        />
                    </div>
                ))}
            </div>
            <div className="p-6 bg-[var(--background-tertiary)] border-t border-[var(--border-color)] flex justify-between items-center">
                <button onClick={handleReset} className="px-4 py-2 bg-[var(--background-danger)] text-white rounded-md text-sm font-medium hover:bg-[var(--background-danger-hover)]">
                    기본값으로 초기화
                </button>
                <div className="flex gap-2">
                    <button onClick={onClose} className="px-4 py-2 bg-[var(--background-secondary)] border border-[var(--border-color-strong)] rounded-md text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--background-primary)]">
                        취소
                    </button>
                    <button onClick={handleSave} className="px-6 py-2 bg-[var(--background-accent)] text-[var(--text-on-accent)] rounded-md text-sm font-medium hover:bg-[var(--background-accent-hover)]">
                        저장
                    </button>
                </div>
            </div>
        </BaseModal>
    );
};

export default MeetingTypeColorSettingsModal;
