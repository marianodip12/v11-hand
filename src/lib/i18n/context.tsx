import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from 'react';
import { DICTIONARIES, type Dict, type Locale } from './dict';

// ─── Persist locale in localStorage ─────────────────────────────────

const STORAGE_KEY = 'hp_locale';

const readLocale = (): Locale => {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (v === 'es' || v === 'en' || v === 'pt') return v;
  } catch { /* ignore */ }
  // Auto-detect from browser if no stored preference
  const lang = navigator.language?.slice(0, 2);
  if (lang === 'pt') return 'pt';
  if (lang === 'en') return 'en';
  return 'es';
};

const saveLocale = (l: Locale) => {
  try { localStorage.setItem(STORAGE_KEY, l); } catch { /* ignore */ }
};

// ─── Context ─────────────────────────────────────────────────────────

interface I18nContextValue {
  locale: Locale;
  t: Dict;
  setLocale: (l: Locale) => void;
}

const I18nContext = createContext<I18nContextValue | null>(null);

export const I18nProvider = ({ children }: { children: ReactNode }) => {
  const [locale, setLocaleState] = useState<Locale>(readLocale);

  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l);
    saveLocale(l);
  }, []);

  return (
    <I18nContext.Provider value={{ locale, t: DICTIONARIES[locale], setLocale }}>
      {children}
    </I18nContext.Provider>
  );
};

// ─── Hook ────────────────────────────────────────────────────────────

export const useI18n = (): I18nContextValue => {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used inside <I18nProvider>');
  return ctx;
};

/** Shorthand — most components only need the dict */
export const useT = (): Dict => useI18n().t;
