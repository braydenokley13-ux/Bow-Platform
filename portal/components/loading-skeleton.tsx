export function LoadingSkeleton(props?: { lines?: number; title?: boolean }) {
  const lines = props?.lines ?? 3;

  return (
    <div className="card" aria-busy="true" aria-live="polite">
      {props?.title === false ? null : <div className="skeleton sk-title" />}
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className="skeleton sk-line" />
      ))}
    </div>
  );
}
