import Link from "next/link";
import { PageTitle } from "@/components/page-title";

export default function OnboardingPage() {
  return (
    <div className="grid" style={{ gap: 14 }}>
      <PageTitle title="Onboarding Checklist" subtitle="Complete these steps to get fully set up" />
      <section className="card" style={{ display: "grid", gap: 10 }}>
        <ol style={{ margin: 0, paddingLeft: 20, display: "grid", gap: 6 }}>
          <li>Activate your account and confirm login works.</li>
          <li>Open <Link href="/activities">Activities</Link> and pick your first lesson.</li>
          <li>Submit your first code in <Link href="/claim">Claim Center</Link>.</li>
          <li>Check XP and level on <Link href="/dashboard">Dashboard</Link>.</li>
          <li>Review events in <Link href="/calendar">Calendar</Link>.</li>
          <li>Join class discussion in <Link href="/chat">Chat</Link>.</li>
          <li>Review raffle ticket balance in <Link href="/raffles">Raffles</Link>.</li>
        </ol>
      </section>
    </div>
  );
}
