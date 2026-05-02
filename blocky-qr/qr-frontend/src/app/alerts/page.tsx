import { fetchAlerts, fetchPipelines } from "@/lib/api";
import { ApiRequestError } from "@/lib/api";
import { AlertsPanel } from "@/components/AlertsPanel";

export default async function AlertsPage() {
  let error: string | null = null;
  let alerts: Awaited<ReturnType<typeof fetchAlerts>> = [];
  let pipelines: Awaited<ReturnType<typeof fetchPipelines>> = [];

  try {
    [alerts, pipelines] = await Promise.all([
      fetchAlerts(),
      fetchPipelines(),
    ]);
  } catch (e) {
    error =
      e instanceof ApiRequestError
        ? e.message
        : "Nepodařilo se načíst alerty.";
  }

  return (
    <>
      <header className="page-header">
        <h1>Alerty</h1>
        <p>
          Seznam z <code className="mono">GET /alerts/</code>. Potvrzení:{" "}
          <code className="mono">POST /alerts/:id/acknowledge</code>. Sloupec závažnosti je
          odvozený ze statusu alertu — pole <code className="mono">severity</code> API nemá.
        </p>
      </header>

      {error ? <p className="error-text">{error}</p> : null}

      {!error ? (
        <AlertsPanel alerts={alerts} pipelines={pipelines} />
      ) : null}
    </>
  );
}
