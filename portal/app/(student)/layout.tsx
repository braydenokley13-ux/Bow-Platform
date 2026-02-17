import { SessionGuard } from "@/components/session-guard";

export default function StudentLayout({ children }: { children: React.ReactNode }) {
  return <SessionGuard>{children}</SessionGuard>;
}
