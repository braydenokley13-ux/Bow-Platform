import Link from "next/link";

export default function HomePage() {
  return (
    <div className="grid" style={{ gap: 14 }}>
      <section className="card" style={{ display: "grid", gap: 12 }}>
        <h1 style={{ margin: 0 }}>Welcome to BOW Sports Capital Portal</h1>
        <p style={{ margin: 0 }}>
          Use <Link href="/login">Login</Link> if you already have access, or visit
          <Link href="/activate"> Activate</Link> if you were invited.
        </p>
      </section>

      <section className="grid grid-2">
        <Link className="card" href="/home">
          Daily home feed
        </Link>
        <Link className="card" href="/onboarding">
          Student onboarding checklist
        </Link>
        <Link className="card" href="/dashboard">
          Student dashboard
        </Link>
        <Link className="card" href="/activities">
          Activities and modules
        </Link>
        <Link className="card" href="/claim">
          Claim center
        </Link>
        <Link className="card" href="/events">
          Live events
        </Link>
        <Link className="card" href="/pods">
          Team pods
        </Link>
        <Link className="card" href="/quests">
          Quests and rewards
        </Link>
        <Link className="card" href="/raffles">
          Raffle center
        </Link>
        <Link className="card" href="/admin/overview">
          Admin overview
        </Link>
      </section>
    </div>
  );
}
