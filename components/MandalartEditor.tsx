
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { CheckIcon, DownloadIcon } from './icons';

declare const html2canvas: any;
declare const jspdf: any;

interface MandalartEditorProps {
  content: string; // JSON string of an array of 81 strings or { cells: string[], centerColor: string }
  onSave: (newContent: string) => void;
}

const getTextColorForBackground = (hexColor: string): string => {
    if (!hexColor) return 'var(--text-primary)';
    
    const shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
    hexColor = hexColor.replace(shorthandRegex, (m, r, g, b) => r + r + g + g + b + b);
    
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hexColor);
    if (!result) return 'var(--text-primary)';
    
    const r = parseInt(result[1], 16);
    const g = parseInt(result[2], 16);
    const b = parseInt(result[3], 16);
    
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    
    return luminance > 0.5 ? 'var(--text-primary)' : '#FFFFFF';
};

const getFontSizeClass = (text: string): string => {
  const length = text?.length || 0;
  if (length > 35) {
    return 'text-[10px] leading-tight';
  }
  if (length > 25) {
    return 'text-xs leading-snug';
  }
  return 'text-sm';
};

const MandalartEditor: React.FC<MandalartEditorProps> = ({ content, onSave }) => {
  const [cells, setCells] = useState<string[]>(Array(81).fill(''));
  const [centerColor, setCenterColor] = useState<string>('#4338ca'); // Default: indigo-700
  const [subGoalColors, setSubGoalColors] = useState<string[]>(Array(8).fill('#475569'));
  const saveTimeout = useRef<number | null>(null);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const inputRefs = useRef<(HTMLTextAreaElement | null)[]>([]);
  const mandalartRef = useRef<HTMLDivElement>(null);
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
  const [zoom, setZoom] = useState(1);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      const parsedContent = JSON.parse(content);
      if (typeof parsedContent === 'object' && parsedContent !== null && Array.isArray(parsedContent.cells)) {
        // New format: { cells: string[], centerColor: string, subGoalColors?: string[] }
        setCells(parsedContent.cells.length === 81 ? parsedContent.cells : Array(81).fill(''));
        setCenterColor(parsedContent.centerColor || '#4338ca');
        setSubGoalColors(parsedContent.subGoalColors && parsedContent.subGoalColors.length === 8 ? parsedContent.subGoalColors : Array(8).fill('#475569'));
      } else if (Array.isArray(parsedContent)) {
        // Old format: string[]
        setCells(parsedContent.length === 81 ? parsedContent : Array(81).fill(''));
        setCenterColor('#4338ca');
        setSubGoalColors(Array(8).fill('#475569'));
      } else {
        // If content is empty or malformed
        setCells(Array(81).fill(''));
        setCenterColor('#4338ca');
        setSubGoalColors(Array(8).fill('#475569'));
      }
    } catch (e) {
      // If content is not valid JSON (e.g., empty string)
      setCells(Array(81).fill(''));
      setCenterColor('#4338ca');
      setSubGoalColors(Array(8).fill('#475569'));
    }
    inputRefs.current = inputRefs.current.slice(0, 81);
  }, [content]);

  const handleFit = useCallback(() => {
    if (containerRef.current && mandalartRef.current) {
        const containerWidth = containerRef.current.clientWidth;
        const containerHeight = containerRef.current.clientHeight;
        const gridWidth = mandalartRef.current.offsetWidth;
        const gridHeight = mandalartRef.current.offsetHeight;

        if (gridWidth === 0 || gridHeight === 0) return;

        const scale = Math.min(containerWidth / gridWidth, containerHeight / gridHeight) * 0.95; // 95% for padding
        setZoom(scale > 0 ? scale : 1);
    }
  }, []);

  useEffect(() => {
    const observer = new ResizeObserver(() => {
        handleFit();
    });
    const container = containerRef.current;
    if (container) {
        observer.observe(container);
    }
    // Initial fit
    const timeoutId = setTimeout(handleFit, 100);

    return () => {
        if (container) {
            observer.unobserve(container);
        }
        clearTimeout(timeoutId);
    };
  }, [handleFit]);
  
  const debouncedSave = useCallback(() => {
    setSaveStatus('saving');
    if (saveTimeout.current) {
      clearTimeout(saveTimeout.current);
    }
    saveTimeout.current = window.setTimeout(() => {
      onSave(JSON.stringify({ cells, centerColor, subGoalColors }));
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    }, 1500);
  }, [cells, centerColor, subGoalColors, onSave]);

  useEffect(() => {
    debouncedSave();
  }, [cells, centerColor, subGoalColors, debouncedSave]);

  const handleChange = (index: number, value: string) => {
    const newCells = [...cells];
    newCells[index] = value;
    setCells(newCells);
  };
  
  const handleColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCenterColor(e.target.value);
  };
  
  const handleSubGoalColorChange = (index: number, color: string) => {
    const newColors = [...subGoalColors];
    newColors[index] = color;
    setSubGoalColors(newColors);
  };
  
  const handleGlobalSubGoalColorChange = (color: string) => {
    setSubGoalColors(Array(8).fill(color));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>, index: number) => {
    let nextIndex = -1;
    const col = index % 9;
    const row = Math.floor(index / 9);

    switch (e.key) {
      case 'ArrowUp':
        if (row > 0) nextIndex = index - 9;
        break;
      case 'ArrowDown':
        if (row < 8) nextIndex = index + 9;
        break;
      case 'ArrowLeft':
        if (col > 0) nextIndex = index - 1;
        break;
      case 'ArrowRight':
        if (col < 8) nextIndex = index + 1;
        break;
      default:
        return;
    }

    if (nextIndex !== -1) {
      e.preventDefault();
      inputRefs.current[nextIndex]?.focus();
    }
  };


  useEffect(() => {
    return () => {
      // Cleanup timeout on unmount
      if (saveTimeout.current) {
        clearTimeout(saveTimeout.current);
      }
    };
  }, []);

  const getBoardTitle = (): string => {
    return cells[40]?.trim() || 'Mandalart-Board';
  };

  const handleExport = async (format: 'png' | 'jpg' | 'pdf') => {
    setIsExportMenuOpen(false);
    if (!mandalartRef.current) return;

    const activeElement = document.activeElement as HTMLElement;
    if (activeElement && typeof activeElement.blur === 'function') {
        activeElement.blur();
    }
    await new Promise(r => setTimeout(r, 100)); 

    try {
        const canvas = await html2canvas(mandalartRef.current, {
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
                orientation: 'p',
                unit: 'px',
                format: [canvas.width, canvas.height]
            });
            pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
            pdf.save(filename);
        } else {
            const image = canvas.toDataURL(format === 'png' ? 'image/png' : 'image/jpeg');
            const link = document.createElement('a');
            link.href = image;
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    } catch (error) {
        console.error('Export failed:', error);
        alert('보드 내보내기에 실패했습니다.');
    }
  };

  const subGoalCenterIndices = [30, 31, 32, 39, 41, 48, 49, 50];
  const outerBlockCenterIndices = [10, 13, 16, 37, 43, 64, 67, 70];

  const renderCell = (index: number) => {
    const row = Math.floor(index / 9);
    const col = Math.floor(index % 9);
    
    const isCenterBlock = row >= 3 && row < 6 && col >= 3 && col < 6;
    const isCenterOfCenter = row === 4 && col === 4;

    const subGoalIndex = subGoalCenterIndices.indexOf(index);
    const outerCenterIndex = outerBlockCenterIndices.indexOf(index);

    const isSubGoalCell = subGoalIndex !== -1;
    const isOuterCenterCell = outerCenterIndex !== -1;

    const fontSizeClass = getFontSizeClass(cells[index]);

    const cellClasses = [
      'w-full', 'h-full', 'p-2', 'bg-transparent', 'border', 'resize-none', 'focus:outline-none', 'focus:ring-2', 'focus:z-10', 'relative',
      'transition-colors', 'duration-200', 'flex', 'items-center', 'justify-center', 'text-center',
      isCenterOfCenter || isSubGoalCell || isOuterCenterCell
        ? 'border-transparent focus:ring-white/50'
        : isCenterBlock
        ? 'border-slate-500 bg-[var(--background-secondary)] focus:ring-[var(--background-accent)]'
        : 'border-slate-700 bg-[var(--background-tertiary)] focus:ring-[var(--background-accent)]',
      fontSizeClass,
    ].join(' ');
    
    const style: React.CSSProperties = {};
    if (isCenterOfCenter) {
        style.backgroundColor = centerColor;
        style.color = getTextColorForBackground(centerColor);
    } else if (isSubGoalCell) {
        const color = subGoalColors[subGoalIndex];
        style.backgroundColor = color;
        style.color = getTextColorForBackground(color);
    } else if (isOuterCenterCell) {
        const color = subGoalColors[outerCenterIndex];
        style.backgroundColor = color;
        style.color = getTextColorForBackground(color);
    }

    return (
      <textarea
        key={index}
        ref={(el) => { inputRefs.current[index] = el; }}
        value={cells[index] || ''}
        onChange={(e) => handleChange(index, e.target.value)}
        onKeyDown={(e) => handleKeyDown(e, index)}
        className={cellClasses}
        style={style}
        aria-label={`Mandalart cell ${row + 1}, ${col + 1}`}
      />
    );
  };

  const renderSaveStatus = () => {
    if (saveStatus === 'saving') {
      return <span className="text-xs text-[var(--text-muted)]">저장 중...</span>;
    }
    if (saveStatus === 'saved') {
      return <span className="text-xs text-green-500 flex items-center"><CheckIcon className="h-4 w-4 mr-1"/>저장 완료</span>;
    }
    return <div className="h-5"></div>; // Placeholder for alignment
  };

  return (
    <div className="h-full flex flex-row relative">
      <div className="w-48 p-4 flex flex-col justify-between flex-shrink-0 border-r border-[var(--border-color)]">
          <div className="space-y-6">
              <div className="flex flex-col items-center gap-1">
                  <label htmlFor="centerColorPicker" className="text-sm font-medium text-[var(--text-secondary)]">핵심 목표</label>
                  <input
                      type="color"
                      id="centerColorPicker"
                      value={centerColor}
                      onChange={handleColorChange}
                      className="w-12 h-12 p-0 border-none rounded-lg cursor-pointer bg-transparent"
                      title="핵심 목표 배경색"
                  />
              </div>
              <div>
                  <div className="flex items-center justify-between mb-2">
                      <label className="text-sm font-medium text-[var(--text-secondary)]">하위 목표</label>
                      <div className="flex items-center gap-1" title="모든 하위 목표 색상 일괄 적용">
                          <span className="text-xs text-[var(--text-muted)]">일괄:</span>
                          <input
                              type="color"
                              onChange={(e) => handleGlobalSubGoalColorChange(e.target.value)}
                              className="w-6 h-6 p-0 border-none rounded cursor-pointer bg-transparent"
                          />
                      </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                      {subGoalColors.map((color, index) => (
                          <input
                              key={index}
                              type="color"
                              value={color}
                              onChange={(e) => handleSubGoalColorChange(index, e.target.value)}
                              className="w-full h-10 p-0 border-none rounded-md cursor-pointer bg-transparent"
                              title={`하위 목표 ${index + 1} 색상`}
                          />
                      ))}
                  </div>
              </div>
              <div className="pt-4 border-t border-[var(--border-color)]">
                <label htmlFor="zoom-slider" className="text-sm font-medium text-[var(--text-secondary)]">화면 보기 비율</label>
                <div className="flex items-center gap-2 mt-2">
                    <input
                        type="range"
                        id="zoom-slider"
                        min="0.2"
                        max="2"
                        step="0.05"
                        value={zoom}
                        onChange={(e) => setZoom(parseFloat(e.target.value))}
                        className="w-full"
                    />
                    <span className="text-sm text-[var(--text-primary)] w-10 text-right">{Math.round(zoom * 100)}%</span>
                </div>
                <button
                    onClick={handleFit}
                    className="w-full mt-2 px-3 py-1 bg-[var(--background-tertiary)] text-xs font-medium rounded-md hover:bg-[var(--background-primary)] border border-[var(--border-color)]"
                >
                    화면에 맞춤
                </button>
              </div>
          </div>
          <div className="text-center">
            {renderSaveStatus()}
          </div>
      </div>
      <div ref={containerRef} className="flex-1 min-h-0 overflow-auto custom-scrollbar flex items-center justify-center p-4 bg-[var(--background-primary)]">
        <div 
          ref={mandalartRef} 
          className="w-[720px] h-[720px] p-2 bg-[var(--background-primary)] flex-shrink-0"
          style={{ transform: `scale(${zoom})`, transformOrigin: 'center', transition: 'transform 0.1s ease-out' }}
        >
          <div className="grid grid-cols-9 grid-rows-9 gap-0.5 h-full">
            {Array.from({ length: 81 }).map((_, i) => renderCell(i))}
          </div>
        </div>
      </div>
      <div className="absolute bottom-4 right-4">
        <div className="relative">
          <button
            onClick={() => setIsExportMenuOpen(!isExportMenuOpen)}
            className="p-3 bg-[var(--background-accent)] text-white rounded-full shadow-lg hover:bg-[var(--background-accent-hover)] transition-transform transform hover:scale-110"
            title="내보내기"
          >
            <DownloadIcon className="h-6 w-6" />
          </button>
          {isExportMenuOpen && (
            <div className="absolute bottom-full right-0 mb-2 w-32 bg-[var(--background-secondary)] rounded-md shadow-xl border border-[var(--border-color)] overflow-hidden animate-fade-in-up z-10">
              <button onClick={() => handleExport('png')} className="w-full text-left px-4 py-2 text-sm text-[var(--text-primary)] hover:bg-[var(--background-tertiary)]">PNG로 저장</button>
              <button onClick={() => handleExport('jpg')} className="w-full text-left px-4 py-2 text-sm text-[var(--text-primary)] hover:bg-[var(--background-tertiary)]">JPG로 저장</button>
              <button onClick={() => handleExport('pdf')} className="w-full text-left px-4 py-2 text-sm text-[var(--text-primary)] hover:bg-[var(--background-tertiary)]">PDF로 저장</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MandalartEditor;
