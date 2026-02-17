import React from "react";

function isPrimitive(v: unknown): v is string | number | boolean | null {
  return v === null || ["string", "number", "boolean"].includes(typeof v);
}

function objectEntries(v: unknown): Array<[string, unknown]> {
  if (!v || typeof v !== "object" || Array.isArray(v)) return [];
  return Object.entries(v as Record<string, unknown>);
}

function renderPrimitive(v: unknown) {
  if (v === null) return "null";
  if (v === undefined) return "undefined";
  if (typeof v === "boolean") return v ? "true" : "false";
  return String(v);
}

function TableFromObjects({ rows }: { rows: Array<Record<string, unknown>> }) {
  const columns = Array.from(new Set(rows.flatMap((r) => Object.keys(r))));
  if (!columns.length) return <p style={{ margin: 0 }}>No rows.</p>;

  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            {columns.map((c) => (
              <th key={c}>{c}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, idx) => (
            <tr key={idx}>
              {columns.map((c) => (
                <td key={c}>{renderPrimitive(r[c])}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function DataView({ value }: { value: unknown }) {
  if (value === null || value === undefined) {
    return <p style={{ margin: 0 }}>No data.</p>;
  }

  if (Array.isArray(value)) {
    if (!value.length) return <p style={{ margin: 0 }}>No data.</p>;

    if (value.every((v) => v && typeof v === "object" && !Array.isArray(v))) {
      return <TableFromObjects rows={value as Array<Record<string, unknown>>} />;
    }

    return (
      <ul style={{ margin: 0, paddingLeft: 18 }}>
        {value.map((v, i) => (
          <li key={i}>{renderPrimitive(v)}</li>
        ))}
      </ul>
    );
  }

  if (typeof value === "object") {
    const entries = objectEntries(value);
    const primitiveEntries = entries.filter(([, v]) => isPrimitive(v));
    const nestedEntries = entries.filter(([, v]) => !isPrimitive(v));

    return (
      <div style={{ display: "grid", gap: 12 }}>
        {primitiveEntries.length ? (
          <div className="grid grid-2">
            {primitiveEntries.map(([k, v]) => (
              <article key={k} className="card" style={{ padding: 12 }}>
                <div className="kicker">{k}</div>
                <div style={{ marginTop: 6, fontWeight: 600 }}>{renderPrimitive(v)}</div>
              </article>
            ))}
          </div>
        ) : null}

        {nestedEntries.map(([k, v]) => (
          <section key={k} className="card" style={{ display: "grid", gap: 8 }}>
            <h3 style={{ margin: 0, fontSize: 16 }}>{k}</h3>
            <DataView value={v} />
          </section>
        ))}
      </div>
    );
  }

  return <p style={{ margin: 0 }}>{renderPrimitive(value)}</p>;
}
