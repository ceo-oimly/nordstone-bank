"use client";

import { useLanguage } from "@/components/i18n/LanguageProvider";
import { languageOptions } from "@/lib/languages";

export default function LanguageSwitcher() {
  const { language, setLanguage, t } = useLanguage();
  const selected = languageOptions.find((option) => option.code === language) ?? languageOptions[0];
  return <label className="language-tool" aria-label={t("Choose language")}>
    <span aria-hidden="true">{selected.flag}</span>
    <select aria-label={t("Choose language")} value={language} onChange={(event) => setLanguage(event.target.value as typeof language)}>
      {languageOptions.map((option) => <option value={option.code} key={option.code}>{option.flag} {option.name}</option>)}
    </select>
    <b aria-hidden="true">⌄</b>
  </label>;
}
