import type { Alert } from "@/types/blocky";
import { alertSeverityCz, alertSeverityLabel } from "@/lib/alert-utils";

export function AlertSeverityBadge({ alert }: { alert: Alert }) {
  const sev = alertSeverityLabel(alert);
  const tone = sev === "error" ? "err" : sev === "info" ? "ok" : "run";
  return (
    <span className={`badge ${tone}`} title="Odvozeno ze statusu alertu (API bez pole severity)">
      {alertSeverityCz(alert)}
    </span>
  );
}
