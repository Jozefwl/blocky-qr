import Link from "next/link";
import { notFound } from "next/navigation";
import { ApiRequestError, fetchPipelines, fetchRun } from "@/lib/api";
import { formatDuration, runRuntimeMs } from "@/lib/run-utils";
import { StatusBadge } from "@/components/StatusBadge";

type Props = { params: Promise<{ id: string }> };

export default async function RunDetailPage({ params }: Props) {
  const { id } = await params;
  let run: Awaited<ReturnType<typeof fetchRun>> | null = null;
  let error: string | null = null;

  try {
    run = await fetchRun(id);
  } catch (e) {
    if (e instanceof ApiRequestError && e.status === 404) notFound();
    error =
      e instanceof ApiRequestError
        ? e.message
        : "Nepodařilo se načíst běh.";
  }

  if (error || !run) {
    return (
      <>
        <header className="page-header">
          <h1>Běh</h1>
        </header>
        <p className="error-text">{error}</p>
        <Link href="/runs">← Zpět</Link>
      </>
    );
  }

  let pipelineName: string | null = null;
  try {
    const pipelines = await fetchPipelines();
    pipelineName =
      pipelines.find((p) => p._id === run.pipelineOid)?.name ?? null;
  } catch {
    pipelineName = null;
  }

  const steps = run.steps;
  const hasSteps = Array.isArray(steps) && steps.length > 0;

  return (
    <>
      <div className="page-actions">
        <Link href="/runs">← Běhy</Link>
      </div>
      <header className="page-header">
        <h1 className="mono" style={{ fontSize: "1.25rem" }}>
          Běh {run._id}
        </h1>
        <p>Detail z <code className="mono">GET /runs/:id</code>.</p>
      </header>

      <div className="card stack">
        <h2 className="card-title">Shrnutí</h2>
        <dl className="dl-grid">
          <dt>Pipeline</dt>
          <dd>
            <Link href={`/pipelines/${run.pipelineOid}`}>
              {pipelineName ?? run.pipelineOid}
            </Link>
          </dd>
          <dt>Verze pipeline</dt>
          <dd>{run.pipelineVersion}</dd>
          <dt>Stav</dt>
          <dd>
            <StatusBadge status={run.status} />
          </dd>
          <dt>Začátek</dt>
          <dd>{run.startTime ?? run.createdAt ?? "—"}</dd>
          <dt>Konec</dt>
          <dd>{run.finishTime ?? "—"}</dd>
          <dt>Délka běhu</dt>
          <dd>{formatDuration(runRuntimeMs(run))}</dd>
          <dt>Chybová zpráva</dt>
          <dd>{run.errorMessage ?? "—"}</dd>
          <dt>Zpracovaných záznamů</dt>
          <dd>{run.processedRecords ?? 0}</dd>
        </dl>
      </div>

      {hasSteps ? (
        <div className="card stack" style={{ marginTop: "1rem" }}>
          <h2 className="card-title">Kroky (JobRunStep)</h2>
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Krok</th>
                  <th>Stav</th>
                  <th>Zpráva</th>
                </tr>
              </thead>
              <tbody>
                {steps!.map((step, i) => (
                  <tr key={i}>
                    <td className="mono">
                      {step.name ?? step.step ?? `krok ${i + 1}`}
                    </td>
                    <td>
                      <StatusBadge status={step.status ?? undefined} />
                    </td>
                    <td className="muted small">{step.message ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="card muted small" style={{ marginTop: "1rem" }}>
          API zatím nevrací pole kroků (<code className="mono">steps</code> / JobRunStep).
          Až backend doplní strukturu, zobrazí se zde.
        </div>
      )}
    </>
  );
}
