export function StatCard(props: {
  label: string;
  value: string | number;
  hint?: string;
  accent?: "brand" | "info" | "success" | "danger";
}) {
  return (
    <article className={`card stat-card ${props.accent || "brand"}`}>
      <p className="kicker">{props.label}</p>
      <h3>{props.value}</h3>
      {props.hint ? <p className="stat-hint">{props.hint}</p> : null}
    </article>
  );
}
