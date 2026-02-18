"use client";

import dynamic from "next/dynamic";

const AuthStatus = dynamic(
  () => import("@/components/auth-status").then((mod) => mod.AuthStatus),
  {
    ssr: false,
    loading: () => <span className="pill">Auth...</span>
  }
);

const DarkModeToggle = dynamic(
  () => import("@/components/dark-mode-toggle").then((mod) => mod.DarkModeToggle),
  {
    ssr: false
  }
);

export function TopBar(props: {
  title: string;
  subtitle?: string;
  onOpenSidebar: () => void;
  onOpenPalette: () => void;
}) {
  return (
    <header className="topbar">
      <div className="topbar-row">
        <button
          type="button"
          className="icon-button mobile-only"
          onClick={props.onOpenSidebar}
          aria-label="Open navigation"
        >
          ☰
        </button>

        <div>
          <p className="kicker">Performance-first portal</p>
          <h1 className="topbar-title">{props.title}</h1>
          {props.subtitle ? <p className="topbar-subtitle">{props.subtitle}</p> : null}
        </div>

        <div className="topbar-actions">
          <button type="button" className="secondary" onClick={props.onOpenPalette}>
            Search (Cmd/Ctrl+K)
          </button>
          <DarkModeToggle />
          <AuthStatus />
        </div>
      </div>
    </header>
  );
}
