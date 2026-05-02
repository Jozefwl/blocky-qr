import type { JobRun } from "@/types/blocky";

export const DEFAULT_METRICS_PERIOD_DAYS = 7;

export function runStartedAt(run: JobRun): Date | null {
  const s = run.startTime ?? run.createdAt;
  if (!s) return null;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function runFinishedAt(run: JobRun): Date | null {
  const s = run.finishTime;
  if (!s) return null;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Duration in ms when both start and finish exist */
export function runRuntimeMs(run: JobRun): number | null {
  const a = runStartedAt(run);
  const b = runFinishedAt(run);
  if (!a || !b) return null;
  const ms = b.getTime() - a.getTime();
  return ms >= 0 ? ms : null;
}

export function formatDuration(ms: number | null): string {
  if (ms == null || ms < 0) return "—";
  if (ms < 1000) return `${Math.round(ms)} ms`;
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s} s`;
  const m = Math.floor(s / 60);
  const rs = s % 60;
  if (m < 60) return `${m} min ${rs} s`;
  const h = Math.floor(m / 60);
  const rm = m % 60;
  return `${h} h ${rm} min`;
}

export function dateDaysAgo(days: number): Date {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - days);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

export function isRunStartedOnOrAfter(run: JobRun, since: Date): boolean {
  const t = runStartedAt(run);
  return t != null && t >= since;
}

export type RunListFilters = {
  pipelineOid?: string;
  status?: string;
  from?: string;
  to?: string;
};

export function filterRunsList(runs: JobRun[], f: RunListFilters): JobRun[] {
  return runs.filter((r) => {
    if (f.pipelineOid && r.pipelineOid !== f.pipelineOid) return false;
    if (f.status && r.status !== f.status) return false;
    const t = runStartedAt(r);
    if (f.from && t) {
      const from = new Date(`${f.from}T00:00:00`);
      if (!Number.isNaN(from.getTime()) && t < from) return false;
    }
    if (f.to && t) {
      const to = new Date(`${f.to}T23:59:59.999`);
      if (!Number.isNaN(to.getTime()) && t > to) return false;
    }
    return true;
  });
}

export function averageRuntimeMs(runs: JobRun[]): number | null {
  const durations = runs
    .map(runRuntimeMs)
    .filter((x): x is number => x != null);
  if (durations.length === 0) return null;
  return durations.reduce((a, b) => a + b, 0) / durations.length;
}
