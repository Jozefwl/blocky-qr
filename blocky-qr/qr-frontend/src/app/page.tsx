import Link from "next/link";
import {
  ApiRequestError,
  fetchAlerts,
  fetchDatasets,
  fetchHealth,
  fetchPipelines,
  fetchRuns,
} from "@/lib/api";
import {
  DEFAULT_METRICS_PERIOD_DAYS,
  dateDaysAgo,
  isRunStartedOnOrAfter,
} from "@/lib/run-utils";
import { isAlertOpen } from "@/lib/alert-utils";

export default async function DashboardPage() {
  let healthMessage: string | null = null;
  const metrics = {
    datasets: 0,
    pipelines: 0,
    activePipelines: 0,
    runsInPeriod: 0,
    failedRunsInPeriod: 0,
    openAlerts: 0,
  };
  let error: string | null = null;

  try {
    const since = dateDaysAgo(DEFAULT_METRICS_PERIOD_DAYS);
    const [health, datasets, pipelines, runs, alerts] = await Promise.all([
      fetchHealth(),
      fetchDatasets(),
      fetchPipelines(),
      fetchRuns(),
      fetchAlerts(),
    ]);
    healthMessage = health.message ?? null;

    const runsRecent = runs.filter((r) => isRunStartedOnOrAfter(r, since));
    metrics.datasets = datasets.length;
    metrics.pipelines = pipelines.length;
    metrics.activePipelines = pipelines.filter((p) => p.active).length;
    metrics.runsInPeriod = runsRecent.length;
    metrics.failedRunsInPeriod = runsRecent.filter((r) => r.status === "error").length;
    metrics.openAlerts = alerts.filter(isAlertOpen).length;
  } catch (e) {
    error =
      e instanceof ApiRequestError
        ? e.message
        : "Nepodařilo se spojit s API. Zkontrolujte backend (výchozí port 3000) a proměnnou BLOCKY_API_ORIGIN.";
  }

  const periodLabel = `posledních ${DEFAULT_METRICS_PERIOD_DAYS} dnů`;

  return (
    <>
      <header className="page-header">
        <h1>Přehled platformy</h1>
        <p>
          Hlavní metriky BlockyQR. Serverová data jdou přímo na{" "}
          <code className="mono">BLOCKY_API_ORIGIN</code>, akce z prohlížeče přes{" "}
          <code className="mono">/blocky-api</code>.
        </p>
      </header>

      {error ? (
        <div className="card" style={{ borderColor: "var(--err)" }}>
          <p className="error-text" style={{ margin: 0 }}>
            {error}
          </p>
        </div>
      ) : null}

      {!error && healthMessage ? (
        <p className="muted" style={{ marginTop: "-0.5rem", marginBottom: "1.25rem" }}>
          API: {healthMessage}
        </p>
      ) : null}

      {!error ? (
        <p className="muted small" style={{ marginBottom: "1rem" }}>
          Metriky běhů a selhání za <strong>{periodLabel}</strong> (podle času startu běhu).
        </p>
      ) : null}

      <div className="grid-cards metrics-grid">
        <Link href="/datasets" className="stat-card">
          <div className="label">Datasety</div>
          <div className="value">{metrics.datasets}</div>
        </Link>
        <Link href="/pipelines" className="stat-card">
          <div className="label">Pipeline celkem</div>
          <div className="value">{metrics.pipelines}</div>
        </Link>
        <Link href="/pipelines" className="stat-card">
          <div className="label">Aktivní pipeline</div>
          <div className="value">{metrics.activePipelines}</div>
        </Link>
        <Link href="/runs" className="stat-card">
          <div className="label">Běhy ({periodLabel})</div>
          <div className="value">{metrics.runsInPeriod}</div>
        </Link>
        <Link href="/runs?status=error" className="stat-card">
          <div className="label">Neúspěšné běhy ({periodLabel})</div>
          <div className="value">{metrics.failedRunsInPeriod}</div>
        </Link>
        <Link href="/alerts" className="stat-card">
          <div className="label">Otevřené alerty</div>
          <div className="value">{metrics.openAlerts}</div>
        </Link>
      </div>
    </>
  );
}
