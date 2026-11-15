"use client";

import { useMemo, useState, useEffect } from "react";
import { useLanguage } from "@/components/i18n/LanguageProvider";
import { languageOptions, LanguageCode } from "@/lib/languages";

const quickPickCodes: LanguageCode[] = ["en", "ko", "ar-ae", "es", "fr", "de", "ja", "zh"];

export default function LanguageModal() {
  const { language, setLanguage, t, isModalOpen, closeModal } = useLanguage();
  const [search, setSearch] = useState("");

  const filteredOptions = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return languageOptions;
    return languageOptions.filter((opt) => {
      const name = opt.name.toLowerCase();
      const nativeName = (opt.nativeName || "").toLowerCase();
      const region = (opt.region || "").toLowerCase();
      const code = opt.code.toLowerCase();
      return name.includes(q) || nativeName.includes(q) || region.includes(q) || code.includes(q);
    });
  }, [search]);

  // Handle escape key
  useEffect(() => {
    if (!isModalOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        closeModal();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isModalOpen, closeModal]);

  if (!isModalOpen) return null;

  const handleSelect = (code: LanguageCode) => {
    setLanguage(code);
    closeModal();
    setSearch("");
  };

  return (
    <div
      className="lang-modal-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) closeModal();
      }}
      role="presentation"
    >
      <div
        className="lang-modal-card"
        role="dialog"
        aria-modal="true"
        aria-label={t("Choose language")}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="lang-modal-head">
          <div className="lang-modal-title-wrap">
            <span className="lang-globe-icon" aria-hidden="true">🌐</span>
            <div>
              <h3 className="lang-modal-title">{t("Choose language")}</h3>
              <p className="lang-modal-subtitle">
                Select your preferred language for Nordstone Bank
              </p>
            </div>
          </div>
          <button
            type="button"
            className="lang-modal-close"
            onClick={closeModal}
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Live Search */}
        <div className="lang-search-wrap">
          <span className="lang-search-icon" aria-hidden="true">🔍</span>
          <input
            type="text"
            className="lang-search-input"
            placeholder="Search language or country (e.g. Korea, Dubai, Spain)..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            autoFocus
          />
          {search && (
            <button
              type="button"
              className="lang-search-clear"
              onClick={() => setSearch("")}
              aria-label="Clear search"
            >
              ✕
            </button>
          )}
        </div>

        {/* Quick Picks / Featured Languages */}
        {!search && (
          <div className="lang-quick-picks">
            <span className="lang-quick-title">Popular:</span>
            <div className="lang-quick-chips">
              {quickPickCodes.map((c) => {
                const opt = languageOptions.find((o) => o.code === c);
                if (!opt) return null;
                const isCurrent = opt.code === language;
                return (
                  <button
                    type="button"
                    key={opt.code}
                    onClick={() => handleSelect(opt.code)}
                    className={`lang-chip ${isCurrent ? "is-active" : ""}`}
                  >
                    <span>{opt.flag}</span>
                    <span>{opt.nativeName || opt.name}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Language Grid */}
        <div className="lang-grid" role="listbox">
          {filteredOptions.length === 0 ? (
            <div className="lang-empty">
              <span>🌐</span>
              <p>No matching languages found for &ldquo;{search}&rdquo;</p>
            </div>
          ) : (
            filteredOptions.map((opt) => {
              const isActive = opt.code === language;
              return (
                <button
                  type="button"
                  key={opt.code}
                  onClick={() => handleSelect(opt.code)}
                  className={`lang-option-card ${isActive ? "is-selected" : ""}`}
                  role="option"
                  aria-selected={isActive}
                >
                  <div className="lang-option-flag" aria-hidden="true">
                    {opt.flag}
                  </div>
                  <div className="lang-option-info">
                    <div className="lang-option-native">
                      {opt.nativeName || opt.name}
                      {opt.direction === "rtl" && (
                        <span className="lang-rtl-badge">RTL</span>
                      )}
                    </div>
                    <div className="lang-option-en">
                      {opt.name} · {opt.region}
                    </div>
                  </div>
                  {isActive && (
                    <div className="lang-option-check" aria-hidden="true">
                      ✓
                    </div>
                  )}
                </button>
              );
            })
          )}
        </div>

        {/* Modal Footer */}
        <div className="lang-modal-footer">
          <span>✓ Selected language applies across all pages of Nordstone Bank.</span>
        </div>
      </div>
    </div>
  );
}

