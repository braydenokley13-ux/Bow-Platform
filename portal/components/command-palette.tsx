"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { NavItem } from "@/types/ui";

function scoreItem(item: NavItem, query: string) {
  const q = query.toLowerCase().trim();
  if (!q) return 1;
  const label = item.label.toLowerCase();
  const href = item.href.toLowerCase();
  if (label.startsWith(q)) return 5;
  if (label.includes(q)) return 4;
  if (href.includes(q)) return 3;
  if (item.keywords?.some((k) => k.toLowerCase().includes(q))) return 2;
  return 0;
}

export function CommandPalette(props: {
  open: boolean;
  onClose: () => void;
  items: NavItem[];
}) {
  const { open, onClose, items } = props;
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (!open) {
      setQuery("");
      return;
    }

    function onEsc(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }

    window.addEventListener("keydown", onEsc);
    return () => window.removeEventListener("keydown", onEsc);
  }, [open, onClose]);

  const matches = useMemo(() => {
    return items
      .map((item) => ({ item, score: scoreItem(item, query) }))
      .filter((row) => row.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 18)
      .map((row) => row.item);
  }, [items, query]);

  if (!open) return null;

  return (
    <div className="palette-root" role="dialog" aria-modal="true" aria-label="Quick navigation">
      <button type="button" className="palette-backdrop" onClick={onClose} aria-label="Close search" />
      <div className="palette-panel">
        <input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search routes, pages, actions..."
          aria-label="Search routes"
        />

        <div className="palette-results">
          {matches.length === 0 ? <p className="kicker">No routes matched your search.</p> : null}
          {matches.map((item) => (
            <Link key={item.href} href={item.href} onClick={onClose}>
              <span>{item.label}</span>
              <code>{item.href}</code>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
