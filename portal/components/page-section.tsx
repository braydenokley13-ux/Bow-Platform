export function PageSection(props: {
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <section className="card page-section">
      {props.title ? (
        <header className="page-section-head">
          <div>
            <h2>{props.title}</h2>
            {props.subtitle ? <p>{props.subtitle}</p> : null}
          </div>
          {props.actions ? <div>{props.actions}</div> : null}
        </header>
      ) : null}
      {props.children}
    </section>
  );
}
