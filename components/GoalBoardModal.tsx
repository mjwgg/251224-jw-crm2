import React, { useState, useRef, useEffect } from 'react';
import type { GoalBoard } from '../types';
import BaseModal from './ui/BaseModal';
import { XIcon, PlusIcon, BrainIcon, TrashIcon, PencilIcon, CheckIcon, ViewColumnsIcon, ArrowsPointingOutIcon, ArrowsPointingInIcon, ViewRowsIcon, AdjustmentsHorizontalIcon, FishboneIcon } from './icons';
import MandalartEditor from './MandalartEditor';
import MindMapEditor from './MindMapEditor';
import GanttChartEditor from './GanttChartEditor';
import FishboneEditor from './FishboneEditor';

interface GoalBoardModalProps {
  isOpen: boolean;
  onClose: () => void;
  goalBoards: GoalBoard[];
  onAdd: (newBoard: Omit<GoalBoard, 'id' | 'createdAt'>) => Promise<void>;
  onUpdate: (board: GoalBoard) => Promise<void>;
  onDelete: (boardId: string) => Promise<void>;
}

const mindMapTemplates = [
  {
    key: 'radial',
    name: '방사형',
    description: '중심 주제에서 아이디어가 사방으로 뻗어나갑니다.',
    data: {
      id: 'root',
      text: '중심 주제',
      children: [
        { id: 'node_1', text: '주제 1', children: [] },
        { id: 'node_2', text: '주제 2', children: [] },
        { id: 'node_3', text: '주제 3', children: [] },
        { id: 'node_4', text: '주제 4', children: [] },
      ],
    },
  },
  {
    key: 'tree',
    name: '트리형',
    description: '하나의 주제에서 가지를 치며 생각을 정리합니다.',
    data: {
      id: 'root',
      text: '중심 주제',
      children: [
        {
          id: 'node_1',
          text: '대주제 1',
          children: [
            { id: 'node_1_1', text: '소주제 1.1', children: [] },
            { id: 'node_1_2', text: '소주제 1.2', children: [] },
          ],
        },
        {
          id: 'node_2',
          text: '대주제 2',
          children: [{ id: 'node_2_1', text: '소주제 2.1', children: [] }],
        },
      ],
    },
  },
  {
    key: 'org-chart',
    name: '조직도형',
    description: '계층 구조를 명확하게 표현할 때 유용합니다.',
    data: {
      id: 'root',
      text: '대표',
      layout: 'vertical',
      children: [
        {
          id: 'node_1',
          text: 'A 부서',
          children: [
            { id: 'node_1_1', text: '팀원 1', children: [] },
            { id: 'node_1_2', text: '팀원 2', children: [] },
          ],
        },
        {
          id: 'node_2',
          text: 'B 부서',
          children: [{ id: 'node_2_1', text: '팀원 3', children: [] }],
        },
      ],
    },
  },
  {
    key: 'blank',
    name: '빈 캔버스',
    description: '아무것도 없는 상태에서 자유롭게 시작합니다.',
    data: { id: 'root', text: '중심 주제', children: [] },
  },
];


const GoalBoardModal: React.FC<GoalBoardModalProps> = ({ isOpen, onClose, goalBoards, onAdd, onUpdate, onDelete }) => {
  const [view, setView] = useState<'list' | 'mandalart' | 'mindmap' | 'gantt' | 'fishbone'>('list');
  const [activeBoard, setActiveBoard] = useState<GoalBoard | null>(null);
  const [editingBoard, setEditingBoard] = useState<{ id: string; title: string } | null>(null);
  const [isNewBoardMenuOpen, setIsNewBoardMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const [isFullScreen, setIsFullScreen] = useState(false);

  const [creationState, setCreationState] = useState<{ type: 'mandalart' | 'mindmap' | 'gantt' | 'fishbone'; step: 'template' | 'title' } | null>(null);
  const [newBoardTitle, setNewBoardTitle] = useState('');
  const [selectedTemplateKey, setSelectedTemplateKey] = useState('radial');

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
        if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
            setIsNewBoardMenuOpen(false);
        }
    };

    if (isNewBoardMenuOpen) {
        document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
        document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isNewBoardMenuOpen]);

  const handleClose = () => {
    setView('list');
    setActiveBoard(null);
    setEditingBoard(null);
    setCreationState(null);
    setNewBoardTitle('');
    setIsFullScreen(false);
    onClose();
  };
  
  const handleStartCreateNew = (type: 'mandalart' | 'mindmap' | 'gantt' | 'fishbone') => {
    setIsNewBoardMenuOpen(false);
    if (type === 'mandalart') {
        setCreationState({ type: 'mandalart', step: 'title' });
        setNewBoardTitle('나의 만다라트');
    } else if (type === 'gantt') {
        setCreationState({ type: 'gantt', step: 'title' });
        setNewBoardTitle('새 프로젝트');
    } else if (type === 'fishbone') {
        setCreationState({ type: 'fishbone', step: 'title' });
        setNewBoardTitle('새 피쉬본 다이어그램');
    } else {
        setCreationState({ type: 'mindmap', step: 'title' });
        setNewBoardTitle('새 마인드맵');
    }
  };

  const handleConfirmCreation = () => {
    if (!creationState || !newBoardTitle.trim()) {
        return;
    }

    const newBoardData: Omit<GoalBoard, 'id' | 'createdAt'> = {
        title: newBoardTitle.trim(),
        type: creationState.type,
        content: '',
    };

    if (creationState.type === 'mandalart') {
        newBoardData.content = JSON.stringify(Array(81).fill(''));
    } else if (creationState.type === 'gantt') {
        newBoardData.content = JSON.stringify([]);
    } else if (creationState.type === 'fishbone') {
        newBoardData.content = JSON.stringify({
          effect: "문제 또는 결과",
          categories: [
            { "id": "cat1", "name": "분류 1", "causes": [{ "id": "c1-1", "text": "세부 원인" }] },
            { "id": "cat2", "name": "분류 2", "causes": [{ "id": "c2-1", "text": "세부 원인" }] },
            { "id": "cat3", "name": "분류 3", "causes": [{ "id": "c3-1", "text": "세부 원인" }] },
            { "id": "cat4", "name": "분류 4", "causes": [{ "id": "c4-1", "text": "세부 원인" }] },
            { "id": "cat5", "name": "분류 5", "causes": [{ "id": "c5-1", "text": "세부 원인" }] },
            { "id": "cat6", "name": "분류 6", "causes": [{ "id": "c6-1", "text": "세부 원인" }] }
          ]
        });
    } else {
        const template = mindMapTemplates.find(t => t.key === selectedTemplateKey) || mindMapTemplates[0];
        const newContent = JSON.parse(JSON.stringify(template.data));
        newContent.text = newBoardTitle.trim();
        newBoardData.content = JSON.stringify(newContent);
    }

    const tempBoard: GoalBoard = {
        ...newBoardData,
        id: `temp-${Date.now()}`,
        createdAt: new Date().toISOString()
    };

    setActiveBoard(tempBoard);
    setView(creationState.type);
    setCreationState(null);
    setNewBoardTitle('');
  };

  const openBoard = (board: GoalBoard) => {
    setActiveBoard(board);
    setView(board.type);
  };
  
  const handleSaveBoardContent = (newContent: string) => {
      if (!activeBoard) return;
      
      const boardToSave = { ...activeBoard, content: newContent };
      
      if (activeBoard.id.startsWith('temp-')) {
          const { id, createdAt, ...newBoardData } = boardToSave;
          onAdd(newBoardData).then(() => {
              setView('list');
              setActiveBoard(null);
          });
      } else {
          onUpdate(boardToSave);
      }
  };

  const handleDeleteBoard = (e: React.MouseEvent, boardId: string) => {
    e.stopPropagation();
    if (window.confirm('정말로 이 보드를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) {
      onDelete(boardId);
    }
  };

  const handleStartEdit = (e: React.MouseEvent, board: GoalBoard) => {
    e.stopPropagation();
    setEditingBoard({ id: board.id, title: board.title });
  };

  const handleSaveEdit = () => {
    if (editingBoard && editingBoard.title.trim()) {
      const boardToUpdate = goalBoards.find(b => b.id === editingBoard.id);
      if (boardToUpdate) {
        onUpdate({ ...boardToUpdate, title: editingBoard.title.trim() });
      }
    }
    setEditingBoard(null);
  };

  const renderListView = () => {
    if (creationState) {
        if (creationState.type === 'mandalart' || creationState.type === 'gantt' || creationState.type === 'fishbone') {
            return (
                <div className="animate-fade-in p-6">
                    <h3 className="text-lg font-semibold mb-4">
                        {creationState.type === 'mandalart' ? '새 만다라트 만들기' : 
                         creationState.type === 'gantt' ? '새 간트 차트 만들기' :
                         '새 피쉬본 다이어그램 만들기'}
                    </h3>
                    <div className="space-y-4">
                        <div>
                            <label htmlFor="newBoardTitle" className="block text-sm font-medium text-[var(--text-secondary)]">보드 제목</label>
                            <input
                                type="text"
                                id="newBoardTitle"
                                value={newBoardTitle}
                                onChange={(e) => setNewBoardTitle(e.target.value)}
                                onKeyDown={(e) => { if (e.key === 'Enter') handleConfirmCreation(); }}
                                className="mt-1 block w-full p-2 border border-[var(--border-color-strong)] bg-[var(--background-tertiary)] text-[var(--text-primary)] rounded-md shadow-sm focus:ring-[var(--background-accent)] focus:border-[var(--background-accent)]"
                                autoFocus
                            />
                        </div>
                        <div className="flex justify-end gap-2">
                            <button onClick={() => setCreationState(null)} className="px-4 py-2 bg-[var(--background-secondary)] border border-[var(--border-color-strong)] rounded-md text-sm font-medium text-[var(--text-secondary)]">
                                취소
                            </button>
                            <button onClick={handleConfirmCreation} className="px-4 py-2 bg-[var(--background-accent)] text-[var(--text-on-accent)] rounded-md text-sm font-medium">
                                생성하기
                            </button>
                        </div>
                    </div>
                </div>
            );
        } else if (creationState.type === 'mindmap') {
            if (creationState.step === 'template') {
                return (
                  <div className="animate-fade-in p-6">
                    <h3 className="text-lg font-semibold mb-4">마인드맵 템플릿 선택</h3>
                    <div className="grid grid-cols-2 gap-4">
                      {mindMapTemplates.map(template => (
                        <div 
                          key={template.key}
                          onClick={() => setSelectedTemplateKey(template.key)}
                          className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${selectedTemplateKey === template.key ? 'border-[var(--background-accent)] ring-2 ring-[var(--background-accent)]' : 'border-[var(--border-color-strong)] hover:border-[var(--background-accent)]'}`}
                        >
                          <div className="font-bold text-[var(--text-primary)]">{template.name}</div>
                          <p className="text-xs text-[var(--text-muted)] mt-1 h-8">{template.description}</p>
                        </div>
                      ))}
                    </div>
                    <div className="flex justify-end gap-2 mt-6">
                      <button onClick={() => setCreationState(null)} className="px-4 py-2 bg-[var(--background-secondary)] border border-[var(--border-color-strong)] rounded-md text-sm font-medium text-[var(--text-secondary)]">
                        취소
                      </button>
                      <button onClick={() => { setNewBoardTitle(''); setCreationState({ type: 'mindmap', step: 'title' }); }} className="px-4 py-2 bg-[var(--background-accent)] text-[var(--text-on-accent)] rounded-md text-sm font-medium">
                        다음
                      </button>
                    </div>
                  </div>
                );
            } else { // step === 'title'
                return (
                  <div className="animate-fade-in p-6">
                    <h3 className="text-lg font-semibold mb-4">마인드맵 제목 입력</h3>
                    <div className="space-y-4">
                        <div>
                            <label htmlFor="newBoardTitle" className="block text-sm font-medium text-[var(--text-secondary)]">보드 제목 (중심 주제)</label>
                            <input
                                type="text"
                                id="newBoardTitle"
                                value={newBoardTitle}
                                onChange={(e) => setNewBoardTitle(e.target.value)}
                                onKeyDown={(e) => { if (e.key === 'Enter') handleConfirmCreation(); }}
                                className="mt-1 block w-full p-2 border border-[var(--border-color-strong)] bg-[var(--background-tertiary)] text-[var(--text-primary)] rounded-md shadow-sm focus:ring-[var(--background-accent)] focus:border-[var(--background-accent)]"
                                autoFocus
                            />
                        </div>
                        <div className="flex justify-end gap-2">
                            <button onClick={() => setCreationState(null)} className="px-4 py-2 bg-[var(--background-secondary)] border border-[var(--border-color-strong)] rounded-md text-sm font-medium text-[var(--text-secondary)]">
                                취소
                            </button>
                            <button onClick={handleConfirmCreation} className="px-4 py-2 bg-[var(--background-accent)] text-[var(--text-on-accent)] rounded-md text-sm font-medium">
                                생성하기
                            </button>
                        </div>
                    </div>
                </div>
                );
            }
        }
    }

    return (
        <div className="animate-fade-in p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">내 보드 목록 ({goalBoards.length})</h3>
            <div className="relative" ref={menuRef}>
                <button 
                    onClick={() => setIsNewBoardMenuOpen(prev => !prev)}
                    className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-md bg-[var(--background-accent)] text-[var(--text-on-accent)] hover:bg-opacity-90"
                >
                    <PlusIcon className="h-4 w-4" /> 새 보드 만들기
                </button>
                {isNewBoardMenuOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-[var(--background-secondary)] rounded-md shadow-lg border border-[var(--border-color)] z-10 animate-fade-in">
                      <button onClick={() => handleStartCreateNew('mandalart')} className="block w-full text-left px-4 py-2 text-sm text-[var(--text-primary)] hover:bg-[var(--background-tertiary)]">만다라트 만들기</button>
                      <button onClick={() => handleStartCreateNew('mindmap')} className="block w-full text-left px-4 py-2 text-sm text-[var(--text-primary)] hover:bg-[var(--background-tertiary)]">마인드맵 만들기</button>
                      <button onClick={() => handleStartCreateNew('gantt')} className="block w-full text-left px-4 py-2 text-sm text-[var(--text-primary)] hover:bg-[var(--background-tertiary)]">간트 차트 만들기</button>
                      <button onClick={() => handleStartCreateNew('fishbone')} className="block w-full text-left px-4 py-2 text-sm text-[var(--text-primary)] hover:bg-[var(--background-tertiary)]">피쉬본 다이어그램</button>
                  </div>
                )}
            </div>
          </div>
          
          {goalBoards.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {goalBoards.map(board => (
                      <div key={board.id} onClick={() => openBoard(board)} className="p-4 bg-[var(--background-tertiary)] rounded-lg border border-[var(--border-color)] cursor-pointer hover:border-[var(--background-accent)] transition-colors">
                          <div className="flex justify-between items-start">
                              {editingBoard?.id === board.id ? (
                                <div className="flex-grow">
                                    <input 
                                        type="text"
                                        value={editingBoard.title}
                                        onChange={(e) => setEditingBoard({ ...editingBoard, title: e.target.value })}
                                        onClick={(e) => e.stopPropagation()}
                                        onKeyDown={(e) => { if (e.key === 'Enter') handleSaveEdit(); }}
                                        onBlur={handleSaveEdit}
                                        className="w-full p-1 border-b-2 bg-transparent focus:border-[var(--background-accent)] outline-none text-[var(--text-primary)] font-bold border-[var(--border-color-strong)]"
                                        autoFocus
                                    />
                                </div>
                              ) : (
                                <div className="flex-grow min-w-0">
                                    <p className="font-bold text-[var(--text-primary)] truncate">{board.title}</p>
                                    <div className="flex items-center text-sm text-[var(--text-muted)] mt-1">
                                        {board.type === 'mandalart' ? <ViewColumnsIcon className="h-4 w-4 mr-1" /> : 
                                         board.type === 'mindmap' ? <BrainIcon className="h-4 w-4 mr-1" /> : 
                                         board.type === 'fishbone' ? <FishboneIcon className="h-4 w-4 mr-1" /> :
                                         <ViewRowsIcon className="h-4 w-4 mr-1" />}
                                        <span>{board.type === 'mandalart' ? '만다라트' : board.type === 'mindmap' ? '마인드맵' : board.type === 'fishbone' ? '피쉬본' : '간트 차트'}</span>
                                    </div>
                                </div>
                              )}
                              <div className="flex items-center gap-1 shrink-0 ml-2">
                                {editingBoard?.id === board.id ? (
                                    <>
                                        <button onClick={(e) => { e.stopPropagation(); handleSaveEdit(); }} className="text-green-500 hover:text-green-600 p-1"><CheckIcon className="h-5 w-5"/></button>
                                        <button onClick={(e) => { e.stopPropagation(); setEditingBoard(null); }} className="text-[var(--text-muted)] hover:text-[var(--text-primary)] p-1"><XIcon className="h-5 w-5"/></button>
                                    </>
                                ) : (
                                    <>
                                        <button onClick={(e) => handleStartEdit(e, board)} className="text-[var(--text-muted)] hover:text-[var(--text-accent)] p-1"><PencilIcon className="h-4 w-4" /></button>
                                        <button onClick={(e) => handleDeleteBoard(e, board.id)} className="text-[var(--text-muted)] hover:text-[var(--text-danger)] p-1"><TrashIcon className="h-4 w-4" /></button>
                                    </>
                                )}
                              </div>
                          </div>
                          <p className="text-xs text-[var(--text-muted)] mt-2">{new Date(board.createdAt).toLocaleDateString()}</p>
                      </div>
                  ))}
              </div>
          ) : (
               <div className="mt-4 border-2 border-dashed border-[var(--border-color-strong)] rounded-lg h-64 flex items-center justify-center">
                  <div className="text-center">
                      <p className="text-[var(--text-muted)]">아직 생성된 보드가 없습니다.</p>
                      <p className="text-sm text-[var(--text-muted)] mt-1">'새 보드 만들기'를 눌러 첫 목표 보드를 만들어보세요.</p>
                  </div>
              </div>
          )}
        </div>
    );
  };
  
  const renderEditorView = () => {
    if (!activeBoard) return null;
    return (
      <div className="h-full flex flex-col animate-fade-in">
        <div className="flex justify-between items-center mb-4 flex-shrink-0 px-6 pt-6">
          <h3 className="text-lg font-semibold">{activeBoard.title}</h3>
          <button onClick={() => { setView('list'); setActiveBoard(null); setIsFullScreen(false); }} className="text-sm text-[var(--text-accent)] hover:underline">목록으로 돌아가기</button>
        </div>
        <div className={`flex-1 min-h-0 ${activeBoard.type === 'mandalart' ? 'px-6 pb-6' : ''}`}>
          {activeBoard.type === 'mandalart' && (
            <MandalartEditor content={activeBoard.content} onSave={handleSaveBoardContent} />
          )}
          {activeBoard.type === 'mindmap' && (
            <MindMapEditor content={activeBoard.content} onSave={handleSaveBoardContent} />
          )}
          {activeBoard.type === 'gantt' && (
            <GanttChartEditor content={activeBoard.content} onSave={handleSaveBoardContent} />
          )}
          {activeBoard.type === 'fishbone' && (
            <FishboneEditor content={activeBoard.content} onSave={handleSaveBoardContent} />
          )}
        </div>
      </div>
    );
  };
  
  return (
    <BaseModal
        isOpen={isOpen}
        onClose={handleClose}
        className={isFullScreen
            ? "w-screen h-screen max-w-none max-h-none rounded-none border-0"
            : "max-w-4xl w-full h-[90vh]"
        }
    >
      <div className="p-4 border-b border-[var(--border-color)] flex justify-between items-center flex-shrink-0">
        <h2 className="text-xl font-bold text-[var(--text-primary)] flex items-center gap-2">
            <BrainIcon className="h-6 w-6" />
            목표 관리 보드
        </h2>
        <div className="flex items-center gap-2">
            {view !== 'list' && (
                <button
                    onClick={() => setIsFullScreen(prev => !prev)}
                    className="p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                    title={isFullScreen ? '전체화면 종료' : '전체화면'}
                >
                    {isFullScreen ? <ArrowsPointingInIcon className="h-5 w-5" /> : <ArrowsPointingOutIcon className="h-5 w-5" />}
                </button>
            )}
            <button onClick={handleClose} className="text-[var(--text-muted)] hover:text-[var(--text-primary)]">
                <XIcon className="h-6 w-6" />
            </button>
        </div>
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar">
        <div key={view} className="h-full">
            {view === 'list' ? renderListView() : renderEditorView()}
        </div>
      </div>
    </BaseModal>
  );
};

export default GoalBoardModal;