"use client";

import Link from "next/link";
import type { NavSection } from "@/types/ui";

function isActive(pathname: string, href: string) {
  if (pathname === href) return true;
  return pathname.startsWith(href + "/");
}

export function Sidebar(props: {
  id: string;
  sections: NavSection[];
  pathname: string;
  mobileOpen: boolean;
  onClose: () => void;
  roleLabel: string;
}) {
  return (
    <>
      <button
        type="button"
        className={`sidebar-overlay${props.mobileOpen ? " open" : ""}`}
        onClick={props.onClose}
        aria-label="Close navigation"
        aria-hidden={!props.mobileOpen}
        tabIndex={props.mobileOpen ? 0 : -1}
      />

      <aside id={props.id} className={`sidebar${props.mobileOpen ? " open" : ""}`} aria-label={`${props.roleLabel} navigation`}>
        <div className="sidebar-head">
          <div className="logo-block" aria-hidden />
          <div>
            <p className="sidebar-kicker">BOW Sports Capital</p>
            <h2>{props.roleLabel} Console</h2>
          </div>
        </div>

        <nav className="sidebar-nav">
          {props.sections.map((section) => (
            <details key={section.key} className="sidebar-group" open>
              <summary>{section.title}</summary>
              <div className="sidebar-links">
                {section.items.map((item) => {
                  const active = isActive(props.pathname, item.href);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={active ? "active" : ""}
                      aria-current={active ? "page" : undefined}
                      onClick={props.onClose}
                    >
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            </details>
          ))}
        </nav>
      </aside>
    </>
  );
}
