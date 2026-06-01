import { useCallback } from 'react';

export function useExpressEvents() {
  const activeEvent = null;

  const triggerEventProgress = useCallback(
    (type: 'scan' | 'loyalty' | 'sale', onSaveUser?: (user: any) => void, user?: any) => {
      // No-op - gamification disabled
    },
    [],
  );

  const triggerExpressEvent = useCallback(
    (type: 'happy_hour' | 'scan_challenge' | 'loyalty_challenge') => {
      // No-op - gamification disabled
    },
    [],
  );

  return {
    activeEvent,
    triggerEventProgress,
    triggerExpressEvent,
  };
}

