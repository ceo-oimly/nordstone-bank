"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import LoadingSecure from "@/components/auth/LoadingSecure";
import BankBrand from "@/components/brand/BankBrand";
import { useLanguage } from "@/components/i18n/LanguageProvider";

export default function LoginPage() {
  const { t } = useLanguage();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [transition, setTransition] = useState(false);
  const [error, setError] = useState("");
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const cleanEmail = email.trim();
    const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail);
    setEmailError(!cleanEmail ? t("Email address is required.") : !validEmail ? t("Enter a valid email address.") : "");
    setPasswordError(password ? "" : t("Password is required."));
    if (!cleanEmail || !validEmail || !password) return;

    setBusy(true);
    try {
      const response = await fetch("/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: cleanEmail, password, rememberMe }) });
      const result = await response.json();
      if (!response.ok || !result.needsPin) {
        setError(t(result.error || "Invalid email or password"));
        setBusy(false);
        return;
      }
      setTransition(true);
      window.setTimeout(() => router.push("/verify-pin"), 1200);
    } catch {
      setError(t("We couldn’t sign you in. Check your connection and try again."));
      setBusy(false);
    }
  }

  if (transition) return <LoadingSecure/>;

  return <main className="auth-page">
    <BankBrand href="/" className="auth-wordmark" />
    <section className="login-card">
      <div className="auth-eyebrow">{t("WELCOME BACK")}</div>
      <h1>{t("Sign In to NORDSTONE BANK")}</h1>
      <p className="auth-subtitle">{t("Access the NORDSTONE BANK panel using your email and password.")}</p>
      <form onSubmit={onSubmit} noValidate>
        <label className="auth-label" htmlFor="email">{t("Email Address")}</label>
        <div className={`auth-input-wrap ${emailError ? "has-error" : ""}`}><span aria-hidden="true">✉</span><input id="email" type="email" autoComplete="email" placeholder="name@email.com" value={email} onChange={(event) => { setEmail(event.target.value); setEmailError(""); }} aria-invalid={Boolean(emailError)} aria-describedby={emailError ? "email-error" : undefined}/></div>
        {emailError && <small id="email-error" className="inline-error">{emailError}</small>}

        <div className="password-label-row"><label className="auth-label" htmlFor="password">{t("Password")}</label><a href="/forgot-password">{t("Forgot Password?")}</a></div>
        <div className={`auth-input-wrap ${passwordError ? "has-error" : ""}`}><span aria-hidden="true">♙</span><input id="password" type={showPassword ? "text" : "password"} autoComplete="current-password" placeholder={t("Enter your password")} value={password} onChange={(event) => { setPassword(event.target.value); setPasswordError(""); }} aria-invalid={Boolean(passwordError)} aria-describedby={passwordError ? "password-error" : undefined}/><button type="button" className="eye-toggle" aria-label={t(showPassword ? "Hide password" : "Show password")} onClick={() => setShowPassword(!showPassword)}>{showPassword ? "◉" : "◎"}</button></div>
        {passwordError && <small id="password-error" className="inline-error">{passwordError}</small>}

        <label className="remember-row"><input type="checkbox" checked={rememberMe} onChange={(event) => setRememberMe(event.target.checked)}/><span>{t("Stay signed in for 30 days")}</span></label>
        {error && <div className="auth-error" role="alert">{error}</div>}
        <button className="auth-primary" type="submit" disabled={busy}>{busy ? <><i className="button-spinner"/> {t("Signing in...")}</> : <>{t("Sign In")} <b>→</b></>}</button>
      </form>
      <a href="/register" className="auth-secondary"><span>♙+</span> {t("Not enrolled? Create Account")}</a>
      <p className="auth-terms">{t("By signing in, you agree to our")} <a href="/terms">{t("Terms of Service")}</a> {t("and")} <a href="/privacy">{t("Privacy Policy")}</a></p>
    </section>
    <div className="auth-support"><a href="/">← {t("Back to home")}</a></div>
  </main>;
}
