"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/client-api";
import { DataView } from "@/components/data-view";

export function FetchPanel(props: {
  endpoint: string;
  method?: "GET" | "POST";
  payload?: unknown;
  title?: string;
  refreshLabel?: string;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<unknown>(null);
  const [updatedAt, setUpdatedAt] = useState<string>("");

  async function load() {
    setBusy(true);
    setError(null);
    try {
      const json = await apiFetch<unknown>(props.endpoint, {
        method: props.method || "GET",
        json: props.method === "POST" ? props.payload ?? {} : undefined
      });
      setData(json);
      setUpdatedAt(new Date().toISOString());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed");
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.endpoint]);

  return (
    <section className="card" style={{ display: "grid", gap: 10 }}>
      {props.title ? <h2 style={{ margin: 0, fontSize: 18 }}>{props.title}</h2> : null}
      <div className="kicker">{props.endpoint}</div>
      <div>
        <button onClick={() => void load()} disabled={busy}>
          {busy ? "Loading..." : props.refreshLabel || "Refresh"}
        </button>
      </div>
      {error ? <p style={{ margin: 0, color: "var(--danger)" }}>{error}</p> : null}
      {updatedAt ? <div className="kicker">Updated {new Date(updatedAt).toLocaleString()}</div> : null}
      <DataView value={data} />
    </section>
  );
}
