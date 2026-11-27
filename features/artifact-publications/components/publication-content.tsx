"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import dynamic from "next/dynamic";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { MessageSquarePlusIcon } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { MarkdownPreview } from "@/components/shared/forms/markdown-textarea";
import { quoteMarkdownSource } from "@/lib/comments/markdown-source-range";
import { bodyImagePrefix } from "@/lib/markdown-body-images";
import { PublicationImageScope } from "@/components/shared/forms/markdown-image";
import { DataLoadError } from "@/components/shared/feedback/data-load-error";
import type { PublicationNodeRead } from "@/lib/api/generated/model";
import type { Content } from "@/features/specifications/lib/specification";
import { readPublicationNodes } from "../lib/api";
import { decodePublicationGraph } from "../lib/graph";
import {
  publicationQuoteFields,
  publicationQuoteId,
  quoteFromSelection,
  type PublicationQuote,
} from "../lib/publication-quote";

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
  project_goal: "案件ゴール",
  project_scope: "対象範囲・対象外",
  project_completion_criteria: "案件の完了条件",
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

function quoteLocation(node: PublicationNodeRead, field: string) {
  if (!publicationQuoteFields[node.node_kind]?.includes(field)) return {};
  return {
    id: publicationQuoteId(node.id, field),
    "data-quote-node": node.id,
    "data-quote-field": field,
  };
}

type QuoteAction = { field: string; onClick: () => void };

function AddQuote({ action, field }: { action?: QuoteAction; field: string }) {
  if (action?.field !== field) return null;
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className="mt-2 self-start"
      onClick={action.onClick}
    >
      <MessageSquarePlusIcon data-icon="inline-start" />
      選択した箇所にコメント
    </Button>
  );
}

export function PublicNode({
  node,
  onSelectText,
  quoteAction,
  reader = false,
  sharedPublicationId,
  trackQuoteSource = false,
}: {
  node: PublicationNodeRead;
  onSelectText?: (field: string, quote: string, quoteStart: number) => void;
  quoteAction?: QuoteAction;
  reader?: boolean;
  sharedPublicationId?: string;
  trackQuoteSource?: boolean;
}) {
  const structured =
    node.node_kind === "specification" &&
    node.payload.content &&
    typeof node.payload.content === "object";
  const fields = Object.entries(node.payload).filter(
    ([key]) =>
      key !== "title" && (!structured || !["summary", "content"].includes(key)),
  );
  const mainFields: Record<string, string[]> = {
    requirement_document: [
      "purpose",
      "project_goal",
      "project_scope",
      "project_completion_criteria",
    ],
    section: ["content"],
    requirement: ["description", "acceptance_criteria", "rationale"],
    requirement_detail: ["detail_json"],
  };
  const body = reader ? (mainFields[node.node_kind] ?? []) : [];
  const displayed = reader
    ? body.flatMap((key) =>
        fields.filter(([field, value]) => field === key && value),
      )
    : fields;
  const metadata = fields.filter(
    ([key, value]) => !body.includes(key) && value != null && value !== "",
  );
  return (
    <PublicationImageScope.Provider
      value={
        sharedPublicationId
          ? { publicationId: sharedPublicationId, nodeId: node.id }
          : null
      }
    >
      <article
        id={`public-node-${node.id}`}
        className="flex min-w-0 flex-col gap-3 border-b pb-5 last:border-b-0"
      >
        {!reader ? (
          <p className="text-xs text-muted-foreground">
            固定した内容
            {node.source_version ? `・元の版 ${node.source_version}` : ""}
          </p>
        ) : null}
        {structured ? (
          <SpecificationFields
            values={{
              title: String(node.payload.title ?? ""),
              summary: String(node.payload.summary ?? ""),
              content: node.payload.content as Content,
            }}
            onChange={() => undefined}
            readOnly
            liveLinks={false}
            renderReadOnlyText={(field, value) => {
              if (field !== "title" && field !== "summary") return undefined;
              return (
                <>
                  <div {...quoteLocation(node, field)} className="scroll-mt-20">
                    {field === "summary" && value.includes(bodyImagePrefix) ? (
                      <MarkdownPreview
                        value={value}
                        liveLinks={false}
                        inert
                        quoteSourcePositions={trackQuoteSource}
                        className="min-h-0 rounded-none border-0 bg-transparent p-0"
                      />
                    ) : (
                      value
                    )}
                  </div>
                  <AddQuote action={quoteAction} field={field} />
                </>
              );
            }}
          />
        ) : typeof node.payload.title === "string" ? (
          <>
            <h3
              {...quoteLocation(node, "title")}
              className={
                reader
                  ? "scroll-mt-20 text-2xl font-semibold [overflow-wrap:anywhere]"
                  : "scroll-mt-20 text-base font-semibold"
              }
            >
              {node.payload.title}
            </h3>
            <AddQuote action={quoteAction} field="title" />
          </>
        ) : null}
        <dl className="flex min-w-0 flex-col gap-3">
          {displayed.map(([key, value]) => (
            <div key={key} className="min-w-0">
              <dt
                className={
                  reader
                    ? "text-sm font-semibold"
                    : "text-xs text-muted-foreground"
                }
              >
                {labels[key] ?? key}
              </dt>
              <dd
                {...quoteLocation(node, key)}
                className="scroll-mt-20"
                onMouseUp={
                  onSelectText && typeof value === "string"
                    ? (event) => {
                        const anchor = quoteMarkdownSource(
                          event.currentTarget,
                          value,
                          window.getSelection(),
                        );
                        if (anchor)
                          onSelectText(key, anchor.quote, anchor.quote_start);
                      }
                    : undefined
                }
              >
                {typeof value === "string" ? (
                  <MarkdownPreview
                    liveLinks={false}
                    inert
                    quoteSourcePositions={
                      trackQuoteSource || Boolean(onSelectText)
                    }
                    className={
                      reader
                        ? "min-h-0 rounded-none border-0 bg-transparent px-0 py-2"
                        : "min-h-0"
                    }
                    value={value}
                    emptyMessage="記載なし"
                  />
                ) : (
                  <pre className="max-w-full overflow-x-auto whitespace-pre-wrap break-words text-sm">
                    {value == null
                      ? "記載なし"
                      : JSON.stringify(value, null, 2)}
                  </pre>
                )}
              </dd>
              {quoteAction?.field === key && (
                <dd>
                  <AddQuote action={quoteAction} field={key} />
                </dd>
              )}
            </div>
          ))}
        </dl>
        {reader ? (
          metadata.length ? (
            <details className="text-sm text-muted-foreground">
              <summary className="cursor-pointer">固定版の属性</summary>
              <dl className="grid gap-2 pt-2 sm:grid-cols-2">
                {metadata.map(([key, value]) => (
                  <div
                    key={key}
                    className="min-w-0 text-xs [overflow-wrap:anywhere]"
                  >
                    <dt>{labels[key] ?? key}</dt>
                    <dd className="text-foreground">
                      {typeof value === "string"
                        ? value
                        : JSON.stringify(value)}
                    </dd>
                  </div>
                ))}
              </dl>
            </details>
          ) : null
        ) : (
          <details className="text-sm">
            <summary>本文全体をテキストで確認</summary>
            <pre className="mt-2 max-w-full overflow-x-auto whitespace-pre-wrap break-words text-xs">
              {JSON.stringify(node.payload, null, 2)}
            </pre>
          </details>
        )}
      </article>
    </PublicationImageScope.Provider>
  );
}

function PublicGraph({
  root,
  nodes,
  publicationId,
  onReady,
  title,
}: {
  root: PublicationNodeRead;
  nodes: PublicationNodeRead[];
  publicationId: string;
  onReady: (id: string, ready: boolean) => void;
  title?: ReactNode;
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
  useEffect(() => {
    onReady(root.id, graph.isSuccess);
    return () => onReady(root.id, false);
  }, [onReady, root.id, graph.isSuccess]);
  if (graph.isPending) return <Skeleton className="h-32" />;
  if (graph.error)
    return (
      <DataLoadError
        resourceName="公開準備版のテスト設計"
        onRetry={() => void graph.refetch()}
      />
    );
  return <PublicTestDesign design={graph.data} title={title} />;
}

export function PublicationContent({
  projectId,
  publicationId,
  onReady,
  onNodes,
  onQuote,
}: {
  projectId: number;
  publicationId: string;
  onReady?: (ready: boolean) => void;
  onNodes?: (nodes: PublicationNodeRead[]) => void;
  onQuote?: (quote: PublicationQuote) => void;
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
  useEffect(() => {
    onNodes?.(!query.hasNextPage && query.isSuccess ? nodes : []);
  }, [nodes, query.hasNextPage, query.isSuccess, onNodes]);
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
    <PublicationBody
      nodes={nodes}
      publicationId={publicationId}
      onReady={onReady}
      onQuote={onQuote}
    />
  );
}

export function PublicationBody({
  nodes,
  publicationId,
  onReady,
  reader = false,
  sharedPublicationId,
  onQuote,
}: {
  nodes: PublicationNodeRead[];
  publicationId: string;
  onReady?: (ready: boolean) => void;
  reader?: boolean;
  sharedPublicationId?: string;
  onQuote?: (quote: PublicationQuote) => void;
}) {
  const body = useRef<HTMLDivElement>(null);
  const [selectedQuote, setSelectedQuote] = useState<PublicationQuote>();
  const [graphs, setGraphs] = useState<Record<string, boolean>>({});
  const graphReady = useCallback((id: string, ready: boolean) => {
    setGraphs((previous) =>
      previous[id] === ready ? previous : { ...previous, [id]: ready },
    );
  }, []);
  const allReady = nodes
    .filter((n) => n.node_kind === "test_design")
    .every((n) => graphs[n.id]);
  useEffect(() => {
    onReady?.(allReady);
    return () => onReady?.(false);
  }, [allReady, onReady]);
  useEffect(() => {
    if (!onQuote) return;
    function selectQuote() {
      const selection = window.getSelection();
      const start = selection?.anchorNode;
      if (
        !selection ||
        selection.isCollapsed ||
        !start ||
        !body.current?.contains(start)
      )
        return;
      const container = start instanceof Element ? start : start.parentElement;
      const element = container?.closest<HTMLElement>(
        "[data-quote-node][data-quote-field]",
      );
      const nodeId = element?.dataset.quoteNode;
      const field = element?.dataset.quoteField;
      const source =
        nodeId && field
          ? nodes.find((node) => node.id === nodeId)?.payload[field]
          : undefined;
      if (!element || !nodeId || !field || typeof source !== "string") {
        setSelectedQuote(undefined);
        return;
      }
      const quote = element.querySelector("[data-quote-source]")
        ? quoteMarkdownSource(element, source, selection)
        : quoteFromSelection(selection, element, field, source);
      setSelectedQuote(
        quote ? { nodeId, anchor: { ...quote, field } } : undefined,
      );
    }
    document.addEventListener("selectionchange", selectQuote);
    return () => document.removeEventListener("selectionchange", selectQuote);
  }, [nodes, onQuote]);
  return (
    <div
      ref={body}
      className="flex min-w-0 flex-col gap-6"
      aria-label="相手に見せる本文全体"
    >
      {!reader ? (
        <p className="text-xs text-muted-foreground">
          本文全体を取得しました。内部状態の表示は、顧客による合意・正式承認を表すものではありません。
        </p>
      ) : null}
      {nodes
        .filter((n) => n.node_kind !== "test_design_part")
        .map((node) => {
          const action =
            onQuote && selectedQuote?.nodeId === node.id
              ? {
                  field: selectedQuote.anchor.field,
                  onClick: () => {
                    onQuote(selectedQuote);
                    setSelectedQuote(undefined);
                  },
                }
              : undefined;
          return node.node_kind === "test_design" ? (
            <section key={node.id} id={`public-node-${node.id}`}>
              <PublicationImageScope.Provider
                value={
                  sharedPublicationId
                    ? { publicationId: sharedPublicationId, nodeId: node.id }
                    : null
                }
              >
                <PublicGraph
                  root={node}
                  nodes={nodes}
                  publicationId={publicationId}
                  onReady={graphReady}
                  title={
                    <span
                      {...quoteLocation(node, "title")}
                      className="scroll-mt-20"
                    >
                      {String(node.payload.title ?? "")}
                    </span>
                  }
                />
              </PublicationImageScope.Provider>
              <AddQuote action={action} field="title" />
            </section>
          ) : (
            <PublicNode
              key={node.id}
              node={node}
              reader={reader}
              sharedPublicationId={sharedPublicationId}
              quoteAction={action}
              trackQuoteSource={Boolean(onQuote)}
            />
          );
        })}
    </div>
  );
}
