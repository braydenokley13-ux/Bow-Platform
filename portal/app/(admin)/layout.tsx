import { SessionGuard } from "@/components/session-guard";
import { AppShell } from "@/components/app-shell";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <SessionGuard requireAdmin>
      <AppShell role="ADMIN">{children}</AppShell>
    </SessionGuard>
  );
}
