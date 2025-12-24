
import React from 'react';
import { XIcon } from '../icons';

interface TagProps {
  label: string;
  onRemove?: () => void;
}

const Tag: React.FC<TagProps> = ({ label, onRemove }) => {
  return (
    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
      {label}
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          className="flex-shrink-0 ml-1.5 h-4 w-4 rounded-full inline-flex items-center justify-center text-indigo-400 hover:bg-indigo-200 hover:text-indigo-500 focus:outline-none focus:bg-indigo-500 focus:text-white"
        >
          <span className="sr-only">Remove {label}</span>
          <XIcon className="h-3 w-3" />
        </button>
      )}
    </span>
  );
};

export default Tag;
