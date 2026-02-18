export function EmptyState(props: {
  title: string;
  body?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="empty-state" role="status">
      <h3>{props.title}</h3>
      {props.body ? <p>{props.body}</p> : null}
      {props.action ? <div>{props.action}</div> : null}
    </div>
  );
}
