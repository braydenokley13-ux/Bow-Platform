import { LoadingSkeleton } from "@/components/loading-skeleton";

export default function StudentLoading() {
  return (
    <main id="app-content" className="public-shell">
      <div className="public-shell-inner grid gap-lg">
        <LoadingSkeleton lines={2} />
        <LoadingSkeleton lines={6} title={false} />
      </div>
    </main>
  );
}
