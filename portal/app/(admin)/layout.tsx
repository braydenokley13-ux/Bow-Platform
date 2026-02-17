import { SessionGuard } from "@/components/session-guard";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <SessionGuard requireAdmin>{children}</SessionGuard>;
}
