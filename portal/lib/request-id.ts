export function createRequestId(prefix = "req"): string {
  const rand = Math.random().toString(36).slice(2, 10).toUpperCase();
  return `${prefix}_${Date.now()}_${rand}`;
}
