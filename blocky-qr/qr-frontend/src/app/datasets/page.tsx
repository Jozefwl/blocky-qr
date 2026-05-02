import Link from "next/link";
import { ApiRequestError, fetchDatasets } from "@/lib/api";
import { DatasetCreateForm } from "@/components/DatasetCreateForm";

export default async function DatasetsPage() {
  let datasets: Awaited<ReturnType<typeof fetchDatasets>> = [];
  let error: string | null = null;

  try {
    datasets = await fetchDatasets();
  } catch (e) {
    error =
      e instanceof ApiRequestError
        ? e.message
        : "Nepodařilo se načíst datasety.";
  }

  return (
    <>
      <header className="page-header">
        <h1>Datasety</h1>
        <p>
          Seznam z <code className="mono">GET /datasets/</code>. Agregační pole nejsou v tabulce.
        </p>
      </header>

      {!error ? <DatasetCreateForm /> : null}

      {error ? <p className="error-text">{error}</p> : null}

      {!error && (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Název</th>
                <th>Vlastník</th>
                <th>schemaVersion</th>
                <th>Vytvořeno</th>
                <th>Akce</th>
              </tr>
            </thead>
            <tbody>
              {datasets.map((d) => (
                <tr key={d._id}>
                  <td>{d.name}</td>
                  <td>{d.owner}</td>
                  <td className="mono">{d.schemaVersion ?? 1}</td>
                  <td className="muted small">
                    {d.createdAt
                      ? new Date(d.createdAt).toLocaleString()
                      : "—"}
                  </td>
                  <td>
                    <Link href={`/datasets/${d._id}`}>Detail</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!error && datasets.length === 0 ? (
        <p className="muted">Žádné datasety.</p>
      ) : null}
    </>
  );
}
