import Link from "next/link";
import { ApiRequestError, fetchPipelines, fetchRuns } from "@/lib/api";
import {
  filterRunsList,
  formatDuration,
  runRuntimeMs,
} from "@/lib/run-utils";
import { StatusBadge } from "@/components/StatusBadge";
import { RunsFilterForm } from "@/components/RunsFilterForm";

type Props = {
  searchParams: Promise<{
    pipeline?: string;
    status?: string;
    from?: string;
    to?: string;
  }>;
};

export default async function RunsPage({ searchParams }: Props) {
  const sp = await searchParams;
  const filters = {
    pipelineOid: sp.pipeline,
    status: sp.status,
    from: sp.from,
    to: sp.to,
  };

  let runs: Awaited<ReturnType<typeof fetchRuns>> = [];
  let pipelines: Awaited<ReturnType<typeof fetchPipelines>> = [];
  let error: string | null = null;

  try {
    [runs, pipelines] = await Promise.all([fetchRuns(), fetchPipelines()]);
  } catch (e) {
    error =
      e instanceof ApiRequestError ? e.message : "Nepodařilo se načíst běhy.";
  }

  const pipelineName = (oid: string) =>
    pipelines.find((p) => p._id === oid)?.name ?? oid;

  const filtered = error
    ? []
    : filterRunsList(runs, filters).sort((a, b) => {
        const ta = a.startTime ?? a.createdAt ?? "";
        const tb = b.startTime ?? b.createdAt ?? "";
        return tb.localeCompare(ta);
      });

  return (
    <>
      <header className="page-header">
        <h1>Běhy</h1>
        <p>
          Data z <code className="mono">GET /runs/</code>. Filtry používají čas startu běhu.
        </p>
      </header>

      {!error ? (
        <RunsFilterForm
          pipelines={pipelines}
          initial={{
            pipeline: filters.pipelineOid,
            status: filters.status,
            from: filters.from,
            to: filters.to,
          }}
        />
      ) : null}

      {error ? <p className="error-text">{error}</p> : null}

      {!error && (
        <p className="muted small" style={{ marginBottom: "0.75rem" }}>
          Zobrazeno <strong>{filtered.length}</strong> z {runs.length} běhů
        </p>
      )}

      {!error && (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Pipeline</th>
                <th>Stav</th>
                <th>Začátek</th>
                <th>Konec</th>
                <th>Délka</th>
                <th>Záznamů</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r._id}>
                  <td>
                    <Link href={`/pipelines/${r.pipelineOid}`}>
                      {pipelineName(r.pipelineOid)}
                    </Link>
                  </td>
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
      )}

      {!error && filtered.length === 0 ? (
        <p className="muted">Žádné běhy pro zvolené filtry.</p>
      ) : null}
    </>
  );
}
