"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import BankBrand from "@/components/brand/BankBrand";
import { useLanguage } from "@/components/i18n/LanguageProvider";

type Profile = { firstName: string; lastName: string; initials: string };

export default function VerifyPinPage() {
  const { t, locale } = useLanguage();
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [shake, setShake] = useState(false);
  const [lockedUntil, setLockedUntil] = useState<number | null>(null);
  const [now, setNow] = useState(Date.now());
  const locked = lockedUntil !== null && lockedUntil > now;

  useEffect(() => {
    let active = true;
    fetch("/api/auth/me", { cache: "no-store" }).then(async (response) => {
      const data = await response.json();
      if (!active) return;
      if (!response.ok) { router.replace("/login"); return; }
      if (data.account) { router.replace("/dashboard"); return; }
      setProfile(data.user);
      if (data.pinLockedUntil) setLockedUntil(new Date(data.pinLockedUntil).getTime());
    }).catch(() => { if (active) router.replace("/login"); });
    return () => { active = false; };
  }, [router]);

  useEffect(() => {
    if (!lockedUntil) return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [lockedUntil]);

  const appendDigit = useCallback((digit: string) => {
    if (locked || busy) return;
    setError("");
    setPin((current) => current.length < 4 ? current + digit : current);
  }, [busy, locked]);

  const removeDigit = useCallback(() => {
    if (locked || busy) return;
    setError("");
    setPin((current) => current.slice(0, -1));
  }, [busy, locked]);

  const verify = useCallback(async () => {
    if (pin.length !== 4 || locked || busy) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/auth/verify-pin", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ pin }) });
      const result = await response.json();
      if (!response.ok) {
        setPin("");
        setShake(true);
        window.setTimeout(() => setShake(false), 500);
        setError(result.error || "Unable to verify your PIN.");
        if (response.status === 423 && result.lockedUntil) setLockedUntil(new Date(result.lockedUntil).getTime());
        setBusy(false);
        return;
      }
      router.replace(result.redirect || "/dashboard");
    } catch {
      setError("We couldn’t verify your PIN. Check your connection and try again.");
      setBusy(false);
    }
  }, [busy, locked, pin, router]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (/^\d$/.test(event.key)) appendDigit(event.key);
      else if (event.key === "Backspace") removeDigit();
      else if (event.key === "Enter") void verify();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [appendDigit, removeDigit, verify]);

  const resetPin = () => { if (!locked && !busy) { setPin(""); setError(""); } };
  const remainingMinutes = lockedUntil ? Math.max(1, Math.ceil((lockedUntil - now) / 60000)) : 5;

  return <main className="pin-page">
    <section className="pin-card">
      <header className="pin-header">
        <div className="pin-header-orb orb-one"/><div className="pin-header-orb orb-two"/><div className="pin-header-orb orb-three"/>
        <BankBrand href="/" className="pin-wordmark" />
        <div className="fingerprint-icon" aria-hidden="true">◎</div>
        <h1>{t("Verify Your Identity")}</h1>
        <p>{t("Please enter your secure 4-digit PIN to continue")}</p>
      </header>

      <div className="pin-content">
        <div className="pin-user"><div className="pin-avatar">{profile?.initials || "··"}<span>✓</span></div><div><strong>{profile ? `${profile.firstName} ${profile.lastName}` : t("Loading your profile...")}</strong><small>{t("Secure account verification")}</small></div></div>
        <div className={`pin-dots ${shake ? "pin-shake" : ""}`} aria-label={`${pin.length} of 4 PIN digits entered`}>{[0, 1, 2, 3].map((index) => <span key={index} className={index < pin.length ? "filled" : ""}/>)}</div>
        <p className="pin-helper">{t("Enter the 4-digit PIN you created during registration")}</p>
        {error && <div className={`pin-error ${locked ? "locked-message" : ""}`} role="alert">{locked ? `${t("Too many attempts. Try again in")} ${new Intl.NumberFormat(locale).format(remainingMinutes)} ${t("minutes")}.` : t(error)}</div>}
        <div className="pin-keypad" aria-label={t("PIN keypad")}>
          {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((digit) => <button type="button" key={digit} disabled={locked || busy || !profile} onClick={() => appendDigit(digit)}>{digit}</button>)}
          <button type="button" aria-label={t("Reset PIN")} disabled={locked || busy} onClick={resetPin}>↻</button>
          <button type="button" disabled={locked || busy || !profile} onClick={() => appendDigit("0")}>0</button>
          <button type="button" aria-label={t("Delete last digit")} disabled={locked || busy} onClick={removeDigit}>⌫</button>
        </div>
        <button type="button" className="pin-submit" disabled={pin.length !== 4 || locked || busy} onClick={() => void verify()}>{busy ? t("Verifying...") : t("Verify PIN")} <b>→</b></button>
        <div className="pin-security"><span>♙</span><p>{t("Your security is our priority. PIN verification protects your account from unauthorized access.")}</p></div>
      </div>
    </section>
    <footer className="pin-footer"><span>© {new Date().toLocaleDateString(locale, { year: "numeric" })} NORDSTONE BANK. {t("All rights reserved.")}</span><nav><a href="/privacy">{t("Privacy Policy")}</a><a href="/terms">{t("Terms of Service")}</a><a href="/support">{t("Contact Support")}</a></nav></footer>
  </main>;
}
