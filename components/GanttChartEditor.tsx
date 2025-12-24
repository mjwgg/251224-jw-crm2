import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { GanttTask } from '../types';
import { PlusIcon, TrashIcon, CheckIcon, DownloadIcon } from './icons';

declare const html2canvas: any;
declare const jspdf: any;

interface GanttChartEditorProps {
  content: string;
  onSave: (newContent: string) => void;
}

const GanttChartEditor: React.FC<GanttChartEditorProps> = ({ content, onSave }) => {
  const [tasks, setTasks] = useState<GanttTask[]>([]);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const saveTimeout = useRef<number | null>(null);
  const editorRef = useRef<HTMLDivElement>(null);
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);

  useEffect(() => {
    try {
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed)) {
        setTasks(parsed);
      } else {
        setTasks([]);
      }
    } catch {
      setTasks([]);
    }
  }, [content]);

  const debouncedSave = useCallback(() => {
    setSaveStatus('saving');
    if (saveTimeout.current) clearTimeout(saveTimeout.current);
    saveTimeout.current = window.setTimeout(() => {
      onSave(JSON.stringify(tasks));
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    }, 1500);
  }, [tasks, onSave]);
  
  useEffect(() => {
      debouncedSave();
  }, [tasks, debouncedSave]);
  
  useEffect(() => {
    return () => {
      if (saveTimeout.current) clearTimeout(saveTimeout.current);
    };
  }, []);

  const handleUpdateTask = (id: string, field: keyof GanttTask, value: string | number) => {
    setTasks(prev => prev.map(task => (task.id === id ? { ...task, [field]: value } : task)));
  };

  const handleAddTask = () => {
    const today = new Date().toISOString().split('T')[0];
    const newTask: GanttTask = {
      id: `task-${Date.now()}`,
      name: '새 과제',
      start: today,
      end: today,
      progress: 0,
    };
    setTasks(prev => [...prev, newTask]);
  };

  const handleDeleteTask = (id: string) => {
    setTasks(prev => prev.filter(task => task.id !== id));
  };
  
  const getBoardTitle = (): string => {
    return document.querySelector('.text-lg.font-semibold')?.textContent || 'Gantt-Chart';
  };

  const handleExport = async (format: 'png' | 'pdf') => {
    setIsExportMenuOpen(false);
    if (!editorRef.current) return;
    
    await new Promise(r => setTimeout(r, 100));

    try {
        const canvas = await html2canvas(editorRef.current, {
            useCORS: true,
            backgroundColor: getComputedStyle(document.documentElement).getPropertyValue('--background-primary').trim(),
            scale: 2,
        });
        
        const title = getBoardTitle();
        const filename = `${title.replace(/[^a-z0-9ㄱ-힣]/gi, '_').toLowerCase()}.${format}`;

        if (format === 'pdf') {
            const { jsPDF } = jspdf;
            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF({
                orientation: canvas.width > canvas.height ? 'l' : 'p',
                unit: 'px',
                format: [canvas.width, canvas.height]
            });
            pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
            pdf.save(filename);
        } else {
            const image = canvas.toDataURL('image/png');
            const link = document.createElement('a');
            link.href = image;
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    } catch (error) {
        console.error('Export failed:', error);
        alert('차트 내보내기에 실패했습니다.');
    }
  };


  const renderSaveStatus = () => {
    if (saveStatus === 'saving') return <span className="text-xs text-[var(--text-muted)]">저장 중...</span>;
    if (saveStatus === 'saved') return <span className="text-xs text-green-500 flex items-center"><CheckIcon className="h-4 w-4 mr-1"/>저장 완료</span>;
    return <div className="h-5"></div>;
  };

  return (
    <div className="h-full flex flex-col p-6">
      <div ref={editorRef} className="flex-1 min-h-0 overflow-auto custom-scrollbar bg-[var(--background-primary)] p-4 rounded-lg border border-[var(--border-color)]">
        <table className="w-full text-sm text-left">
            <thead className="bg-[var(--background-tertiary)] sticky top-0 z-10">
                <tr>
                    <th className="p-2 w-2/5">과제</th>
                    <th className="p-2 w-1/5">시작일</th>
                    <th className="p-2 w-1/5">종료일</th>
                    <th className="p-2 w-1/5">진행률</th>
                    <th className="p-2"></th>
                </tr>
            </thead>
            <tbody>
                {tasks.map(task => (
                    <tr key={task.id} className="border-b border-[var(--border-color)]">
                        <td className="p-2">
                            <input
                                type="text"
                                value={task.name}
                                onChange={e => handleUpdateTask(task.id, 'name', e.target.value)}
                                className="w-full bg-transparent focus:outline-none focus:ring-1 focus:ring-[var(--background-accent)] rounded px-1"
                            />
                        </td>
                        <td className="p-2">
                            <input
                                type="date"
                                value={task.start}
                                onChange={e => handleUpdateTask(task.id, 'start', e.target.value)}
                                className="w-full bg-transparent focus:outline-none focus:ring-1 focus:ring-[var(--background-accent)] rounded px-1"
                            />
                        </td>
                        <td className="p-2">
                            <input
                                type="date"
                                value={task.end}
                                onChange={e => handleUpdateTask(task.id, 'end', e.target.value)}
                                className="w-full bg-transparent focus:outline-none focus:ring-1 focus:ring-[var(--background-accent)] rounded px-1"
                            />
                        </td>
                        <td className="p-2">
                            <div className="flex items-center gap-2">
                                <input
                                    type="range"
                                    min="0"
                                    max="100"
                                    value={task.progress}
                                    onChange={e => handleUpdateTask(task.id, 'progress', parseInt(e.target.value, 10))}
                                    className="w-full accent-[var(--background-accent)]"
                                />
                                <span className="text-xs w-8 text-right">{task.progress}%</span>
                            </div>
                        </td>
                        <td className="p-2 text-center">
                            <button onClick={() => handleDeleteTask(task.id)} className="text-[var(--text-muted)] hover:text-[var(--text-danger)]">
                                <TrashIcon className="h-4 w-4" />
                            </button>
                        </td>
                    </tr>
                ))}
            </tbody>
        </table>
        <button
            onClick={handleAddTask}
            className="mt-4 flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-md bg-[var(--background-tertiary)] text-[var(--text-accent)] hover:bg-opacity-80"
        >
            <PlusIcon className="h-4 w-4" /> 과제 추가
        </button>
      </div>
      <div className="flex justify-between items-center h-8 mt-2 flex-shrink-0">
        {renderSaveStatus()}
         <div className="relative">
          <button
            onClick={() => setIsExportMenuOpen(!isExportMenuOpen)}
            className="p-2 bg-[var(--background-accent)] text-white rounded-full shadow-lg hover:bg-[var(--background-accent-hover)] transition-transform transform hover:scale-110"
            title="내보내기"
          >
            <DownloadIcon className="h-5 w-5" />
          </button>
          {isExportMenuOpen && (
            <div className="absolute bottom-full right-0 mb-2 w-32 bg-[var(--background-secondary)] rounded-md shadow-xl border border-[var(--border-color)] overflow-hidden animate-fade-in-up z-10">
              <button onClick={() => handleExport('png')} className="w-full text-left px-4 py-2 text-sm text-[var(--text-primary)] hover:bg-[var(--background-tertiary)]">PNG로 저장</button>
              <button onClick={() => handleExport('pdf')} className="w-full text-left px-4 py-2 text-sm text-[var(--text-primary)] hover:bg-[var(--background-tertiary)]">PDF로 저장</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default GanttChartEditor;
