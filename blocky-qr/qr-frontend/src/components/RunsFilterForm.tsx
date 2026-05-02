import Link from "next/link";
import type { Pipeline } from "@/types/blocky";

export function RunsFilterForm({
  pipelines,
  initial,
}: {
  pipelines: Pipeline[];
  initial: {
    pipeline?: string;
    status?: string;
    from?: string;
    to?: string;
  };
}) {
  return (
    <form method="get" className="card filter-bar">
      <div className="filter-bar-inner">
        <label className="form-field compact">
          <span>Pipeline</span>
          <select name="pipeline" className="input" defaultValue={initial.pipeline ?? ""}>
            <option value="">Všechny</option>
            {pipelines.map((p) => (
              <option key={p._id} value={p._id}>
                {p.name}
              </option>
            ))}
          </select>
        </label>
        <label className="form-field compact">
          <span>Stav</span>
          <select name="status" className="input" defaultValue={initial.status ?? ""}>
            <option value="">Všechny</option>
            <option value="pending">pending</option>
            <option value="running">running</option>
            <option value="successful">successful</option>
            <option value="error">error</option>
          </select>
        </label>
        <label className="form-field compact">
          <span>Od data</span>
          <input
            type="date"
            name="from"
            className="input"
            defaultValue={initial.from ?? ""}
          />
        </label>
        <label className="form-field compact">
          <span>Do data</span>
          <input type="date" name="to" className="input" defaultValue={initial.to ?? ""} />
        </label>
        <div className="filter-actions">
          <button type="submit" className="btn primary">
            Filtrovat
          </button>
          <Link href="/runs" className="btn">
            Reset
          </Link>
        </div>
      </div>
    </form>
  );
}
