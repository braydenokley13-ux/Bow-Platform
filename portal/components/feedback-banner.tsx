import type { ReactNode } from "react";

export function FeedbackBanner(props: {
  kind?: "info" | "success" | "error" | "warn";
  children: ReactNode;
}) {
  return <div className={`banner banner-${props.kind || "info"}`}>{props.children}</div>;
}
