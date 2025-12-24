
import React from 'react';

interface SpinnerProps {
    small?: boolean;
}

const Spinner: React.FC<SpinnerProps> = ({ small = false }) => {
  const sizeClasses = small ? 'h-5 w-5' : 'h-8 w-8';
  return (
    <div className={`animate-spin rounded-full ${sizeClasses} border-t-2 border-b-2 border-[var(--background-accent)]`}></div>
  );
};

export default Spinner;