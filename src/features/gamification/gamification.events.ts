import { globalEventBus } from '../../shared/events/EventBus';

export const GAMIFICATION_EVENTS = {
  XP_EARNED: 'gamification:xp_earned',
  LEVEL_UP: 'gamification:level_up',
  GEMS_CHANGED: 'gamification:gems_changed',
  LEAGUE_CHANGED: 'gamification:league_changed',
} as const;

export interface XpEarnedPayload {
  userId: string;
  username: string;
  xpGained: number;
  totalXp: number;
  source: string;
}

export interface LevelUpPayload {
  userId: string;
  username: string;
  previousLevel: number;
  newLevel: number;
  levelTitle: string;
}

export interface GemsChangedPayload {
  userId: string;
  username: string;
  previousGems: number;
  newGems: number;
  difference: number;
  source: string;
}

export interface LeagueChangedPayload {
  userId: string;
  username: string;
  previousLeague: string;
  newLeague: string;
}

export function emitXpEarned(payload: XpEarnedPayload): void {
  globalEventBus.publish<XpEarnedPayload>(GAMIFICATION_EVENTS.XP_EARNED, payload);
}

export function emitLevelUp(payload: LevelUpPayload): void {
  globalEventBus.publish<LevelUpPayload>(GAMIFICATION_EVENTS.LEVEL_UP, payload);
}

export function emitGemsChanged(payload: GemsChangedPayload): void {
  globalEventBus.publish<GemsChangedPayload>(GAMIFICATION_EVENTS.GEMS_CHANGED, payload);
}

export function emitLeagueChanged(payload: LeagueChangedPayload): void {
  globalEventBus.publish<LeagueChangedPayload>(GAMIFICATION_EVENTS.LEAGUE_CHANGED, payload);
}
