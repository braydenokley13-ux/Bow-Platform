"use client";

import { useEffect, useState } from "react";
import { PageTitle } from "@/components/page-title";
import { apiFetch } from "@/lib/client-api";

interface ZoomLinkPayload {
  ok: boolean;
  data: {
    url: string | null;
    label?: string;
  };
}

export default function JoinClassPage() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [url, setUrl] = useState<string | null>(null);
  const [label, setLabel] = useState<string>("Join Next Class");

  async function load() {
    setBusy(true);
    setError(null);
    try {
      const res = await apiFetch<ZoomLinkPayload>("/api/settings/zoom-link");
      setUrl(res.data.url ?? null);
      if (res.data.label) setLabel(res.data.label);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load class link");
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  return (
    <div className="grid" style={{ gap: 14 }}>
      <PageTitle
        title="Join Class"
        subtitle="The current Zoom link for BOW Sports Capital live sessions"
      />

      {error ? (
        <section className="card">
          <div className="banner banner-error">{error}</div>
        </section>
      ) : null}

      <section className="card" style={{ textAlign: "center", padding: 32 }}>
        {busy ? (
          <p style={{ margin: 0, opacity: 0.6 }}>Loading class link...</p>
        ) : url ? (
          <>
            <p style={{ margin: "0 0 20px", opacity: 0.7 }}>
              Click the button below to open the Zoom session.
            </p>
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              style={{ textDecoration: "none" }}
            >
              <button style={{ fontSize: 18, padding: "14px 32px" }}>
                {label}
              </button>
            </a>
            <p style={{ margin: "16px 0 0", fontSize: 13, opacity: 0.5 }}>
              Link managed by your instructor — always up to date.
            </p>
          </>
        ) : (
          <p style={{ margin: 0, opacity: 0.6 }}>
            No class link has been set yet. Check back before your next session.
          </p>
        )}
      </section>
    </div>
  );
}
