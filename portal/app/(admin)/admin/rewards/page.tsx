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
    <div className="grid gap-20">
      <PageTitle title="Rewards Catalog" subtitle="Create and manage XP reward items. Fulfill student redemptions." />

      {error && <div className="banner banner-error"><strong>Error:</strong> {error}</div>}

      {/* ── Create / Edit Form ─────────────────────────────────────────── */}
      <section className="card stack-12">
        <h2 className="title-18">{form.reward_id ? "Edit Reward" : "Add New Reward"}</h2>
        <div className="grid grid-2 gap-10">
          <label className="field field-sm">
            Icon (emoji)
            <input className="input-w-70" value={form.icon} onChange={(e) => setForm((f) => ({ ...f, icon: e.target.value }))} maxLength={4} />
          </label>
          <label className="field field-sm">
            Category
            <select value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}>
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </label>
          <label className="field field-sm grid-span-2">
            Title
            <input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} placeholder="e.g. Custom Zoom Background" />
          </label>
          <label className="field field-sm grid-span-2">
            Description
            <textarea className="input-resize" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} rows={2} placeholder="Short description of this reward…" />
          </label>
          <label className="field field-sm">
            XP Cost
            <input type="number" min={0} step={50} value={form.xp_cost} onChange={(e) => setForm((f) => ({ ...f, xp_cost: Number(e.target.value) }))} />
          </label>
          <label className="field field-sm">
            Available to students?
            <select value={form.available ? "yes" : "no"} onChange={(e) => setForm((f) => ({ ...f, available: e.target.value === "yes" }))}>
              <option value="yes">Yes</option>
              <option value="no">No (hidden)</option>
            </select>
          </label>
        </div>
        <div className="row-8-center-wrap">
          <button onClick={() => void save()} disabled={saving || !form.title}>
            {saving ? "Saving…" : form.reward_id ? "Update Reward" : "Add Reward"}
          </button>
          {form.reward_id && (
            <button className="secondary" onClick={() => setForm(EMPTY_FORM)}>Cancel Edit</button>
          )}
          {saveMsg && <span className={`fs-13 ${saveMsg === "Saved!" ? "text-success" : "text-danger"}`}>{saveMsg}</span>}
        </div>
      </section>

      {/* ── Pending Redemptions ────────────────────────────────────────── */}
      <section className="card stack-12">
        <div className="row-10-baseline">
          <h2 className="title-18">Pending Redemptions</h2>
          {pending.length > 0 && (
            <span className="pill pill-status-pending">
              {pending.length} to fulfill
            </span>
          )}
        </div>
        {pending.length === 0 ? (
          <p className="m-0 text-muted">No pending redemptions.</p>
        ) : (
          <div className="table-wrap">
            <table className="table-inline">
              <thead>
                <tr>
                  {["Student", "Reward", "XP Cost", "Requested", "Action"].map((h) => (
                    <th key={h}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pending.map((r) => (
                  <tr key={r.redemption_id}>
                    <td>{r.student_name} <span className="muted-12">({r.student_email})</span></td>
                    <td className="fw-700">{r.reward_title}</td>
                    <td>{r.xp_cost.toLocaleString()} XP</td>
                    <td className="muted-13">
                      {new Date(r.redeemed_at).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                    </td>
                    <td>
                      <button className="btn-sm" onClick={() => void fulfill(r.redemption_id)} disabled={fulfilling === r.redemption_id}>
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
      <section className="card stack-12">
        <div className="row-10-baseline">
          <h2 className="title-18">Current Catalog</h2>
          <button onClick={() => void load()} disabled={busy} className="secondary ml-auto btn-sm">
            {busy ? "Loading…" : "Refresh"}
          </button>
        </div>
        {catalog.length === 0 ? (
          <p className="m-0 text-muted">No rewards in catalog yet.</p>
        ) : (
          <div className="table-wrap">
            <table className="table-inline">
              <thead>
                <tr>
                  {["Icon", "Title", "Category", "XP Cost", "Status", "Edit"].map((h) => (
                    <th key={h}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {catalog.map((item) => (
                  <tr key={item.reward_id}>
                    <td className="fs-20">{item.icon}</td>
                    <td className="fw-700">{item.title}</td>
                    <td><span className="pill">{item.category}</span></td>
                    <td>{item.xp_cost.toLocaleString()} XP</td>
                    <td>
                      <span className={`pill ${item.available ? "pill-status-positive" : "pill-status-muted"}`}>
                        {item.available ? "visible" : "hidden"}
                      </span>
                    </td>
                    <td>
                      <button onClick={() => editReward(item)} className="secondary btn-xs">Edit</button>
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
