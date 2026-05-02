"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import type { Dataset } from "@/types/blocky";
import { createPipeline } from "@/lib/api";

const OBJECT_ID_RE = /^[a-fA-F0-9]{24}$/;

export function PipelineCreateForm({ datasets }: { datasets: Dataset[] }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [datasetOid, setDatasetOid] = useState("");
  const [schedule, setSchedule] = useState("");
  const [active, setActive] = useState(false);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError(null);

    if (!OBJECT_ID_RE.test(datasetOid.trim())) {
      setError("Vyberte dataset (platný ObjectId).");
      setPending(false);
      return;
    }

    try {
      const body: Record<string, unknown> = {
        name: name.trim(),
        datasetOid: datasetOid.trim(),
        active,
      };
      if (schedule.trim()) body.schedule = schedule.trim();

      const created = await createPipeline(body);
      router.push(`/pipelines/${created._id}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Vytvoření selhalo.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="card stack">
      <h2 className="card-title">Nová pipeline</h2>
      <p className="muted small" style={{ marginTop: "-0.5rem" }}>
        Odpovídá <code className="mono">POST /pipelines/</code> — název, dataset (ObjectId),
        volitelný cron harmonogram, aktivní stav.
      </p>

      {datasets.length === 0 ? (
        <p className="muted small">
          Nejprve <Link href="/datasets">vytvořte dataset</Link>, pak pipeline k němu
          přiřaďte.
        </p>
      ) : (
        <form onSubmit={submit} className="form-create">
          <label className="form-field">
            <span>Název</span>
            <input
              className="input"
              required
              minLength={1}
              maxLength={100}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="např. daily-aggregation"
            />
          </label>

          <label className="form-field">
            <span>Dataset</span>
            <select
              className="input"
              required
              value={datasetOid}
              onChange={(e) => setDatasetOid(e.target.value)}
            >
              <option value="">— vyberte —</option>
              {datasets.map((d) => (
                <option key={d._id} value={d._id}>
                  {d.name} ({d.type})
                </option>
              ))}
            </select>
          </label>

          <label className="form-field">
            <span>Harmonogram (cron, volitelné)</span>
            <input
              className="input mono"
              value={schedule}
              onChange={(e) => setSchedule(e.target.value)}
              placeholder="např. 0 2 * * *"
            />
          </label>

          <label className="check-row">
            <input
              type="checkbox"
              checked={active}
              onChange={(e) => setActive(e.target.checked)}
            />
            <span>Aktivní (lze spustit Run)</span>
          </label>

          {error ? <p className="error-text">{error}</p> : null}

          <button type="submit" className="btn primary" disabled={pending}>
            {pending ? "Ukládám…" : "Vytvořit pipeline"}
          </button>
        </form>
      )}
    </div>
  );
}
