"use client";

import { useEffect, useState } from "react";
import { PageTitle } from "@/components/page-title";
import { apiFetch } from "@/lib/client-api";

interface Student {
  email: string;
  display_name?: string;
  role?: string;
  status?: string;
  xp?: number;
  raffle_tickets?: number;
  pod?: string;
}

interface StudentsPayload {
  ok: boolean;
  data: Student[];
}

function downloadCsv(students: Student[]) {
  const headers = ["Email", "Display Name", "Role", "Status", "XP", "Raffle Tickets", "Pod"];
  const rows = students.map((s) => [
    s.email,
    s.display_name ?? "",
    s.role ?? "",
    s.status ?? "",
    String(s.xp ?? ""),
    String(s.raffle_tickets ?? ""),
    s.pod ?? ""
  ]);

  const csv =
    [headers, ...rows]
      .map((row) => row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(","))
      .join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "bow-students.csv";
  a.click();
  URL.revokeObjectURL(url);
}

export default function AdminStudentsPage() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [query, setQuery] = useState("");

  async function load() {
    setBusy(true);
    setError(null);
    try {
      const res = await apiFetch<StudentsPayload>("/api/admin/students");
      setStudents(res.data ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load students");
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const q = query.toLowerCase();
  const filtered = students.filter(
    (s) =>
      !q ||
      s.email.toLowerCase().includes(q) ||
      (s.display_name ?? "").toLowerCase().includes(q) ||
      (s.pod ?? "").toLowerCase().includes(q) ||
      (s.role ?? "").toLowerCase().includes(q) ||
      (s.status ?? "").toLowerCase().includes(q)
  );

  return (
    <div className="grid" style={{ gap: 14 }}>
      <PageTitle title="Student Roster" subtitle="Role, status, XP, and raffle ticket visibility" />

      <section className="card" style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        <button onClick={() => void load()} disabled={busy}>
          {busy ? "Loading..." : "Refresh"}
        </button>
        <input
          placeholder="Search by email, name, pod, role, or status..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          style={{ flex: 1, minWidth: 220 }}
        />
        <button
          className="secondary"
          onClick={() => downloadCsv(filtered)}
          disabled={filtered.length === 0}
        >
          Export CSV ({filtered.length})
        </button>
      </section>

      {error ? (
        <section className="card">
          <div className="banner banner-error">{error}</div>
        </section>
      ) : null}

      <section className="card" style={{ padding: 0 }}>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Email</th>
                <th>Name</th>
                <th>Role</th>
                <th>Status</th>
                <th>XP</th>
                <th>Tickets</th>
                <th>Pod</th>
              </tr>
            </thead>
            <tbody>
              {busy && students.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: "center", opacity: 0.6 }}>
                    Loading...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: "center", opacity: 0.6 }}>
                    {query ? "No students match your search." : "No students found."}
                  </td>
                </tr>
              ) : (
                filtered.map((s) => (
                  <tr key={s.email}>
                    <td>{s.email}</td>
                    <td>{s.display_name ?? "—"}</td>
                    <td>{s.role ?? "—"}</td>
                    <td>{s.status ?? "—"}</td>
                    <td>{s.xp ?? 0}</td>
                    <td>{s.raffle_tickets ?? 0}</td>
                    <td>{s.pod ?? "—"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
