"use client";

import { useMemo } from "react";
import { useLanguage } from "@/components/i18n/LanguageProvider";
import { languageOptions } from "@/lib/languages";

export default function LanguageSwitcher({
  variant = "floating",
  className = "",
}: {
  variant?: "floating" | "header" | "inline";
  className?: string;
}) {
  const { language, openModal, t } = useLanguage();

  const selected = useMemo(() => {
    return languageOptions.find((option) => option.code === language) ?? languageOptions[0];
  }, [language]);

  if (variant === "header") {
    return (
      <button
        type="button"
        onClick={openModal}
        className={`lang-btn lang-btn-header ${className}`}
        aria-label={t("Choose language")}
        title={`${selected.name} (${selected.region || selected.code.toUpperCase()})`}
      >
        <span className="lang-btn-flag" aria-hidden="true">{selected.flag}</span>
        <span className="lang-btn-label">
          {selected.code === "ar-ae" ? "UAE" : selected.code.toUpperCase()}
        </span>
        <span className="lang-btn-chevron" aria-hidden="true">▾</span>
      </button>
    );
  }

  if (variant === "inline") {
    return (
      <button
        type="button"
        onClick={openModal}
        className={`lang-btn lang-btn-inline ${className}`}
        aria-label={t("Choose language")}
        title={t("Choose language")}
      >
        <span className="lang-btn-flag" aria-hidden="true">{selected.flag}</span>
        <span className="lang-btn-text">{selected.nativeName || selected.name}</span>
        <span className="lang-btn-chevron" aria-hidden="true">▾</span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={openModal}
      className={`lang-btn lang-btn-floating ${className}`}
      aria-label={t("Choose language")}
      title={t("Choose language")}
    >
      <span className="lang-btn-flag" aria-hidden="true">{selected.flag}</span>
      <span className="lang-btn-text">{selected.nativeName || selected.name}</span>
      <span className="lang-btn-chevron" aria-hidden="true">▾</span>
    </button>
  );
}
