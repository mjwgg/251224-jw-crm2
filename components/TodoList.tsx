
import React, { useState, useMemo } from 'react';
import type { Todo } from '../types';
import { TrashIcon, PlusIcon, CheckIcon, PencilIcon, XIcon } from './icons';

interface TodoListProps {
    todos: Todo[];
    onAddTodo: (text: string, priority: Todo['priority'], date?: string) => void;
    onToggleTodo: (id: string) => void;
    onDeleteTodo: (id: string) => void;
    onUpdateTodo: (id: string, data: { text: string; priority: Todo['priority'] }) => void;
    title?: string;
    date?: string; // YYYY-MM-DD
    maxVisibleItems?: number;
    onShowMoreClick?: () => void;
    showAllIncomplete?: boolean;
    showAll?: boolean;
}

const priorityMap: { [key in Todo['priority']]: { color: string, order: number, label: string } } = {
    high: { color: 'bg-red-500', order: 1, label: '높음' },
    medium: { color: 'bg-yellow-500', order: 2, label: '보통' },
    low: { color: 'bg-blue-500', order: 3, label: '낮음' },
};

const TodoList: React.FC<TodoListProps> = ({ todos, onAddTodo, onToggleTodo, onDeleteTodo, onUpdateTodo, title = "To Do List", date, maxVisibleItems, onShowMoreClick, showAllIncomplete = false, showAll = false }) => {
    const [newTodoText, setNewTodoText] = useState('');
    const [selectedPriority, setSelectedPriority] = useState<Todo['priority']>('medium');
    const [editing, setEditing] = useState<{ id: string; text: string; priority: Todo['priority'] } | null>(null);

    const handleAddClick = () => {
        if (newTodoText.trim()) {
            onAddTodo(newTodoText.trim(), selectedPriority, date);
            setNewTodoText('');
            setSelectedPriority('medium');
        }
    };
    
    const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            handleAddClick();
        }
    };

    const dateToFilter = useMemo(() => {
        if (date) return date;
        const today = new Date();
        return new Date(today.getTime() - (today.getTimezoneOffset() * 60000)).toISOString().split('T')[0];
    }, [date]);
    
    const sortedTodos = useMemo(() => {
        let filtered = todos;
        if (showAll) {
            // No filter, use all todos
        } else if (showAllIncomplete) {
            filtered = todos.filter(todo => !todo.completed);
        } else {
            filtered = todos.filter(todo => {
                return (todo.date < dateToFilter && !todo.completed) || todo.date === dateToFilter;
            });
        }
        
        return filtered.sort((a, b) => {
            if (a.completed !== b.completed) {
                return a.completed ? 1 : -1;
            }
            if (priorityMap[a.priority].order !== priorityMap[b.priority].order) {
                return priorityMap[a.priority].order - priorityMap[b.priority].order;
            }
            if (showAll && a.date !== b.date) {
                return b.date.localeCompare(a.date);
            }
            return b.id.localeCompare(a.id);
        });
    }, [todos, dateToFilter, showAllIncomplete, showAll]);
    

    const handleStartEdit = (todo: Todo) => {
        setEditing({ id: todo.id, text: todo.text, priority: todo.priority });
    };

    const handleCancelEdit = () => {
        setEditing(null);
    };

    const handleSaveEdit = () => {
        if (editing && editing.text.trim()) {
            onUpdateTodo(editing.id, { text: editing.text, priority: editing.priority });
            setEditing(null);
        }
    };

    const visibleTodos = maxVisibleItems ? sortedTodos.slice(0, maxVisibleItems) : sortedTodos;

    return (
        <div className="h-full flex flex-col">
            {title && (
              <h2 className="text-xl font-bold text-[var(--text-primary)] mb-2 md:mb-4 flex items-center shrink-0">
                  <CheckIcon className="h-5 w-5 mr-2 text-green-400"/>
                  <span className="truncate">{title} ({sortedTodos.length})</span>
              </h2>
            )}
            <div className="flex flex-col flex-1 min-h-0">
                <div className="space-y-2 mb-2 shrink-0">
                    <input
                        type="text"
                        value={newTodoText}
                        onChange={(e) => setNewTodoText(e.target.value)}
                        onKeyPress={handleKeyPress}
                        placeholder="새로운 할 일..."
                        className="w-full p-2 text-sm border rounded-md shadow-sm focus:ring-[var(--background-accent)] focus:border-[var(--background-accent)] bg-[var(--background-tertiary)] border-[var(--border-color-strong)] text-[var(--text-primary)]"
                    />
                    <div className="flex justify-between items-center">
                        <div className="flex items-center gap-1 sm:gap-2">
                             {(['high', 'medium', 'low'] as const).map(p => (
                                <button 
                                    key={p}
                                    type="button"
                                    onClick={() => setSelectedPriority(p)}
                                    className={`w-4 h-4 sm:w-5 sm:h-5 rounded-full border-2 transition-transform transform hover:scale-110 ${selectedPriority === p ? 'ring-2 ring-offset-1 ring-[var(--background-accent)]' : ''} ${priorityMap[p].color}`}
                                    aria-label={`${priorityMap[p].label} 우선순위`}
                                ></button>
                             ))}
                        </div>
                        <button
                            onClick={handleAddClick}
                            className="p-1.5 bg-[var(--background-accent)] text-[var(--text-on-accent)] rounded-md font-semibold hover:bg-[var(--background-accent-hover)] disabled:opacity-50 flex items-center"
                            disabled={!newTodoText.trim()}
                        >
                            <PlusIcon className="h-4 w-4 sm:h-5 sm:w-5" />
                        </button>
                    </div>
                </div>
                {sortedTodos.length > 0 ? (
                    <div className="flex-1 overflow-y-auto custom-scrollbar pr-1 -mr-1">
                        <ul className="space-y-1">
                            {visibleTodos.map(todo => {
                                const isEditing = editing?.id === todo.id;
                                return (
                                <li key={todo.id} className={`flex items-center p-1.5 rounded-md group ${isEditing ? 'bg-[var(--background-primary)]' : 'hover:bg-[var(--background-tertiary)]'}`}>
                                    {isEditing ? (
                                        <>
                                            <div className="flex-grow mr-2 space-y-2">
                                                <input
                                                    type="text"
                                                    value={editing.text}
                                                    onChange={(e) => setEditing({ ...editing, text: e.target.value })}
                                                    className="w-full p-1 text-sm border rounded-md shadow-sm bg-[var(--background-tertiary)] border-[var(--border-color-strong)] text-[var(--text-primary)]"
                                                    autoFocus
                                                />
                                                <div className="flex items-center gap-2">
                                                    {(['high', 'medium', 'low'] as const).map(p => (
                                                        <button key={p} type="button" onClick={() => setEditing({ ...editing, priority: p })} className={`w-4 h-4 rounded-full border-2 ${editing.priority === p ? 'ring-2 ring-offset-1 ring-[var(--background-accent)]' : ''} ${priorityMap[p].color}`} aria-label={`${priorityMap[p].label} 우선순위`}></button>
                                                    ))}
                                                </div>
                                            </div>
                                            <div className="flex items-center shrink-0">
                                                <button onClick={handleSaveEdit} className="p-1 text-[var(--text-success)] hover:text-[var(--text-success)]/80"><CheckIcon className="h-5 w-5"/></button>
                                                <button onClick={handleCancelEdit} className="p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)]"><XIcon className="h-5 w-5"/></button>
                                            </div>
                                        </>
                                    ) : (
                                        <>
                                            <button onClick={() => onToggleTodo(todo.id)} className="flex items-center justify-center h-4 w-4 rounded-full border-2 border-[var(--border-color-strong)] mr-2 shrink-0">
                                                {todo.completed && <div className="w-2.5 h-2.5 bg-[var(--background-accent)] rounded-full"></div>}
                                            </button>
                                            <div className="flex-grow">
                                                <span className={`text-sm ${todo.completed ? 'line-through text-[var(--text-muted)]' : 'text-[var(--text-primary)]'}`}>{todo.text}</span>
                                                {showAll && <span className="text-xs text-[var(--text-muted)] ml-2">{todo.date}</span>}
                                            </div>
                                            <div className={`${priorityMap[todo.priority].color} h-3.5 w-1 rounded-full ml-2 shrink-0`}></div>
                                            <div className="flex items-center shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button onClick={() => handleStartEdit(todo)} className="p-1 text-[var(--text-muted)] hover:text-[var(--text-accent)]"><PencilIcon className="h-4 w-4"/></button>
                                                <button onClick={() => onDeleteTodo(todo.id)} className="p-1 text-[var(--text-muted)] hover:text-[var(--text-danger)]"><TrashIcon className="h-4 w-4"/></button>
                                            </div>
                                        </>
                                    )}
                                </li>
                            )})}
                        </ul>
                        {onShowMoreClick && (
                            <button onClick={onShowMoreClick} className="w-full mt-2 text-sm font-medium text-[var(--text-accent)] hover:underline">
                                전체보기
                            </button>
                        )}
                    </div>
                 ) : (
                    <div className="flex items-center justify-center h-full">
                        <p className="text-[var(--text-muted)] text-center text-sm py-4">할 일이 없습니다.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default TodoList;
