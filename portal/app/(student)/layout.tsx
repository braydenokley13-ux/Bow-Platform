import { SessionGuard } from "@/components/session-guard";
import { AnnouncementBanner } from "@/components/announcement-banner";

export default function StudentLayout({ children }: { children: React.ReactNode }) {
  return (
    <SessionGuard>
      <AnnouncementBanner />
      {children}
    </SessionGuard>
  );
}
