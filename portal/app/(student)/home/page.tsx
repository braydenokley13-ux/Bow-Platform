"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { StatCard } from "@/components/stat-card";
import { EmptyState } from "@/components/empty-state";
import { FeedbackBanner } from "@/components/feedback-banner";
import { BowArcade } from "@/components/bow-arcade";
import { apiFetch } from "@/lib/client-api";
import { getFirebaseAuth } from "@/lib/firebase-client";

interface HomeFeedPayload {
  ok: boolean;
  data: {
    my_standing: { rank: number; points: number } | null;
    rewards: { streak_days: number };
  };
}

interface ActiveRaffle {
  raffle_id: string;
  title: string;
  prize: string;
  status: string;
  closes_at?: string;
}

export default function StudentHomePage() {
  const auth = getFirebaseAuth();
  const firebaseUser = auth?.currentUser;
  const displayName =
    firebaseUser?.displayName ??
    firebaseUser?.email?.split("@")[0] ??
    "there";

  const [loading, setLoading] = useState(true);
  const [xp, setXp] = useState<number | null>(null);
  const [streak, setStreak] = useState<number>(0);
  const [raffle, setRaffle] = useState<ActiveRaffle | null | undefined>(undefined);
  const [ticketBalance, setTicketBalance] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const [feedRes, activeRes, balanceRes] = await Promise.allSettled([
          apiFetch<HomeFeedPayload>("/api/me/home-feed"),
          apiFetch<{ ok: boolean; data: { raffle: ActiveRaffle | null } }>("/api/raffles/active"),
          apiFetch<{ ok: boolean; data: { available: number } }>("/api/raffles/me/balance")
        ]);

        if (feedRes.status === "fulfilled") {
          setXp(feedRes.value.data?.my_standing?.points ?? 0);
          setStreak(feedRes.value.data?.rewards?.streak_days ?? 0);
        }
        if (activeRes.status === "fulfilled") {
          setRaffle(activeRes.value.data?.raffle ?? null);
        } else {
          setRaffle(null);
        }
        if (balanceRes.status === "fulfilled") {
          setTicketBalance(balanceRes.value.data?.available ?? 0);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load");
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, []);

  if (loading) return <BowArcade statusMessage="Loading your home\u2026" />;

  return (
    <div className="grid gap-14">
      <header className="stack-4">
        <h1 className="title-24">Hey, {displayName}!</h1>
        <p className="text-muted m-0">Here&apos;s everything you need today.</p>
      </header>

      {error ? <FeedbackBanner kind="error">{error}</FeedbackBanner> : null}

      <div className="grid grid-2">
        <StatCard
          label="Your XP"
          value={xp != null ? `${xp} XP` : "—"}
          hint={streak ? `${streak}-day streak` : "Start your streak today!"}
          accent="brand"
        />
        <StatCard
          label="Raffle Tickets"
          value={ticketBalance != null ? `${ticketBalance} ticket${ticketBalance !== 1 ? "s" : ""}` : "—"}
          hint="1 ticket per 100 XP"
          accent="info"
        />
      </div>

      <section className="card stack-8">
        <h2 className="title-16">Find Activities</h2>
        <p className="m-0 text-muted">Browse lessons and earn XP for completing them.</p>
        <Link href="/activities">Browse activities →</Link>
      </section>

      <section className="card stack-8">
        <h2 className="title-16">Current Raffle</h2>
        {raffle === undefined ? (
          <p className="m-0 text-muted">Loading...</p>
        ) : raffle ? (
          <div className="stack-6">
            <div className="fw-700">{raffle.title}</div>
            <p className="m-0">
              Prize: <strong>{raffle.prize}</strong>
            </p>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <span className="pill">{raffle.status}</span>
              {raffle.closes_at ? (
                <span style={{ fontSize: 12, opacity: 0.55 }}>
                  Closes {new Date(raffle.closes_at).toLocaleDateString()}
                </span>
              ) : null}
            </div>
            <Link href="/raffles">Enter raffle →</Link>
          </div>
        ) : (
          <EmptyState title="No active raffle" body="Check back soon!" />
        )}
      </section>

      <section className="card stack-8">
        <h2 className="title-16">Your Progress</h2>
        <p className="m-0 text-muted">See how far you&apos;ve come across your lessons.</p>
        <Link href="/progress">View progress →</Link>
      </section>
    </div>
  );
}
