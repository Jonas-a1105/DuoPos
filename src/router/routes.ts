export const ROUTES = {
  LANDING: '/',
  LOGIN: '/login',
  DASHBOARD: '/',
  SALES: '/sales',
  INVENTORY: '/inventory',
  HISTORY: '/history',
  CUSTOMERS: '/customers',
  SETTINGS: '/settings',
  SHIFTS: '/shifts',
  LOGISTICS: '/logistics',
} as const;

export type AppRoute = (typeof ROUTES)[keyof typeof ROUTES];

export const ROLE_GUARDS: Record<string, string[]> = {
  [ROUTES.INVENTORY]: ['admin', 'supervisor'],
  [ROUTES.LOGISTICS]: ['admin', 'supervisor'],
  [ROUTES.SETTINGS]: ['admin'],
};
