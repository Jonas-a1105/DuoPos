import { globalEventBus } from '../../shared/events/EventBus';

export const AUTH_EVENTS = {
  USER_LOGIN: 'auth:user_login',
  USER_LOGOUT: 'auth:user_logout',
} as const;

export function emitUserLogin(userId: string, username: string): void {
  globalEventBus.publish(AUTH_EVENTS.USER_LOGIN, { userId, username });
}

export function emitUserLogout(userId: string): void {
  globalEventBus.publish(AUTH_EVENTS.USER_LOGOUT, { userId });
}
