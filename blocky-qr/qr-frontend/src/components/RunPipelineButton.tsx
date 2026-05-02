"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { ApiOk } from "@/types/blocky";
import type { JobRun } from "@/types/blocky";
import { apiClient } from "@/lib/api";

export function RunPipelineButton({
  pipelineId,
  disabled,
  compact,
}: {
  pipelineId: string;
  disabled?: boolean;
  compact?: boolean;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function run() {
    setPending(true);
    setMsg(null);
    try {
      const res = await apiClient<
        ApiOk<JobRun> & { message?: string }
      >(`/pipelines/${pipelineId}/run`, { method: "POST", body: "{}" });
      setMsg(res.message ?? "Běh spuštěn.");
      router.refresh();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Spuštění selhalo.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className={compact ? "inline-actions compact-run" : "inline-actions"}>
      <button
        type="button"
        className={compact ? "btn small primary" : "btn primary"}
        disabled={disabled || pending}
        onClick={run}
      >
        {pending ? "…" : compact ? "Run" : "Spustit pipeline"}
      </button>
      {msg && !compact ? <span className="form-hint">{msg}</span> : null}
      {msg && compact ? (
        <span className="form-hint small" title={msg}>
          {msg.length > 40 ? `${msg.slice(0, 40)}…` : msg}
        </span>
      ) : null}
    </div>
  );
}
