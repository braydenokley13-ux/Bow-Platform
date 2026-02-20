import type { ReactNode } from "react";
import { SessionGuard } from "@/components/session-guard";
import { AppShell } from "@/components/app-shell";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <SessionGuard requireAdmin>
      <AppShell role="ADMIN">{children}</AppShell>
    </SessionGuard>
  );
}
