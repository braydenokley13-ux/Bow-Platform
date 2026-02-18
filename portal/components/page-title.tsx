export function PageTitle(props: { title: string; subtitle?: string }) {
  return (
    <section className="page-title">
      <div className="kicker">BOW Sports Capital</div>
      <h1>{props.title}</h1>
      {props.subtitle ? <p>{props.subtitle}</p> : null}
    </section>
  );
}
