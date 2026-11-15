"use client";

import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import BankBrand from "@/components/brand/BankBrand";
import { useLanguage } from "@/components/i18n/LanguageProvider";

type AccountType = "Checking" | "Savings" | "Business" | "Student";
type Draft = { step: number; firstName: string; middleName: string; lastName: string; username: string; email: string; phone: string; country: string; accountType: AccountType | "" };
type FormState = Draft & { pin: string; password: string; confirmPassword: string; agreeToTerms: boolean };
type Availability = "idle" | "checking" | "available" | "taken" | "error";
const DRAFT_KEY = "yourbrand-register-draft-v1";
const usernamePattern = /^[A-Za-z0-9]{3,20}$/;
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const phonePattern = /^\+?[0-9\s().-]{7,24}$/;

const regionNames = new Intl.DisplayNames(["en"], { type: "region" });
const countryOptions = (() => {
  const regions: string[] = [];
  for (let first = 65; first <= 90; first++) for (let second = 65; second <= 90; second++) {
    const code = String.fromCharCode(first, second);
    const name = regionNames.of(code);
    if (name && name !== code) regions.push(code === "US" ? "United States of America" : name);
  }
  return Array.from(new Set(regions)).sort((a, b) => a.localeCompare(b));
})();

function CircleIcon({ type }: { type: "person" | "mail" | "bank" | "shield" }) {
  const paths: Record<typeof type, React.ReactNode> = {
    person: <><circle cx="12" cy="8" r="3.5"/><path d="M5 20c.7-3.3 3.1-5 7-5s6.3 1.7 7 5"/></>,
    mail: <><rect x="3.5" y="5.5" width="17" height="13" rx="2"/><path d="m4.5 7 7.5 6 7.5-6"/></>,
    bank: <><path d="m3 9 9-5 9 5"/><path d="M5 10v8m4-8v8m6-8v8m4-8v8M3 21h18M3 10h18"/></>,
    shield: <><path d="M12 3 19 6v5c0 4.5-2.6 7.8-7 10-4.4-2.2-7-5.5-7-10V6z"/><path d="m9 12 2 2 4-4"/></>,
  };
  return <div className="reg-step-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[type]}</svg></div>;
}

export default function RegisterWizard() {
  const { t } = useLanguage();
  const router = useRouter();
  const [form, setForm] = useState<FormState>({ step: 1, firstName: "", middleName: "", lastName: "", username: "", email: "", phone: "", country: "United States of America", accountType: "", pin: "", password: "", confirmPassword: "", agreeToTerms: false });
  const [hydrated, setHydrated] = useState(false);
  const [countrySearch, setCountrySearch] = useState("United States of America");
  const [countryOpen, setCountryOpen] = useState(false);
  const [usernameAvailability, setUsernameAvailability] = useState<Availability>("idle");
  const [emailAvailability, setEmailAvailability] = useState<Availability>("idle");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [accountNumber, setAccountNumber] = useState("");
  const [showPin, setShowPin] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(DRAFT_KEY);
      if (stored) {
        const draft = JSON.parse(stored) as Partial<Draft>;
        setForm((current) => ({ ...current, ...draft, pin: "", password: "", confirmPassword: "", agreeToTerms: false }));
        if (draft.country) setCountrySearch(draft.country);
      }
    } catch { localStorage.removeItem(DRAFT_KEY); }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated || success) return;
    const { step, firstName, middleName, lastName, username, email, phone, country, accountType } = form;
    const safeDraft: Draft = { step, firstName, middleName, lastName, username, email, phone, country, accountType };
    localStorage.setItem(DRAFT_KEY, JSON.stringify(safeDraft));
  }, [form, hydrated, success]);

  useEffect(() => {
    const username = form.username.trim();
    if (!usernamePattern.test(username)) { setUsernameAvailability("idle"); return; }
    const controller = new AbortController();
    setUsernameAvailability("checking");
    const timer = window.setTimeout(async () => {
      try {
        const response = await fetch(`/api/auth/check-username?username=${encodeURIComponent(username)}`, { signal: controller.signal, cache: "no-store" });
        const result = await response.json();
        setUsernameAvailability(response.ok && result.available ? "available" : response.ok ? "taken" : "error");
      } catch { if (!controller.signal.aborted) setUsernameAvailability("error"); }
    }, 350);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [form.username]);

  useEffect(() => {
    const email = form.email.trim();
    if (!emailPattern.test(email)) { setEmailAvailability("idle"); return; }
    const controller = new AbortController();
    setEmailAvailability("checking");
    const timer = window.setTimeout(async () => {
      try {
        const response = await fetch(`/api/auth/check-email?email=${encodeURIComponent(email)}`, { signal: controller.signal, cache: "no-store" });
        const result = await response.json();
        setEmailAvailability(response.ok && result.available ? "available" : response.ok ? "taken" : "error");
      } catch { if (!controller.signal.aborted) setEmailAvailability("error"); }
    }, 350);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [form.email]);

  const filteredCountries = useMemo(() => {
    const query = countrySearch.trim().toLowerCase();
    return query ? countryOptions.filter((name) => name.toLowerCase().includes(query)) : countryOptions;
  }, [countrySearch]);
  const requirements = { length: form.password.length >= 8, uppercase: /[A-Z]/.test(form.password), number: /\d/.test(form.password) };
  const strengthScore = Object.values(requirements).filter(Boolean).length;
  const strengthText = strengthScore <= 1 ? "Weak" : strengthScore === 2 ? "Medium" : "Strong";

  function update(field: keyof FormState, value: string | boolean | number) {
    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: "" }));
    setFormError("");
  }

  function validateStep(step: number) {
    const nextErrors: Record<string, string> = {};
    if (step === 1) {
      if (!form.firstName.trim()) nextErrors.firstName = "First name is required.";
      if (!form.lastName.trim()) nextErrors.lastName = "Last name is required.";
      if (!usernamePattern.test(form.username.trim())) nextErrors.username = "Use 3–20 letters or numbers.";
      else if (usernameAvailability === "taken") nextErrors.username = "That username is already taken.";
      else if (usernameAvailability === "error") nextErrors.username = "Could not check availability. Try again.";
    }
    if (step === 2) {
      if (!emailPattern.test(form.email.trim())) nextErrors.email = "Enter a valid email address.";
      else if (emailAvailability === "taken") nextErrors.email = "That email is already registered.";
      else if (emailAvailability === "error") nextErrors.email = "Could not check availability. Try again.";
      if (!phonePattern.test(form.phone.trim())) nextErrors.phone = "Enter a valid phone number.";
      if (!countryOptions.includes(form.country)) nextErrors.country = "Choose a country from the list.";
    }
    if (step === 3) {
      if (!form.accountType) nextErrors.accountType = "Choose an account type.";
      if (!/^\d{4}$/.test(form.pin)) nextErrors.pin = "Enter a 4-digit transaction PIN.";
    }
    if (step === 4) {
      if (form.password.length < 8 || !requirements.uppercase || !requirements.number) nextErrors.password = "Meet all password requirements.";
      if (form.confirmPassword !== form.password) nextErrors.confirmPassword = "Passwords do not match.";
      if (!form.agreeToTerms) nextErrors.agreeToTerms = "Please accept the terms to continue.";
    }
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  function nextStep() {
    if (!validateStep(form.step)) return;
    setForm((current) => ({ ...current, step: Math.min(4, current.step + 1) }));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function previousStep() {
    setForm((current) => ({ ...current, step: Math.max(1, current.step - 1) }));
    setFormError("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function createAccount(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!validateStep(4)) return;
    setSubmitting(true);
    setFormError("");
    const response = await fetch("/api/auth/register", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ firstName: form.firstName, middleName: form.middleName, lastName: form.lastName, username: form.username, email: form.email, phone: form.phone, country: form.country, accountType: form.accountType, pin: form.pin, password: form.password, confirmPassword: form.confirmPassword, agreeToTerms: form.agreeToTerms }) }).catch(() => null);
    if (!response) { setFormError("We couldn’t create your account. Check your connection and try again."); setSubmitting(false); return; }
    const result = await response.json().catch(() => ({}));
    if (!response.ok || !result.success) { setFormError(result.error || "We couldn’t create your account. Please try again."); setSubmitting(false); return; }
    setAccountNumber(result.user.accountNumber);
    setSuccess(true);
    localStorage.removeItem(DRAFT_KEY);
    window.setTimeout(() => router.push(result.redirect || "/verify-pin"), 1400);
  }

  const handleCountry = (event: ChangeEvent<HTMLInputElement>) => {
    setCountrySearch(event.target.value);
    update("country", event.target.value);
    setCountryOpen(true);
  };

  const accountOptions: { type: AccountType; title: string; desc: string; icon: string }[] = [
    { type: "Checking", title: "Checking Account", desc: "Perfect for daily transactions and bill payments", icon: "▣" },
    { type: "Savings", title: "Savings Account", desc: "Earn interest on your deposits", icon: "♧" },
    { type: "Business", title: "Business Account", desc: "Banking tools for your growing business", icon: "▤" },
    { type: "Student", title: "Student Account", desc: "A simple account for your next chapter", icon: "⌂" },
  ];

  return <main className="register-page">
    <BankBrand href="/" className="auth-wordmark" />
    <section className="register-card">
      <div className="register-card-heading"><h1>{t("Create Your Account")}</h1><span>{t("Step")} {new Intl.NumberFormat().format(form.step)} {t("of")} 4</span></div>
      <div className="register-progress" aria-label={`${t("Step")} ${form.step} ${t("of")} 4`}><i style={{ width: `${form.step * 25}%` }}/></div>
      <div className="register-step-labels">{["Personal Info", "Contact Details", "Account Setup", "Security"].map((label, index) => <span key={label} className={index + 1 <= form.step ? "current" : ""}>{t(label)}</span>)}</div>

      {success ? <div className="register-success"><span>✓</span><h2>{t("Account created successfully!")}</h2><p>{t("Your account number is")}</p><strong>{accountNumber}</strong><small>{t("Taking you to PIN verification...")}</small></div> : <form onSubmit={form.step === 4 ? createAccount : (event) => { event.preventDefault(); nextStep(); }} noValidate>
        {form.step === 1 && <>
          <CircleIcon type="person"/><h2 className="register-step-title">{t("Personal Information")}</h2><p className="register-step-subtitle">{t("Please provide your legal name as it appears on official documents")}</p>
          <div className="register-fields two-cols">
            <Field label={t("Legal First Name *")} error={errors.firstName}><input autoComplete="given-name" placeholder={t("John")} value={form.firstName} onChange={(e) => update("firstName", e.target.value)}/></Field>
            <Field label={t("Middle Name")} hint={t("Optional")}><input autoComplete="additional-name" placeholder={t("David")} value={form.middleName} onChange={(e) => update("middleName", e.target.value)}/></Field>
            <Field label={t("Legal Last Name *")} error={errors.lastName}><input autoComplete="family-name" placeholder={t("Smith")} value={form.lastName} onChange={(e) => update("lastName", e.target.value)}/></Field>
            <Field label={t("Username *")} error={errors.username} status={usernameAvailability}><input autoComplete="username" placeholder={t("johnsmith123")} value={form.username} onChange={(e) => update("username", e.target.value.replace(/[^a-zA-Z0-9]/g, "").slice(0, 20))}/></Field>
          </div>
        </>}

        {form.step === 2 && <>
          <CircleIcon type="mail"/><h2 className="register-step-title">{t("Contact Information")}</h2><p className="register-step-subtitle">{t("We’ll use these details to communicate with you about your account")}</p>
          <div className="register-fields">
            <Field label={`${t("Email Address")} *`} error={errors.email} status={emailAvailability} icon="✉"><input type="email" autoComplete="email" placeholder="john.smith@example.com" value={form.email} onChange={(e) => update("email", e.target.value)}/></Field>
            <Field label={`${t("Phone Number")} *`} error={errors.phone} icon="☎"><input type="tel" autoComplete="tel" placeholder="+12345678901" value={form.phone} onChange={(e) => update("phone", e.target.value)}/></Field>
            <Field label={`${t("Country")} *`} error={errors.country} icon="◎">
              <div className="country-picker"><input role="combobox" aria-expanded={countryOpen} aria-controls="country-options" autoComplete="country-name" placeholder={t("Search countries")} value={countrySearch} onFocus={() => { setCountrySearch(""); setCountryOpen(true); }} onBlur={() => window.setTimeout(() => { setCountryOpen(false); setCountrySearch(form.country); }, 150)} onChange={handleCountry}/><span>⌄</span>{countryOpen && <div className="country-options" id="country-options" role="listbox">{filteredCountries.length ? filteredCountries.map((country) => <button type="button" role="option" aria-selected={form.country === country} key={country} onMouseDown={(e) => e.preventDefault()} onClick={() => { update("country", country); setCountrySearch(country); setCountryOpen(false); }}>{t(country)}</button>) : <div className="country-empty">{t("No matching countries")}</div>}</div>}</div>
            </Field>
          </div>
        </>}

        {form.step === 3 && <>
          <CircleIcon type="bank"/><h2 className="register-step-title">{t("Account Setup")}</h2><p className="register-step-subtitle">{t("Choose your account type and set up your transaction PIN")}</p>
          <div className="account-choice-grid">{accountOptions.slice(0, 2).map((option) => <AccountChoice key={option.type} option={option} selected={form.accountType === option.type} onSelect={() => update("accountType", option.type)} />)}</div>
          <button type="button" className="show-account-types" onClick={(e) => { const grid = document.getElementById("additional-account-types"); if (grid) grid.hidden = !grid.hidden; e.currentTarget.setAttribute("aria-expanded", grid?.hidden ? "false" : "true"); }}>{t("Show more account types")} <span>⌄</span></button>
          <div id="additional-account-types" className="account-choice-grid additional-account-types" hidden>{accountOptions.slice(2).map((option) => <AccountChoice key={option.type} option={option} selected={form.accountType === option.type} onSelect={() => update("accountType", option.type)} />)}</div>
          {errors.accountType && <small className="reg-field-error">{errors.accountType}</small>}
          <Field label="Transaction PIN (4 digits) *" error={errors.pin} icon="⌑"><input type={showPin ? "text" : "password"} inputMode="numeric" pattern="[0-9]*" autoComplete="off" maxLength={4} placeholder="••••" value={form.pin} onChange={(e) => update("pin", e.target.value.replace(/\D/g, "").slice(0, 4))}/><button type="button" className="reg-eye" onClick={() => setShowPin(!showPin)} aria-label={showPin ? "Hide PIN" : "Show PIN"}>{showPin ? "◉" : "◎"}</button></Field>
          <p className="reg-helper">{t("Your PIN will be required to authorize transactions.")}</p>
        </>}

        {form.step === 4 && <>
          <CircleIcon type="shield"/><h2 className="register-step-title">{t("Secure Your Account")}</h2><p className="register-step-subtitle">{t("Create a strong password to protect your account")}</p>
          <div className="register-fields">
            <Field label="Password *" error={errors.password} icon="♙"><input type={showPassword ? "text" : "password"} autoComplete="new-password" placeholder="Create a password" value={form.password} onChange={(e) => update("password", e.target.value)}/><button type="button" className="reg-eye" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? "Hide password" : "Show password"}>{showPassword ? "◉" : "◎"}</button></Field>
          <div className="password-strength"><div className={`strength-meter strength-${strengthScore}`}><i/><i/><i/></div><span className={`strength-text strength-label-${strengthScore}`}>{form.password ? t(strengthText) : t("Password strength")}</span></div>
            <div className="password-checklist"><span className={requirements.length ? "met" : ""}><b>{requirements.length ? "✓" : "○"}</b>{t("8+ characters")}</span><span className={requirements.uppercase ? "met" : ""}><b>{requirements.uppercase ? "✓" : "○"}</b>{t("One uppercase letter")}</span><span className={requirements.number ? "met" : ""}><b>{requirements.number ? "✓" : "○"}</b>{t("One number")}</span></div>
            <Field label="Confirm Password *" error={errors.confirmPassword} icon="♙"><input type={showConfirmPassword ? "text" : "password"} autoComplete="new-password" placeholder="Re-enter your password" value={form.confirmPassword} onChange={(e) => update("confirmPassword", e.target.value)}/><button type="button" className="reg-eye" onClick={() => setShowConfirmPassword(!showConfirmPassword)} aria-label={showConfirmPassword ? "Hide password" : "Show password"}>{showConfirmPassword ? "◉" : "◎"}</button></Field>
          </div>
          <label className="reg-terms"><input type="checkbox" checked={form.agreeToTerms} onChange={(e) => update("agreeToTerms", e.target.checked)}/><span>{t("I agree to the")} <a href="/terms" target="_blank">{t("Terms of Service")}</a> {t("and")} <a href="/privacy" target="_blank">{t("Privacy Policy")}</a>.</span></label>
          {errors.agreeToTerms && <small className="reg-field-error">{errors.agreeToTerms}</small>}
        </>}

        {formError && <div className="register-form-error" role="alert">{formError}</div>}
        <div className={`register-actions ${form.step === 1 ? "first-step" : ""}`}>
          {form.step > 1 && <button type="button" className="reg-previous" onClick={previousStep}>‹ <span>{t("Previous")}</span></button>}
          {form.step < 4 ? <button type="submit" className="reg-next">{t("Next")} <b>›</b></button> : <button type="submit" className="reg-next create-account" disabled={submitting || !form.agreeToTerms}>{submitting ? <><i className="button-spinner"/> {t("Creating your account...")}</> : <>✓ <span>{t("Create Account")}</span></>}</button>}
        </div>
      </form>}
    </section>
    <p className="register-signin">{t("Already have an account?")} <a href="/login">{t("Sign in instead")}</a></p>
  </main>;
}

function Field({ label, error, hint, icon, status, children }: { label: string; error?: string; hint?: string; icon?: string; status?: Availability; children: React.ReactNode }) {
  const { t } = useLanguage();
  return <label className="reg-field"><span className="reg-label-row"><span>{label}</span>{hint && <small>{hint}</small>}</span><span className={`reg-control ${error ? "invalid" : ""} ${icon ? "with-icon" : ""}`}>{icon && <i aria-hidden="true">{icon}</i>}{children}{status === "checking" && <em className="availability checking">…</em>}{status === "available" && <em className="availability available">✓</em>}{status === "taken" && <em className="availability taken">×</em>}</span>{error && <small className="reg-field-error">{t(error)}</small>}</label>;
}

function AccountChoice({ option, selected, onSelect }: { option: { type: AccountType; title: string; desc: string; icon: string }; selected: boolean; onSelect: () => void }) {
  const { t } = useLanguage();
  return <button type="button" className={`account-choice ${selected ? "selected" : ""}`} onClick={onSelect} aria-pressed={selected}><span className="account-choice-icon">{option.icon}</span><span className="account-choice-copy"><strong>{t(option.title)}</strong><small>{t(option.desc)}</small></span>{selected && <span className="account-choice-check">✓</span>}</button>;
}
