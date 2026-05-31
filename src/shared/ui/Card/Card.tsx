import React from 'react';

export interface CardProps {
  children: React.ReactNode;
  className?: string;
  padding?: boolean;
  onClick?: () => void;
}

export function Card({ children, className = '', padding = true, onClick }: CardProps) {
  return (
    <div
      onClick={onClick}
      className={`bg-white border-2 border-[#e5e5e5] border-b-[6px] rounded-3xl shadow-sm
        ${padding ? 'p-5' : ''}
        ${onClick ? 'cursor-pointer hover:border-[#58cc02] active:translate-y-[2px] active:border-b-0 transition-all' : ''}
        ${className}`}
    >
      {children}
    </div>
  );
}
