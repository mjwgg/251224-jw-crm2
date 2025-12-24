
import React, { useState, useCallback } from 'react';
import type { Customer } from '../types';
import BaseModal from './ui/BaseModal';
import { XIcon, MessageIcon } from './icons';
import { generatePersonalizedGreeting } from '../services/geminiService';
import Spinner from './ui/Spinner';

interface TouchRecommendationModalProps {
  isOpen: boolean;
  onClose: () => void;
  customers: Customer[];
  onSelectCustomer: (customer: Customer, initialTab?: 'details' | 'consultations' | 'contracts' | 'callHistory') => void;
}

const TouchRecommendationModal: React.FC<TouchRecommendationModalProps> = ({ isOpen, onClose, customers, onSelectCustomer }) => {
    const [personalizedGreetings, setPersonalizedGreetings] = useState<Record<string, string>>({});
    const [loadingGreeting, setLoadingGreeting] = useState<string | null>(null);

    const handleGenerateGreeting = useCallback(async (customer: Customer) => {
        setLoadingGreeting(customer.id);
        try {
            const greeting = await generatePersonalizedGreeting(customer.name);
            setPersonalizedGreetings(prev => ({ ...prev, [customer.id]: greeting }));
        } catch (error) {
            alert('AI 문구 생성에 실패했습니다.');
        } finally {
            setLoadingGreeting(null);
        }
    }, []);

    return (
        <BaseModal isOpen={isOpen} onClose={onClose} className="max-w-2xl w-full">
            <div className="p-6 border-b border-[var(--border-color)] flex justify-between items-center">
                <h2 className="text-2xl font-bold text-[var(--text-primary)]">터치 추천 전체 보기</h2>
                <button onClick={onClose} className="text-[var(--text-muted)] hover:text-[var(--text-primary)]"><XIcon className="h-6 w-6" /></button>
            </div>
            <div className="p-6 flex-1 min-h-0 overflow-y-auto custom-scrollbar">
                {customers.length > 0 ? (
                    <div className="space-y-3">
                        {customers.map(customer => (
                            <div key={customer.id} className="p-3 bg-[var(--background-tertiary)] rounded-md border-[var(--border-color-strong)]">
                                <div className="flex justify-between items-start text-sm">
                                    <div className="truncate mr-2">
                                        <button onClick={() => { onSelectCustomer(customer, 'details'); onClose(); }} className="font-semibold text-[var(--text-primary)] hover:underline truncate" title={customer.name}>{customer.name}</button>
                                        <p className="text-xs text-[var(--text-muted)] truncate">최근 연락: {customer.callHistory && customer.callHistory.length > 0 ? new Date(customer.callHistory[0].date).toLocaleDateString() : '기록 없음'}</p>
                                    </div>
                                    <button
                                        onClick={() => handleGenerateGreeting(customer)}
                                        disabled={!!loadingGreeting}
                                        className="flex shrink-0 items-center ml-2 px-3 py-1.5 bg-pink-500 text-white rounded-md font-medium hover:bg-pink-600 disabled:opacity-50 text-xs"
                                    >
                                        {loadingGreeting === customer.id ? <Spinner small /> : <MessageIcon className="h-4 w-4 mr-1.5" />}
                                        <span>안부</span>
                                    </button>
                                </div>
                                {personalizedGreetings[customer.id] && (
                               