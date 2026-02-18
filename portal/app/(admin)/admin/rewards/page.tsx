"use client";

import { useEffect, useState } from "react";
import { PageTitle } from "@/components/page-title";
import { apiFetch } from "@/lib/client-api";

interface RewardItem {
  reward_id: string;
  title: string;
  description: string;
  xp_cost: number;
  category: string;
  available: boolean;
  icon: string;
}

interface Redemption {
  redemption_id: string;
  student_email: string;
  student_name: string;
  reward_id: string;
  reward_title: string;
  xp_cost: number;
  status: string;
  redeemed_at: string;
}

interface AdminRewardsPayload {
  ok: boolean;
  data: {
    catalog: RewardItem[];
    redemptions: Redemption[];
  };
}

const CATEGORIES = ["recognition", "content", "custom", "social"];

const EMPTY_FORM: Omit<RewardItem, "reward_id"> = {
  title: "",
  description: "",
  xp_cost: 500,
  category: "recognition",
  available: true,
  icon: "🎁",
};

export default function AdminRewardsPage() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [payload, setPayload] = useState<AdminRewardsPayload | null>(null);
  const [form, setForm] = useState<Omit<RewardItem, "reward_id"> & { reward_id?: string }>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);
  const [fulfilling, setFulfilling] = useState<string | null>(null);

  async function load() {
    setBusy(true);
    setError(null);
    try {
      const json = await apiFetch<AdminRewardsPayload>("/api/admin/rewards");
      setPayload(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setBusy(false);
    }
  }

  async function save() {
    setSaving(true);
    setSaveMsg(null);
    try {
      await apiFetch("/api/admin/rewards", { method: "POST", body: JSON.stringify(form) });
      setSaveMsg("Saved!");
      setForm(EMPTY_FORM);
      void load();
    } catch (err) {
      setSaveMsg(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function fulfill(redemptionId: string) {
    setFulfilling(redemptionId);
    try {
      await apiFetch("/api/admin/rewards/fulfill", { method: "POST", body: JSON.stringify({ redemption_id: redemptionId }) });
      void load();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Fulfillment failed");
    } finally {
      setFulfilling(null);
    }
  }

  function editReward(r: RewardItem) {
    setForm({ ...r });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  useEffect(() => { void load(); }, []);

  const catalog = payload?.data.catalog ?? [];
  const redemptions = payload?.data.redemptions ?? [];
  const pending = redemptions.filter((r) => r.status === "pending");

  return (
    <div className="grid" style={{ gap: 20 }}>
      <PageTitle title="Rewards Catalog" subtitle="Create and manage XP reward items. Fulfill student redemptions." />

      {error && <div className="banner banner-error"><strong>Error:</strong> {error}</div>}

      {/* ── Create / Edit Form ─────────────────────────────────────────── */}
      <section className="card" style={{ display: "grid", gap: 12 }}>
        <h2 style={{ margin: 0, fontSize: 18 }}>{form.reward_id ? "Edit Reward" : "Add New Reward"}</h2>
        <div className="grid grid-2" style={{ gap: 10 }}>
          <label style={{ display: "grid", gap: 4, fontSize: 13 }}>
            Icon (emoji)
            <input value={form.icon} onChange={(e) => setForm((f) => ({ ...f, icon: e.target.value }))} maxLength={4} style={{ width: 70 }} />
          </label>
          <label style={{ display: "grid", gap: 4, fontSize: 13 }}>
            Category
            <select value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}>
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </label>
          <label style={{ display: "grid", gap: 4, fontSize: 13, gridColumn: "span 2" }}>
            Title
            <input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} placeholder="e.g. Custom Zoom Background" />
          </label>
          <label style={{ display: "grid", gap: 4, fontSize: 13, gridColumn: "span 2" }}>
            Description
            <textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} rows={2} placeholder="Short description of this reward…" style={{ resize: "vertical" }} />
          </label>
          <label style={{ display: "grid", gap: 4, fontSize: 13 }}>
            XP Cost
            <input type="number" min={0} step={50} value={form.xp_cost} onChange={(e) => setForm((f) => ({ ...f, xp_cost: Number(e.target.value) }))} />
          </label>
          <label style={{ display: "grid", gap: 4, fontSize: 13 }}>
            Available to students?
            <select value={form.available ? "yes" : "no"} onChange={(e) => setForm((f) => ({ ...f, available: e.target.value === "yes" }))}>
              <option value="yes">Yes</option>
              <option value="no">No (hidden)</option>
            </select>
          </label>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <button onClick={() => void save()} disabled={saving || !form.title}>
            {saving ? "Saving…" : form.reward_id ? "Update Reward" : "Add Reward"}
          </button>
          {form.reward_id && (
            <button className="secondary" onClick={() => setForm(EMPTY_FORM)}>Cancel Edit</button>
          )}
          {saveMsg && <span style={{ fontSize: 13, color: saveMsg === "Saved!" ? "#0d7a4f" : "var(--danger)" }}>{saveMsg}</span>}
        </div>
      </section>

      {/* ── Pending Redemptions ────────────────────────────────────────── */}
      <section className="card" style={{ display: "grid", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
          <h2 style={{ margin: 0, fontSize: 18 }}>Pending Redemptions</h2>
          {pending.length > 0 && (
            <span className="pill" style={{ background: "#fef3c7", borderColor: "#d97706", color: "#92400e" }}>
              {pending.length} to fulfill
            </span>
          )}
        </div>
        {pending.length === 0 ? (
          <p style={{ color: "var(--muted)", margin: 0 }}>No pending redemptions.</p>
        ) : (
          <div className="table-wrap">
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
              <thead>
                <tr style={{ borderBottom: "2px solid var(--border)" }}>
                  {["Student", "Reward", "XP Cost", "Requested", "Action"].map((h) => (
                    <th key={h} style={{ textAlign: "left", padding: "6px 8px", color: "var(--muted)", fontWeight: 600 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pending.map((r) => (
                  <tr key={r.redemption_id} style={{ borderBottom: "1px solid var(--border)" }}>
                    <td style={{ padding: "8px 8px" }}>{r.student_name} <span style={{ color: "var(--muted)", fontSize: 12 }}>({r.student_email})</span></td>
                    <td style={{ padding: "8px 8px", fontWeight: 600 }}>{r.reward_title}</td>
                    <td style={{ padding: "8px 8px" }}>{r.xp_cost.toLocaleString()} XP</td>
                    <td style={{ padding: "8px 8px", color: "var(--muted)", fontSize: 13 }}>
                      {new Date(r.redeemed_at).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                    </td>
                    <td style={{ padding: "8px 8px" }}>
                      <button onClick={() => void fulfill(r.redemption_id)} disabled={fulfilling === r.redemption_id} style={{ fontSize: 13, padding: "4px 10px" }}>
                        {fulfilling === r.redemption_id ? "…" : "Mark Fulfilled"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* ── Catalog ────────────────────────────────────────────────────── */}
      <section className="card" style={{ display: "grid", gap: 12 }}>
        <div style={{ display: "flex", gap: 10, alignItems: "baseline" }}>
          <h2 style={{ margin: 0, fontSize: 18 }}>Current Catalog</h2>
          <button onClick={() => void load()} disabled={busy} className="secondary" style={{ marginLeft: "auto", fontSize: 13, padding: "4px 10px" }}>
            {busy ? "Loading…" : "Refresh"}
          </button>
        </div>
        {catalog.length === 0 ? (
          <p style={{ color: "var(--muted)", margin: 0 }}>No rewards in catalog yet.</p>
        ) : (
          <div className="table-wrap">
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
              <thead>
                <tr style={{ borderBottom: "2px solid var(--border)" }}>
                  {["Icon", "Title", "Category", "XP Cost", "Status", "Edit"].map((h) => (
                    <th key={h} style={{ textAlign: "left", padding: "6px 8px", color: "var(--muted)", fontWeight: 600 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {catalog.map((item) => (
                  <tr key={item.reward_id} style={{ borderBottom: "1px solid var(--border)" }}>
                    <td style={{ padding: "8px 8px", fontSize: 20 }}>{item.icon}</td>
                    <td style={{ padding: "8px 8px", fontWeight: 600 }}>{item.title}</td>
                    <td style={{ padding: "8px 8px" }}><span className="pill">{item.category}</span></td>
                    <td style={{ padding: "8px 8px" }}>{item.xp_cost.toLocaleString()} XP</td>
                    <td style={{ padding: "8px 8px" }}>
                      <span className="pill" style={{ color: item.available ? "#0d7a4f" : "var(--muted)", borderColor: item.available ? "#0d7a4f55" : "var(--border)" }}>
                        {item.available ? "visible" : "hidden"}
                      </span>
                    </td>
                    <td style={{ padding: "8px 8px" }}>
                      <button onClick={() => editReward(item)} className="secondary" style={{ fontSize: 12, padding: "3px 8px" }}>Edit</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
