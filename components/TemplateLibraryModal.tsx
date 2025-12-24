
import React, { useState, useMemo } from 'react';
import type { MessageTemplate } from '../types';
import BaseModal from './ui/BaseModal';
import { XIcon, PlusIcon, PencilIcon, TrashIcon, ClipboardIcon, CheckIcon, SearchIcon, DocumentTextIcon } from './icons';

interface TemplateLibraryModalProps {
  isOpen: boolean;
  onClose: () => void;
  templates: MessageTemplate[];
  onAdd: (template: Omit<MessageTemplate, 'id' | 'createdAt'>) => Promise<void>;
  onUpdate: (template: MessageTemplate) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

const categories = ['전체', '안부', '상담', '후속 관리', '기념일', '기타'];

const TemplateLibraryModal: React.FC<TemplateLibraryModalProps> = ({
  isOpen,
  onClose,
  templates,
  onAdd,
  onUpdate,
  onDelete,
}) => {
  const [view, setView] = useState<'list' | 'form'>('list');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('전체');
  const [editingTemplate, setEditingTemplate] = useState<MessageTemplate | null>(null);
  const [formData, setFormData] = useState({ title: '', category: '안부', content: '' });
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const filteredTemplates = useMemo(() => {
    return templates.filter(t => {
      const matchesSearch = t.title.toLowerCase().includes(searchTerm.toLowerCase()) || t.content.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = selectedCategory === '전체' || t.category === selectedCategory;
      return matchesSearch && matchesCategory;
    }).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [templates, searchTerm, selectedCategory]);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleAddNew = () => {
    setEditingTemplate(null);
    setFormData({ title: '', category: '안부', content: '' });
    setView('form');
  };

  const handleEdit = (template: MessageTemplate) => {
    setEditingTemplate(template);
    setFormData({ title: template.title, category: template.category, content: template.content });
    setView('form');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.content.trim()) return;

    if (editingTemplate) {
      await onUpdate({ ...editingTemplate, ...formData });
    } else {
      await onAdd(formData);
    }
    setView('list');
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('정말 삭제하시겠습니까?')) {
      await onDelete(id);
    }
  };

  return (
    <BaseModal isOpen={isOpen} onClose={onClose} className="max-w-2xl w-full h-[80vh] flex flex-col">
      <div className="p-4 border-b border-[var(--border-color)] flex justify-between items-center flex-shrink-0">
        <h2 className="text-xl font-bold text-[var(--text-primary)] flex items-center gap-2">
            <DocumentTextIcon className="h-6 w-6 text-indigo-500" />
            템플릿 라이브러리
        </h2>
        <button onClick={onClose} className="text-[var(--text-muted)] hover:text-[var(--text-primary)]">
          <XIcon className="h-6 w-6" />
        </button>
      </div>

      <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
        {view === 'list' ? (
          <>
            <div className="p-4 border-b border-[var(--border-color)] space-y-3 flex-shrink-0 bg-[var(--background-secondary)]">
                <div className="flex gap-2 overflow-x-auto pb-1 custom-scrollbar">
                    {categories.map(cat => (
                        <button
                            key={cat}
                            onClick={() => setSelectedCategory(cat)}
                            className={`px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                                selectedCategory === cat 
                                ? 'bg-[var(--background-accent)] text-[var(--text-on-accent)]' 
                                : 'bg-[var(--background-tertiary)] text-[var(--text-secondary)] hover:bg-[var(--background-primary)] border border-[var(--border-color-strong)]'
                            }`}
                        >
                            {cat}
                        </button>
                    ))}
                </div>
                <div className="relative">
                    <input 
                        type="text" 
                        value={searchTerm} 
                        onChange={(e) => setSearchTerm(e.target.value)} 
                        placeholder="템플릿 검색..." 
                        className="w-full pl-9 pr-4 py-2 bg-[var(--background-tertiary)] border border-[var(--border-color-strong)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--background-accent)]"
                    />
                    <SearchIcon className="absolute left-3 top-2.5 h-4 w-4 text-[var(--text-muted)]" />
                </div>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-3">
                {filteredTemplates.length > 0 ? (
                    filteredTemplates.map(template => (
                        <div key={template.id} className="p-4 bg-[var(--background-tertiary)] rounded-lg border border-[var(--border-color)] hover:border-[var(--background-accent)] transition-colors group">
                            <div className="flex justify-between items-start mb-2">
                                <div>
                                    <span className="inline-block px-2 py-0.5 rounded text-xs font-medium bg-[var(--background-secondary)] text-[var(--text-muted)] mb-1 border border-[var(--border-color-strong)]">
                                        {template.category}
                                    </span>
                                    <h3 className="font-bold text-[var(--text-primary)]">{template.title}</h3>
                                </div>
                                <div className="flex items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                                    <button onClick={() => handleEdit(template)} className="p-1.5 text-[var(--text-muted)] hover:text-[var(--text-accent)] rounded-full hover:bg-[var(--background-secondary)]"><PencilIcon className="h-4 w-4"/></button>
                                    <button onClick={() => handleDelete(template.id)} className="p-1.5 text-[var(--text-muted)] hover:text-[var(--text-danger)] rounded-full hover:bg-[var(--background-secondary)]"><TrashIcon className="h-4 w-4"/></button>
                                </div>
                            </div>
                            <pre className="whitespace-pre-wrap font-sans text-sm text-[var(--text-secondary)] bg-[var(--background-secondary)] p-3 rounded border border-[var(--border-color-strong)] mb-2">
                                {template.content}
                            </pre>
                            <div className="flex justify-end">
                                <button 
                                    onClick={() => handleCopy(template.content, template.id)}
                                    className={`flex items-center gap-1 px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                                        copiedId === template.id 
                                        ? 'bg-green-100 text-green-700' 
                                        : 'bg-[var(--background-secondary)] text-[var(--text-secondary)] hover:bg-[var(--background-primary)] border border-[var(--border-color-strong)]'
                                    }`}
                                >
                                    {copiedId === template.id ? <CheckIcon className="h-3 w-3" /> : <ClipboardIcon className="h-3 w-3" />}
                                    {copiedId === template.id ? '복사됨' : '내용 복사'}
                                </button>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="text-center py-10 text-[var(--text-muted)]">
                        <p>등록된 템플릿이 없습니다.</p>
                    </div>
                )}
            </div>
            
            <div className="p-4 border-t border-[var(--border-color)] bg-[var(--background-secondary)]">
                <button 
                    onClick={handleAddNew} 
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-[var(--background-accent)] text-[var(--text-on-accent)] rounded-lg font-semibold hover:bg-[var(--background-accent-hover)]"
                >
                    <PlusIcon className="h-5 w-5" /> 새 템플릿 추가
                </button>
            </div>
          </>
        ) : (
          <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden">
             <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-4">
                <div>
                    <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">제목</label>
                    <input 
                        type="text" 
                        value={formData.title} 
                        onChange={(e) => setFormData({...formData, title: e.target.value})}
                        placeholder="템플릿 제목 (예: 명절 인사)"
                        className="w-full p-2 bg-[var(--background-tertiary)] border border-[var(--border-color-strong)] rounded-md focus:ring-2 focus:ring-[var(--background-accent)] focus:outline-none"
                        required
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">카테고리</label>
                    <div className="flex flex-wrap gap-2">
                        {categories.filter(c => c !== '전체').map(cat => (
                            <button
                                key={cat}
                                type="button"
                                onClick={() => setFormData({...formData, category: cat})}
                                className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                                    formData.category === cat
                                    ? 'bg-[var(--background-accent)] text-[var(--text-on-accent)] border-transparent'
                                    : 'bg-[var(--background-tertiary)] text-[var(--text-secondary)] border-[var(--border-color-strong)] hover:bg-[var(--background-primary)]'
                                }`}
                            >
                                {cat}
                            </button>
                        ))}
                    </div>
                </div>
                <div className="flex-1">
                    <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">내용</label>
                    <textarea 
                        value={formData.content} 
                        onChange={(e) => setFormData({...formData, content: e.target.value})}
                        placeholder="내용을 입력하세요..."
                        className="w-full h-64 p-3 bg-[var(--background-tertiary)] border border-[var(--border-color-strong)] rounded-md focus:ring-2 focus:ring-[var(--background-accent)] focus:outline-none resize-none"
                        required
                    />
                     <p className="text-xs text-[var(--text-muted)] mt-1">Tip: <code>{'{customerName}'}</code>을 입력하면 전송 시 고객 이름으로 자동 변경됩니다.</p>
                </div>
             </div>
             <div className="p-4 border-t border-[var(--border-color)] bg-[var(--background-secondary)] flex justify-end gap-3">
                <button 
                    type="button" 
                    onClick={() => setView('list')}
                    className="px-4 py-2 bg-[var(--background-tertiary)] text-[var(--text-secondary)] rounded-md hover:bg-[var(--background-primary)] border border-[var(--border-color-strong)]"
                >
                    취소
                </button>
                <button 
                    type="submit"
                    className="px-6 py-2 bg-[var(--background-accent)] text-[var(--text-on-accent)] rounded-md font-medium hover:bg-[var(--background-accent-hover)]"
                >
                    {editingTemplate ? '수정 완료' : '추가하기'}
                </button>
             </div>
          </form>
        )}
      </div>
    </BaseModal>
  );
};

export default TemplateLibraryModal;
