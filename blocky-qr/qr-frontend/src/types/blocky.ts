export type Dataset = {
  _id: string;
  name: string;
  owner: string;
  type: "aggregation" | "file";
  schemaVersion?: number;
  createdAt?: string;
  fileType?: Record<string, unknown>;
  fileLink?: string;
  aggregation?: { timeFrom?: string; timeTo?: string };
};

export type DatasetDetail = Dataset & {
  aggregationResult?: { _id: string }[] | null;
};

export type Pipeline = {
  _id: string;
  name: string;
  datasetOid: string;
  schedule?: string;
  active: boolean;
  createdAt?: string;
  pipelineVersion: number;
  lastRunTime?: string | null;
  lastStatus?: "successful" | "error" | "running" | null;
};

/** Pokud backend doplní JobRunStep — volitelné pole kroků */
export type JobRunStep = {
  name?: string;
  step?: string;
  status?: string;
  message?: string;
  startedAt?: string;
  finishedAt?: string;
};

export type JobRun = {
  _id: string;
  pipelineOid: string;
  pipelineVersion: number;
  status: "pending" | "running" | "successful" | "error";
  createdAt?: string;
  startTime?: string | null;
  finishTime?: string | null;
  errorMessage?: string | null;
  processedRecords?: number;
  totalRecords?: number;
  steps?: JobRunStep[];
};

export type Alert = {
  _id: string;
  name: string;
  status: "successful" | "error" | "pending" | "running";
  message: string;
  pipelineOid: string;
  runId: string;
  alertRuleId?: string | null;
  createdAt?: string;
  acknowledgedAt?: string | null;
};

export type AlertRule = {
  _id: string;
  name: string;
  pipelineOid: string;
  reportWhenState: "successful" | "error" | "pending" | "running";
  createdAt?: string;
};

export type ApiOk<T> = { status: string; data: T };
export type ApiErr = { error?: string; errors?: string[] };
