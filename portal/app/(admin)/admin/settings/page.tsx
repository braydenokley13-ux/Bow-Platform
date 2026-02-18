"use client";

import { useEffect, useState } from "react";
import { PageTitle } from "@/components/page-title";
import { apiFetch } from "@/lib/client-api";

interface ZoomLinkPayload {
  ok: boolean;
  data: { url: string | null };
}

export default function AdminSettingsPage() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusMsg, setStatusMsg] = useState("");
  const [zoomUrl, setZoomUrl] = useState("");

  async function load() {
    setBusy(true);
    setError(null);
    try {
      const res = await apiFetch<ZoomLinkPayload>("/api/admin/settings/zoom-link");
      setZoomUrl(res.data.url ?? "");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load settings");
    } finally {
      setBusy(false);
    }
  }

  async function saveZoomLink() {
    setBusy(true);
    setStatusMsg("");
    setError(null);
    try {
      await apiFetch("/api/admin/settings/zoom-link", {
        method: "POST",
        json: { url: zoomUrl.trim() }
      });
      setStatusMsg("Zoom link saved. Students will see the updated link immediately.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save Zoom link");
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  return (
    <div className="grid gap-14">
      <PageTitle
        title="Portal Settings"
        subtitle="Global configuration visible to students"
      />

      {error ? (
        <section className="card">
          <div className="banner banner-error">{error}</div>
        </section>
      ) : null}

      {statusMsg ? (
        <section className="card">
          <div className="banner">{statusMsg}</div>
        </section>
      ) : null}

      <section className="card stack-10">
        <h2 className="title-18">Zoom / Class Link</h2>
        <p style={{ margin: 0, opacity: 0.7, fontSize: 14 }}>
          Students see a {'"'}Join Next Class{'"'} button that always points here. Update it whenever the link changes.
        </p>
        <label>
          Zoom URL
          <input
            type="url"
            value={zoomUrl}
            onChange={(e) => setZoomUrl(e.target.value)}
            placeholder="https://zoom.us/j/..."
            style={{ width: "100%" }}
          />
        </label>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => void saveZoomLink()} disabled={busy}>
            {busy ? "Saving..." : "Save Zoom Link"}
          </button>
          {zoomUrl ? (
            <button className="secondary" onClick={() => setZoomUrl("")}>
              Clear
            </button>
          ) : null}
        </div>
      </section>
    </div>
  );
}
