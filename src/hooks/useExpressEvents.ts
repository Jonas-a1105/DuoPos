import { useEffect, useCallback } from 'react';
import { ExpressEvent } from '../types';
import { useInventoryStore } from '../stores/useInventoryStore';
import { toast } from '../components/Modal/FlashNotifications';
import { playSound } from '../services/sounds';

export function useExpressEvents() {
  const activeEvent = useInventoryStore((s) => s.activeEvent);
  const setActiveEvent = useInventoryStore((s) => s.setActiveEvent);

  // Timer effect for active express events
  useEffect(() => {
    if (!activeEvent) return;
    const interval = setInterval(() => {
      if (activeEvent.remainingSeconds <= 1) {
        toast.info(`El evento "${activeEvent.title}" ha finalizado sin completarse.`, {
          title: 'Reto Express Expirado ⏰',
        });
        setActiveEvent(null);
      } else {
        setActiveEvent({
          ...activeEvent,
          remainingSeconds: activeEvent.remainingSeconds - 1,
        });
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [activeEvent, setActiveEvent]);

  const triggerEventProgress = useCallback(
    (type: 'scan' | 'loyalty' | 'sale', onSaveUser?: (user: any) => void, user?: any) => {
      if (!activeEvent) return;

      if (
        (type === 'scan' && activeEvent.type === 'scan_challenge') ||
        (type === 'loyalty' && activeEvent.type === 'loyalty_challenge')
      ) {
        const nextCount = activeEvent.currentCount + 1;
        if (nextCount >= activeEvent.targetCount) {
          playSound('levelup');
          toast.achievement(`¡RETO CUMPLIDO! 🏆 Ganaste +${activeEvent.gemsReward} gemas por "${activeEvent.title}".`, {
            title: 'Reto Express Completado 🎉',
            duration: 6000,
          });
          if (user) {
            const updatedUser = {
              ...user,
              gems: (user.gems ?? 40) + activeEvent.gemsReward,
              gemsEarnedTotal: (user.gemsEarnedTotal ?? 40) + activeEvent.gemsReward,
            };
            onSaveUser?.(updatedUser);
          }
          setActiveEvent(null);
        } else {
          setActiveEvent({
            ...activeEvent,
            currentCount: nextCount,
          });
        }
      }
    },
    [activeEvent, setActiveEvent],
  );

  const triggerExpressEvent = useCallback(
    (type: 'happy_hour' | 'scan_challenge' | 'loyalty_challenge') => {
      playSound('levelup');
      const now = Date.now();
      let newEvent: ExpressEvent;

      switch (type) {
        case 'happy_hour':
          newEvent = {
            id: `event-${now}`,
            type: 'happy_hour',
            title: 'Hora Feliz de Ventas ⚡',
            description:
              '¡Doble XP en todas las ventas concretadas durante los próximos 5 minutos! Acelera el paso y factura ya.',
            durationSeconds: 300,
            remainingSeconds: 300,
            gemsReward: 0,
            targetCount: 0,
            currentCount: 0,
            expiresAt: now + 300 * 1000,
          };
          break;
        case 'scan_challenge':
          newEvent = {
            id: `event-${now}`,
            type: 'scan_challenge',
            title: 'Reto Express de Escaneo 🔍',
            description: 'Escanear 2 productos en menos de 60 segundos para obtener un bono de 20 gemas extra.',
            durationSeconds: 60,
            remainingSeconds: 60,
            gemsReward: 20,
            targetCount: 2,
            currentCount: 0,
            expiresAt: now + 60 * 1000,
          };
          break;
        default:
          newEvent = {
            id: `event-${now}`,
            type: 'loyalty_challenge',
            title: 'Fidelización Relámpago 🤝',
            description:
              'Registrar o asociar un cliente en Duo loyalty en menos de 3 minutos para ganar 20 gemas de inmediato.',
            durationSeconds: 180,
            remainingSeconds: 180,
            gemsReward: 20,
            targetCount: 1,
            currentCount: 0,
            expiresAt: now + 180 * 1000,
          };
      }

      setActiveEvent(newEvent);
      toast.achievement(`¡EVENTO EXPRESS INICIADO! ⚡ "${newEvent.title}" está activo.`, {
        title: 'Reto de Duo Activo 🦉',
        duration: 5000,
      });
    },
    [setActiveEvent],
  );

  return {
    activeEvent,
    triggerEventProgress,
    triggerExpressEvent,
  };
}
