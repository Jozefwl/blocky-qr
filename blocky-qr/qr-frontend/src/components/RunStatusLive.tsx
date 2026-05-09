"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { ApiOk, JobRun } from "@/types/blocky";
import { apiClient } from "@/lib/api";
import { StatusBadge } from "@/components/StatusBadge";

const FAST_MS = 1000;
/** After run finishes (successful or error), poll this often instead of FAST_MS. */
const TERMINAL_POLL_MS = 60_000;

function isTerminalRunStatus(s: JobRun["status"]): boolean {
  return s === "successful" || s === "error";
}

export function RunStatusLive({
  runId,
  initialFromServer,
}: {
  runId: string;
  /** RSC snapshot when opening this run; client polling updates after that. */
  initialFromServer: JobRun["status"];
}) {
  const initialRef = useRef(initialFromServer);
  initialRef.current = initialFromServer;

  const [status, setStatus] = useState<JobRun["status"]>(initialFromServer);

  useLayoutEffect(() => {
    setStatus(initialRef.current);
  }, [runId]);

  useEffect(() => {
    let cancelled = false;
    let intervalId: ReturnType<typeof setInterval> | null = null;
    /** While true, poll every FAST_MS; after successful or error, switch to TERMINAL_POLL_MS. */
    let useFastPoll = !isTerminalRunStatus(initialRef.current);

    function armInterval(ms: number) {
      if (intervalId) clearInterval(intervalId);
      intervalId = setInterval(() => void tick(), ms);
    }

    async function fetchStatus(): Promise<JobRun["status"]> {
      const r = await apiClient<ApiOk<JobRun>>(`/runs/${runId}`, {
        cache: "no-store",
      });
      return r.data.status;
    }

    async function tick() {
      try {
        const s = await fetchStatus();
        if (cancelled) return;
        setStatus(s);

        if (isTerminalRunStatus(s) && useFastPoll) {
          useFastPoll = false;
          armInterval(TERMINAL_POLL_MS);
        }
      } catch {
        /* keep last known status */
      }
    }

    void tick();
    armInterval(useFastPoll ? FAST_MS : TERMINAL_POLL_MS);

    return () => {
      cancelled = true;
      if (intervalId) clearInterval(intervalId);
    };
  }, [runId]);

  return <StatusBadge status={status} />;
}
