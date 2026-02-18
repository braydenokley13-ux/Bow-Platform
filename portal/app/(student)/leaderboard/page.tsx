"use client";

import { useState } from "react";
import { PageTitle } from "@/components/page-title";
import { FetchPanel } from "@/components/fetch-panel";

export default function LeaderboardPage() {
  const [track, setTrack] = useState("all");
  return (
    <div className="grid gap-14">
      <PageTitle title="Leaderboard" subtitle="Overall and track-specific standings" />
      <section className="card max-w-320">
        <label>
          Track
          <select value={track} onChange={(e) => setTrack(e.target.value)}>
            <option value="all">All</option>
            <option value="101">101</option>
            <option value="201">201</option>
            <option value="301">301</option>
          </select>
        </label>
      </section>
      <FetchPanel endpoint={`/api/leaderboard?track=${track}`} title="Leaderboard data" />
    </div>
  );
}
