import { SessionGuard } from "@/components/session-guard";
import { AnnouncementBanner } from "@/components/announcement-banner";
import { AppShell } from "@/components/app-shell";

export default function StudentLayout({ children }: { children: React.ReactNode }) {
  return (
    <SessionGuard>
      <AppShell role="STUDENT" banner={<AnnouncementBanner />}>
        {children}
      </AppShell>
    </SessionGuard>
  );
}
