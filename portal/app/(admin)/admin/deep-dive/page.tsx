"use client";

import { useEffect, useState } from "react";
import { PageTitle } from "@/components/page-title";
import { apiFetch } from "@/lib/client-api";

interface DeepDiveLink {
  link_id: string;
  module_id: string;
  title: string;
  url: string;
  kind: string;
  description?: string;
  xp_reward: number;
}

interface DeepDivePayload {
  ok: boolean;
  data: { links: DeepDiveLink[] };
}

const KINDS = ["article", "video", "podcast", "other"];
const EMPTY_FORM = { module_id: "", title: "", url: "", kind: "article", description: "", xp_reward: 10 };

export default function AdminDeepDivePage() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [links, setLinks] = useState<DeepDiveLink[]>([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function load() {
    setBusy(true);
    setError(null);
    try {
      const res = await apiFetch<DeepDivePayload>("/api/admin/deep-dive");
      setLinks(res.data.links ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load links");
    } finally {
      setBusy(false);
    }
  }

  async function save() {
    setSaving(true);
    setStatusMsg("");
    setError(null);
    try {
      await apiFetch("/api/admin/deep-dive", {
        method: "POST",
        json: { ...form, xp_reward: Number(form.xp_reward) }
      });
      setForm(EMPTY_FORM);
      setStatusMsg("Link added.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    if (!confirm("Delete this link?")) return;
    setDeletingId(id);
    try {
      await apiFetch(`/api/admin/deep-dive/${id}`, { method: "DELETE" });
      setLinks((prev) => prev.filter((l) => l.link_id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setDeletingId(null);
    }
  }

  useEffect(() => { void load(); }, []);

  const f = (k: keyof typeof EMPTY_FORM) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm((prev) => ({ ...prev, [k]: e.target.value }));

  const grouped = links.reduce<Record<string, DeepDiveLink[]>>((acc, l) => {
    (acc[l.module_id] ??= []).push(l);
    return acc;
  }, {});

  return (
    <div className="grid" style={{ gap: 14 }}>
      <PageTitle title="Deep Dive Manager" subtitle="Curate optional reading, video, and podcast links per module" />

      {error ? <section className="card"><div className="banner banner-error">{error}</div></section> : null}
      {statusMsg ? <section className="card"><div className="banner">{statusMsg}</div></section> : null}

      <section className="card" style={{ display: "grid", gap: 10 }}>
        <h2 style={{ margin: 0, fontSize: 16 }}>Add Link</h2>
        <div className="grid grid-2">
          <label>
            Module ID
            <input value={form.module_id} onChange={f("module_id")} placeholder="MOD_101_1" />
          </label>
          <label>
            Type
            <select value={form.kind} onChange={f("kind")}>
              {KINDS.map((k) => <option key={k} value={k}>{k}</option>)}
            </select>
          </label>
          <label>
            Title
            <input value={form.title} onChange={f("title")} placeholder="The Economics of Player Contracts" />
          </label>
          <label>
            URL
            <input value={form.url} onChange={f("url")} placeholder="https://..." type="url" />
          </label>
          <label>
            XP Reward
            <input value={form.xp_reward} onChange={f("xp_reward")} type="number" min={0} max={500} />
          </label>
          <label>
            Description <span style={{ opacity: 0.5, fontWeight: 400 }}>(optional)</span>
            <input value={form.description} onChange={f("description")} placeholder="Short summary..." />
          </label>
        </div>
        <div>
          <button
            onClick={() => void save()}
            disabled={saving || !form.module_id.trim() || !form.title.trim() || !form.url.trim()}
          >
            {saving ? "Adding..." : "Add Link"}
          </button>
        </div>
      </section>

      <section className="card" style={{ display: "flex", gap: 8 }}>
        <button className="secondary" onClick={() => void load()} disabled={busy}>{busy ? "Loading..." : "Refresh"}</button>
        <span style={{ fontSize: 13, opacity: 0.5, alignSelf: "center" }}>{links.length} links total</span>
      </section>

      {Object.entries(grouped).map(([modId, modLinks]) => (
        <section key={modId} className="card" style={{ padding: 0 }}>
          <div style={{ padding: "10px 16px", borderBottom: "1px solid var(--border, #e5e7eb)", fontWeight: 700 }}>{modId}</div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Type</th>
                  <th>XP</th>
                  <th>URL</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {modLinks.map((l) => (
                  <tr key={l.link_id}>
                    <td>{l.title}</td>
                    <td>{l.kind}</td>
                    <td>+{l.xp_reward}</td>
                    <td style={{ maxWidth: 200 }}>
                      <a href={l.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12 }}>
                        {l.url.slice(0, 40)}{l.url.length > 40 ? "…" : ""}
                      </a>
                    </td>
                    <td>
                      <button
                        style={{ padding: "2px 8px", fontSize: 12, background: "#ef4444", color: "#fff", border: "none" }}
                        onClick={() => void remove(l.link_id)}
                        disabled={deletingId === l.link_id}
                      >
                        {deletingId === l.link_id ? "..." : "Delete"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ))}

      {links.length === 0 && !busy ? (
        <section className="card"><p style={{ margin: 0, opacity: 0.6 }}>No links added yet.</p></section>
      ) : null}
    </div>
  );
}
