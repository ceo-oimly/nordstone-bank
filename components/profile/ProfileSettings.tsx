"use client";

import { ChangeEvent, FormEvent, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";

type ProfileData = { user: { firstName: string; lastName: string; initials: string; email: string; dateOfBirth: string | null; phone: string | null; address: string | null; avatarUrl: string | null }; account: { accountNumber: string; accountNumberMasked: string; status: string } };
type Tab = "profile" | "security" | "pin";

export default function ProfileSettings() {
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState("");
  const [activeTab, setActiveTab] = useState<Tab>("profile");
  const [pinOpen, setPinOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [avatarBusy, setAvatarBusy] = useState(false);
  const [toast, setToast] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [passwordBusy, setPasswordBusy] = useState(false);
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [newPin, setNewPin] = useState("");
  const [pinPassword, setPinPassword] = useState("");
  const [pinError, setPinError] = useState("");
  const [pinBusy, setPinBusy] = useState(false);
  const [showPinPassword, setShowPinPassword] = useState(false);

  useEffect(() => { fetch("/api/profile", { cache: "no-store" }).then(async (response) => { const body = await response.json(); if (!response.ok) throw new Error(body.error || "Profile could not be loaded."); setProfile(body); }).catch((error) => setPageError(error instanceof Error ? error.message : "Profile could not be loaded.")).finally(() => setLoading(false)); }, []);
  useEffect(() => { if (!toast) return; const timeout = setTimeout(() => setToast(""), 4200); return () => clearTimeout(timeout); }, [toast]);

  function selectTab(tab: Tab) {
    setActiveTab(tab);
    if (tab === "pin") { setPinError(""); setPinOpen(true); }
  }

  async function copyAccount() {
    if (!profile?.account.accountNumber) return;
    try { await navigator.clipboard.writeText(profile.account.accountNumber); setCopied(true); setTimeout(() => setCopied(false), 1800); }
    catch { setPageError("Could not copy the account number. Please select and copy it manually."); }
  }

  async function uploadAvatar(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setPageError("");
    const supported = ["image/jpeg", "image/png", "image/webp"];
    if (!supported.includes(file.type)) { setPageError("Choose a JPG, PNG, or WebP image."); event.target.value = ""; return; }
    if (file.size >= 2 * 1024 * 1024) { setPageError("Image must be smaller than 2 MB."); event.target.value = ""; return; }
    setAvatarBusy(true);
    try {
      const form = new FormData(); form.set("avatar", file);
      const response = await fetch("/api/profile/avatar", { method: "POST", body: form }); const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Avatar upload failed.");
      setProfile((old) => old ? { ...old, user: { ...old.user, avatarUrl: body.avatarUrl } } : old); setToast("Profile photo updated.");
    } catch (error) { setPageError(error instanceof Error ? error.message : "Avatar upload failed."); }
    finally { setAvatarBusy(false); event.target.value = ""; }
  }

  const passwordChecks = useMemo(() => ({ length: newPassword.length >= 8, lower: /[a-z]/.test(newPassword), upper: /[A-Z]/.test(newPassword), number: /\d/.test(newPassword) }), [newPassword]);
  const checksMet = Object.values(passwordChecks).filter(Boolean).length;

  async function changePassword(event: FormEvent) {
    event.preventDefault(); setPasswordError("");
    if (!currentPassword || !newPassword || !confirmPassword) { setPasswordError("Complete all password fields."); return; }
    if (!Object.values(passwordChecks).every(Boolean)) { setPasswordError("Your new password does not meet all requirements."); return; }
    if (newPassword !== confirmPassword) { setPasswordError("The new password and confirmation do not match."); return; }
    if (newPassword === currentPassword) { setPasswordError("Choose a password different from your current password."); return; }
    setPasswordBusy(true);
    try {
      const response = await fetch("/api/settings/change-password", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ currentPassword, newPassword, confirmPassword }) });
      const body = await response.json(); if (!response.ok) throw new Error(body.error || "Password could not be updated.");
      setToast(body.message || "Password updated. Please log in again.");
      await fetch("/api/auth/logout", { method: "POST" }).catch(() => undefined);
      setTimeout(() => window.location.assign("/login"), 1200);
    } catch (error) { setPasswordError(error instanceof Error ? error.message : "Password could not be updated."); setPasswordBusy(false); }
  }

  async function changePin(event: FormEvent) {
    event.preventDefault(); setPinError("");
    if (!/^\d{4}$/.test(newPin) || ["0000", "1234", "1111"].includes(newPin)) { setPinError("Choose a valid 4-digit PIN. Avoid 0000, 1234, and 1111."); return; }
    if (!pinPassword) { setPinError("Enter your current password."); return; }
    setPinBusy(true);
    try {
      const response = await fetch("/api/settings/change-pin", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ newPin, currentPassword: pinPassword }) }); const body = await response.json();
      if (!response.ok) throw new Error(body.error || "PIN could not be updated.");
      setPinOpen(false); setActiveTab("profile"); setNewPin(""); setPinPassword(""); setToast("Transaction PIN updated.");
    } catch (error) { setPinError(error instanceof Error ? error.message : "PIN could not be updated."); }
    finally { setPinBusy(false); }
  }

  const formattedDob = profile?.user.dateOfBirth ? new Date(`${profile.user.dateOfBirth.slice(0, 10)}T00:00:00`).toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" }) : "Not provided";
  return <main className="profile-settings-page">
    <div className="profile-breadcrumb"><Link href="/dashboard">Dashboard</Link><span>›</span><strong>Settings</strong></div>
    <div className="profile-page-title"><span>ACCOUNT & SECURITY</span><h1>Account Settings</h1><p>View your account information and manage sign-in security.</p></div>
    {pageError && <div className="profile-error" role="alert">{pageError}</div>}
    {loading ? <div className="profile-loading">Loading your account settings…</div> : profile && <>
      <section className="profile-hero"><div className="profile-avatar-wrap"><div className="profile-avatar">{profile.user.avatarUrl ? <img src={profile.user.avatarUrl} alt={`${profile.user.firstName} ${profile.user.lastName}`} /> : <span>{profile.user.initials}</span>}</div><button type="button" aria-label="Change profile photo" title="Change profile photo" disabled={avatarBusy} onClick={() => fileRef.current?.click()}>{avatarBusy ? "…" : "📷"}</button><input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={uploadAvatar} hidden /></div><div className="profile-hero-copy"><h2>{profile.user.firstName} {profile.user.lastName}</h2><p>Account #{profile.account.accountNumber || profile.account.accountNumberMasked || "—"}</p></div><span className="profile-account-status">{profile.account.status}</span></section>
      <section className="profile-tabs-card" aria-label="Account settings sections"><button className={activeTab === "profile" ? "active" : ""} onClick={() => selectTab("profile")} type="button"><span>♙</span><span><strong>Profile Information</strong><small>Personal and account details</small></span><b>›</b></button><button className={activeTab === "security" ? "active" : ""} onClick={() => selectTab("security")} type="button"><span>♢</span><span><strong>Security Settings</strong><small>Update your account password</small></span><b>›</b></button><button className={activeTab === "pin" ? "active" : ""} onClick={() => selectTab("pin")} type="button"><span>⌑</span><span><strong>Transaction PIN</strong><small>Change your transaction PIN</small></span><b>›</b></button></section>
      {activeTab === "profile" ? <section className="profile-content-card"><div className="profile-content-heading"><span>♙</span><div><h2>Profile Information</h2><p>Your personal information and account details.</p></div></div><div className="profile-readonly-grid"><label>First Name<input value={profile.user.firstName} readOnly disabled /></label><label>Last Name<input value={profile.user.lastName} readOnly disabled /></label><label>Account Number<div className="profile-account-field"><span>#</span><input value={profile.account.accountNumber || profile.account.accountNumberMasked || "—"} readOnly disabled/><button type="button" onClick={copyAccount} disabled={!profile.account.accountNumber}>{copied ? "Copied!" : "Copy"}</button></div></label><label>Email Address<input value={profile.user.email} readOnly disabled /></label><label>Date of Birth<input value={formattedDob} readOnly disabled /></label><label>Phone Number<input value={profile.user.phone || "Not provided"} readOnly disabled /></label><label className="profile-address-field">Address<textarea value={profile.user.address || "Not provided"} rows={3} readOnly disabled /></label></div><aside className="profile-info-box"><span>ⓘ</span><div><strong>Account Information</strong><p>To update your personal information, please contact our customer support team.</p></div></aside></section> : activeTab === "security" ? <section className="profile-content-card"><div className="profile-content-heading"><span>♢</span><div><h2>Change Password</h2><p>Update your account password to maintain security.</p></div></div><form className="profile-security-form" onSubmit={changePassword}>
        <label className="profile-input-label">Current Password<div className="profile-password-input"><i>▣</i><input type={showCurrent ? "text" : "password"} value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} autoComplete="current-password"/><button type="button" onClick={() => setShowCurrent(!showCurrent)}>{showCurrent ? "Hide" : "Show"}</button></div></label>
        <label className="profile-input-label">New Password<div className="profile-password-input"><i>⚿</i><input type={showNew ? "text" : "password"} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} autoComplete="new-password"/><button type="button" onClick={() => setShowNew(!showNew)}>{showNew ? "Hide" : "Show"}</button></div></label>
        <div className="profile-password-checklist" aria-live="polite"><span className={`profile-check ${passwordChecks.length ? "met" : ""}`}>✓ At least 8 characters</span><span className={`profile-check ${passwordChecks.lower ? "met" : ""}`}>✓ One lowercase letter</span><span className={`profile-check ${passwordChecks.upper ? "met" : ""}`}>✓ One uppercase letter</span><span className={`profile-check ${passwordChecks.number ? "met" : ""}`}>✓ One number</span><div className={`profile-password-strength strength-${checksMet}`}><i style={{ width: `${checksMet * 25}%` }}/></div></div>
        <label className="profile-input-label">Confirm Password<div className="profile-password-input"><i>✓</i><input type={showConfirm ? "text" : "password"} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} autoComplete="new-password"/><button type="button" onClick={() => setShowConfirm(!showConfirm)}>{showConfirm ? "Hide" : "Show"}</button></div></label>
        <aside className="profile-info-box"><span>ⓘ</span><div><strong>Password Requirements</strong><p>Use at least 8 characters with a lowercase letter, an uppercase letter, and a number.</p></div></aside><aside className="profile-warning-box"><span>!</span><div><strong>Security Reminder</strong><p>After changing your password, you will be logged out and need to log in again with your new password.</p></div></aside>
        {passwordError && <div className="profile-error" role="alert">{passwordError}</div>}<button className="profile-submit-button" type="submit" disabled={passwordBusy}>{passwordBusy ? "Updating…" : "Update Password"}<b>→</b></button>
      </form></section> : null}
      <section className="profile-help-card"><span>?</span><div><h2>Need Help?</h2><p>Contact our support team if you need assistance with your account settings or have any questions.</p><Link href="/support">Contact Support <b>→</b></Link></div></section>
    </>}
    {toast && <div className="profile-toast" role="status">✓ {toast}</div>}
    {pinOpen && <div className="profile-modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) { setPinOpen(false); setActiveTab("profile"); } }}><section className="profile-pin-modal" role="dialog" aria-modal="true" aria-labelledby="pin-modal-title"><button type="button" className="profile-modal-close" aria-label="Close" onClick={() => { setPinOpen(false); setActiveTab("profile"); }}>×</button><div className="profile-content-heading"><span>⌑</span><div><h2 id="pin-modal-title">Change Transaction PIN</h2><p>Choose a new four-digit PIN for transaction approval.</p></div></div><form onSubmit={changePin}><label className="profile-input-label">New Transaction PIN<div className="profile-password-input"><i>⚿</i><input type="password" inputMode="numeric" pattern="[0-9]{4}" maxLength={4} value={newPin} onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ""))} autoComplete="new-password" required/><span className="profile-input-hint">4 digits</span></div></label><label className="profile-input-label">Current Password<div className="profile-password-input"><i>▣</i><input type={showPinPassword ? "text" : "password"} value={pinPassword} onChange={(e) => setPinPassword(e.target.value)} autoComplete="current-password" required/><button type="button" onClick={() => setShowPinPassword(!showPinPassword)}>{showPinPassword ? "Hide" : "Show"}</button></div></label><aside className="profile-warning-box"><span>!</span><div><strong>Security Alert</strong><p>Keep your transaction PIN confidential. Never share your PIN with anyone, including bank representatives.</p></div></aside>{pinError && <div className="profile-error" role="alert">{pinError}</div>}<button type="submit" className="profile-submit-button" disabled={pinBusy}>{pinBusy ? "Updating…" : "Update Transaction PIN"}<b>→</b></button></form></section></div>}
  </main>;
}
