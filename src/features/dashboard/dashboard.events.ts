import { globalEventBus } from '../../shared/events/EventBus';

export const DASHBOARD_EVENTS = {
  DASHBOARD_REFRESH: 'dashboard:dashboard_refresh',
} as const;

export interface DashboardRefreshPayload {
  reason: string;
  timestamp: string;
}

export function emitDashboardRefresh(reason: string): void {
  globalEventBus.publish<DashboardRefreshPayload>(DASHBOARD_EVENTS.DASHBOARD_REFRESH, {
    reason,
    timestamp: new Date().toISOString(),
  });
}
