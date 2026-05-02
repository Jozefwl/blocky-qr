export function StatusBadge({ status }: { status: string | null | undefined }) {
  if (!status) return <span className="badge muted">—</span>;
  const tone =
    status === "successful"
      ? "ok"
      : status === "error"
        ? "err"
        : status === "running" || status === "pending"
          ? "run"
          : "muted";
  return <span className={`badge ${tone}`}>{status}</span>;
}
