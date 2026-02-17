export function PageTitle(props: { title: string; subtitle?: string }) {
  return (
    <section style={{ marginBottom: 16 }}>
      <div className="kicker">BOW Sports Capital</div>
      <h1 style={{ margin: "6px 0 8px", fontSize: 28 }}>{props.title}</h1>
      {props.subtitle ? <p style={{ margin: 0, color: "var(--muted)" }}>{props.subtitle}</p> : null}
    </section>
  );
}
