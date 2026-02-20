import type { ReactNode } from "react";

export function DataTable(props: {
  headers: string[];
  children: ReactNode;
  stickyHeader?: boolean;
}) {
  return (
    <div className="table-wrap">
      <table className={props.stickyHeader ? "table-sticky" : ""}>
        <thead>
          <tr>
            {props.headers.map((head) => (
              <th key={head}>{head}</th>
            ))}
          </tr>
        </thead>
        <tbody>{props.children}</tbody>
      </table>
    </div>
  );
}
