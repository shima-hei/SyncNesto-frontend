"use client";

import { useEffect, useMemo } from "react";
import dynamic from "next/dynamic";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { MarkdownPreview } from "@/components/shared/forms/markdown-textarea";
import { DataLoadError } from "@/components/shared/feedback/data-load-error";
import type { PublicationNodeRead } from "@/lib/api/generated/model";
import type { Content } from "@/features/specifications/lib/specification";
import { readPublicationNodes } from "../lib/api";
import { decodePublicationGraph } from "../lib/graph";

const SpecificationFields = dynamic(() =>
  import("@/features/specifications/components/specification-fields").then(
    (m) => m.SpecificationFields,
  ),
);
const PublicTestDesign = dynamic(() =>
  import("./public-test-design").then((m) => m.PublicTestDesign),
);
const labels: Record<string, string> = {
  requirement_code: "要件コード",
  requirement_type: "要件種別",
  category: "分類",
  description: "要件の内容",
  rationale: "背景・理由",
  acceptance_criteria: "受け入れ条件",
  priority: "優先度",
  source: "情報源",
  document_code: "文書コード",
  purpose: "目的",
  target_system_name: "対象システム",
  client_name: "顧客・利用部門",
  section_type: "章の種類",
  content: "内容",
  sort_order: "表示順",
  summary: "目的・実現すること",
  kind: "設計の種類",
  status: "固定時の内部状態（顧客の承認状態とは別）",
  detail_type: "詳細の種類",
  detail_json: "種別別の詳細",
};

function PublicNode({ node }: { node: PublicationNodeRead }) {
  const structured =
    node.node_kind === "specification" &&
    node.payload.content &&
    typeof node.payload.content === "object";
  return (
    <article className="flex min-w-0 flex-col gap-3 border-b pb-5 last:border-b-0">
      <p className="text-xs text-muted-foreground">
        固定した内容
        {node.source_version ? `・元の版 ${node.source_version}` : ""}
      </p>
      {structured ? (
        <SpecificationFields
          values={{
            title: String(node.payload.title ?? ""),
            summary: String(node.payload.summary ?? ""),
            content: node.payload.content as Content,
          }}
          onChange={() => undefined}
          readOnly
        />
      ) : typeof node.payload.title === "string" ? (
        <h3 className="text-base font-semibold">{node.payload.title}</h3>
      ) : null}
      <dl className="flex min-w-0 flex-col gap-3">
        {Object.entries(node.payload)
          .filter(
            ([key]) =>
              key !== "title" &&
              (!structured || !["summary", "content"].includes(key)),
          )
          .map(([key, value]) => (
            <div key={key} className="min-w-0">
              <dt className="text-xs text-muted-foreground">
                {labels[key] ?? key}
              </dt>
              <dd>
                {typeof value === "string" ? (
                  <MarkdownPreview
                    inert
                    className="min-h-0"
                    value={value}
                    emptyMessage="記載なし"
                  />
                ) : (
                  <pre className="max-w-full overflow-x-auto whitespace-pre-wrap break-words text-sm">
                    {JSON.stringify(value, null, 2) ?? "記載なし"}
                  </pre>
                )}
              </dd>
            </div>
          ))}
      </dl>
      <details className="text-sm">
        <summary>本文全体をテキストで確認</summary>
        <pre className="mt-2 max-w-full overflow-x-auto whitespace-pre-wrap break-words text-xs">
          {JSON.stringify(node.payload, null, 2)}
        </pre>
      </details>
    </article>
  );
}

function PublicGraph({
  root,
  nodes,
  publicationId,
}: {
  root: PublicationNodeRead;
  nodes: PublicationNodeRead[];
  publicationId: string;
}) {
  const graph = useQuery({
    queryKey: [
      "publication-graph",
      publicationId,
      root.id,
      root.payload.graph_digest,
    ],
    queryFn: () => decodePublicationGraph(root, nodes),
    retry: false,
    gcTime: 0,
  });
  if (graph.isPending) return <Skeleton className="h-32" />;
  if (graph.error)
    return (
      <DataLoadError
        resourceName="公開準備版のテスト設計"
        onRetry={() => void graph.refetch()}
      />
    );
  return <PublicTestDesign design={graph.data} />;
}

export function PublicationContent({
  projectId,
  publicationId,
}: {
  projectId: number;
  publicationId: string;
}) {
  const query = useInfiniteQuery({
    queryKey: ["publication-nodes", projectId, publicationId],
    initialPageParam: null as string | null,
    queryFn: ({ pageParam }) =>
      readPublicationNodes(projectId, publicationId, {
        page_size: 50,
        cursor: pageParam ?? undefined,
      }),
    getNextPageParam: (last) => last.next_cursor ?? undefined,
    retry: false,
    gcTime: 0,
  });
  const nodes = useMemo(
    () => query.data?.pages.flatMap((p) => p.items) ?? [],
    [query.data],
  );
  const { hasNextPage, isFetching, error, fetchNextPage } = query;
  useEffect(() => {
    if (hasNextPage && !isFetching && !error) void fetchNextPage();
  }, [hasNextPage, isFetching, error, fetchNextPage]);
  if (query.isPending) return <Skeleton className="h-40" />;
  if (query.error)
    return (
      <DataLoadError
        resourceName="公開準備版の本文全体"
        onRetry={() => void query.refetch()}
      />
    );
  if (query.hasNextPage)
    return (
      <Alert>
        <AlertTitle>本文全体を取得しています</AlertTitle>
        <AlertDescription>
          {nodes.length} / {query.data.pages[0]?.total}
          部分。全体が揃ってから表示します。
        </AlertDescription>
      </Alert>
    );
  return (
    <div
      className="flex min-w-0 flex-col gap-6"
      aria-label="相手に見せる本文全体"
    >
      <p className="text-xs text-muted-foreground">
        本文全体を取得しました。内部状態の表示は、顧客による合意・正式承認を表すものではありません。
      </p>
      {nodes
        .filter((n) => n.node_kind !== "test_design_part")
        .map((node) =>
          node.node_kind === "test_design" ? (
            <PublicGraph
              key={node.id}
              root={node}
              nodes={nodes}
              publicationId={publicationId}
            />
          ) : (
            <PublicNode key={node.id} node={node} />
          ),
        )}
    </div>
  );
}
