import type { ReactNode } from "react";

export function ActionBar(props: { children: ReactNode }) {
  return <div className="action-bar">{props.children}</div>;
}
