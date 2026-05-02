"use client";

import type { Pipeline } from "@/types/blocky";
import { PipelineActiveToggle } from "@/components/PipelineActiveToggle";

export function PipelineQuickEdit({ pipeline }: { pipeline: Pipeline }) {
  return (
    <div className="card stack">
      <h3 className="card-title">Rychlé akce</h3>
      <div className="inline-actions">
        <PipelineActiveToggle
          pipelineId={pipeline._id}
          active={pipeline.active}
          ariaLabel="Aktivní pipeline"
        />
        <span className="muted small">Aktivní (plánované běhy)</span>
      </div>
    </div>
  );
}
