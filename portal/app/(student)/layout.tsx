import type { ReactNode } from "react";
import { SessionGuard } from "@/components/session-guard";
import { AnnouncementBanner } from "@/components/announcement-banner";
import { AppShell } from "@/components/app-shell";

export default function StudentLayout({ children }: { children: ReactNode }) {
  return (
    <SessionGuard>
      <AppShell role="STUDENT" banner={<AnnouncementBanner />}>
        {children}
      </AppShell>
    </SessionGuard>
  );
}
