"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "bow-theme";

export function DarkModeToggle() {
  const [dark, setDark] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    const prefersDark =
      stored === "dark" ||
      (stored === null && window.matchMedia("(prefers-color-scheme: dark)").matches);
    if (prefersDark) {
      document.documentElement.setAttribute("data-theme", "dark");
      setDark(true);
    }
    setMounted(true);
  }, []);

  function toggle() {
    const next = !dark;
    setDark(next);
    localStorage.setItem(STORAGE_KEY, next ? "dark" : "light");
    document.documentElement.setAttribute("data-theme", next ? "dark" : "light");
  }

  if (!mounted) return null;

  return (
    <button
      className="secondary"
      onClick={toggle}
      style={{ fontSize: 13, padding: "3px 10px" }}
      aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
    >
      {dark ? "☀ Light" : "☾ Dark"}
    </button>
  );
}
