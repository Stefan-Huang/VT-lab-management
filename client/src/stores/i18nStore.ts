import { create } from 'zustand';
import type { Language } from '@shared/types';
import { zh } from '../i18n/zh';
import { en } from '../i18n/en';

const LANG_KEY = 'lab-i18n-lang';

const translations = { zh, en };

function getInitialLanguage(): Language {
  if (typeof window === 'undefined') return 'zh';
  const saved = localStorage.getItem(LANG_KEY);
  if (saved === 'zh' || saved === 'en') return saved;
  const browser = navigator.language.toLowerCase();
  return browser.startsWith('zh') ? 'zh' : 'en';
}

interface I18nState {
  lang: Language;
  t: (key: string, params?: Record<string, string | number>) => string;
  setLanguage: (lang: Language) => void;
}

export const useI18nStore = create<I18nState>((set, get) => ({
  lang: getInitialLanguage(),
  t: (key: string, params?: Record<string, string | number>) => {
    const { lang } = get();
    const dict = translations[lang] as Record<string, string>;
    let text = dict[key] ?? key;
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        text = text.replace(`{${k}}`, String(v));
      }
    }
    return text;
  },
  setLanguage: (lang: Language) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(LANG_KEY, lang);
    }
    set({ lang });
  },
}));

export function useTranslation(): {
  lang: Language;
  t: (key: string, params?: Record<string, string | number>) => string;
  setLanguage: (lang: Language) => void;
} {
  const { lang, t, setLanguage } = useI18nStore();
  return { lang, t, setLanguage };
}
