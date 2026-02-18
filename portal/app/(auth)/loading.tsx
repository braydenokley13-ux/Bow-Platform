import { LoadingSkeleton } from "@/components/loading-skeleton";

export default function AuthLoading() {
  return (
    <main id="app-content" className="auth-shell">
      <div className="auth-shell-inner">
        <LoadingSkeleton lines={4} />
      </div>
    </main>
  );
}
