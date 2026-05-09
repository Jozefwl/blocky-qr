"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { ApiOk, Pipeline } from "@/types/blocky";
import { apiClient } from "@/lib/api";
import { StatusBadge } from "@/components/StatusBadge";

const FAST_MS = 1000;
/** Idle pipelines: never run, finished (successful/error), or between runs — poll this often. */
const IDLE_POLL_MS = 60_000;

/** True while a run is actively queued or executing for this pipeline. */
function isPipelineRunInFlight(s: Pipeline["lastStatus"]): boolean {
  return s === "pending" || s === "running";
}

export function PipelineLastStatusLive({
  pipelineId,
  initialLastStatus,
}: {
  pipelineId: string;
  initialLastStatus: Pipeline["lastStatus"];
}) {
  const initialRef = useRef(initialLastStatus);
  initialRef.current = initialLastStatus;

  const [lastStatus, setLastStatus] = useState<Pipeline["lastStatus"]>(
    initialLastStatus,
  );

  useLayoutEffect(() => {
    setLastStatus(initialRef.current);
  }, [pipelineId]);

  useEffect(() => {
    let cancelled = false;
    let intervalId: ReturnType<typeof setInterval> | null = null;
    let useFastPoll = isPipelineRunInFlight(initialRef.current);

    function armInterval(ms: number) {
      if (intervalId) clearInterval(intervalId);
      intervalId = setInterval(() => void tick(), ms);
    }

    async function tick() {
      try {
        const r = await apiClient<ApiOk<Pipeline>>(`/pipelines/${pipelineId}`, {
          cache: "no-store",
        });
        const s = r.data.lastStatus ?? null;
        if (cancelled) return;
        setLastStatus(s);

        const inFlight = isPipelineRunInFlight(s);
        if (inFlight !== useFastPoll) {
          useFastPoll = inFlight;
          armInterval(useFastPoll ? FAST_MS : IDLE_POLL_MS);
        }
      } catch {
        /* keep last value */
      }
    }

    void tick();
    armInterval(useFastPoll ? FAST_MS : IDLE_POLL_MS);

    return () => {
      cancelled = true;
      if (intervalId) clearInterval(intervalId);
    };
  }, [pipelineId]);

  return <StatusBadge status={lastStatus ?? undefined} />;
}
