"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { ApiOk } from "@/types/blocky";
import type { Pipeline } from "@/types/blocky";
import { apiClient } from "@/lib/api";

export function PipelineActiveToggle({
  pipelineId,
  active,
  ariaLabel,
}: {
  pipelineId: string;
  active: boolean;
  ariaLabel?: string;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function patch(next: boolean) {
    setPending(true);
    setError(null);
    try {
      await apiClient<ApiOk<Pipeline>>(`/pipelines/${pipelineId}`, {
        method: "PATCH",
        body: JSON.stringify({ active: next }),
      });
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Chyba.");
    } finally {
      setPending(false);
    }
  }

  return (
    <span className="toggle-inline">
      <input
        type="checkbox"
        className="toggle-input"
        checked={active}
        disabled={pending}
        aria-label={ariaLabel ?? "Aktivní"}
        title={error ?? undefined}
        onChange={(ev) => patch(ev.target.checked)}
      />
      {error ? (
        <span className="error-text small" title={error}>
          !
        </span>
      ) : null}
    </span>
  );
}
