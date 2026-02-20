import type { ReactNode } from "react";

export function PageSection(props: {
  title?: string;
  subtitle?: string;
  children: ReactNode;
  actions?: ReactNode;
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
