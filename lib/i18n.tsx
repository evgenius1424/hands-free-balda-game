"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import ru from "@/locales/ru.json";
import en from "@/locales/en.json";

type Locale = "ru" | "en";

type Messages = typeof ru;

const translations: Record<Locale, Messages> = { ru, en };

type I18nContextType = {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
  onLanguageChange: (callback: (newLocale: Locale) => void) => () => void;
  isHydrated: boolean;
};

const I18nContext = createContext<I18nContextType>({
  locale: "en",
  setLocale: () => {},
  t: (k) => k,
  onLanguageChange: () => () => {},
  isHydrated: false,
});

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocale] = useState<Locale>("en"); // Default to English for SSR
  const [isHydrated, setIsHydrated] = useState(false);
  const callbacksRef = useRef<Set<(newLocale: Locale) => void>>(new Set());

  // Hydration and locale detection
  useEffect(() => {
    setIsHydrated(true);

    try {
      // Check localStorage first (saved preference)
      const saved = localStorage.getItem("locale") as Locale | null;
      if (saved && saved in translations) {
        setLocale(saved);
        return;
      }
      // Fall back to browser language detection
      const browser = navigator.language.split("-")[0] as Locale | undefined;
      if (browser && browser in translations) {
        setLocale(browser);
        return;
      }
      // Keep default English if nothing else matches
    } catch {
      // Keep default English on any error
    }
  }, []);

  const changeLocale = (l: Locale) => {
    const previousLocale = locale;
    setLocale(l);
    try {
      localStorage.setItem("locale", l);
    } catch {}

    if (previousLocale !== l) {
      callbacksRef.current.forEach((callback) => callback(l));
    }
  };

  const onLanguageChange = (callback: (newLocale: Locale) => void) => {
    callbacksRef.current.add(callback);
    return () => {
      callbacksRef.current.delete(callback);
    };
  };

  const t = useMemo(() => {
    const interpolate = (
      template: string,
      vars?: Record<string, string | number>,
    ) => {
      if (!vars) return template;
      return template.replace(/\{(\w+)}/g, (_, name) =>
        Object.prototype.hasOwnProperty.call(vars, name)
          ? String(vars[name])
          : `{${name}}`,
      );
    };

    const getByPath = (obj: any, path: string): any => {
      return path
        .split(".")
        .reduce(
          (acc, part) => (acc && acc[part] != null ? acc[part] : undefined),
          obj,
        );
    };

    return (key: string, vars?: Record<string, string | number>) => {
      const msg = getByPath(translations[locale], key);
      if (typeof msg === "string") return interpolate(msg, vars);
      return key;
    };
  }, [locale]);

  const value = useMemo(
    () => ({
      locale,
      setLocale: changeLocale,
      t,
      onLanguageChange,
      isHydrated,
    }),
    [locale, t, isHydrated],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export const useI18n = () => useContext(I18nContext);
