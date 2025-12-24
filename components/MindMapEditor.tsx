import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { PlusIcon, TrashIcon, CheckIcon, DownloadIcon } from './icons';
import * as d3 from 'd3';

declare const html2canvas: any;
declare const jspdf: any;

interface MindMapNodeData {
  id: string;
  text: string;
  children: MindMapNodeData[];
  layout?: 'vertical';
}

interface MindMapEditorProps {
  content: string;
  onSave: (newContent: string) => void;
}

const NODE_WIDTH = 180;
const NODE_HEIGHT = 100;
const NODE_CONTENT_WIDTH = 150;
const NODE_CONTENT_HEIGHT = 50;

type LayoutType = 'horizontal' | 'vertical' | 'radial';
type LinkStyle = 'curved' | 'elbow';

const findNodeAndParent = (
  node: MindMapNodeData,
  nodeId: string,
  parent: MindMapNodeData | null = null
): { node: MindMapNodeData; parent: MindMapNodeData | null } | null => {
  if (node.id === nodeId) {
    return { node, parent };
  }
  for (const child of node.children) {
    const found = findNodeAndParent(child, nodeId, node);
    if (found) {
      return found;
    }
  }
  return null;
};

const removeNodeFromTree = (root: MindMapNodeData, nodeId: string): MindMapNodeData | null => {
  if (root.id === nodeId) {
    return { id: 'root', text: '중심 주제', children: [] };
  }
  
  function findAndRemove(node: MindMapNodeData, id: string): boolean {
    for (let i = 0; i < node.children.length; i++) {
        const child = node.children[i];
        if (child.id === id) {
            node.children.splice(i, 1);
            return true;
        }
        if (findAndRemove(child, id)) {
            return true;
        }
    }
    return false;
  }

  const newRoot = JSON.parse(JSON.stringify(root));
  findAndRemove(newRoot, nodeId);
  return newRoot;
};

const Node: React.FC<{
  d3Node: d3.HierarchyPointNode<MindMapNodeData>;
  layout: LayoutType;
  onUpdateText: (nodeId: string, text: string) => void;
  onAddChild: (parentId: string, focus?: boolean) => void;
  onDelete: (nodeId: string) => void;
}> = ({ d3Node, layout, onUpdateText, onAddChild, onDelete }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(d3Node.data.text);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setEditText(d3Node.data.text);
  }, [d3Node.data.text]);

  useEffect(() => {
    if (isEditing) {
      textareaRef.current?.focus();
      textareaRef.current?.select();
    }
  }, [isEditing]);
  
  const handleDoubleClick = () => setIsEditing(true);

  const handleBlur = () => {
    if (editText.trim() && editText.trim() !== d3Node.data.text) {
      onUpdateText(d3Node.data.id, editText.trim());
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.key === 'Enter' && e.ctrlKey) || (e.key === 'Enter' && e.metaKey)) {
        e.preventDefault();
        handleBlur();
    }
  };

  const handleContainerKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Tab' && !isEditing) {
        e.preventDefault();
        onAddChild(d3Node.data.id, true);
    }
  }

  let transform: string;
  if (layout === 'radial') {
    const angle = d3Node.x;
    const radius = d3Node.y;
    // Adjust angle by -90 degrees to start from the top
    const x = radius * Math.cos(angle - Math.PI / 2);
    const y = radius * Math.sin(angle - Math.PI / 2);
    transform = `translate(${x}, ${y})`;
  } else {
    const isVertical = layout === 'vertical';
    transform = isVertical ? `translate(${d3Node.x}, ${d3Node.y})` : `translate(${d3Node.y}, ${d3Node.x})`;
  }
  
  const nodeHeight = (d3Node.data as any)._calculatedHeight || NODE_CONTENT_HEIGHT;

  let plusTransform: string;
  let trashTransform: string;

  if (layout === 'horizontal' || layout === 'radial') {
    // Position buttons horizontally for horizontal and radial layouts
    plusTransform = `translate(${NODE_CONTENT_WIDTH / 2 + 15}, 0)`;
    trashTransform = `translate(${-NODE_CONTENT_WIDTH / 2 - 15}, 0)`;
  } else { // vertical
    // Position buttons vertically for vertical layout
    plusTransform = `translate(0, ${nodeHeight / 2 + 15})`;
    trashTransform = `translate(0, ${-nodeHeight / 2 - 15})`;
  }

  return (
    <g transform={transform} className="group">
      <foreignObject x={-NODE_CONTENT_WIDTH/2} y={-nodeHeight/2} width={NODE_CONTENT_WIDTH} height={nodeHeight} onDoubleClick={handleDoubleClick} onKeyDown={handleContainerKeyDown} tabIndex={0} className="focus:outline-none overflow-visible">
        <div 
          style={{ height: `${nodeHeight}px` }}
          className={`w-full p-2 rounded-lg shadow-lg border-2 bg-[var(--background-secondary)] flex items-center justify-center text-center ${d3Node.depth === 0 ? 'border-[var(--background-accent)]' : 'border-[var(--border-color-strong)]'}`}
        >
          {isEditing ? (
            <textarea
              ref={textareaRef}
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              onBlur={handleBlur}
              onKeyDown={handleKeyDown}
              className="bg-transparent focus:outline-none text-[var(--text-primary)] text-sm text-center w-full h-full resize-none custom-scrollbar"
            />
          ) : (
            <pre className="text-[var(--text-primary)] text-sm font-medium whitespace-pre-wrap word-break-break-word text-center">{d3Node.data.text}</pre>
          )}
        </div>
      </foreignObject>
      <g>
        <g transform={plusTransform} onClick={() => onAddChild(d3Node.data.id, true)} className="cursor-pointer">
          <circle r="12" fill="var(--background-tertiary)" stroke="var(--border-color)" />
          <foreignObject x="-10" y="-10" width="20" height="20">
            <PlusIcon className="w-full h-full p-1 text-green-500" />
          </foreignObject>
        </g>
        {d3Node.depth > 0 && (
          <g transform={trashTransform} onClick={() => onDelete(d3Node.data.id)} className="cursor-pointer">
            <circle r="12" fill="var(--background-tertiary)" stroke="var(--border-color)" />
            <foreignObject x="-10" y="-10" width="20" height="20">
              <TrashIcon className="w-full h-full p-1 text-red-500" />
            </foreignObject>
          </g>
        )}
      </g>
    </g>
  );
};

const MindMapEditor: React.FC<MindMapEditorProps> = ({ content, onSave }) => {
  const [data, setData] = useState<MindMapNodeData | null>(null);
  const [layout, setLayout] = useState<LayoutType>('horizontal');
  const [linkStyle, setLinkStyle] = useState<LinkStyle>('curved');
  const [nodes, setNodes] = useState<d3.HierarchyPointNode<MindMapNodeData>[]>([]);
  const [links, setLinks] = useState<d3.HierarchyPointLink<MindMapNodeData>[]>([]);
  const [viewBox, setViewBox] = useState('0 0 1000 800');
  
  const saveTimeoutRef = useRef<number | null>(null);
  const editorRef = useRef<HTMLDivElement>(null);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [focusOnNodeId, setFocusOnNodeId] = useState<string | null>(null);
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
  
  const debouncedSave = useCallback(() => {
    if (!data) return;
    setSaveStatus('saving');
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = window.setTimeout(() => {
      onSave(JSON.stringify({ ...data, layout: layout, linkStyle: linkStyle }));
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    }, 1500);
  }, [data, onSave, layout, linkStyle]);

  useEffect(() => { debouncedSave(); }, [data, layout, linkStyle, debouncedSave]);
  useEffect(() => { return () => { if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current); }; }, []);

  useEffect(() => {
    try {
      const parsed = JSON.parse(content);
      if (parsed.id && parsed.text && Array.isArray(parsed.children)) {
        setData(parsed);
        if (['horizontal', 'vertical', 'radial'].includes(parsed.layout)) {
          setLayout(parsed.layout);
        } else {
          setLayout('horizontal');
        }
        if (['curved', 'elbow'].includes(parsed.linkStyle)) {
          setLinkStyle(parsed.linkStyle);
        } else {
          setLinkStyle('curved');
        }
      } else {
        throw new Error("Invalid mind map format");
      }
    } catch (e) {
      setData({ id: 'root', text: '중심 주제', children: [] });
      setLayout('horizontal');
      setLinkStyle('curved');
    }
  }, [content]);

  useEffect(() => {
    if (!data || !editorRef.current) return;

    // 1. Measure text height for each node
    const measurePre = document.createElement('pre');
    Object.assign(measurePre.style, {
        position: 'absolute',
        visibility: 'hidden',
        width: `${NODE_CONTENT_WIDTH}px`,
        fontSize: '14px',
        fontWeight: '500',
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word',
        fontFamily: getComputedStyle(document.body).fontFamily, // get current font
    });
    document.body.appendChild(measurePre);
    
    const root = d3.hierarchy(data);
    root.each(d => {
        measurePre.innerText = d.data.text || ' ';
        const textHeight = measurePre.offsetHeight;
        // Add vertical padding and ensure a minimum height
        (d.data as any)._calculatedHeight = Math.max(NODE_CONTENT_HEIGHT, textHeight + 24);
    });
    
    document.body.removeChild(measurePre);

    const { width, height } = editorRef.current.getBoundingClientRect();
  
    if (layout === 'radial') {
        const radius = Math.min(width, height) / 2.5;
        const treeLayout = d3.tree<MindMapNodeData>()
            .size([2 * Math.PI, radius])
            .separation((a, b) => (a.parent == b.parent ? 1 : 2) / a.depth);
        
        const treeData = treeLayout(root);
        const calculatedNodes = treeData.descendants();

        setNodes(calculatedNodes);
        setLinks(treeData.links());
        
        setViewBox(`${-width / 2} ${-height / 2} ${width} ${height}`);
    } else {
        const isVertical = layout === 'vertical';
        const treeLayout = d3.tree<MindMapNodeData>()
            .separation((a, b) => {
                const aHeight = (a.data as any)._calculatedHeight || NODE_CONTENT_HEIGHT;
                const bHeight = (b.data as any)._calculatedHeight || NODE_CONTENT_HEIGHT;
                
                let separationValue;
                if (isVertical) {
                    separationValue = 1.2;
                } else {
                    const totalHeight = (aHeight / 2) + (bHeight / 2);
                    separationValue = (totalHeight + 20) / NODE_HEIGHT;
                }
                return a.parent === b.parent ? separationValue : separationValue * 1.5;
            });
        
        treeLayout.nodeSize(isVertical ? [NODE_WIDTH, NODE_HEIGHT * 2.5] : [NODE_HEIGHT, NODE_WIDTH * 1.5]);

        const treeData = treeLayout(root);
        const calculatedNodes = treeData.descendants();
        setNodes(calculatedNodes);
        setLinks(treeData.links());

        let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
        calculatedNodes.forEach(node => {
          const nodeHeight = (node.data as any)._calculatedHeight || NODE_HEIGHT;
          const x = isVertical ? node.x : node.y;
          const y = isVertical ? node.y : node.x;
          minX = Math.min(minX, x - NODE_WIDTH / 2);
          maxX = Math.max(maxX, x + NODE_WIDTH / 2);
          minY = Math.min(minY, y - nodeHeight / 2);
          maxY = Math.max(maxY, y + nodeHeight / 2);
        });
        const viewWidth = maxX - minX;
        const viewHeight = maxY - minY;
        const paddingX = width * 0.1;
        const paddingY = height * 0.1;
        setViewBox(`${minX - paddingX} ${minY - paddingY} ${viewWidth + paddingX * 2} ${viewHeight + paddingY * 2}`);
    }
  
  }, [data, layout]);
  
  const handleAddChild = (parentId: string, focus = false) => {
    setData(prevData => {
      if (!prevData) return null;
      const newData = JSON.parse(JSON.stringify(prevData));
      const result = findNodeAndParent(newData, parentId);
      if (result) {
        const newChildId = `node-${Date.now()}`;
        result.node.children.push({ id: newChildId, text: '새 노드', children: [] });
        if (focus) {
          setFocusOnNodeId(newChildId);
        }
      }
      return newData;
    });
  };

  const handleDelete = (nodeId: string) => {
    setData(prevData => prevData ? removeNodeFromTree(prevData, nodeId) : null);
  };
  
  const handleUpdateText = (nodeId: string, text: string) => {
    setData(prevData => {
      if (!prevData) return null;
      const newData = JSON.parse(JSON.stringify(prevData));
      const result = findNodeAndParent(newData, nodeId);
      if (result) {
        result.node.text = text;
      }
      return newData;
    });
  };

  const handleExport = async (format: 'png' | 'pdf') => {
    setIsExportMenuOpen(false);
    if (!editorRef.current) return;
    
    await new Promise(r => setTimeout(r, 100));

    try {
        const svgElement = editorRef.current.querySelector('svg');
        if (!svgElement) return;

        const canvas = await html2canvas(svgElement, {
            useCORS: true,
            backgroundColor: getComputedStyle(document.documentElement).getPropertyValue('--background-primary').trim(),
            scale: 2,
        });
        
        const title = data?.text.trim() || 'MindMap';
        const filename = `${title.replace(/[^a-z0-9ㄱ-힣]/gi, '_').toLowerCase()}.${format}`;
        
        if (format === 'pdf') {
            const { jsPDF } = jspdf;
            const imgData = canvas.toDataURL('image/png');
            const orientation = canvas.width > canvas.height ? 'l' : 'p';
            const pdf = new jsPDF({
                orientation,
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
        alert('마인드맵 내보내기에 실패했습니다.');
    }
  };

  // Custom path generator for right-angled (elbow) links
  const elbowLinkGenerator = (layoutType: 'horizontal' | 'vertical') => (link: d3.HierarchyPointLink<MindMapNodeData>): string => {
      const { source, target } = link;
      if (layoutType === 'horizontal') {
          return `M${source.y},${source.x}H${source.y + (target.y - source.y) / 2}V${target.x}H${target.y}`;
      } else { // vertical
          return `M${source.x},${source.y}V${source.y + (target.y - source.y) / 2}H${target.x}V${target.y}`;
      }
  };

  const linkGenerator = useMemo(() => {
    if (layout === 'radial') {
        return d3.linkRadial<any, d3.HierarchyPointNode<MindMapNodeData>>()
            .angle(d => d.x)
            .radius(d => d.y);
    }
    if (linkStyle === 'elbow') {
      return elbowLinkGenerator(layout);
    }
    return layout === 'vertical'
        ? d3.linkVertical<any, d3.HierarchyPointNode<MindMapNodeData>>().x(d => d.x).y(d => d.y)
        : d3.linkHorizontal<any, d3.HierarchyPointNode<MindMapNodeData>>().x(d => d.y).y(d => d.x);
  }, [layout, linkStyle]);

  const renderSaveStatus = () => {
    if (saveStatus === 'saving') return <span className="text-xs text-[var(--text-muted)]">저장 중...</span>;
    if (saveStatus === 'saved') return <span className="text-xs text-green-500 flex items-center"><CheckIcon className="h-4 w-4 mr-1"/>저장 완료</span>;
    return <div className="h-5"></div>;
  };
  
  if (!data) return null;

  return (
    <div className="relative h-full flex flex-col">
      <div className="p-2 flex justify-between items-center bg-[var(--background-secondary)] border-b border-[var(--border-color)]">
        <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-[var(--text-secondary)]">레이아웃:</span>
                <div className="flex items-center p-1 bg-[var(--background-tertiary)] rounded-lg">
                    <button onClick={() => setLayout('horizontal')} className={`px-3 py-1 text-sm rounded-md ${layout === 'horizontal' ? 'bg-[var(--background-secondary)] text-[var(--text-accent)] shadow' : 'text-[var(--text-secondary)]'}`}>수평 트리</button>
                    <button onClick={() => setLayout('vertical')} className={`px-3 py-1 text-sm rounded-md ${layout === 'vertical' ? 'bg-[var(--background-secondary)] text-[var(--text-accent)] shadow' : 'text-[var(--text-secondary)]'}`}>수직 트리</button>
                    <button onClick={() => setLayout('radial')} className={`px-3 py-1 text-sm rounded-md ${layout === 'radial' ? 'bg-[var(--background-secondary)] text-[var(--text-accent)] shadow' : 'text-[var(--text-secondary)]'}`}>방사형</button>
                </div>
            </div>
             <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-[var(--text-secondary)]">링크 스타일:</span>
                <div className="flex items-center p-1 bg-[var(--background-tertiary)] rounded-lg">
                    <button onClick={() => setLinkStyle('curved')} className={`px-3 py-1 text-sm rounded-md ${linkStyle === 'curved' ? 'bg-[var(--background-secondary)] text-[var(--text-accent)] shadow' : 'text-[var(--text-secondary)]'}`}>곡선</button>
                    <button onClick={() => setLinkStyle('elbow')} className={`px-3 py-1 text-sm rounded-md ${linkStyle === 'elbow' ? 'bg-[var(--background-secondary)] text-[var(--text-accent)] shadow' : 'text-[var(--text-secondary)]'}`}>직각</button>
                </div>
            </div>
        </div>
        <div className="flex items-center gap-4">
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
      </div>
      <div ref={editorRef} className="flex-1 w-full h-full overflow-auto custom-scrollbar bg-[var(--background-primary)]">
        <svg width="100%" height="100%" viewBox={viewBox} className="min-w-full min-h-full">
          <g>
            {links.map((link) => (
              <path key={`${link.source.data.id}-${link.target.data.id}`} d={linkGenerator(link)!} stroke="var(--border-color-strong)" strokeWidth="2" fill="none" />
            ))}
            {nodes.map(d3Node => (
              <Node key={d3Node.data.id} d3Node={d3Node} layout={layout} onUpdateText={handleUpdateText} onAddChild={handleAddChild} onDelete={handleDelete} />
            ))}
          </g>
        </svg>
      </div>
    </div>
  );
};

export default MindMapEditor;