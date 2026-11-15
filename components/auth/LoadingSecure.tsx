"use client";
import LoadingRings from "@/components/brand/LoadingRings";
import { useLanguage } from "@/components/i18n/LanguageProvider";

export default function LoadingSecure() {
  const { t } = useLanguage();
  return <div className="secure-loading" role="status" aria-live="polite">
    <LoadingRings />
    <div className="secure-progress"><i/></div>
    <p>{t("Loading secure environment...")}</p>
  </div>;
}
