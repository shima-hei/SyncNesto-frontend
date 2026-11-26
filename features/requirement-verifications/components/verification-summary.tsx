"use client";

import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import type { VerificationDetail } from "@/lib/api/generated/model";
import { getEvidence, listEvidenceSets } from "../lib/evidence-api";
import { evidenceResults } from "../lib/evidence";

export function VerificationSummary({
  projectId,
  plan,
  tenantId,
  userId,
}: {
  projectId: number;
  plan: VerificationDetail;
  tenantId?: number;
  userId?: number;
}) {
  const rows = plan.revision.checklist.rows ?? [];
  const evidence = useQuery({
    queryKey: [
      "verification-submissions",
      tenantId,
      userId,
      projectId,
      plan.id,
      "summary",
      plan.current_version,
    ],
    enabled: rows.length > 0,
    retry: false,
    queryFn: async ({ signal }) => {
      const page = await listEvidenceSets(
        projectId,
        plan.id,
        { plan_version: plan.current_version },
        { signal },
      );
      if (page.state !== "ready") return { available: false, entries: [] };
      const saved = page.items?.find((item) => item.status === "ready");
      if (!saved) return { available: !page.next_cursor, entries: [] };
      const detail = await getEvidence(
        projectId,
        plan.id,
        saved.id,
        { page_size: 50 },
        { signal },
      );
      return {
        available: !detail.next_cursor,
        entries: detail.entries,
      };
    },
  });
  const byRow = new Map<string, Set<string>>();
  for (const entry of evidence.data?.entries ?? []) {
    const id = entry.row_id;
    const result = entry.result;
    if (typeof id !== "string" || typeof result !== "string") continue;
    if (!byRow.has(id)) byRow.set(id, new Set());
    byRow.get(id)?.add(result);
  }
  const available = rows.length === 0 || evidence.data?.available;
  const results = rows.map((item, index) => {
    const outcomes = byRow.get(item.id);
    const status = outcomes?.size === 1 ? [...outcomes][0] : undefined;
    return {
      id: item.id,
      label: item.description?.trim() || `確認項目 ${index + 1}`,
      status,
      outcome: !available
        ? evidence.isPending
          ? "読込中"
          : "詳細で確認"
        : !outcomes
          ? byRow.size
            ? "直近の証跡に結果なし"
            : "結果未登録"
          : status
            ? (evidenceResults[status] ?? "詳細で確認")
            : "結果が混在",
    };
  });

  return (
    <section aria-label="確認項目の状況" className="min-w-0 space-y-3">
      <p className="text-sm text-muted-foreground">
        検証対象{" "}
        {plan.target_version_label ??
          `要件版 ${String(plan.fixed_subject.source_version ?? "")}`}{" "}
        ・ 確認表 {plan.current_version}版
      </p>
      <dl className="grid grid-cols-3 gap-2 rounded-lg border px-3 py-2.5 text-sm sm:gap-5">
        <div>
          <dt className="text-muted-foreground">確認項目</dt>
          <dd className="text-lg font-semibold">{rows.length}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">確認OK</dt>
          <dd className="text-lg font-semibold">
            {available
              ? results.filter((r) => r.status === "passed").length
              : "—"}
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground">
            {byRow.size ? "直近の結果なし" : "結果未登録"}
          </dt>
          <dd className="text-lg font-semibold">
            {available ? results.filter((r) => !byRow.has(r.id)).length : "—"}
          </dd>
        </div>
      </dl>
      {results.length ? (
        <ul className="divide-y border-y">
          {results.map((result) => (
            <li
              key={result.id}
              className="flex min-w-0 flex-wrap items-center justify-between gap-2 py-2.5 text-sm"
            >
              <span className="min-w-0 flex-1 [overflow-wrap:anywhere]">
                {result.label}
              </span>
              <Badge
                variant="outline"
                className={
                  result.status === "passed"
                    ? "text-[var(--status-success-fg)]"
                    : undefined
                }
              >
                {result.outcome}
              </Badge>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">
          確認項目はまだありません。
        </p>
      )}
      {evidence.isError ? (
        <p role="status" className="text-xs text-muted-foreground">
          証跡の状況を取得できません。詳細で再確認できます。
        </p>
      ) : byRow.size ? (
        <p className="text-xs text-muted-foreground">
          確認結果は、この確認表の最新版に対して保全された直近の証跡を表示しています。
        </p>
      ) : null}
    </section>
  );
}
