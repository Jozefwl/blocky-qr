import Link from "next/link";
import { notFound } from "next/navigation";
import { ApiRequestError, fetchDataset } from "@/lib/api";
import { StatusBadge } from "@/components/StatusBadge";

type Props = { params: Promise<{ id: string }> };

export default async function DatasetDetailPage({ params }: Props) {
  const { id } = await params;
  let dataset: Awaited<ReturnType<typeof fetchDataset>> | null = null;
  let error: string | null = null;

  try {
    dataset = await fetchDataset(id);
  } catch (e) {
    if (e instanceof ApiRequestError && e.status === 404) notFound();
    error =
      e instanceof ApiRequestError
        ? e.message
        : "Nepodařilo se načíst dataset.";
  }

  if (error || !dataset) {
    return (
      <>
        <header className="page-header">
          <h1>Dataset</h1>
        </header>
        <p className="error-text">{error}</p>
        <Link href="/datasets">← Zpět na seznam</Link>
      </>
    );
  }

  const aggCount = dataset.aggregationResult?.length;

  return (
    <>
      <div className="page-actions">
        <Link href="/datasets">← Datasety</Link>
      </div>
      <header className="page-header">
        <h1>{dataset.name}</h1>
        <p>
          <code className="mono">GET /datasets/:id</code> — plný záznam včetně výsledku agregace
          pro typ <code className="mono">aggregation</code>.
        </p>
      </header>

      <div className="card stack">
        <dl className="dl-grid">
          <dt>ID</dt>
          <dd>{dataset._id}</dd>
          <dt>Typ</dt>
          <dd>
            <StatusBadge status={dataset.type} />
          </dd>
          <dt>Vlastník</dt>
          <dd>{dataset.owner}</dd>
          <dt>schemaVersion</dt>
          <dd>{dataset.schemaVersion ?? 1}</dd>
          <dt>Vytvořeno</dt>
          <dd>{dataset.createdAt ?? "—"}</dd>
          {dataset.type === "file" ? (
            <>
              <dt>Soubor</dt>
              <dd>{dataset.fileLink ?? "—"}</dd>
            </>
          ) : null}
          {dataset.aggregation ? (
            <>
              <dt>Agregace od</dt>
              <dd>{dataset.aggregation.timeFrom ?? "—"}</dd>
              <dt>Agregace do</dt>
              <dd>{dataset.aggregation.timeTo ?? "—"}</dd>
              <dt>Počet ID logů</dt>
              <dd>
                {aggCount != null ? `${aggCount} dokumentů` : "—"}
              </dd>
            </>
          ) : null}
        </dl>
      </div>
    </>
  );
}
