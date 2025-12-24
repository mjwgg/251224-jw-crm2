
import React, { useState, useRef, useCallback } from 'react';
import { transcribeConversationAudio } from '../services/geminiService';
import Spinner from './ui/Spinner';
import { UploadCloudIcon, FileAudioIcon, ClipboardIcon, CheckIcon } from './icons';

const fileToBase64 = (file: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve((reader.result as string).split(',')[1]);
        reader.onerror = error => reject(error);
    });
};

const getMimeTypeFromFile = (file: File): string => {
    if (file.type) return file.type;
    const extension = file.name.split('.').pop()?.toLowerCase();
    switch(extension) {
        case 'm4a': return 'audio/mp4'; case 'mp3': return 'audio/mpeg';
        case 'wav': return 'audio/wav'; case 'mp4': return 'audio/mp4';
        case 'aac': return 'audio/aac'; case 'ogg': return 'audio/ogg';
        case 'opus': return 'audio/opus'; case 'webm': return 'audio/webm';
        default: return '';
    }
};

const VoiceToText: React.FC = () => {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [transcribedText, setTranscribedText] = useState('');
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [copySuccess, setCopySuccess] = useState('');

    const fileInputRef = useRef<HTMLInputElement>(null);
    
    const handleFileSelect = (file: File | null) => {
        setTranscribedText('');
        if (file) {
            const isAudio = file.type.startsWith('audio/') || /\.(m4a|mp3|webm|mp4|wav|aac|ogg|opus)$/i.test(file.name);
            if (!isAudio) {
                setError('오디오 파일만 업로드할 수 있습니다.');
                return;
            }
            setSelectedFile(file);
            setError(null);
        }
    };

    const handleDragEvents = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); };
    const handleDragEnter = (e: React.DragEvent) => { handleDragEvents(e); setIsDragging(true); };
    const handleDragLeave = (e: React.DragEvent) => { handleDragEvents(e); setIsDragging(false); };
    const handleDrop = (e: React.DragEvent) => {
        handleDragEvents(e);
        setIsDragging(false);
        const files = e.dataTransfer.files;
        if (files && files.length > 0) handleFileSelect(files[0]);
    };
    
    const clearFile = () => {
        setSelectedFile(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
    };

    const handleTranscribe = async () => {
        if (!selectedFile) {
            setError('변환할 파일을 업로드해주세요.');
            return;
        }
        setIsLoading(true);
        setError(null);
        setTranscribedText('');
        try {
            const base64Audio = await fileToBase64(selectedFile);
            const mimeType = getMimeTypeFromFile(selectedFile);
            const transcribedTextResult = await transcribeConversationAudio(base64Audio, mimeType);
            setTranscribedText(transcribedTextResult);
        } catch (err) {
            setError(err instanceof Error ? err.message : '음성 변환에 실패했습니다.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleSave = async () => {
        if (!transcribedText) return;
        const fileName = `transcribed_text_${new Date().toISOString().split('T')[0]}.txt`;
        const blob = new Blob([transcribedText], { type: 'text/plain' });
    
        const isMobile = /Mobi/i.test(navigator.userAgent);
    
        // --- For Mobile: Try using the Web Share API ---
        if (isMobile) {
            const file = new File([blob], fileName, { type: 'text/plain' });
            if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
                try {
                    await navigator.share({
                        files: [file],
                        title: '변환된 텍스트',
                        text: `음성에서 변환된 텍스트 파일입니다: ${fileName}`,
                    });
                    return; // Successfully shared, so we stop here.
                } catch (error) {
                    // If user cancels share, we don't want to fall back.
                    if (error instanceof DOMException && error.name === 'AbortError') {
                        console.log('Share was cancelled by the user.');
                        return;
                    }
                    console.error("Web Share API failed on mobile, will fall back to download.", error);
                }
            }
        }
        
        // --- For PC (and as a fallback for mobile): Trigger a direct download ---
        try {
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = fileName;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(link.href);
        } catch (err) {
             console.error("Failed to download file:", err);
             setError("파일 다운로드에 실패했습니다.");
        }
    };

    const handleCopy = useCallback(() => {
        if (!transcribedText) return;
        navigator.clipboard.writeText(transcribedText).then(() => {
            setCopySuccess('복사 완료!');
            setTimeout(() => setCopySuccess(''), 2000);
        });
    }, [transcribedText]);


    return (
        <div className="bg-[var(--background-secondary)] p-6 rounded-lg shadow-lg border border-[var(--border-color)] animate-fade-in-up">
            <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-4">음성 to Text</h2>
            <div className="space-y-3">
                <div className="relative">
                    <div
                        onDragEnter={handleDragEnter} onDragOver={handleDragEnter} onDragLeave={handleDragLeave} onDrop={handleDrop}
                        className={`p-4 border-2 border-dashed rounded-lg text-center transition-colors ${isDragging ? 'border-[var(--background-accent)] bg-[var(--background-accent-subtle)]' : 'border-[var(--border-color-strong)]'} ${selectedFile ? 'bg-[var(--background-tertiary)] opacity-60 pointer-events-none' : 'hover:border-[var(--border-color)]'}`}
                    >
                        {selectedFile ? (
                            <div className="flex flex-col items-center justify-center">
                                <FileAudioIcon className="h-10 w-10 text-[var(--text-muted)]" />
                                <p className="mt-1 text-sm text-[var(--text-secondary)] font-medium">{selectedFile.name}</p>
                                <button onClick={clearFile} className="mt-2 px-3 py-1 bg-red-500/20 text-red-300 rounded-full text-xs font-semibold hover:bg-red-500/30 z-10 relative">파일 제거</button>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center text-[var(--text-muted)]">
                                <UploadCloudIcon className="h-10 w-10" />
                                <p className="mt-1 text-sm"><span className="font-semibold text-[var(--text-accent)]">음성 파일을 첨부</span>하거나 드래그 앤 드롭</p>
                            </div>
                        )}
                    </div>
                    <input
                        ref={fileInputRef} type="file" accept="audio/*,.m4a,.mp3,.wav,.mp4,.aac,.ogg,.opus,.webm"
                        onChange={(e) => handleFileSelect(e.target.files ? e.target.files[0] : null)}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        disabled={!!selectedFile}
                        aria-label="Upload audio file"
                    />
                </div>
                 <div className="text-center">
                    <button
                        onClick={handleTranscribe}
                        disabled={isLoading || !selectedFile}
                        className="w-full px-4 py-2 bg-[var(--background-accent)] text-[var(--text-on-accent)] font-semibold rounded-md hover:bg-[var(--background-accent-hover)] disabled:opacity-50 flex items-center justify-center"
                    >
                        {isLoading ? <><Spinner small /><span className="ml-2">변환 중...</span></> : 'Text 추출'}
                    </button>
                </div>
                {error && <p className="text-[var(--text-danger)] text-sm text-center">{error}</p>}

                {transcribedText && (
                    <div className="pt-4 border-t border-[var(--border-color)] mt-4 space-y-3 animate-fade-in">
                         <h3 className="text-md font-semibold text-[var(--text-primary)]">변환 결과</h3>
                        <textarea
                            value={transcribedText}
                            onChange={(e) => setTranscribedText(e.target.value)}
                            className="w-full h-40 p-3 border border-[var(--border-color-strong)] bg-[var(--background-tertiary)] text-[var(--text-primary)] rounded-md shadow-sm focus:ring-[var(--background-accent)] focus:border-[var(--background-accent)]"
                            placeholder="변환된 텍스트가 여기에 표시됩니다."
                        />
                        <div className="flex justify-end gap-3">
                            <button onClick={handleSave} className="px-4 py-2 bg-[var(--background-success)] text-white text-sm font-semibold rounded-md hover:bg-[var(--background-success-hover)]">저장 / 보내기</button>
                            <button onClick={handleCopy} className="flex items-center px-4 py-2 bg-[var(--background-tertiary)] text-[var(--text-secondary)] text-sm font-semibold rounded-md hover:bg-[var(--background-primary)]">
                                {copySuccess ? <CheckIcon className="h-5 w-5 mr-1.5"/> : <ClipboardIcon className="h-5 w-5 mr-1.5" />}
                                {copySuccess || '전체 복사'}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default VoiceToText;
