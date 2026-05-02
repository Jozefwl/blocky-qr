import Link from "next/link";
import {
  ApiRequestError,
  fetchAlertRules,
  fetchPipelines,
} from "@/lib/api";
import { AlertRuleCreateForm } from "@/components/AlertRuleCreateForm";
import { AlertRuleDeleteButton } from "@/components/AlertRuleDeleteButton";
import { StatusBadge } from "@/components/StatusBadge";

export default async function AlertRulesPage() {
  let rules: Awaited<ReturnType<typeof fetchAlertRules>> = [];
  let pipelines: Awaited<ReturnType<typeof fetchPipelines>> = [];
  let error: string | null = null;

  try {
    [rules, pipelines] = await Promise.all([
      fetchAlertRules(),
      fetchPipelines(),
    ]);
  } catch (e) {
    error =
      e instanceof ApiRequestError
        ? e.message
        : "Nepodařilo se načíst pravidla.";
  }

  const pipelineName = (oid: string) =>
    pipelines.find((p) => p._id === oid)?.name ?? oid;

  return (
    <>
      <header className="page-header">
        <h1>Pravidla alertů</h1>
        <p>
          Správa pravidel z <code className="mono">GET /alert-rules/</code>, mazání{" "}
          <code className="mono">DELETE /alert-rules/:id</code>.
        </p>
      </header>

      {!error ? <AlertRuleCreateForm pipelines={pipelines} /> : null}

      {error ? <p className="error-text">{error}</p> : null}

      {!error && (
        <div className="table-wrap" style={{ marginTop: "1.5rem" }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Název</th>
                <th>Pipeline</th>
                <th>Hlásit při</th>
                <th>Vytvořeno</th>
                <th>Akce</th>
              </tr>
            </thead>
            <tbody>
              {rules.map((r) => (
                <tr key={r._id}>
                  <td>{r.name}</td>
                  <td>
                    <Link href={`/pipelines/${r.pipelineOid}`}>
                      {pipelineName(r.pipelineOid)}
                    </Link>
                  </td>
                  <td>
                    <StatusBadge status={r.reportWhenState} />
                  </td>
                  <td className="muted small">
                    {r.createdAt
                      ? new Date(r.createdAt).toLocaleString()
                      : "—"}
                  </td>
                  <td>
                    <AlertRuleDeleteButton ruleId={r._id} ruleName={r.name} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!error && rules.length === 0 ? (
        <p className="muted" style={{ marginTop: "1rem" }}>
          Zatím žádná pravidla.
        </p>
      ) : null}
    </>
  );
}
