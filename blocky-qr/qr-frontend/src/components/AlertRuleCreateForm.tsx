"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import type { Pipeline } from "@/types/blocky";
import { createAlertRule } from "@/lib/api";

const REPORT_STATES = [
  { value: "successful", label: "Úspěšný běh (successful)" },
  { value: "error", label: "Chyba (error)" },
  { value: "pending", label: "Čekající (pending)" },
  { value: "running", label: "Běžící (running)" },
] as const;

export function AlertRuleCreateForm({ pipelines }: { pipelines: Pipeline[] }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [pipelineOid, setPipelineOid] = useState("");
  const [reportWhenState, setReportWhenState] =
    useState<(typeof REPORT_STATES)[number]["value"]>("successful");

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError(null);

    if (!pipelineOid.trim()) {
      setError("Vyberte pipeline.");
      setPending(false);
      return;
    }

    try {
      await createAlertRule({
        name: name.trim(),
        pipelineOid: pipelineOid.trim(),
        reportWhenState,
      });
      setName("");
      setPipelineOid("");
      setReportWhenState("successful");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Vytvoření selhalo.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="card stack">
      <h2 className="card-title">Nové pravidlo alertu</h2>
      <p className="muted small" style={{ marginTop: "-0.5rem" }}>
        <code className="mono">POST /alert-rules/</code> — při přechodu běhu pipeline do zvoleného
        stavu se může vygenerovat alert (logika na backendu).
      </p>

      {pipelines.length === 0 ? (
        <p className="muted small">
          Nejprve <Link href="/pipelines">vytvořte pipeline</Link>.
        </p>
      ) : (
        <form onSubmit={submit} className="form-create">
          <label className="form-field">
            <span>Název pravidla</span>
            <input
              className="input"
              required
              minLength={1}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="např. Notify při chybě pipeline"
            />
          </label>

          <label className="form-field">
            <span>Pipeline</span>
            <select
              className="input"
              required
              value={pipelineOid}
              onChange={(e) => setPipelineOid(e.target.value)}
            >
              <option value="">— vyberte —</option>
              {pipelines.map((p) => (
                <option key={p._id} value={p._id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>

          <label className="form-field">
            <span>Hlásit při stavu běhu</span>
            <select
              className="input"
              value={reportWhenState}
              onChange={(e) =>
                setReportWhenState(
                  e.target.value as (typeof REPORT_STATES)[number]["value"],
                )
              }
            >
              {REPORT_STATES.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>

          {error ? <p className="error-text">{error}</p> : null}

          <button type="submit" className="btn primary" disabled={pending}>
            {pending ? "Ukládám…" : "Vytvořit pravidlo"}
          </button>
        </form>
      )}
    </div>
  );
}
