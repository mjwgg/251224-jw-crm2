import React, { useState, useMemo, useEffect } from 'react';
import type { Customer } from '../types';
import BaseModal from './ui/BaseModal';
import { XIcon, PencilIcon, TrashIcon, CheckIcon, ClipboardIcon } from './icons';
import ConfirmationModal from './ui/ConfirmationModal';

interface TagStat {
    name: string;
    count: number;
}

interface TagManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  customers: Customer[];
  onBulkUpdate: (updates: {
    rename?: { from: string; to: string };
    merge?: { from: string[]; to: string };
    delete?: string[];
  }) => Promise<void>;
}

const TagManagementModal: React.FC<TagManagementModalProps> = ({ isOpen, onClose, customers, onBulkUpdate }) => {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [selectedToMerge, setSelectedToMerge] = useState<Set<string>>(new Set());
    const [mergeTarget, setMergeTarget] = useState('');
    const [editing, setEditing] = useState<{ oldName: string; newName: string } | null>(null);
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);
    const [confirmAction, setConfirmAction] = useState<(() => void) | null>(null);
    const [confirmMessage, setConfirmMessage] = useState<React.ReactNode>('');

    const tagStats: TagStat[] = useMemo(() => {
        const stats = new Map<string, number>();
        customers.forEach(customer => {
            customer.tags.forEach(tag => {
                stats.set(tag, (stats.get(tag) || 0) + 1);
            });
        });
        return Array.from(stats.entries())
            .map(([name, count]) => ({ name, count }))
            .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
    }, [customers]);
    
    useEffect(() => {
        if(!isOpen) {
            setSelectedToMerge(new Set());
            setMergeTarget('');
            setEditing(null);
            setError('');
        }
    }, [isOpen]);

    const handleToggleMergeSelection = (tagName: string) => {
        setSelectedToMerge(prev => {
            const newSet = new Set(prev);
            if (newSet.has(tagName)) newSet.delete(tagName);
            else newSet.add(tagName);
            return newSet;
        });
    };

    const handleSaveRename = async () => {
        if (!editing || !editing.newName.trim() || editing.newName === editing.oldName) {
            setEditing(null);
            return;
        }
        setIsLoading(true);
        setError('');
        try {
            await onBulkUpdate({ rename: { from: editing.oldName, to: editing.newName.trim() } });
            setEditing(null);
        } catch (e) {
            setError((e as Error).message);
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleMerge = async () => {
        if (selectedToMerge.size < 2 || !mergeTarget.trim()) {
            setError("병합하려면 2개 이상의 태그를 선택하고, 새 태그 이름을 입력해야 합니다.");
            return;
        }
        setConfirmMessage(
            <p>선택한 <span className="font-bold">{selectedToMerge.size}</span>개의 태그를 '<span className="font-bold">{mergeTarget.trim()}</span>'(으)로 병합하시겠습니까? 이 작업은 되돌릴 수 없습니다.</p>
        );
        setConfirmAction(() => async () => {
            setIsLoading(true);
            setError('');
            try {
                await onBulkUpdate({ merge: { from: Array.from(selectedToMerge), to: mergeTarget.trim() } });
                setSelectedToMerge(new Set());
                setMergeTarget('');
            } catch (e) {
                setError((e as Error).message);
            } finally {
                setIsLoading(false);
            }
        });
        setIsConfirmOpen(true);
    };

    const handleDelete = async (tagToDelete: TagStat) => {
        setConfirmMessage(
            <p>'<span className="font-bold">{tagToDelete.name}</span>' 태그를 <span className="font-bold">{tagToDelete.count}</span>명의 고객에게서 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.</p>
        );
        setConfirmAction(() => async () => {
            setIsLoading(true);
            setError('');
            try {
                await onBulkUpdate({ delete: [tagToDelete.name] });
            } catch (e) {
                setError((e as Error).message);
            } finally {
                setIsLoading(false);
            }
        });
        setIsConfirmOpen(true);
    };


    return (
        <>
        <BaseModal isOpen={isOpen} onClose={onClose} className="max-w-2xl w-full">
            <div className="p-6 border-b border-[var(--border-color)] flex justify-between items-center">
                <h2 className="text-2xl font-bold text-[var(--text-primary)]">태그 관리</h2>
                <button onClick={onClose} className="text-[var(--text-muted)] hover:text-[var(--text-primary)]"><XIcon className="h-6 w-6" /></button>
            </div>
            <div className="p-6 flex-1 min-h-0 overflow-y-auto custom-scrollbar">
                {error && <p className="text-sm text-center text-[var(--text-danger)] bg-red-500/10 p-2 rounded-md mb-4">{error}</p>}
                
                <div className="space-y-2 max-h-[40vh] overflow-y-auto pr-2 custom-scrollbar border border-[var(--border-color)] rounded-lg">
                    {tagStats.map(tag => (
                        <div key={tag.name} className="p-2 flex items-center justify-between bg-[var(--background-tertiary)] rounded-md hover:bg-[var(--background-primary)]">
                            <div className="flex items-center flex-grow">
                                <input
                                    type="checkbox"
                                    checked={selectedToMerge.has(tag.name)}
                                    onChange={() => handleToggleMergeSelection(tag.name)}
                                    className="h-5 w-5 rounded border-[var(--border-color-strong)] bg-[var(--background-secondary)] text-[var(--background-accent)] focus:ring-[var(--background-accent)] mr-3"
                                />
                                {editing?.oldName === tag.name ? (
                                    <input
                                        type="text"
                                        value={editing.newName}
                                        onChange={(e) => setEditing({ ...editing, newName: e.target.value })}
                                        className="flex-grow p-1 border-b bg-transparent focus:border-[var(--background-accent)] outline-none text-[var(--text-primary)] font-medium border-[var(--border-color-strong)]"
                                        autoFocus
                                    />
                                ) : (
                                    <span className="font-medium text-[var(--text-primary)]">{tag.name}</span>
                                )}
                                <span className="ml-2 text-xs bg-[var(--background-accent-subtle)] text-[var(--text-accent)] px-2 py-0.5 rounded-full">{tag.count}</span>
                            </div>

                            <div className="flex items-center gap-1">
                                {editing?.oldName === tag.name ? (
                                    <>
                                        <button onClick={handleSaveRename} className="p-2 text-green-500 hover:bg-green-500/10 rounded-full" aria-label="저장"><CheckIcon className="h-5 w-5"/></button>
                                        <button onClick={() => setEditing(null)} className="p-2 text-[var(--text-muted)] hover:bg-gray-500/10 rounded-full" aria-label="취소"><XIcon className="h-5 w-5"/></button>
                                    </>
                                ) : (
                                    <>
                                        <button onClick={() => setEditing({ oldName: tag.name, newName: tag.name })} className="p-2 text-[var(--text-muted)] hover:text-[var(--text-accent)]" aria-label="이름 변경"><PencilIcon className="h-5 w-5"/></button>
                                        <button onClick={() => handleDelete(tag)} className="p-2 text-[var(--text-muted)] hover:text-[var(--text-danger)]" aria-label="삭제"><TrashIcon className="h-5 w-5"/></button>
                                    </>
                                )}
                            </div>
                        </div>
                    ))}
                </div>

                {selectedToMerge.size > 1 && (
                    <div className="mt-6 pt-4 border-t border-[var(--border-color)] animate-fade-in">
                         <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-3">태그 병합</h3>
                         <div className="p-3 bg-[var(--background-tertiary)] rounded-md">
                            <p className="text-sm text-[var(--text-muted)]">선택된 태그: <span className="font-medium text-[var(--text-secondary)]">{Array.from(selectedToMerge).join(', ')}</span></p>
                             <div className="flex items-center gap-2 mt-3">
                                <input
                                    type="text"
                                    value={mergeTarget}
                                    onChange={(e) => setMergeTarget(e.target.value)}
                                    placeholder="병합 후 태그 이름"
                                    className="flex-grow p-2 border border-[var(--border-color-strong)] bg-[var(--background-primary)] text-[var(--text-primary)] rounded-md"
                                />
                                <button
                                    onClick={handleMerge}
                                    className="px-4 py-2 bg-[var(--background-accent)] text-[var(--text-on-accent)] rounded-md text-sm font-medium hover:bg-[var(--background-accent-hover)]"
                                >
                                    병합
                                </button>
                             </div>
                         </div>
                    </div>
                )}
            </div>
            <div className="p-4 bg-[var(--background-primary)] border-t border-[var(--border-color)] flex justify-end">
                <button onClick={onClose} className="px-4 py-2 bg-[var(--background-tertiary)] border border-[var(--border-color-strong)] rounded-md text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--background-primary)]/80">
                    닫기
                </button>
            </div>
        </BaseModal>
        <ConfirmationModal
            isOpen={isConfirmOpen}
            onClose={() => setIsConfirmOpen(false)}
            onConfirm={() => {
                if (confirmAction) confirmAction();
                setIsConfirmOpen(false);
            }}
            title="작업 확인"
            message={confirmMessage}
            zIndex="z-[70]"
        />
        </>
    );
};

export default TagManagementModal;