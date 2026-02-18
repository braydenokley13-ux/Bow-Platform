"use client";

import { FormEvent, useRef, useState } from "react";
import { PageTitle } from "@/components/page-title";
import { apiFetch } from "@/lib/client-api";

interface SpotlightData {
  email: string;
  display_name: string;
  xp: number;
  level: number;
  streak_days: number;
  badges: string[];
  top_badge: string | null;
  league_points: number;
  claims_count: number;
  best_quote: string;
  active_season: string | null;
}

export default function AdminSpotlightPage() {
  const [email, setEmail] = useState("");
  const [data, setData] = useState<SpotlightData | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  async function onSearch(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setData(null);
    try {
      const json = await apiFetch<{ ok: boolean; data: SpotlightData }>(
        `/api/admin/spotlight?email=${encodeURIComponent(email.trim().toLowerCase())}`
      );
      setData(json.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load spotlight");
    } finally {
      setBusy(false);
    }
  }

  async function copyCard() {
    if (!cardRef.current) return;
    try {
      if (typeof ClipboardItem !== "undefined") {
        const html = cardRef.current.outerHTML;
        const blob = new Blob([html], { type: "text/html" });
        await navigator.clipboard.write([new ClipboardItem({ "text/html": blob })]);
        alert("Card HTML copied to clipboard.");
      } else {
        await navigator.clipboard.writeText(cardRef.current.innerText);
        alert("Card text copied to clipboard.");
      }
    } catch {
      alert("Could not copy card automatically — use screenshot instead.");
    }
  }

  return (
    <div className="grid" style={{ gap: 14 }}>
      <PageTitle
        title="Student Spotlight"
        subtitle="Generate a shareable highlight card for any student — screenshot and post to class feed or Zoom"
      />

      <form className="card" onSubmit={(e) => void onSearch(e)} style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-end" }}>
        <label style={{ flex: 1, minWidth: 240 }}>
          Student email
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="student@example.com"
            required
          />
        </label>
        <button disabled={busy}>{busy ? "Loading..." : "Generate spotlight"}</button>
      </form>

      {error ? <div className="banner banner-error">{error}</div> : null}

      {data ? (
        <>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button onClick={() => void copyCard()}>Copy card</button>
            <span style={{ color: "var(--muted)", fontSize: 13, lineHeight: "32px" }}>
              Tip: screenshot the card below and share in Zoom or the class feed.
            </span>
          </div>

          {/* Spotlight card — designed to be screenshot-friendly */}
          <div
            ref={cardRef}
            className="card"
            style={{
              maxWidth: 520,
              background: "linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 100%)",
              border: "2px solid #f59e0b",
              borderRadius: 16,
              padding: "28px 32px",
              display: "grid",
              gap: 16,
              color: "#fff"
            }}
          >
            {/* Header */}
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <div
                style={{
                  width: 60,
                  height: 60,
                  borderRadius: "50%",
                  background: "#f59e0b",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 24,
                  fontWeight: 900,
                  color: "#000",
                  flexShrink: 0
                }}
              >
                {data.display_name.charAt(0).toUpperCase()}
              </div>
              <div>
                <div style={{ fontSize: 22, fontWeight: 800, lineHeight: 1.2 }}>{data.display_name}</div>
                <div style={{ fontSize: 13, color: "#f59e0b", marginTop: 2 }}>
                  Level {data.level} · {data.active_season ?? "BOW Portal"}
                </div>
              </div>
              {data.top_badge && (
                <div
                  style={{
                    marginLeft: "auto",
                    background: "#f59e0b",
                    color: "#000",
                    borderRadius: 8,
                    padding: "4px 10px",
                    fontSize: 11,
                    fontWeight: 800,
                    textTransform: "uppercase",
                    letterSpacing: 1
                  }}
                >
                  {data.top_badge}
                </div>
              )}
            </div>

            {/* Stats grid */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
              {[
                { label: "Total XP", value: data.xp.toLocaleString() },
                { label: "League Pts", value: data.league_points.toLocaleString() },
                { label: "Day Streak", value: data.streak_days },
                { label: "Claims", value: data.claims_count },
                { label: "Badges", value: data.badges.length },
                { label: "Level", value: data.level }
              ].map(({ label, value }) => (
                <div
                  key={label}
                  style={{
                    background: "rgba(255,255,255,0.07)",
                    borderRadius: 10,
                    padding: "10px 12px",
                    textAlign: "center"
                  }}
                >
                  <div style={{ fontSize: 22, fontWeight: 800 }}>{value}</div>
                  <div style={{ fontSize: 11, color: "#aaa", marginTop: 2, textTransform: "uppercase", letterSpacing: 0.5 }}>{label}</div>
                </div>
              ))}
            </div>

            {/* Quote */}
            {data.best_quote ? (
              <div
                style={{
                  borderLeft: "3px solid #f59e0b",
                  paddingLeft: 14,
                  color: "#ccc",
                  fontSize: 13,
                  fontStyle: "italic",
                  lineHeight: 1.6
                }}
              >
                &ldquo;{data.best_quote}&rdquo;
              </div>
            ) : null}

            {/* Footer */}
            <div style={{ textAlign: "center", fontSize: 11, color: "#555", letterSpacing: 1, textTransform: "uppercase" }}>
              BOW Sports Capital Portal
            </div>
          </div>

          {/* Raw stats for reference */}
          <section className="card table-wrap">
            <div style={{ fontWeight: 700, marginBottom: 8 }}>Badges earned</div>
            {data.badges.length > 0 ? (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {data.badges.map((b) => (
                  <span key={b} className="pill">{b}</span>
                ))}
              </div>
            ) : (
              <span style={{ color: "var(--muted)", fontSize: 13 }}>No badges yet.</span>
            )}
          </section>
        </>
      ) : null}
    </div>
  );
}
