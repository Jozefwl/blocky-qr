"use client";

import Link from "next/link";
import type { Pipeline } from "@/types/blocky";
import { PipelineActiveToggle } from "@/components/PipelineActiveToggle";
import { RunPipelineButton } from "@/components/RunPipelineButton";

export function PipelineRowActions({ pipeline }: { pipeline: Pipeline }) {
  return (
    <div className="table-actions">
      <Link href={`/pipelines/${pipeline._id}`}>Detail</Link>
      <RunPipelineButton
        pipelineId={pipeline._id}
        disabled={!pipeline.active}
        compact
      />
      <PipelineActiveToggle
        pipelineId={pipeline._id}
        active={pipeline.active}
        ariaLabel={`Aktivovat pipeline ${pipeline.name}`}
      />
    </div>
  );
}
