import React, { useState, useEffect } from 'react';
import { playSound } from '../../../services/audio/soundService';
import { toast } from '../../../shared/ui';

interface PinLockModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  requiredRole: 'supervisor' | 'admin';
}

export default function PinLockModal({ isOpen, onClose, onSuccess, requiredRole }: PinLockModalProps) {
  const [pin, setPin] = useState<string>('');
  const [isShaking, setIsShaking] = useState<boolean>(false);

  const getTargetPin = (): string => {
    if (requiredRole === 'admin') {
      return localStorage.getItem('duo_pos_pin_admin') || '1919';
    }
    return localStorage.getItem('duo_pos_pin_supervisor') || '1234';
  };

  useEffect(() => {
    if (isOpen) {
      setPin('');
      setIsShaking(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleKeyPress = (num: string) => {
    playSound('click');
    if (pin.length < 4) {
      const nextPin = pin + num;
      setPin(nextPin);
      if (nextPin.length === 4) {
        handleValidate(nextPin);
      }
    }
  };

  const handleBackspace = () => {
    playSound('click');
    setPin(pin.slice(0, -1));
  };

  const handleClear = () => {
    playSound('click');
    setPin('');
  };

  const handleValidate = (inputPin: string) => {
    const targetPin = getTargetPin();
    const adminPin = localStorage.getItem('duo_pos_pin_admin') || '1919';
    const isValid = inputPin === targetPin || (requiredRole === 'supervisor' && inputPin === adminPin);

    if (isValid) {
      playSound('success');
      toast.success(`Acceso Autorizado como ${requiredRole === 'admin' ? 'Administrador 👑' : 'Supervisor ⚡'}`, {
        title: 'Verificación Exitosa'
      });
      onSuccess();
    } else {
      playSound('error');
      setIsShaking(true);
      toast.error('El PIN ingresado es incorrecto. Inténtalo de nuevo.', {
        title: 'Acceso Denegado 🔒'
      });
      setTimeout(() => {
        setIsShaking(false);
        setPin('');
      }, 600);
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (/[0-9]/.test(e.key)) {
        handleKeyPress(e.key);
      } else if (e.key === 'Backspace') {
        handleBackspace();
      } else if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, pin]);

  const activeSkin = localStorage.getItem('duo_pos_active_user') 
    ? JSON.parse(localStorage.getItem('duo_pos_active_user')!).activeSkin || 'standard'
    : 'standard';
  const isDark = ['dark-galaxy', 'neon-cyberpunk', 'emerald-palace', 'retro-8bit', 'executive-gold', 'deep-ocean'].includes(activeSkin);

  return (
    <div className="fixed inset-0 z-50 bg-[#141414]/75 backdrop-blur-xs flex items-center justify-center p-4">
      <div 
        className={`max-w-xs w-full border-2 border-b-[8px] rounded-3xl p-5 text-center space-y-4 shadow-2xl transition-all duration-300 ${
          isDark 
            ? 'bg-zinc-900 border-zinc-800 text-zinc-100' 
            : 'bg-white border-gray-250 text-gray-800'
        } ${isShaking ? 'animate-bounce' : 'animate-scaleUp'}`}
        style={isShaking ? { animation: 'shake 0.5s ease-in-out' } : {}}
      >
        <div className="text-5xl text-amber-500 select-none animate-pulse">🔒</div>
        <div className="space-y-1">
          <h3 className="text-xl font-black tracking-tight uppercase">
            PIN Requerido
          </h3>
          <p className={`text-xs font-bold leading-normal ${isDark ? 'text-zinc-400' : 'text-gray-500'}`}>
            Ingresa el PIN de seguridad de{' '}
            <span className={`px-2 py-0.5 rounded-lg border uppercase text-[10px] font-black tracking-wider ${
              requiredRole === 'admin' 
                ? 'bg-purple-100 dark:bg-purple-950 border-purple-200 dark:border-purple-900 text-purple-700 dark:text-purple-300'
                : 'bg-amber-100 dark:bg-amber-950 border-amber-200 dark:border-amber-900 text-amber-700 dark:text-amber-300'
            }`}>
              {requiredRole === 'admin' ? 'Admin 👑' : 'Supervisor ⚡'}
            </span>
          </p>
        </div>
        <div className="flex justify-center gap-4 py-2.5">
          {[0, 1, 2, 3].map((idx) => (
            <div
              key={idx}
              className={`h-5 w-5 rounded-full border-2 transition-all duration-200 ${
                pin.length > idx
                  ? 'bg-indigo-500 border-indigo-600 scale-110 shadow-sm shadow-indigo-300'
                  : isDark 
                    ? 'bg-zinc-950 border-zinc-800' 
                    : 'bg-gray-150 border-gray-250'
              }`}
            />
          ))}
        </div>
        <div className="grid grid-cols-3 gap-2 px-1">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((num) => (
            <button
              key={num}
              type="button"
              onClick={() => handleKeyPress(num)}
              disabled={pin.length >= 4}
              className={`h-11 font-mono font-black text-lg border-2 border-b-4 rounded-2xl transition-all active:translate-y-0.5 active:border-b-2 flex items-center justify-center cursor-pointer ${
                isDark 
                  ? 'bg-zinc-850 hover:bg-zinc-800 border-zinc-800 hover:border-zinc-700 text-zinc-150 active:border-b-2' 
                  : 'bg-white hover:bg-gray-50 border-gray-200 text-gray-700'
              }`}
            >
              {num}
            </button>
          ))}
          <button
            type="button"
            onClick={handleClear}
            className={`h-11 font-extrabold text-[10px] border-2 border-b-4 rounded-2xl transition-all active:translate-y-0.5 active:border-b-2 flex items-center justify-center cursor-pointer uppercase ${
              isDark 
                ? 'bg-zinc-800 hover:bg-zinc-750 border-zinc-750 text-zinc-400 active:border-b-2' 
                : 'bg-gray-100 hover:bg-gray-150 border-gray-200 text-gray-500'
            }`}
          >
            Limpiar
          </button>
          <button
            type="button"
            onClick={() => handleKeyPress('0')}
            disabled={pin.length >= 4}
            className={`h-11 font-mono font-black text-lg border-2 border-b-4 rounded-2xl transition-all active:translate-y-0.5 active:border-b-2 flex items-center justify-center cursor-pointer ${
              isDark 
                ? 'bg-zinc-850 hover:bg-zinc-800 border-zinc-800 hover:border-zinc-700 text-zinc-150 active:border-b-2' 
                : 'bg-white hover:bg-gray-50 border-gray-200 text-gray-700'
            }`}
          >
            0
          </button>
          <button
            type="button"
            onClick={handleBackspace}
            className={`h-11 font-extrabold text-[10px] border-2 border-b-4 rounded-2xl transition-all active:translate-y-0.5 active:border-b-2 flex items-center justify-center cursor-pointer uppercase ${
              isDark 
                ? 'bg-zinc-850 hover:bg-zinc-800 border-zinc-800 hover:border-zinc-705 text-zinc-450 active:border-b-2' 
                : 'bg-gray-100 hover:bg-gray-150 border-gray-200 text-gray-505'
            }`}
          >
            ⌫
          </button>
        </div>
        <div className="pt-2">
          <button
            type="button"
            onClick={() => {
              playSound('click');
              onClose();
            }}
            className={`w-full py-2 border-2 border-b-4 font-black text-xs rounded-2xl cursor-pointer uppercase transition-all active:translate-y-0.5 active:border-b-2 ${
              isDark 
                ? 'bg-zinc-900 hover:bg-zinc-850 border-zinc-800 text-zinc-400 active:border-b-2' 
                : 'bg-white hover:bg-gray-50 border-gray-200 text-gray-500'
            }`}
          >
            Cancelar
          </button>
        </div>
      </div>
      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          10%, 30%, 50%, 70%, 90% { transform: translateX(-6px); }
          20%, 40%, 60%, 80% { transform: translateX(6px); }
        }
      `}</style>
    </div>
  );
}
