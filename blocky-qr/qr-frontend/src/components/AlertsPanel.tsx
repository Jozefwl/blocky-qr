"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { Alert } from "@/types/blocky";
import type { Pipeline } from "@/types/blocky";
import { AcknowledgeAlertButton } from "@/components/AcknowledgeAlertButton";
import { AlertSeverityBadge } from "@/components/AlertSeverityBadge";
import { alertStateCz } from "@/lib/alert-utils";

export function AlertsPanel({
  alerts,
  pipelines,
}: {
  alerts: Alert[];
  pipelines: Pipeline[];
}) {
  const [pipelineFilter, setPipelineFilter] = useState<string>("");

  const filtered = useMemo(() => {
    if (!pipelineFilter) return alerts;
    return alerts.filter((a) => a.pipelineOid === pipelineFilter);
  }, [alerts, pipelineFilter]);

  const pipelineName = (oid: string) =>
    pipelines.find((p) => p._id === oid)?.name ?? oid.slice(0, 8) + "…";

  return (
    <div className="stack">
      <div className="toolbar">
        <label className="field-inline">
          <span>Pipeline</span>
          <select
            value={pipelineFilter}
            onChange={(e) => setPipelineFilter(e.target.value)}
            className="input"
          >
            <option value="">Všechny</option>
            {pipelines.map((p) => (
              <option key={p._id} value={p._id}>
                {p.name}
              </option>
            ))}
          </select>
        </label>
        <span className="muted small">
          Zobrazeno {filtered.length} z {alerts.length}
        </span>
      </div>

      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>Pipeline</th>
              <th>Run</th>
              <th>Zpráva</th>
              <th>Vytvořeno</th>
              <th>Závažnost</th>
              <th>Stav alertu</th>
              <th>Akce</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((a) => (
              <tr key={a._id}>
                <td>
                  <Link href={`/pipelines/${a.pipelineOid}`}>
                    {pipelineName(a.pipelineOid)}
                  </Link>
                </td>
                <td>
                  <Link href={`/runs/${a.runId}`} className="mono">
                    {a.runId.slice(0, 12)}…
                  </Link>
                </td>
                <td className="clamp">{a.message}</td>
                <td className="muted small">
                  {a.createdAt
                    ? new Date(a.createdAt).toLocaleString()
                    : "—"}
                </td>
                <td>
                  <AlertSeverityBadge alert={a} />
                </td>
                <td>
                  <span className="muted small">{alertStateCz(a)}</span>
                </td>
                <td>
                  <AcknowledgeAlertButton alert={a} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {filtered.length === 0 ? (
        <p className="muted">Žádné alerty pro zvolený filtr.</p>
      ) : null}
    </div>
  );
}
