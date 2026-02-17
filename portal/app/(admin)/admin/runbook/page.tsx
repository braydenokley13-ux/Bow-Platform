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
          <li>Open Launch Center and run smoke checks at least once before class starts.</li>
          <li>Open Content Validation and confirm there are zero ERROR-level issues.</li>
          <li>Check Support Queue for unresolved HIGH priority tickets.</li>
          <li>Verify active raffle state and entry flow with one test account.</li>
          <li>Review Ops/Audit logs for repeated failures before class begins.</li>
        </ul>
      </section>

      <section className="card" style={{ display: "grid", gap: 10 }}>
        <h2 style={{ margin: 0, fontSize: 18 }}>5. Manual Backup Steps (Do this every day in launch week)</h2>
        <ol style={{ margin: "0 0 0 20px", padding: 0, display: "grid", gap: 6 }}>
          <li>Open the production Google Sheet.</li>
          <li>Click File, then Make a copy.</li>
          <li>Name it with date and time, example: `BOW_BACKUP_2026-03-01_0800_ET`.</li>
          <li>Store backup copy in a dedicated Backup folder in Google Drive.</li>
          <li>Verify the copy has these tabs: `Claim_Codes`, `XP_Ledger`, `Users`, `Credentials`, `Raffles`, `Raffle_Entries`, `Raffle_Ticket_Ledger`.</li>
        </ol>
      </section>

      <section className="card" style={{ display: "grid", gap: 10 }}>
        <h2 style={{ margin: 0, fontSize: 18 }}>6. CSV Export Steps (if you need offline snapshots)</h2>
        <ol style={{ margin: "0 0 0 20px", padding: 0, display: "grid", gap: 6 }}>
          <li>Open each critical tab one-by-one in Google Sheets.</li>
          <li>Click File, Download, Comma-separated values (.csv, current sheet).</li>
          <li>Save files with timestamp, example: `XP_Ledger_2026-03-01_0800_ET.csv`.</li>
          <li>Repeat for `Users`, `Credentials`, `Raffles`, and `Support_Tickets`.</li>
          <li>Upload CSV files into your backup folder so they are grouped with the sheet copy.</li>
        </ol>
      </section>
    </div>
  );
}
