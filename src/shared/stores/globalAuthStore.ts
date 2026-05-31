import { create } from 'zustand';
import type { User, UserRole } from '../../types';

interface GlobalAuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  role: UserRole | null;
  setUser: (user: User | null) => void;
  setToken: (token: string | null) => void;
  logout: () => void;
}

export const useGlobalAuthStore = create<GlobalAuthState>((set) => ({
  user: null,
  token: null,
  isAuthenticated: false,
  role: null,
  setUser: (user) =>
    set({
      user,
      isAuthenticated: !!user,
      role: user?.role ?? null,
    }),
  setToken: (token) => set({ token }),
  logout: () =>
    set({
      user: null,
      token: null,
      isAuthenticated: false,
      role: null,
    }),
}));
