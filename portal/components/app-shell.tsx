"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { roleNavigation, flattenSections, findLabelForPath } from "@/components/navigation-config";
import { Sidebar } from "@/components/sidebar";
import { TopBar } from "@/components/top-bar";
import { CommandPalette } from "@/components/command-palette";
import type { NavSection } from "@/types/ui";

function roleLabel(role: "STUDENT" | "ADMIN") {
  return role === "ADMIN" ? "Admin" : "Student";
}

export function AppShell(props: {
  role: "STUDENT" | "ADMIN";
  children: React.ReactNode;
  banner?: React.ReactNode;
}) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);

  const sections: NavSection[] = roleNavigation[props.role];
  const quickLinks = useMemo(() => flattenSections(sections), [sections]);
  const title = useMemo(() => findLabelForPath(pathname, sections), [pathname, sections]);

  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  useEffect(() => {
    function onShortcut(e: KeyboardEvent) {
      const key = e.key.toLowerCase();
      const isCmd = e.metaKey || e.ctrlKey;
      if (isCmd && key === "k") {
        e.preventDefault();
        setPaletteOpen(true);
      }
    }

    window.addEventListener("keydown", onShortcut);
    return () => window.removeEventListener("keydown", onShortcut);
  }, []);

  return (
    <div className="app-shell">
      <Sidebar
        sections={sections}
        pathname={pathname}
        mobileOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        roleLabel={roleLabel(props.role)}
      />

      <div className="shell-main">
        <TopBar
          title={title}
          subtitle={props.role === "ADMIN" ? "Operations, analytics, and curriculum control" : "Daily wins and next best actions"}
          onOpenSidebar={() => setSidebarOpen(true)}
          onOpenPalette={() => setPaletteOpen(true)}
        />

        <section id="app-content" className="content-frame">
          {props.banner}
          <div className="route-content">{props.children}</div>
        </section>
      </div>

      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} items={quickLinks} />
    </div>
  );
}
