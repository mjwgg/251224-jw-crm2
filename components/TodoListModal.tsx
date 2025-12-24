import React from 'react';
import type { Todo } from '../types';
import BaseModal from './ui/BaseModal';
import TodoList from './TodoList';
import { XIcon } from './icons';

interface TodoListModalProps {
  isOpen: boolean;
  onClose: () => void;
  todos: Todo[];
  onAddTodo: (text: string, priority: Todo['priority'], date?: string) => void;
  onToggleTodo: (id: string) => void;
  onDeleteTodo: (id: string) => void;
  onUpdateTodo: (id: string, data: { text: string; priority: Todo['priority'] }) => void;
}

const TodoListModal: React.FC<TodoListModalProps> = ({ isOpen, onClose, todos, onAddTodo, onToggleTodo, onDeleteTodo, onUpdateTodo }) => {
  if (!isOpen) return null;

  return (
    <BaseModal isOpen={isOpen} onClose={onClose} className="max-w-2xl w-full h-[80vh] flex flex-col">
      <div className="p-4 border-b border-[var(--border-color)] flex justify-between items-center flex-shrink-0">
        <h2 className="text-xl font-bold text-[var(--text-primary)]">전체 할 일 목록</h2>
        <button onClick={onClose} className="text-[var(--text-muted)] hover:text-[var(--text-primary)]">
          <XIcon className="h-6 w-6" />
        </button>
      </div>
      <div className="p-4 flex-1 min-h-0">
        <TodoList
          todos={todos}
          onAddTodo={onAddTodo}
          onToggleTodo={onToggleTodo}
          onDeleteTodo={onDeleteTodo}
          onUpdateTodo={onUpdateTodo}
          showAll={true}
          title=""
        />
      </div>
    </BaseModal>
  );
};

export default TodoListModal;
