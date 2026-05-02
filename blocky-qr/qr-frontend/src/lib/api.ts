import type {
  Alert,
  AlertRule,
  ApiErr,
  ApiOk,
  Dataset,
  DatasetDetail,
  JobRun,
  Pipeline,
} from "@/types/blocky";

/** Browser: same-origin rewrite → backend (see next.config rewrites). */
const CLIENT_BASE = "/blocky-api";

function serverApiOrigin(): string {
  return (
    process.env.BLOCKY_API_ORIGIN?.replace(/\/$/, "") ?? "http://127.0.0.1:3000"
  );
}

async function parseJson<T>(res: Response): Promise<T> {
  const text = await res.text();
  if (!text) return {} as T;
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(`Invalid JSON (${res.status})`);
  }
}

export class ApiRequestError extends Error {
  status: number;
  body: unknown;

  constructor(message: string, status: number, body: unknown) {
    super(message);
    this.status = status;
    this.body = body;
  }
}

function throwIfNotOk(res: Response, body: unknown): void {
  if (!res.ok) {
    const b = body as ApiErr;
    const msg =
      b.error ??
      b.errors?.join("; ") ??
      `Request failed (${res.status})`;
    throw new ApiRequestError(msg, res.status, body);
  }
}

/**
 * Server-side fetch (RSC). Must use an absolute URL — relative `/blocky-api` has no
 * base URL in Node and fails silently or with network errors.
 */
export async function apiGetServer<T>(path: string): Promise<T> {
  const p = path.startsWith("/") ? path : `/${path}`;
  const url = `${serverApiOrigin()}${p}`;
  const res = await fetch(url, { cache: "no-store" });
  const body = await parseJson<unknown>(res);
  throwIfNotOk(res, body);
  return body as T;
}

/** Browser / client fetch */
export async function apiClient<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const url = `${CLIENT_BASE}${path.startsWith("/") ? path : `/${path}`}`;
  const res = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });
  const body = await parseJson<unknown>(res);
  throwIfNotOk(res, body);
  return body as T;
}

/** DELETE s prázdným tělem (např. 204 No Content). */
export async function apiDeleteClient(path: string): Promise<void> {
  const url = `${CLIENT_BASE}${path.startsWith("/") ? path : `/${path}`}`;
  const res = await fetch(url, { method: "DELETE" });
  const body = await parseJson<unknown>(res);
  throwIfNotOk(res, body);
}

export async function fetchHealth(): Promise<{ message?: string }> {
  return apiGetServer<{ message?: string }>("/");
}

export async function fetchDatasets(): Promise<Dataset[]> {
  const r = await apiGetServer<ApiOk<Dataset[]>>("/datasets/");
  return r.data;
}

export async function fetchDataset(id: string): Promise<DatasetDetail> {
  const r = await apiGetServer<ApiOk<DatasetDetail>>(`/datasets/${id}`);
  return r.data;
}

export async function fetchPipelines(): Promise<Pipeline[]> {
  const r = await apiGetServer<ApiOk<Pipeline[]>>("/pipelines/");
  return r.data;
}

export async function fetchPipeline(id: string): Promise<Pipeline> {
  const r = await apiGetServer<ApiOk<Pipeline>>(`/pipelines/${id}`);
  return r.data;
}

export async function fetchRuns(): Promise<JobRun[]> {
  const r = await apiGetServer<ApiOk<JobRun[]>>("/runs/");
  return r.data;
}

export async function fetchRun(id: string): Promise<JobRun> {
  const r = await apiGetServer<ApiOk<JobRun>>(`/runs/${id}`);
  return r.data;
}

export async function fetchAlerts(): Promise<Alert[]> {
  const r = await apiGetServer<ApiOk<Alert[]>>("/alerts/");
  return r.data;
}

export async function fetchAlertRules(): Promise<AlertRule[]> {
  const r = await apiGetServer<ApiOk<AlertRule[]>>("/alert-rules/");
  return r.data;
}

export async function createDataset(
  body: Record<string, unknown>,
): Promise<Dataset> {
  const r = await apiClient<ApiOk<Dataset>>("/datasets/", {
    method: "POST",
    body: JSON.stringify(body),
  });
  return r.data;
}

export async function createPipeline(
  body: Record<string, unknown>,
): Promise<Pipeline> {
  const r = await apiClient<ApiOk<Pipeline>>("/pipelines/", {
    method: "POST",
    body: JSON.stringify(body),
  });
  return r.data;
}

export async function createAlertRule(
  body: Record<string, unknown>,
): Promise<AlertRule> {
  const r = await apiClient<ApiOk<AlertRule>>("/alert-rules/", {
    method: "POST",
    body: JSON.stringify(body),
  });
  return r.data;
}

export async function deleteAlertRule(id: string): Promise<void> {
  await apiDeleteClient(`/alert-rules/${id}`);
}
