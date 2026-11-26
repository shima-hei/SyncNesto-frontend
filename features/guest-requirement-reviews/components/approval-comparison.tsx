"use client";

import { useCallback, useId, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { DataLoadError } from "@/components/shared/feedback/data-load-error";
import { DataPagination } from "@/components/shared/navigation/data-pagination";
import { useFreshShared } from "@/features/artifact-publications/hooks/use-fresh-shared";
import type { loadSharedContent } from "@/features/artifact-publications/lib/load-shared-content";
import { RequirementVersionChanges } from "@/features/requirements/components/review/requirement-version-changes";
import {
  reviewTargetKind,
  reviewTargetTitle,
} from "@/features/requirements/lib/requirement-workflow-review";
import { ApiError } from "@/lib/api/error";
import type { PublicationNodeRead } from "@/lib/api/generated/model";
import { readApprovalComparison } from "../lib/api";

type SharedContent = Awaited<ReturnType<typeof loadSharedContent>>;
const pageSize = 20;
const changeLabels = {
  added: "追加",
  changed: "変更",
  removed: "削除",
} as const;
const ignoredFields = new Set([
  "status",
  "sort_order",
  "source",
  "part_count",
  "counts",
  "graph_schema",
  "graph_digest",
]);

function indexNodes(nodes: PublicationNodeRead[]) {
  const byId = new Map(nodes.map((node) => [node.id, node]));
  const details = new Map<string, PublicationNodeRead["payload"][]>();
  for (const node of nodes) {
    if (node.node_kind !== "requirement_detail" || !node.parent_id) continue;
    const grouped = details.get(node.parent_id) ?? [];
    grouped.push(node.payload);
    details.set(node.parent_id, grouped);
  }
  return { byId, details };
}

function fieldValue(
  node: PublicationNodeRead | undefined,
  index: ReturnType<typeof indexNodes>,
  field: string,
) {
  if (!node) return undefined;
  if (field === "position") return node.position + 1;
  if (field === "details") return index.details.get(node.id);
  if (field === "parent") {
    const parent = node.parent_id ? index.byId.get(node.parent_id) : undefined;
    return parent ? reviewTargetTitle(parent) : "直下";
  }
  return node.payload[field];
}

export function SharedApprovalComparison({
  requestId,
  current,
  previous,
  onRecheck,
}: {
  requestId: string;
  current: SharedContent;
  previous: SharedContent;
  onRecheck: () => void;
}) {
  const headingId = useId();
  const root = useRef<HTMLDivElement>(null);
  const [page, setPage] = useState(1);
  const publicationId = current.metadata.content.id;
  const before = useMemo(() => indexNodes(previous.nodes), [previous.nodes]);
  const after = useMemo(() => indexNodes(current.nodes), [current.nodes]);
  const load = useCallback(
    async (signal: AbortSignal) => {
      const result = await readApprovalComparison(
        publicationId,
        requestId,
        { page, page_size: pageSize },
        { signal },
      );
      if (
        result.authorization_revision !==
          current.metadata.authorization_revision ||
        result.previous_publication_id !== previous.metadata.content.id ||
        result.previous_authorization_revision !==
          previous.metadata.authorization_revision
      ) {
        throw new Error("閲覧許可が更新されました。再確認してください。");
      }
      return result;
    },
    [
      publicationId,
      requestId,
      page,
      current.metadata.authorization_revision,
      previous.metadata,
    ],
  );
  const mask = useCallback((hidden: boolean) => {
    if (root.current) root.current.hidden = hidden;
  }, []);
  const { value, error } = useFreshShared(
    `${publicationId}:${requestId}:${page}`,
    load,
    mask,
  );
  const changes = (value?.items ?? []).flatMap((item) => {
    const older = item.before_id ? before.byId.get(item.before_id) : undefined;
    const newer = item.after_id ? after.byId.get(item.after_id) : undefined;
    const target = newer ?? older;
    if (!target) return [];
    const attachment = ["specification", "test_design"].includes(
      target.node_kind,
    );
    const fields =
      older && newer
        ? item.fields
        : Object.keys(target.payload).filter((key) => !ignoredFields.has(key));
    const index = newer ? after : before;
    const visibleFields =
      !older || !newer
        ? fields.filter(
            (key) => target.payload[key] != null && target.payload[key] !== "",
          )
        : fields;
    if ((!older || !newer) && index.details.has(target.id))
      visibleFields.push("details");
    const code = target.payload.requirement_code;
    return [
      {
        id: target.id,
        label: `${attachment ? `${reviewTargetKind[target.node_kind]} ・ ` : typeof code === "string" ? `${code} ・ ` : ""}${reviewTargetTitle(target)}`,
        type: changeLabels[item.kind],
        fields: visibleFields
          .filter((field) => !ignoredFields.has(field))
          .map((field) => ({
            field,
            before: fieldValue(older, before, field),
            after: fieldValue(newer, after, field),
          })),
        extra: attachment ? (
          <div className="mb-3 flex flex-wrap gap-4 border-s ps-3">
            {older ? (
              <Link
                className="underline"
                href={`/shared/publications/${previous.metadata.content.id}#public-node-${older.id}`}
              >
                承認済み版の資料を開く
              </Link>
            ) : null}
            {newer ? (
              <Link
                className="underline"
                href={`/shared/publications/${publicationId}#public-node-${newer.id}`}
              >
                承認対象版の資料を開く
              </Link>
            ) : null}
          </div>
        ) : undefined,
      },
    ];
  });

  return (
    <section className="grid min-w-0 gap-3" aria-labelledby={headingId}>
      <h3 id={headingId} className="font-semibold">
        前回承認済み版からの変更
      </h3>
      <div ref={root}>
        {error instanceof ApiError && error.status === 404 ? (
          <p className="text-sm text-muted-foreground" role="status">
            前回承認済み版との比較を表示できません。
          </p>
        ) : error ? (
          <DataLoadError
            resourceName="前回承認済み版との差分"
            onRetry={onRecheck}
          />
        ) : !value ? (
          <p role="status" className="text-sm text-muted-foreground">
            版の内容を比較しています…
          </p>
        ) : (
          <>
            <RequirementVersionChanges changes={changes} />
            {value.total > pageSize ? (
              <div className="mt-3">
                <DataPagination
                  page={page}
                  pageSize={pageSize}
                  total={value.total}
                  currentCount={changes.length}
                  onPageChange={setPage}
                />
              </div>
            ) : null}
          </>
        )}
      </div>
    </section>
  );
}
