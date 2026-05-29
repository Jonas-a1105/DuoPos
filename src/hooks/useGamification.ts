import { useCallback } from 'react';
import { User } from '../types';
import { playSound } from '../services/sounds';
import { toast } from '../components/Modal/FlashNotifications';

const LEVEL_TITLES = [
  'Monolingüe Comercial 🦉',
  'Cajero de Bronce 🥉',
  'Supervisor de Rachas 🥈',
  'Experto en Finanzas 🥇',
  'Duo Maestro Glorioso 👑',
  'Dios del Escáner de Barras ⚡',
  'Socio Corporativo de Duo 💎',
];

interface LevelUpResult {
  user: User;
  didLevelUp: boolean;
  newLevel?: number;
  title?: string;
}

export function calculateXpGain(
  amount: number,
  options?: {
    boosterCharges?: number;
    isHappyHourActive?: boolean;
  },
): { xpGained: number; remainingBoosterCharges: number } {
  let xpGained = amount;
  let remainingBoosterCharges = options?.boosterCharges ?? 0;

  if (remainingBoosterCharges > 0) {
    xpGained = amount * 2;
    remainingBoosterCharges -= 1;
  }

  if (options?.isHappyHourActive) {
    xpGained *= 2;
  }

  return { xpGained, remainingBoosterCharges };
}

export function processLevelUp(user: User, xpGained: number): LevelUpResult {
  let updatedXp = user.xp + xpGained;
  let currentLevel = user.level;
  let title = user.levelTitle;
  let didLevelUp = false;

  let neededXp = currentLevel * 100;
  while (updatedXp >= neededXp) {
    updatedXp -= neededXp;
    currentLevel += 1;
    neededXp = currentLevel * 100;
    didLevelUp = true;
  }

  if (didLevelUp) {
    title = LEVEL_TITLES[Math.min(currentLevel - 1, LEVEL_TITLES.length - 1)];
  }

  return {
    user: {
      ...user,
      xp: updatedXp,
      level: currentLevel,
      levelTitle: title,
      weeklyXp: (user.weeklyXp ?? 0) + xpGained,
      seasonXp: (user.seasonXp ?? 0) + xpGained,
    },
    didLevelUp,
    newLevel: didLevelUp ? currentLevel : undefined,
    title: didLevelUp ? title : undefined,
  };
}

export function notifyXpResult(
  xpGained: number,
  levelUpResult: LevelUpResult,
  options?: { triggerHappyMood?: () => void },
) {
  if (levelUpResult.didLevelUp) {
    playSound('levelup');
    toast.achievement(`¡Subiste al nivel ${levelUpResult.newLevel}! Título: ${levelUpResult.title}`, {
      title: '¡NIVEL ALCANZADO! 🎉',
      duration: 8000,
    });
    options?.triggerHappyMood?.();
  } else if (xpGained > 0) {
    toast.info(`¡Ganaste +${xpGained} XP! Sigue así ⚡`, {
      title: 'XP Reincorporado',
      duration: 2500,
    });
  }
}

export function useGamification() {
  const grantXp = useCallback(
    (
      user: User,
      amount: number,
      options?: {
        boosterCharges?: number;
        isHappyHourActive?: boolean;
        onLevelUp?: (result: LevelUpResult) => void;
        onSaveUser?: (user: User) => void;
      },
    ) => {
      const { xpGained } = calculateXpGain(amount, options);
      const levelUpResult = processLevelUp(user, xpGained);
      notifyXpResult(xpGained, levelUpResult);
      options?.onLevelUp?.(levelUpResult);
      options?.onSaveUser?.(levelUpResult.user);
      return levelUpResult;
    },
    [],
  );

  return { grantXp };
}
