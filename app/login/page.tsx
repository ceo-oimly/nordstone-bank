"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import LoadingSecure from "@/components/auth/LoadingSecure";

export default function LoginPage() {
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
    setEmailError(!cleanEmail ? "Email address is required." : !validEmail ? "Enter a valid email address." : "");
    setPasswordError(password ? "" : "Password is required.");
    if (!cleanEmail || !validEmail || !password) return;

    setBusy(true);
    try {
      const response = await fetch("/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: cleanEmail, password, rememberMe }) });
      const result = await response.json();
      if (!response.ok || !result.needsPin) {
        setError(result.error || "Invalid email or password");
        setBusy(false);
        return;
      }
      setTransition(true);
      window.setTimeout(() => router.push("/verify-pin"), 1200);
    } catch {
      setError("We couldn’t sign you in. Check your connection and try again.");
      setBusy(false);
    }
  }

  if (transition) return <LoadingSecure/>;

  return <main className="auth-page">
    <a href="/" className="auth-wordmark"><b>NORDSTONE</b><span>BANK</span></a>
    <section className="login-card">
      <div className="auth-eyebrow">WELCOME BACK</div>
      <h1>Sign In to NORDSTONE BANK</h1>
      <p className="auth-subtitle">Access the NORDSTONE BANK panel using your email and password.</p>
      <form onSubmit={onSubmit} noValidate>
        <label className="auth-label" htmlFor="email">Email Address</label>
        <div className={`auth-input-wrap ${emailError ? "has-error" : ""}`}><span aria-hidden="true">✉</span><input id="email" type="email" autoComplete="email" placeholder="name@email.com" value={email} onChange={(event) => { setEmail(event.target.value); setEmailError(""); }} aria-invalid={Boolean(emailError)} aria-describedby={emailError ? "email-error" : undefined}/></div>
        {emailError && <small id="email-error" className="inline-error">{emailError}</small>}

        <div className="password-label-row"><label className="auth-label" htmlFor="password">Password</label><a href="/forgot-password">Forgot Password?</a></div>
        <div className={`auth-input-wrap ${passwordError ? "has-error" : ""}`}><span aria-hidden="true">♙</span><input id="password" type={showPassword ? "text" : "password"} autoComplete="current-password" placeholder="Enter your password" value={password} onChange={(event) => { setPassword(event.target.value); setPasswordError(""); }} aria-invalid={Boolean(passwordError)} aria-describedby={passwordError ? "password-error" : undefined}/><button type="button" className="eye-toggle" aria-label={showPassword ? "Hide password" : "Show password"} onClick={() => setShowPassword(!showPassword)}>{showPassword ? "◉" : "◎"}</button></div>
        {passwordError && <small id="password-error" className="inline-error">{passwordError}</small>}

        <label className="remember-row"><input type="checkbox" checked={rememberMe} onChange={(event) => setRememberMe(event.target.checked)}/><span>Stay signed in for 30 days</span></label>
        {error && <div className="auth-error" role="alert">{error}</div>}
        <button className="auth-primary" type="submit" disabled={busy}>{busy ? <><i className="button-spinner"/> Signing in...</> : <>Sign In <b>→</b></>}</button>
      </form>
      <a href="/register" className="auth-secondary"><span>♙+</span> Not enrolled? Create Account</a>
      <p className="auth-terms">By signing in, you agree to our <a href="/terms">Terms of Service</a> and <a href="/privacy">Privacy Policy</a></p>
    </section>
    <div className="auth-support"><a href="/">← Back to home</a></div>
  </main>;
}
