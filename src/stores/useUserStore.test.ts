// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useUserStore } from './useUserStore';

vi.mock('../services/sounds', () => ({
  playSound: vi.fn(),
}));

vi.mock('../services/db', () => {
  const mockGenericStore = {
    get: vi.fn(() => Promise.resolve(null)),
    put: vi.fn(() => Promise.resolve()),
    delete: vi.fn(() => Promise.resolve()),
  };
  return {
    db: {
      generic_store: mockGenericStore,
    },
  };
});

vi.mock('../components/Modal/FlashNotifications', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
    achievement: vi.fn(),
  },
  FlashNotifications: () => null,
}));

vi.mock('../config/supabaseClient', () => ({
  supabase: {
    from: vi.fn(() => ({
      update: vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({ data: null, error: null })),
      })),
    })),
  },
  isSupabaseConfigured: vi.fn(() => false),
}));

const store: Record<string, string> = {};
const localStorageMock = {
  getItem: vi.fn((key: string) => store[key] || null),
  setItem: vi.fn((key: string, value: string) => {
    store[key] = value.toString();
  }),
  removeItem: vi.fn((key: string) => {
    delete store[key];
  }),
  clear: vi.fn(() => {
    for (const key in store) delete store[key];
  }),
  length: 0,
  key: vi.fn((index: number) => Object.keys(store)[index] || null),
};
vi.stubGlobal('localStorage', localStorageMock);

describe('useUserStore Unit Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.clear();
  });

  it('debe inicializar el estado del usuario por defecto en nulo', () => {
    const state = useUserStore.getState();
    expect(state.user).toBeNull();
  });

  it('debe actualizar el usuario correctamente con setUser', () => {
    const mockUser = {
      id: 'user-123',
      username: 'Jonas Test',
      email: 'jonas@test.com',
      avatar: 'duo',
      streak: 5,
      xp: 50,
      level: 1,
      dailyGoal: 100,
      levelTitle: 'Monolingüe Comercial 🦉',
    };

    useUserStore.getState().setUser(mockUser);
    expect(useUserStore.getState().user).toEqual(mockUser);
  });

  it('debe calcular correctamente la subida de nivel al otorgar XP suficiente', async () => {
    const mockUser = {
      id: 'user-123',
      username: 'Jonas Test',
      email: 'jonas@test.com',
      avatar: 'duo',
      streak: 5,
      xp: 80,
      level: 1,
      dailyGoal: 100,
      levelTitle: 'Monolingüe Comercial 🦉',
      weeklyXp: 0,
      seasonXp: 0,
    };

    useUserStore.getState().setUser(mockUser);

    await useUserStore.getState().grantXp(30);

    const updatedUser = useUserStore.getState().user;
    expect(updatedUser?.level).toBe(2);
    expect(updatedUser?.xp).toBe(10);
    expect(updatedUser?.levelTitle).toBe('Cajero de Bronce 🥉');
  });
});
