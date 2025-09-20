"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import ru from "@/locales/ru.json";

type Locale = "ru";

type Messages = typeof ru;

const translations: Record<Locale, Messages> = { ru };

type I18nContextType = {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
};

const I18nContext = createContext<I18nContextType>({
  locale: "ru",
  setLocale: () => {},
  t: (k) => k,
});

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocale] = useState<Locale>("ru");

  useEffect(() => {
    try {
      const saved = (typeof window !== "undefined" &&
        localStorage.getItem("locale")) as Locale | null;
      if (saved && saved in translations) {
        setLocale(saved);
        return;
      }
      const browser = (typeof navigator !== "undefined" &&
        navigator.language.split("-")[0]) as Locale | undefined;
      if (browser && browser in translations) {
        setLocale(browser);
      }
    } catch {}
  }, []);

  const changeLocale = (l: Locale) => {
    setLocale(l);
    try {
      localStorage.setItem("locale", l);
    } catch {}
  };

  const t = useMemo(() => {
    const interpolate = (
      template: string,
      vars?: Record<string, string | number>,
    ) => {
      if (!vars) return template;
      return template.replace(/\{(\w+)\}/g, (_, name) =>
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
    () => ({ locale, setLocale: changeLocale, t }),
    [locale, t],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export const useI18n = () => useContext(I18nContext);
