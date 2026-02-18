import Link from "next/link";

export default function HomePage() {
  return (
    <main id="app-content" className="public-shell">
      <div className="public-shell-inner grid gap-lg">
        <section className="card public-hero">
          <h1>Welcome to BOW Sports Capital Portal</h1>
          <p>
            Use <Link href="/login">Login</Link> if you already have access, or visit
            <Link href="/activate"> Activate</Link> if you were invited.
          </p>
        </section>

        <section className="grid grid-2 page-links">
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
    </main>
  );
}
