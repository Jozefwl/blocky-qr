import { ApiRequestError, fetchDatasets, fetchPipelines } from "@/lib/api";
import { PipelineCreateForm } from "@/components/PipelineCreateForm";
import { PipelineRowActions } from "@/components/PipelineRowActions";
import { StatusBadge } from "@/components/StatusBadge";
import Link from "next/link";

export default async function PipelinesPage() {
  let pipelines: Awaited<ReturnType<typeof fetchPipelines>> = [];
  let datasets: Awaited<ReturnType<typeof fetchDatasets>> = [];
  let error: string | null = null;

  try {
    [pipelines, datasets] = await Promise.all([
      fetchPipelines(),
      fetchDatasets(),
    ]);
  } catch (e) {
    error =
      e instanceof ApiRequestError
        ? e.message
        : "Nepodařilo se načíst pipeline.";
  }

  const datasetName = (oid: string) =>
    datasets.find((d) => d._id === oid)?.name ?? oid;

  return (
    <>
      <header className="page-header">
        <h1>Pipeline</h1>
        <p>Seznam z <code className="mono">GET /pipelines/</code>.</p>
      </header>

      {!error ? <PipelineCreateForm datasets={datasets} /> : null}

      {error ? <p className="error-text">{error}</p> : null}

      {!error && (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Název</th>
                <th>Dataset</th>
                <th>Harmonogram</th>
                <th>Aktivní</th>
                <th>Poslední běh</th>
                <th>Poslední stav</th>
                <th>Akce</th>
              </tr>
            </thead>
            <tbody>
              {pipelines.map((p) => (
                <tr key={p._id}>
                  <td>{p.name}</td>
                  <td>
                    <Link href={`/datasets/${p.datasetOid}`}>{datasetName(p.datasetOid)}</Link>
                  </td>
                  <td className="mono small">{p.schedule ?? "—"}</td>
                  <td>{p.active ? "ano" : "ne"}</td>
                  <td className="muted small">{p.lastRunTime ?? "—"}</td>
                  <td>
                    <StatusBadge status={p.lastStatus ?? undefined} />
                  </td>
                  <td>
                    <PipelineRowActions pipeline={p} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!error && pipelines.length === 0 ? (
        <p className="muted">Žádné pipeline.</p>
      ) : null}
    </>
  );
}
