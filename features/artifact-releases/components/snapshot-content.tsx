"use client";

import dynamic from "next/dynamic";
import { useInfiniteQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { MarkdownPreview } from "@/components/shared/forms/markdown-textarea";
import { DataLoadError } from "@/components/shared/feedback/data-load-error";
import type { ArtifactNodeRead } from "@/lib/api/generated/model";
import type { Content } from "@/features/specifications/lib/specification";
import { readNodes } from "../lib/api";

const SpecificationFields = dynamic(() =>
  import("@/features/specifications/components/specification-fields").then(
    (module) => module.SpecificationFields,
  ),
);
const labels: Record<string, string> = {
  purpose: "目的",
  content: "内容",
  description: "要件の内容",
  rationale: "背景・理由",
  acceptance_criteria: "受け入れ条件",
  summary: "目的・実現すること",
  source: "情報源",
};
const kindLabels: Record<string, string> = {
  requirement_document: "要件定義書",
  section: "セクション",
  requirement: "要件",
  requirement_detail: "種別別の詳細",
  specification: "画面・API設計",
};

function SnapshotNode({ node }: { node: ArtifactNodeRead }) {
  const content = node.payload.content;
  const structured =
    node.node_kind === "specification" &&
    content &&
    typeof content === "object" &&
    "type" in content &&
    ["api", "screen"].includes(String(content.type));
  return (
    <article className="min-w-0 border-b pb-5 last:border-b-0">
      <p className="text-xs text-muted-foreground">
        {kindLabels[node.node_kind] ?? node.node_kind}
        {node.source_version ? `・元の版 ${node.source_version}` : ""}
      </p>
      {structured ? (
        <SpecificationFields
          values={{
            title: String(node.payload.title ?? ""),
            summary: String(node.payload.summary ?? ""),
            content: content as Content,
          }}
          onChange={() => undefined}
          readOnly
        />
      ) : (
        <>
          {typeof node.payload.title === "string" ? (
            <h3 className="my-2 text-base font-semibold">
              {node.payload.title}
            </h3>
          ) : null}
          <dl className="flex flex-col gap-3">
            {Object.entries(labels).map(([key, label]) =>
              typeof node.payload[key] === "string" && node.payload[key] ? (
                <div key={key}>
                  <dt className="text-xs text-muted-foreground">{label}</dt>
                  <dd className="text-sm">
                    <MarkdownPreview
                      className="min-h-0"
                      value={String(node.payload[key])}
                    />
                  </dd>
                </div>
              ) : null,
            )}
          </dl>
          {node.node_kind === "requirement_detail" ? (
            <details className="mt-3">
              <summary className="text-sm">詳細項目を確認</summary>
              <pre className="mt-2 overflow-x-auto whitespace-pre-wrap break-words text-xs">
                {JSON.stringify(node.payload.detail_json, null, 2)}
              </pre>
            </details>
          ) : null}
        </>
      )}
    </article>
  );
}

export function SnapshotContent({
  projectId,
  releaseId,
}: {
  projectId: number;
  releaseId: string;
}) {
  const query = useInfiniteQuery({
    queryKey: ["artifact-nodes", projectId, releaseId],
    initialPageParam: null as string | null,
    queryFn: ({ pageParam }) =>
      readNodes(projectId, releaseId, {
        page_size: 50,
        cursor: pageParam ?? undefined,
      }),
    getNextPageParam: (last) => last.next_cursor ?? undefined,
    retry: false,
  });
  if (query.isPending) return <Skeleton className="h-24" />;
  if (query.error)
    return (
      <DataLoadError
        resourceName="固定した本文"
        onRetry={() => void query.refetch()}
      />
    );
  return (
    <div className="flex min-w-0 flex-col gap-5">
      {query.data.pages
        .flatMap((page) => page.items)
        .map((node) => (
          <SnapshotNode key={node.id} node={node} />
        ))}
      {query.hasNextPage ? (
        <Button
          variant="outline"
          disabled={query.isFetchingNextPage}
          onClick={() => void query.fetchNextPage()}
        >
          本文の続きを表示
        </Button>
      ) : null}
    </div>
  );
}
