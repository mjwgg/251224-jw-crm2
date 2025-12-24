import React, { useState } from 'react';
import { SearchIcon } from './icons';
import Spinner from './ui/Spinner';

interface GlobalSearchBarProps {
  onSearch: (query: string) => void;
  isSearching: boolean;
}

const GlobalSearchBar: React.FC<GlobalSearchBarProps> = ({ onSearch, isSearching }) => {
  const [query, setQuery] = useState('');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      onSearch(query.trim());
    }
  };

  return (
    <form onSubmit={handleSearch} className="relative w-full">
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="통합 검색..."
        className="w-full pl-4 pr-12 py-2 border border-[var(--border-color-strong)] rounded-full bg-[var(--background-tertiary)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--background-accent)] focus:border-transparent text-base"
        disabled={isSearching}
        aria-label="통합 검색"
      />
      <button
        type="submit"
        disabled={isSearching || !query.trim()}
        className="absolute inset-y-0 right-0 flex items-center justify-center w-12 h-full text-[var(--text-muted)] rounded-full hover:bg-[var(--background-primary)] disabled:opacity-50"
        aria-label="검색 실행"
      >
        {isSearching ? <Spinner small /> : <SearchIcon className="h-6 w-6 text-[var(--text-accent)]" />}
      </button>
    </form>
  );
};

export default GlobalSearchBar;