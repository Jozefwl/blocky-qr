"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Alert } from "@/types/blocky";
import type { ApiOk } from "@/types/blocky";
import { apiClient } from "@/lib/api";

export function AcknowledgeAlertButton({
  alert,
}: {
  alert: Alert;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  if (alert.acknowledgedAt) {
    return (
      <span className="muted small">
        Potvrzeno {new Date(alert.acknowledgedAt).toLocaleString()}
      </span>
    );
  }

  async function acknowledge() {
    setPending(true);
    try {
      await apiClient<ApiOk<Alert>>(`/alerts/${alert._id}/acknowledge`, {
        method: "POST",
        body: "{}",
      });
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <button
      type="button"
      className="btn small"
      disabled={pending}
      onClick={acknowledge}
    >
      {pending ? "…" : "Potvrdit"}
    </button>
  );
}
