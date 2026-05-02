import type { Alert } from "@/types/blocky";

/** Backend nemá pole severity — odvozeno z typu alertu (stav runu v době pravidla). */
export function alertSeverityLabel(a: Alert): string {
  switch (a.status) {
    case "error":
      return "error";
    case "successful":
      return "info";
    case "running":
    case "pending":
    default:
      return "warning";
  }
}

export function alertSeverityCz(a: Alert): string {
  switch (alertSeverityLabel(a)) {
    case "error":
      return "Vysoká";
    case "info":
      return "Nízká";
    default:
      return "Střední";
  }
}

export function isAlertOpen(a: Alert): boolean {
  return !a.acknowledgedAt;
}

export function alertStateCz(a: Alert): string {
  return isAlertOpen(a) ? "Otevřený" : "Potvrzený";
}
