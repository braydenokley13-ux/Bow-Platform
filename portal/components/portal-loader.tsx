"use client";

import { useEffect, useState } from "react";

const MESSAGES = [
  "Loading the playbook\u2026",
  "Crunching the numbers\u2026",
  "Reviewing the tape\u2026",
  "Lacing up\u2026",
  "Taking the field\u2026"
];

export function PortalLoader({ message }: { message?: string }) {
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    if (message) return;
    const id = setInterval(() => setIdx((i) => (i + 1) % MESSAGES.length), 2200);
    return () => clearInterval(id);
  }, [message]);

  return (
    <div className="portal-loader" aria-busy="true" aria-live="polite" aria-label="Loading">
      <div className="portal-loader-body">
        <div className="bow-wordmark" aria-hidden="true">
          <span className="bow-letter bow-letter-1">B</span>
          <span className="bow-letter bow-letter-2">O</span>
          <span className="bow-letter bow-letter-3">W</span>
        </div>

        <div className="loader-ring" aria-hidden="true" />

        <div className="loader-dots" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>

        <p className="loader-msg">{message ?? MESSAGES[idx]}</p>
      </div>
    </div>
  );
}
