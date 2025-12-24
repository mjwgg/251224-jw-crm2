import React, { useState, useEffect, useRef, useCallback } from 'react';
import { PlusIcon, TrashIcon, CheckIcon, DownloadIcon } from './icons';

declare const html2canvas: any;
declare const jspdf: any;

interface FishboneCause {
  id: string;
  text: string;
}

interface FishboneCategory {
  id: string;
  name: string;
  causes: FishboneCause[];
}

interface FishboneData {
  effect: string;
  categories: FishboneCategory[];
}

interface FishboneEditorProps {
  content: string;
  onSave: (newContent: string) => void;
}

const FishboneEditor: React.FC<FishboneEditorProps> = ({ content, onSave }) => {
  const [data, setData] = useState<FishboneData | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const saveTimeout = useRef<number | null>(null);
  const editorRef = useRef<HTMLDivElement>(null);
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);

  useEffect(() => {
    try {
      const parsed = JSON.parse(content);
      if (parsed.effect && parsed.categories) {
        setData(parsed);
      }
    } catch {
      // Initialize with default if content is invalid
    }
  }, [content]);

  const debouncedSave = useCallback(() => {
    if (!data) return;
    setSaveStatus('saving');
    if (saveTimeout.current) clearTimeout(saveTimeout.current);
    saveTimeout.current = window.setTimeout(() => {
      onSave(JSON.stringify(data));
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    }, 1500);
  }, [data, onSave]);

  useEffect(() => { debouncedSave(); }, [data, debouncedSave]);
  useEffect(() => { return () => { if (saveTimeout.current) clearTimeout(saveTimeout.current); }; }, []);
  
  const handleUpdate = () => {
    if (!editingId) return;
    const newText = editingText.trim();
    setData(prev => {
        if (!prev) return null;
        if (prev.effect === editingId) { // Legacy check, use ID instead
            return { ...prev, effect: newText };
        }
        if (editingId === 'effect') {
            return { ...prev, effect: newText };
        }
        const newCategories = prev.categories.map(cat => {
            if (cat.id === editingId) {
                return { ...cat, name: newText };
            }
            return {
                ...cat,
                causes: cat.causes.map(cause => cause.id === editingId ? { ...cause, text: newText } : cause),
            };
        });
        return { ...prev, categories: newCategories };
    });
    setEditingId(null);
  };

  const handleStartEditing = (id: string, currentText: string) => {
    if(editingId) {
        handleUpdate();
    }
    setEditingId(id);
    setEditingText(currentText);
  };
  
  const handleAddCause = (categoryId: string) => {
    setData(prev => {
        if (!prev) return null;
        return {
            ...prev,
            categories: prev.categories.map(cat => 
                cat.id === categoryId 
                    ? { ...cat, causes: [...cat.causes, { id: `cause-${Date.now()}`, text: '새 원인' }] }
                    : cat
            ),
        };
    });
  };
  
  const handleRemoveCause = (categoryId: string, causeId: string) => {
    setData(prev => {
        if (!prev) return null;
        return {
            ...prev,
            categories: prev.categories.map(cat => 
                cat.id === categoryId 
                    ? { ...cat, causes: cat.causes.filter(c => c.id !== causeId) }
                    : cat
            ),
        };
    });
  };

  const getBoardTitle = (): string => data?.effect.trim() || 'Fishbone-Diagram';

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
                orientation: 'l',
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
  
  const EditableText: React.FC<{id: string, text: string, className?: string}> = ({ id, text, className = '' }) => {
      if (editingId === id) {
          return (
              <textarea
                  value={editingText}
                  onChange={(e) => setEditingText(e.target.value)}
                  onBlur={handleUpdate}
                  onKeyDown={(e) => {if(e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); (e.target as HTMLTextAreaElement).blur(); }}}
                  className={`w-full h-full p-1 bg-[var(--background-secondary)] border border-[var(--background-accent)] rounded-md resize-none focus:outline-none ${className}`}
                  autoFocus
              />
          );
      }
      return (
          <div onDoubleClick={() => handleStartEditing(id, text)} className={`p-1 cursor-pointer w-full h-full flex items-center justify-center text-center ${className}`}>{text}</div>
      );
  };

  if (!data) return null;

  const topCategories = data.categories.slice(0, 3);
  const bottomCategories = data.categories.slice(3, 6);

  return (
    <div className="h-full flex flex-col relative bg-[var(--background-primary)]">
      <div className="p-2 flex justify-end items-center gap-4 flex-shrink-0">
        {renderSaveStatus()}
        <div className="relative">
          <button onClick={() => setIsExportMenuOpen(!isExportMenuOpen)} className="p-2 bg-[var(--background-accent-subtle)] rounded-full hover:bg-opacity-80" title="내보내기">
            <DownloadIcon className="h-5 w-5 text-[var(--text-accent)]" />
          </button>
          {isExportMenuOpen && (
            <div className="absolute top-full right-0 mt-2 w-32 bg-[var(--background-secondary)] rounded-md shadow-xl border border-[var(--border-color)] overflow-hidden animate-fade-in-up z-10">
              <button onClick={() => handleExport('png')} className="w-full text-left px-4 py-2 text-sm text-[var(--text-primary)] hover:bg-[var(--background-tertiary)]">PNG</button>
              <button onClick={() => handleExport('pdf')} className="w-full text-left px-4 py-2 text-sm text-[var(--text-primary)] hover:bg-[var(--background-tertiary)]">PDF</button>
            </div>
          )}
        </div>
      </div>
      <div ref={editorRef} className="flex-1 min-h-0 overflow-auto custom-scrollbar p-4">
        <svg viewBox="0 0 1200 600" className="min-w-[1100px] font-sans">
          {/* Spine */}
          <line x1="50" y1="300" x2="1050" y2="300" stroke="var(--text-primary)" strokeWidth="3" />
          
          {/* Head */}
          <g transform="translate(1050, 260)">
            <path d="M 0 0 L 30 40 L 0 80 L 0 0" fill="var(--background-tertiary)" stroke="var(--text-primary)" strokeWidth="2"/>
            <foreignObject x="-120" y="0" width="120" height="80">
              <EditableText id="effect" text={data.effect} className="text-lg font-bold" />
            </foreignObject>
          </g>

          {/* Top Categories */}
          {topCategories.map((cat, i) => (
            <g key={cat.id} transform={`translate(${200 + i * 250}, 300)`} className="group">
              <line x1="0" y1="0" x2="150" y2="-150" stroke="var(--text-primary)" strokeWidth="2" />
              <foreignObject x="110" y="-190" width="100" height="40">
                <EditableText id={cat.id} text={cat.name} className="font-bold bg-[var(--background-primary)]" />
              </foreignObject>
              {cat.causes.map((cause, j) => (
                 <g key={cause.id} transform={`translate(${40 + j * 30}, -${40 + j * 30})`} className="cause-group">
                   <line x1="0" y1="0" x2="60" y2="0" stroke="var(--text-primary)" strokeWidth="1" />
                   <foreignObject x="65" y="-18" width="80" height="36">
                     <EditableText id={cause.id} text={cause.text} className="text-xs bg-[var(--background-primary)]"/>
                   </foreignObject>
                    <g className="opacity-0 group-hover:opacity-100 transition-opacity">
                      <foreignObject x="148" y="-12" width="24" height="24">
                          <button onClick={() => handleRemoveCause(cat.id, cause.id)} className="p-1 rounded-full text-[var(--text-danger)] bg-white/50 hover:bg-white"><TrashIcon className="h-4 w-4"/></button>
                      </foreignObject>
                   </g>
                 </g>
              ))}
              <g className="opacity-0 group-hover:opacity-100 transition-opacity">
                <foreignObject x={155} y={-155} width="24" height="24">
                  <button onClick={() => handleAddCause(cat.id)} className="p-1 rounded-full text-green-500 bg-white/50 hover:bg-white"><PlusIcon className="h-4 w-4"/></button>
                </foreignObject>
              </g>
            </g>
          ))}
          
          {/* Bottom Categories */}
          {bottomCategories.map((cat, i) => (
            <g key={cat.id} transform={`translate(${325 + i * 250}, 300)`} className="group">
              <line x1="0" y1="0" x2="150" y2="150" stroke="var(--text-primary)" strokeWidth="2" />
              <foreignObject x="110" y="150" width="100" height="40">
                <EditableText id={cat.id} text={cat.name} className="font-bold bg-[var(--background-primary)]" />
              </foreignObject>
               {cat.causes.map((cause, j) => (
                 <g key={cause.id} transform={`translate(${40 + j * 30}, ${40 + j * 30})`} className="cause-group">
                   <line x1="0" y1="0" x2="60" y2="0" stroke="var(--text-primary)" strokeWidth="1" />
                   <foreignObject x="65" y="-18" width="80" height="36">
                     <EditableText id={cause.id} text={cause.text} className="text-xs bg-[var(--background-primary)]"/>
                   </foreignObject>
                   <g className="opacity-0 group-hover:opacity-100 transition-opacity">
                      <foreignObject x="148" y="-12" width="24" height="24">
                          <button onClick={() => handleRemoveCause(cat.id, cause.id)} className="p-1 rounded-full text-[var(--text-danger)] bg-white/50 hover:bg-white"><TrashIcon className="h-4 w-4"/></button>
                      </foreignObject>
                   </g>
                 </g>
              ))}
              <g className="opacity-0 group-hover:opacity-100 transition-opacity">
                <foreignObject x={155} y={131} width="24" height="24">
                  <button onClick={() => handleAddCause(cat.id)} className="p-1 rounded-full text-green-500 bg-white/50 hover:bg-white"><PlusIcon className="h-4 w-4"/></button>
                </foreignObject>
              </g>
            </g>
          ))}
        </svg>
      </div>
    </div>
  );
};

export default FishboneEditor;
