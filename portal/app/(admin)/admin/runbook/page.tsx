import { PageTitle } from "@/components/page-title";

export default function AdminRunbookPage() {
  return (
    <div className="grid" style={{ gap: 14 }}>
      <PageTitle
        title="Instructor Runbook"
        subtitle="Manual fallback steps for launch week incidents"
      />

      <section className="card" style={{ display: "grid", gap: 10 }}>
        <h2 style={{ margin: 0, fontSize: 18 }}>1. Claim Flow Fails</h2>
        <ol style={{ margin: "0 0 0 20px", padding: 0, display: "grid", gap: 6 }}>
          <li>Capture student email, code, track, module, and lesson.</li>
          <li>Check `Claim_Codes` for code existence and `is_used` status.</li>
          <li>If valid but failed, add a manual `XP_Ledger` row and mark code used when required.</li>
          <li>Run `recomputeCompletionAndPasses()` then `rebuildLeaderboards()` in Apps Script.</li>
          <li>Create a support ticket note with root cause and remediation.</li>
        </ol>
      </section>

      <section className="card" style={{ display: "grid", gap: 10 }}>
        <h2 style={{ margin: 0, fontSize: 18 }}>2. Raffle Entry Issues</h2>
        <ol style={{ margin: "0 0 0 20px", padding: 0, display: "grid", gap: 6 }}>
          <li>Confirm one raffle is `ACTIVE` in `Raffles` sheet.</li>
          <li>Check student ticket balance (`floor(net_xp/100)` plus ticket ledger adjustments).</li>
          <li>If needed, enqueue `ADJUST_TICKETS` action and run from Action Queue.</li>
          <li>If draw fails, retry close/draw from admin raffle panel once.</li>
          <li>If still blocked, manually close raffle row and publish winner from entries export.</li>
        </ol>
      </section>

      <section className="card" style={{ display: "grid", gap: 10 }}>
        <h2 style={{ margin: 0, fontSize: 18 }}>3. Portal Outage Fallback</h2>
        <ol style={{ margin: "0 0 0 20px", padding: 0, display: "grid", gap: 6 }}>
          <li>Switch class operations to existing form + sheets flow immediately.</li>
          <li>Continue collecting claims through Finish Form response tab.</li>
          <li>Track temporary manual actions in `Ops_Log` for later replay.</li>
          <li>After recovery, backfill portal-only actions (support tickets, notifications).</li>
        </ol>
      </section>

      <section className="card" style={{ display: "grid", gap: 10 }}>
        <h2 style={{ margin: 0, fontSize: 18 }}>4. Daily Launch Checklist</h2>
        <ul style={{ margin: 0, paddingLeft: 18, display: "grid", gap: 6 }}>
          <li>Open Admin Overview and confirm launch health card shows low errors.</li>
          <li>Check Support Queue for unresolved HIGH priority tickets.</li>
          <li>Verify active raffle state and entry flow with one test account.</li>
          <li>Review Ops/Audit logs for repeated failures before class begins.</li>
        </ul>
      </section>
    </div>
  );
}
