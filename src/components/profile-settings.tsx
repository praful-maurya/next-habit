"use client";

import { useState } from "react";
import Link from "next/link";
import SignOutButton from "@/components/sign-out-button";

export default function ProfileSettings({
  displayName,
  email,
}: {
  displayName: string;
  email: string;
}) {
  const [name, setName] = useState(displayName);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const saveProfile = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ displayName: name }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Unable to save your profile.");
      setName(result.displayName);
      setNotice("Profile saved.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to save your profile.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="settings-content">
      <header className="settings-heading">
        <Link className="text-action" href="/">Back to your journal</Link>
        <p className="eyebrow">YOUR ACCOUNT</p>
        <h1>Profile <em>settings.</em></h1>
        <p className="welcome-subtitle">Manage your personal details and sign-in access.</p>
      </header>

      {error && <div className="alert-banner" role="alert">{error}</div>}
      {notice && <div className="settings-notice" role="status">{notice}</div>}

      <section className="panel-card settings-card">
        <form className="settings-form" onSubmit={saveProfile}>
          <label>
            Display name
            <input
              autoComplete="name"
              maxLength={60}
              required
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </label>
          <label>
            Email address
            <input value={email} readOnly aria-describedby="email-help" />
            <small id="email-help">Email changes are managed by Neon Auth and are not available in this profile form.</small>
          </label>
          <button className="primary-action" disabled={saving} type="submit">
            {saving ? "Saving…" : "Save profile"}
          </button>
        </form>
      </section>

      <section className="panel-card settings-card">
        <p className="eyebrow">PASSWORD</p>
        <h2>Reset your password</h2>
        <p>We’ll send a secure reset link to your account email. Reset links expire after 15 minutes.</p>
        <a className="text-action" href="/forgot-password">Send a password reset link</a>
      </section>

      <section className="panel-card settings-card signout-card">
        <div>
          <p className="eyebrow">SESSION</p>
          <h2>Sign out</h2>
          <p>End this session on this device.</p>
        </div>
        <SignOutButton />
      </section>
    </div>
  );
}
