import { create } from 'zustand';
import type { LabUser } from '@shared/types';

interface AuthState {
  user: LabUser | null;
  isLoading: boolean;
  setUser: (user: LabUser | null) => void;
  setLoading: (loading: boolean) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: true,
  setUser: (user) => set({ user, isLoading: false }),
  setLoading: (isLoading) => set({ isLoading }),
  logout: () => set({ user: null, isLoading: false }),
}));
