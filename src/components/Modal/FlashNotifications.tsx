import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle2, XCircle, Info, AlertTriangle, Sparkles, X } from 'lucide-react';

export interface FlashNotification {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info' | 'warning' | 'achievement';
  title?: string;
  duration?: number;
}

// Global hook/trigger listeners
let flashListeners: Array<(notification: FlashNotification) => void> = [];

export const toast = {
  success: (message: string, options?: { title?: string; duration?: number }) => {
    dispatchFlash({ id: Math.random().toString(), message, type: 'success', ...options });
  },
  error: (message: string, options?: { title?: string; duration?: number }) => {
    dispatchFlash({ id: Math.random().toString(), message, type: 'error', ...options });
  },
  info: (message: string, options?: { title?: string; duration?: number }) => {
    dispatchFlash({ id: Math.random().toString(), message, type: 'info', ...options });
  },
  warning: (message: string, options?: { title?: string; duration?: number }) => {
    dispatchFlash({ id: Math.random().toString(), message, type: 'warning', ...options });
  },
  achievement: (message: string, options?: { title?: string; duration?: number }) => {
    dispatchFlash({ id: Math.random().toString(), message, type: 'achievement', ...options });
  }
};

const dispatchFlash = (n: FlashNotification) => {
  flashListeners.forEach(listener => listener(n));
};

// Make it globally accessible to non-React parts or quick legacy scripts
if (typeof window !== 'undefined') {
  
}

export function FlashNotifications() {
  const [notifications, setNotifications] = useState<FlashNotification[]>([]);

  useEffect(() => {
    const handleAdd = (notification: FlashNotification) => {
      setNotifications(prev => [notification, ...prev]);
    };

    flashListeners.push(handleAdd);

    // Global CustomEvent listener as backup/robust integration
    const handleEvent = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail && detail.message) {
        handleAdd({
          id: detail.id || Math.random().toString(),
          message: detail.message,
          type: detail.type || 'info',
          title: detail.title,
          duration: detail.duration
        });
      }
    };

    window.addEventListener('show-flash', handleEvent);

    return () => {
      flashListeners = flashListeners.filter(l => l !== handleAdd);
      window.removeEventListener('show-flash', handleEvent);
    };
  }, []);

  const handleDismiss = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  return (
    <div className="fixed top-4 right-4 z-[9999] pointer-events-none w-full max-w-sm flex flex-col gap-3 px-4 sm:px-0">
      <AnimatePresence>
        {notifications.map((n) => (
          <NotificationCard key={n.id} notification={n} onDismiss={handleDismiss} />
        ))}
      </AnimatePresence>
    </div>
  );
}

function NotificationCard({
  notification,
  onDismiss
}: {
  notification: FlashNotification;
  onDismiss: (id: string) => void;
  key?: React.Key;
}) {
  const { id, message, type, title, duration = 4000 } = notification;

  useEffect(() => {
    const timer = setTimeout(() => {
      onDismiss(id);
    }, duration);
    return () => clearTimeout(timer);
  }, [id, duration, onDismiss]);

  // Color mappings matching Duolingo style guides
  const config = {
    success: {
      bg: 'bg-[#eefcf2]',
      border: 'border-[#58cc02] border-b-[5px]',
      text: 'text-[#1c7b01]',
      titleColor: 'text-[#2b8a0e]',
      icon: <CheckCircle2 className="text-[#58cc02]" size={22} />,
      emoji: '🦉'
    },
    error: {
      bg: 'bg-[#ffedf0]',
      border: 'border-[#ff4b4b] border-b-[5px]',
      text: 'text-[#bd1616]',
      titleColor: 'text-[#ea2b2b]',
      icon: <XCircle className="text-[#ff4b4b]" size={22} />,
      emoji: '😢'
    },
    warning: {
      bg: 'bg-[#fff5e6]',
      border: 'border-[#ff9600] border-b-[5px]',
      text: 'text-[#a66200]',
      titleColor: 'text-[#e67e22]',
      icon: <AlertTriangle className="text-[#ff9600]" size={22} />,
      emoji: '⚡'
    },
    info: {
      bg: 'bg-[#e6f7ff]',
      border: 'border-[#1cb0f6] border-b-[5px]',
      text: 'text-[#005c8a]',
      titleColor: 'text-[#1cb0f6]',
      icon: <Info className="text-[#1cb0f6]" size={22} />,
      emoji: '💡'
    },
    achievement: {
      bg: 'bg-[#f7f0ff]',
      border: 'border-[#8e44ad] border-b-[5px]',
      text: 'text-[#5a008a]',
      titleColor: 'text-[#8e44ad]',
      icon: <Sparkles className="text-[#9b59b6] animate-pulse" size={22} />,
      emoji: '🏆'
    }
  }[type];

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.85, transition: { duration: 0.15 } }}
      transition={{ type: 'spring', stiffness: 380, damping: 26 }}
      className={`pointer-events-auto w-full select-none rounded-2xl p-4 flex gap-3 shadow-md border-2 border-[#e5e5e5] ${config.bg} ${config.border} relative overflow-hidden`}
    >
      <div className="flex-shrink-0 flex items-center justify-center text-2xl w-9 h-9 bg-white/70 rounded-full border border-gray-150 relative">
        <span className="absolute animate-pulse text-[14px] top-[-6px] right-[-6px]">{config.emoji}</span>
        {config.icon}
      </div>

      <div className="flex-1 text-left">
        {title ? (
          <h4 className={`text-xs font-black uppercase tracking-wider ${config.titleColor} leading-tight`}>
            {title}
          </h4>
        ) : (
          <h4 className={`text-xs font-black uppercase tracking-wider ${config.titleColor} leading-tight`}>
            {type === 'achievement' ? '¡Logro Desbloqueado!' : type === 'success' ? 'Éxito' : type === 'warning' ? 'Aviso Importante' : 'Notificación'}
          </h4>
        )}
        <p className={`text-sm font-extrabold mt-0.5 leading-snug ${config.text}`}>
          {message}
        </p>
      </div>

      <button
        type="button"
        onClick={() => onDismiss(id)}
        className="text-gray-400 hover:text-gray-600 transition-colors h-fit p-1 rounded-lg hover:bg-black/5"
      >
        <X size={14} />
      </button>

      {/* Mini Progress Timer Indicator of Duolingo layout */}
      <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-black/5">
        <motion.div
          initial={{ width: '100%' }}
          animate={{ width: '0%' }}
          transition={{ duration: duration / 1000, ease: 'linear' }}
          className={`h-full ${
            type === 'success' ? 'bg-[#58cc02]' :
            type === 'error' ? 'bg-[#ff4b4b]' :
            type === 'warning' ? 'bg-[#ff9600]' :
            type === 'info' ? 'bg-[#1cb0f6]' : 'bg-[#8e44ad]'
          }`}
        />
      </div>
    </motion.div>
  );
}
