"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ApiRequestError, deleteAlertRule } from "@/lib/api";

export function AlertRuleDeleteButton({
  ruleId,
  ruleName,
}: {
  ruleId: string;
  ruleName: string;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function onDelete() {
    if (
      !confirm(
        `Smazat pravidlo „${ruleName}“? Tuto akci nelze vrátit zpět.`,
      )
    ) {
      return;
    }
    setPending(true);
    try {
      await deleteAlertRule(ruleId);
      router.refresh();
    } catch (err) {
      const msg =
        err instanceof ApiRequestError
          ? err.message
          : "Smazání se nepodařilo.";
      alert(msg);
    } finally {
      setPending(false);
    }
  }

  return (
    <button
      type="button"
      className="btn small danger"
      disabled={pending}
      onClick={onDelete}
    >
      {pending ? "…" : "Smazat"}
    </button>
  );
}
