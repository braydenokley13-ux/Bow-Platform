export function JsonBlock({ value }: { value: unknown }) {
  return (
    <pre
      className="card"
      style={{
        whiteSpace: "pre-wrap",
        overflowWrap: "anywhere",
        fontSize: 13,
        lineHeight: 1.35,
        margin: 0
      }}
    >
      {JSON.stringify(value, null, 2)}
    </pre>
  );
}
