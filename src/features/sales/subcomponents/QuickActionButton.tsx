import React from 'react';

interface QuickActionButtonProps {
  icon: string;
  label: string;
  shortcut?: string;
  onClick: () => void;
  color?: 'amber' | 'sky' | 'emerald' | 'purple' | 'rose';
  disabled?: boolean;
}

const colorStyles = {
  amber: 'bg-amber-50 hover:bg-amber-100 text-amber-700 border-amber-200',
  sky: 'bg-sky-50 hover:bg-sky-100 text-sky-700 border-sky-200',
  emerald: 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200',
  purple: 'bg-purple-50 hover:bg-purple-100 text-purple-700 border-purple-200',
  rose: 'bg-rose-50 hover:bg-rose-100 text-rose-700 border-rose-200',
};

export function QuickActionButton({
  icon,
  label,
  shortcut,
  onClick,
  color = 'sky',
  disabled = false,
}: QuickActionButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`py-2 px-1 border rounded-xl text-[9px] uppercase font-black cursor-pointer text-center
        flex flex-col items-center justify-center gap-1 transition-all active:translate-y-0.5
        ${disabled ? 'opacity-40 cursor-not-allowed' : colorStyles[color]}`}
    >
      <span>{icon}</span>
      <span>{label}</span>
      {shortcut && (
        <span className="text-[7px] opacity-60 font-mono">{shortcut}</span>
      )}
    </button>
  );
}
