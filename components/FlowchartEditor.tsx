import React, { useState, useEffect, useRef, useCallback } from 'react';
import { PlusIcon, TrashIcon, CheckIcon, DownloadIcon } from './icons';

declare const html2canvas: any;
declare const jspdf: any;

interface FlowNode {
  id: string;
  type: 'start-end' | 'process' | 'decision' | 'io';
  text: string;
  position: { x: number; y: number };
  width: number;
  height: number;
}
interface FlowEdge {
  id: string;
  source: string;
  target: string;
}
interface FlowchartData {
  nodes: FlowNode[];
  edges: FlowEdge[];
  viewport: { x: number; y: number; zoom: number };
}

interface FlowchartEditorProps {
  content: string;
  onSave: (newContent: string) => void;
}

const FlowchartEditor: React.FC<FlowchartEditorProps> = ({ content, onSave }) => {
    const [data, setData] = useState<FlowchartData>({ nodes: [], edges: [], viewport: { x: 0, y: 0, zoom: 1 } });
    const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
    const saveTimeout = useRef<number | null>(null);
    const editorRef = useRef<HTMLDivElement>(null);
    const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
    
    // Interaction states
    const [editingNodeId, setEditingNodeId] = useState<string | null>(null);
    const [draggingNode, setDraggingNode] = useState<{ id: string; offsetX: number; offsetY: number } | null>(null);
    const [connectingFromId, setConnectingFromId] = useState<string | null>(null);
    const [mousePosition, setMousePosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

    useEffect(() => {
        try {
            const parsed = JSON.parse(content);
            if (parsed.nodes && parsed.edges) {
                setData(parsed);
            }
        } catch {
            // Initialize with default if content is invalid
        }
    }, [content]);

    const debouncedSave = useCallback(() => {
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

    const handleAddNode = (type: FlowNode['type']) => {
        const newNode: FlowNode = {
            id: `node-${Date.now()}`,
            type,
            text: type.charAt(0).toUpperCase() + type.slice(1),
            position: { x: 100, y: 100 },
            width: 120,
            height: 50
        };
        if (type === 'decision') newNode.height = 80;
        setData(prev => ({ ...prev, nodes: [...prev.nodes, newNode] }));
    };

    const handleNodeMouseDown = (e: React.MouseEvent, nodeId: string) => {
        const node = data.nodes.find(n => n.id === nodeId);
        if (node) {
            setDraggingNode({ id: nodeId, offsetX: e.clientX - node.position.x, offsetY: e.clientY - node.position.y });
        }
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        setMousePosition({ x: e.clientX, y: e.clientY });
        if (draggingNode) {
            setData(prev => ({
                ...prev,
                nodes: prev.nodes.map(n =>
                    n.id === draggingNode.id
                        ? { ...n, position: { x: e.clientX - draggingNode.offsetX, y: e.clientY - draggingNode.offsetY } }
                        : n
                )
            }));
        }
    };

    const handleMouseUp = () => {
        setDraggingNode(null);
    };

    const handleNodeClick = (e: React.MouseEvent, nodeId: string) => {
        e.stopPropagation();
        if (connectingFromId && connectingFromId !== nodeId) {
            const newEdge: FlowEdge = {
                id: `edge-${Date.now()}`,
                source: connectingFromId,
                target: nodeId,
            };
            setData(prev => ({ ...prev, edges: [...prev.edges, newEdge] }));
            setConnectingFromId(null);
        }
    };

    const handleConnectorClick = useCallback((e: React.MouseEvent, nodeId: string) => {
        e.stopPropagation();
        if (connectingFromId) {
            // End of connection
            if (connectingFromId !== nodeId) {
                const newEdge: FlowEdge = {
                    id: `edge-${Date.now()}`,
                    source: connectingFromId,
                    target: nodeId,
                };
                setData(prev => ({ ...prev, edges: [...prev.edges, newEdge] }));
            }
            setConnectingFromId(null);
        } else {
            // Start of connection
            setConnectingFromId(nodeId);
        }
    }, [connectingFromId, setData]);

    const handleUpdateText = (nodeId: string, text: string) => {
        setData(prev => ({ ...prev, nodes: prev.nodes.map(n => n.id === nodeId ? { ...n, text } : n) }));
        setEditingNodeId(null);
    };

    const handleDeleteNode = (e: React.MouseEvent, nodeId: string) => {
        e.stopPropagation();
        setData(prev => ({
            ...prev,
            nodes: prev.nodes.filter(n => n.id !== nodeId),
            edges: prev.edges.filter(e => e.source !== nodeId && e.target !== nodeId)
        }));
    };
    
    const handleDeleteEdge = (edgeId: string) => {
        setData(prev => ({...prev, edges: prev.edges.filter(e => e.id !== edgeId)}));
    };

    const NodeComponent: React.FC<{ node: FlowNode }> = ({ node }) => {
        const isEditing = editingNodeId === node.id;
        let shape: React.ReactNode;
        switch(node.type) {
            case 'start-end': shape = <rect rx={node.height / 2} ry={node.height / 2} width={node.width} height={node.height} fill="var(--background-tertiary)" stroke="var(--border-color-strong)" strokeWidth="2" />; break;
            case 'process': shape = <rect width={node.width} height={node.height} fill="var(--background-tertiary)" stroke="var(--border-color-strong)" strokeWidth="2" />; break;
            case 'decision': shape = <path d={`M ${node.width / 2} 0 L ${node.width} ${node.height / 2} L ${node.width / 2} ${node.height} L 0 ${node.height / 2} Z`} fill="var(--background-tertiary)" stroke="var(--border-color-strong)" strokeWidth="2" />; break;
            case 'io': shape = <path d={`M 20 0 L ${node.width} 0 L ${node.width - 20} ${node.height} L 0 ${node.height} Z`} fill="var(--background-tertiary)" stroke="var(--border-color-strong)" strokeWidth="2" />; break;
        }

        return (
            <g transform={`translate(${node.position.x}, ${node.position.y})`} onMouseDown={(e) => handleNodeMouseDown(e, node.id)} onClick={(e) => handleNodeClick(e, node.id)} onDoubleClick={() => setEditingNodeId(node.id)} className="cursor-move">
                {shape}
                {isEditing ? (
                     <foreignObject x="0" y="0" width={node.width} height={node.height}>
                        <textarea
                            defaultValue={node.text}
                            onBlur={(e) => handleUpdateText(node.id, e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); (e.target as HTMLTextAreaElement).blur(); } }}
                            style={{ width: '100%', height: '100%', textAlign: 'center', background: 'transparent', border: 'none', resize: 'none', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                            autoFocus
                        />
                     </foreignObject>
                ) : (
                    <foreignObject x="5" y="5" width={node.width - 10} height={node.height - 10} style={{ pointerEvents: 'none' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', textAlign: 'center', color: 'var(--text-primary)', wordBreak: 'break-word' }}>{node.text}</div>
                    </foreignObject>
                )}
                <circle cx={node.width/2} cy={0} r="5" fill="var(--background-accent)" className="cursor-pointer" onClick={(e) => handleConnectorClick(e, node.id)} />
                <circle cx={node.width} cy={node.height/2} r="5" fill="var(--background-accent)" className="cursor-pointer" onClick={(e) => handleConnectorClick(e, node.id)} />
                <circle cx={node.width/2} cy={node.height} r="5" fill="var(--background-accent)" className="cursor-pointer" onClick={(e) => handleConnectorClick(e, node.id)} />
                <circle cx={0} cy={node.height/2} r="5" fill="var(--background-accent)" className="cursor-pointer" onClick={(e) => handleConnectorClick(e, node.id)} />
                <foreignObject x={node.width + 5} y={-10} width="24" height="24">
                   <button onMouseDown={(e) => e.stopPropagation()} onClick={(e) => handleDeleteNode(e, node.id)} className="p-1 text-[var(--text-muted)] hover:text-[var(--text-danger)]"><TrashIcon className="h-4 w-4"/></button>
                </foreignObject>
            </g>
        );
    };
    
    const EdgeComponent: React.FC<{ edge: FlowEdge }> = ({ edge }) => {
        const sourceNode = data.nodes.find(n => n.id === edge.source);
        const targetNode = data.nodes.find(n => n.id === edge.target);
        if (!sourceNode || !targetNode) return null;

        const sx = sourceNode.position.x + sourceNode.width / 2;
        const sy = sourceNode.position.y + sourceNode.height / 2;
        const tx = targetNode.position.x + targetNode.width / 2;
        const ty = targetNode.position.y + targetNode.height / 2;
        
        return <path d={`M ${sx} ${sy} L ${tx} ${ty}`} stroke="var(--border-color-strong)" strokeWidth="2" fill="none" markerEnd="url(#arrow)" onClick={() => handleDeleteEdge(edge.id)} className="cursor-pointer hover:stroke-red-500" />;
    };


    return (
        <div className="h-full flex flex-col relative bg-[var(--background-primary)]">
            <div className="absolute top-2 left-2 z-10 p-2 bg-[var(--background-secondary)] rounded-lg shadow-md border border-[var(--border-color)] flex gap-2">
                <button onClick={() => handleAddNode('start-end')} className="px-2 py-1 text-xs border rounded">시작/종료</button>
                <button onClick={() => handleAddNode('process')} className="px-2 py-1 text-xs border rounded">프로세스</button>
                <button onClick={() => handleAddNode('decision')} className="px-2 py-1 text-xs border rounded">결정</button>
                <button onClick={() => handleAddNode('io')} className="px-2 py-1 text-xs border rounded">입/출력</button>
            </div>
            <div ref={editorRef} className="flex-1 w-full h-full overflow-auto custom-scrollbar">
                <svg
                    width="2000" height="2000"
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onClick={() => setConnectingFromId(null)}
                >
                    <defs>
                        <marker id="arrow" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                            <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--border-color-strong)" />
                        </marker>
                    </defs>
                    {data.edges.map(edge => <EdgeComponent key={edge.id} edge={edge} />)}
                    {data.nodes.map(node => <NodeComponent key={node.id} node={node} />)}
                    {connectingFromId && (
                        <line 
                            x1={data.nodes.find(n => n.id === connectingFromId)!.position.x + data.nodes.find(n => n.id === connectingFromId)!.width / 2} 
                            y1={data.nodes.find(n => n.id === connectingFromId)!.position.y + data.nodes.find(n => n.id === connectingFromId)!.height / 2}
                            x2={mousePosition.x - (editorRef.current?.getBoundingClientRect().left || 0)} 
                            y2={mousePosition.y - (editorRef.current?.getBoundingClientRect().top || 0)}
                            stroke="var(--background-accent)" strokeWidth="2" strokeDasharray="5,5"
                        />
                    )}
                </svg>
            </div>
        </div>
    );
};

export default FlowchartEditor;