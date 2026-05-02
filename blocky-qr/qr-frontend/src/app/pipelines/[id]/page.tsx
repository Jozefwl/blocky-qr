import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ApiRequestError,
  fetchAlerts,
  fetchDatasets,
  fetchPipeline,
  fetchRuns,
} from "@/lib/api";
import {
  averageRuntimeMs,
  formatDuration,
  runRuntimeMs,
} from "@/lib/run-utils";
import { StatusBadge } from "@/components/StatusBadge";
import { RunPipelineButton } from "@/components/RunPipelineButton";
import { PipelineQuickEdit } from "@/components/PipelineQuickEdit";
import { AlertSeverityBadge } from "@/components/AlertSeverityBadge";
import { alertStateCz } from "@/lib/alert-utils";

type Props = { params: Promise<{ id: string }> };

export default async function PipelineDetailPage({ params }: Props) {
  const { id } = await params;
  let pipeline: Awaited<ReturnType<typeof fetchPipeline>> | null = null;
  let error: string | null = null;

  try {
    pipeline = await fetchPipeline(id);
  } catch (e) {
    if (e instanceof ApiRequestError && e.status === 404) notFound();
    error =
      e instanceof ApiRequestError
        ? e.message
        : "Nepodařilo se načíst pipeline.";
  }

  if (error || !pipeline) {
    return (
      <>
        <header className="page-header">
          <h1>Pipeline</h1>
        </header>
        <p className="error-text">{error}</p>
        <Link href="/pipelines">← Zpět</Link>
      </>
    );
  }

  const [datasets, allRuns, allAlerts] = await Promise.all([
    fetchDatasets(),
    fetchRuns(),
    fetchAlerts(),
  ]);

  const dataset = datasets.find((d) => d._id === pipeline.datasetOid);
  const pipelineRuns = allRuns
    .filter((r) => r.pipelineOid === pipeline._id)
    .sort((a, b) => {
      const ta = a.startTime ?? a.createdAt ?? "";
      const tb = b.startTime ?? b.createdAt ?? "";
      return tb.localeCompare(ta);
    });

  const pipelineAlerts = allAlerts
    .filter((a) => a.pipelineOid === pipeline._id)
    .sort((a, b) => {
      const ta = a.createdAt ?? "";
      const tb = b.createdAt ?? "";
      return tb.localeCompare(ta);
    })
    .slice(0, 40);

  const successCount = pipelineRuns.filter((r) => r.status === "successful").length;
  const failCount = pipelineRuns.filter((r) => r.status === "error").length;
  const avgMs = averageRuntimeMs(pipelineRuns);

  return (
    <>
      <div className="page-actions">
        <Link href="/pipelines">← Pipeline</Link>
      </div>
      <header className="page-header">
        <h1>{pipeline.name}</h1>
        <p>
          Detail z <code className="mono">GET /pipelines/:id</code>. Manuální běh:{" "}
          <code className="mono">POST /pipelines/:id/run</code> (vyžaduje aktivní pipeline).
        </p>
      </header>

      <div className="stack">
        <div className="card stack">
          <h2 className="card-title">Metadata</h2>
          <dl className="dl-grid">
            <dt>ID</dt>
            <dd className="mono">{pipeline._id}</dd>
            <dt>Verze</dt>
            <dd>{pipeline.pipelineVersion}</dd>
            <dt>Aktivní</dt>
            <dd>{pipeline.active ? "ano" : "ne"}</dd>
            <dt>Harmonogram</dt>
            <dd className="mono">{pipeline.schedule ?? "—"}</dd>
            <dt>Poslední stav</dt>
            <dd>
              <StatusBadge status={pipeline.lastStatus ?? undefined} />
            </dd>
            <dt>Poslední běh</dt>
            <dd>{pipeline.lastRunTime ?? "—"}</dd>
            <dt>Dataset</dt>
            <dd>
              <Link href={`/datasets/${pipeline.datasetOid}`}>
                {dataset?.name ?? pipeline.datasetOid}
              </Link>
            </dd>
          </dl>

          <RunPipelineButton
            pipelineId={pipeline._id}
            disabled={!pipeline.active}
          />
          {!pipeline.active ? (
            <p className="form-hint">
              Aktivujte pipeline níže — backend vrací 409 pro neaktivní pipeline.
            </p>
          ) : null}

          <p className="muted small" style={{ marginTop: "0.75rem" }}>
            <Link href={`/runs?pipeline=${pipeline._id}`}>Všechny běhy této pipeline →</Link>
          </p>
        </div>

        <div className="card stack">
          <h2 className="card-title">Statistiky běhů</h2>
          <dl className="dl-grid">
            <dt>Úspěšné běhy</dt>
            <dd>{successCount}</dd>
            <dt>Neúspěšné běhy</dt>
            <dd>{failCount}</dd>
            <dt>Průměrná délka běhu</dt>
            <dd>
              {avgMs != null ? formatDuration(avgMs) : "—"}
              <span className="muted small"> (jen dokončené se startem a koncem)</span>
            </dd>
          </dl>
        </div>

        <div className="card stack">
          <h2 className="card-title">Nedávné běhy</h2>
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Stav</th>
                  <th>Start</th>
                  <th>Konec</th>
                  <th>Délka</th>
                  <th>Záznamů</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {pipelineRuns.slice(0, 25).map((r) => (
                  <tr key={r._id}>
                    <td>
                      <StatusBadge status={r.status} />
                    </td>
                    <td className="muted small">{r.startTime ?? r.createdAt ?? "—"}</td>
                    <td className="muted small">{r.finishTime ?? "—"}</td>
                    <td className="mono small">{formatDuration(runRuntimeMs(r))}</td>
                    <td>{r.processedRecords ?? 0}</td>
                    <td>
                      <Link href={`/runs/${r._id}`}>Detail</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {pipelineRuns.length === 0 ? (
            <p className="muted">Zatím žádné běhy.</p>
          ) : null}
        </div>

        <div className="card stack">
          <h2 className="card-title">Související alerty</h2>
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Zpráva</th>
                  <th>Vytvořeno</th>
                  <th>Závažnost</th>
                  <th>Stav</th>
                </tr>
              </thead>
              <tbody>
                {pipelineAlerts.map((a) => (
                  <tr key={a._id}>
                    <td className="clamp">
                      <Link href={`/runs/${a.runId}`}>{a.message}</Link>
                    </td>
                    <td className="muted small">
                      {a.createdAt
                        ? new Date(a.createdAt).toLocaleString()
                        : "—"}
                    </td>
                    <td>
                      <AlertSeverityBadge alert={a} />
                    </td>
                    <td className="muted small">{alertStateCz(a)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {pipelineAlerts.length === 0 ? (
            <p className="muted">Žádné alerty pro tuto pipeline.</p>
          ) : null}
        </div>

        <PipelineQuickEdit pipeline={pipeline} />
      </div>
    </>
  );
}
