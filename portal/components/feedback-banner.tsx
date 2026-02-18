export function FeedbackBanner(props: {
  kind?: "info" | "success" | "error" | "warn";
  children: React.ReactNode;
}) {
  return <div className={`banner banner-${props.kind || "info"}`}>{props.children}</div>;
}
