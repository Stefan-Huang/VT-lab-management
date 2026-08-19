import { create } from 'zustand';
import type { PersonalApiConfig } from '@shared/types';

const CONFIG_KEY = 'lab-personal-api-config';

function loadConfig(): PersonalApiConfig {
  if (typeof window === 'undefined') {
    return { apiBaseUrl: '', apiKey: '', modelName: '', preferred: false };
  }
  try {
    const raw = localStorage.getItem(CONFIG_KEY);
    if (raw) return JSON.parse(raw) as PersonalApiConfig;
  } catch {
    /* ignore */
  }
  return { apiBaseUrl: '', apiKey: '', modelName: '', preferred: false };
}

interface ApiConfigState extends PersonalApiConfig {
  saveConfig: (config: Partial<PersonalApiConfig>) => void;
  togglePreferred: () => void;
}

export const useApiConfigStore = create<ApiConfigState>((set, get) => ({
  ...loadConfig(),
  saveConfig: (config) => {
    const next = { ...get(), ...config };
    if (typeof window !== 'undefined') {
      localStorage.setItem(CONFIG_KEY, JSON.stringify(next));
    }
    set(next);
  },
  togglePreferred: () => {
    const next = { ...get(), preferred: !get().preferred };
    if (typeof window !== 'undefined') {
      localStorage.setItem(CONFIG_KEY, JSON.stringify(next));
    }
    set(next);
  },
}));
