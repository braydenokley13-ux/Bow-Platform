"use client";

import { useEffect, useState } from "react";
import { PageTitle } from "@/components/page-title";
import { apiFetch } from "@/lib/client-api";

interface ProfilePayload {
  ok: boolean;
  data: {
    email: string;
    display_name: string;
    bio?: string;
    pod?: string;
    xp: number;
    streak_days?: number;
    badges?: Array<{ badge_id: string; label: string; earned_at: string }>;
    goal?: string;
  };
}

function Initials({ name }: { name: string }) {
  const parts = name.trim().split(/\s+/);
  const chars =
    parts.length >= 2
      ? parts[0][0] + parts[parts.length - 1][0]
      : (parts[0] ?? "?").slice(0, 2);
  return (
    <div
      style={{
        width: 72,
        height: 72,
        borderRadius: "50%",
        background: "var(--accent, #2563eb)",
        color: "#fff",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 26,
        fontWeight: 700,
        flexShrink: 0
      }}
      aria-hidden
    >
      {chars.toUpperCase()}
    </div>
  );
}

export default function ProfilePage() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [profile, setProfile] = useState<ProfilePayload["data"] | null>(null);
  const [editing, setEditing] = useState(false);
  const [draftName, setDraftName] = useState("");
  const [draftBio, setDraftBio] = useState("");
  const [saving, setSaving] = useState(false);

  async function load() {
    setBusy(true);
    setError(null);
    try {
      const res = await apiFetch<ProfilePayload>("/api/me/profile");
      setProfile(res.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load profile");
    } finally {
      setBusy(false);
    }
  }

  function startEdit() {
    setDraftName(profile?.display_name ?? "");
    setDraftBio(profile?.bio ?? "");
    setEditing(true);
  }

  async function saveEdit() {
    setSaving(true);
    setError(null);
    try {
      const res = await apiFetch<ProfilePayload>("/api/me/profile", {
        method: "PATCH",
        json: { display_name: draftName.trim(), bio: draftBio.trim() }
      });
      setProfile(res.data);
      setEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save profile");
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  return (
    <div className="grid gap-14">
      <PageTitle title="My Profile" subtitle="Your public profile — visible to classmates and instructors" />

      {error ? (
        <section className="card">
          <div className="banner banner-error">{error}</div>
        </section>
      ) : null}

      {busy && !profile ? (
        <section className="card">
          <p className="m-0 text-muted-60">Loading profile...</p>
        </section>
      ) : null}

      {profile ? (
        <>
          <section className="card" style={{ display: "flex", gap: 16, alignItems: "flex-start", flexWrap: "wrap" }}>
            <Initials name={profile.display_name || profile.email} />
            <div style={{ flex: 1, minWidth: 200 }}>
              <h2 style={{ margin: "0 0 4px" }}>{profile.display_name || profile.email}</h2>
              {profile.pod ? <div className="pill" style={{ marginBottom: 8 }}>Pod: {profile.pod}</div> : null}
              {profile.bio ? (
                <p style={{ margin: "8px 0 0", opacity: 0.8 }}>{profile.bio}</p>
              ) : (
                <p style={{ margin: "8px 0 0", opacity: 0.45, fontStyle: "italic" }}>No bio yet.</p>
              )}
            </div>
            <button className="secondary" onClick={startEdit}>
              Edit Profile
            </button>
          </section>

          <section className="grid grid-2">
            <article className="card">
              <div className="kicker">XP</div>
              <h2 className="my-8">{profile.xp.toLocaleString()}</h2>
            </article>
            <article className="card">
              <div className="kicker">Streak</div>
              <h2 className="my-8">{profile.streak_days ?? 0} days</h2>
            </article>
          </section>

          {profile.goal ? (
            <section className="card">
              <div className="kicker">Season Goal</div>
              <p style={{ margin: "8px 0 0", fontSize: 16, fontWeight: 500 }}>{profile.goal}</p>
            </section>
          ) : null}

          {(profile.badges ?? []).length > 0 ? (
            <section className="card stack-8">
              <div className="kicker">Badges ({profile.badges!.length})</div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {profile.badges!.map((b) => (
                  <span key={b.badge_id} className="pill" title={`Earned ${new Date(b.earned_at).toLocaleDateString()}`}>
                    {b.label}
                  </span>
                ))}
              </div>
            </section>
          ) : null}
        </>
      ) : null}

      {editing ? (
        <section className="card stack-10">
          <h2 className="title-18">Edit Profile</h2>
          <label>
            Display Name
            <input
              value={draftName}
              onChange={(e) => setDraftName(e.target.value)}
              maxLength={60}
              placeholder="Your preferred name"
            />
          </label>
          <label>
            Bio <span style={{ opacity: 0.5, fontWeight: 400 }}>(optional, max 300 chars)</span>
            <textarea
              rows={3}
              value={draftBio}
              onChange={(e) => setDraftBio(e.target.value)}
              maxLength={300}
              placeholder="A short intro about yourself..."
              className="input-resize"
            />
          </label>
          <div className="row-8">
            <button onClick={() => void saveEdit()} disabled={saving || !draftName.trim()}>
              {saving ? "Saving..." : "Save"}
            </button>
            <button className="secondary" onClick={() => setEditing(false)} disabled={saving}>
              Cancel
            </button>
          </div>
        </section>
      ) : null}
    </div>
  );
}
