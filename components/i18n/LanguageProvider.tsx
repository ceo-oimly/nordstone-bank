"use client";

import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { appTranslations, languageOptions, LanguageCode, translations } from "@/lib/languages";

type LanguageContextValue = { language: LanguageCode; locale: string; setLanguage: (language: LanguageCode) => void; t: (text: string) => string };
const LanguageContext = createContext<LanguageContextValue | null>(null);
const STORAGE_KEY = "nordstone-language";
const validLanguage = (code: string): code is LanguageCode => languageOptions.some((language) => language.code === code);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<LanguageCode>("en");
  useEffect(() => {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved && validLanguage(saved)) setLanguageState(saved);
  }, []);

  const setLanguage = useCallback((next: LanguageCode) => {
    setLanguageState(next);
    window.localStorage.setItem(STORAGE_KEY, next);
  }, []);

  const selected = languageOptions.find((option) => option.code === language) ?? languageOptions[0];
  useEffect(() => {
    document.documentElement.lang = selected.locale;
    document.documentElement.dir = selected.direction;
  }, [selected]);

  const value = useMemo<LanguageContextValue>(() => ({
    language,
    locale: selected.locale,
    setLanguage,
    t: (text: string) => appTranslations[language][text] ?? translations[language][text] ?? text,
  }), [language, selected.locale, setLanguage]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const value = useContext(LanguageContext);
  if (!value) throw new Error("useLanguage must be used inside LanguageProvider");
  return value;
}
