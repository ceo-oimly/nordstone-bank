"use client";

import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { appTranslations, languageOptions, LanguageCode, translations } from "@/lib/languages";

type LanguageContextValue = {
  language: LanguageCode;
  locale: string;
  setLanguage: (language: LanguageCode) => void;
  t: (text: string) => string;
  isModalOpen: boolean;
  openModal: () => void;
  closeModal: () => void;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);
const STORAGE_KEY = "nordstone-language";

const validLanguage = (code: string): code is LanguageCode =>
  languageOptions.some((language) => language.code === code);

function readPersistedLanguage(): LanguageCode {
  if (typeof window === "undefined") return "en";
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved && validLanguage(saved)) return saved;
    const cookieMatch = document.cookie.match(/(?:^|;\s*)nordstone-language=([^;]+)/);
    if (cookieMatch && validLanguage(cookieMatch[1])) return cookieMatch[1];
  } catch {}
  return "en";
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<LanguageCode>("en");
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    const initial = readPersistedLanguage();
    if (initial !== "en") {
      setLanguageState(initial);
    }
  }, []);

  const setLanguage = useCallback((next: LanguageCode) => {
    setLanguageState(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
      document.cookie = `${STORAGE_KEY}=${next}; path=/; max-age=31536000; SameSite=Lax`;
      window.dispatchEvent(new CustomEvent("nordstone-language-change", { detail: next }));
    } catch {}
  }, []);

  const openModal = useCallback(() => setIsModalOpen(true), []);
  const closeModal = useCallback(() => setIsModalOpen(false), []);

  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && e.newValue && validLanguage(e.newValue)) {
        setLanguageState(e.newValue);
      }
    };
    const handleCustom = (e: Event) => {
      const custom = e as CustomEvent<string>;
      if (custom.detail && validLanguage(custom.detail)) {
        setLanguageState(custom.detail);
      }
    };
    window.addEventListener("storage", handleStorage);
    window.addEventListener("nordstone-language-change", handleCustom);
    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("nordstone-language-change", handleCustom);
    };
  }, []);

  const selected = languageOptions.find((option) => option.code === language) ?? languageOptions[0];

  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.lang = selected.locale;
      document.documentElement.dir = selected.direction;
    }
  }, [selected]);

  const value = useMemo<LanguageContextValue>(() => ({
    language,
    locale: selected.locale,
    setLanguage,
    t: (text: string) => {
      if (!text) return "";
      return appTranslations[language]?.[text] ?? translations[language]?.[text] ?? text;
    },
    isModalOpen,
    openModal,
    closeModal,
  }), [language, selected.locale, selected.direction, setLanguage, isModalOpen, openModal, closeModal]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const value = useContext(LanguageContext);
  if (!value) throw new Error("useLanguage must be used inside LanguageProvider");
  return value;
}
