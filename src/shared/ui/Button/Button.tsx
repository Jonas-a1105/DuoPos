import React from 'react';

export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost' | 'success';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  isLoading?: boolean;
  fullWidth?: boolean;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    'bg-[#1cb0f6] text-white border-b-4 border-[#1899d6] hover:bg-[#34beff] active:translate-y-[2px] active:border-b-0',
  secondary: 'bg-white text-gray-700 border-2 border-gray-200 border-b-4 hover:bg-gray-50 active:translate-y-[2px] active:border-b-0',
  danger: 'bg-red-500 text-white border-b-4 border-red-700 hover:bg-red-600 active:translate-y-[2px] active:border-b-0',
  ghost: 'bg-transparent text-gray-600 hover:bg-gray-100 border-2 border-transparent',
  success:
    'bg-[#58cc02] text-white border-b-4 border-[#46a302] hover:bg-[#61e002] active:translate-y-[2px] active:border-b-0',
};

export function Button({
  variant = 'primary',
  isLoading = false,
  fullWidth = false,
  children,
  className = '',
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      className={`font-black text-xs uppercase rounded-xl px-4 py-2.5 cursor-pointer select-none transition-all
        ${variantStyles[variant]}
        ${fullWidth ? 'w-full' : ''}
        ${disabled || isLoading ? 'opacity-50 cursor-not-allowed' : ''}
        ${className}`}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? 'Cargando...' : children}
    </button>
  );
}
