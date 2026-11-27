import { useEffect, useRef, useState } from "react";
import { MessageSquarePlusIcon } from "lucide-react";
import { MarkdownPreview } from "@/components/shared/forms/markdown-textarea";
import { Button } from "@/components/ui/button";
import { SnapshotNode } from "@/features/artifact-releases/components/snapshot-content";
import { TestDesignSnapshot } from "@/features/artifact-releases/components/test-design-snapshot";
import {
  fixedQuoteRange,
  quoteMarkdownSource,
} from "@/lib/comments/markdown-source-range";
import { showQuoteRange } from "@/lib/comments/rendered-range";
import {
  reviewTargetKind,
  reviewTargetTitle,
} from "@/features/requirements/lib/requirement-workflow-review";
import type {
  ArtifactNodeRead,
  RequirementReviewAnchor,
} from "@/lib/api/generated/model";

const fieldsByKind: Record<string, readonly (readonly [string, string])[]> = {
  requirement_document: [
    ["purpose", "目的"],
    ["project_goal", "案件の目標"],
    ["project_scope", "対象範囲"],
    ["project_completion_criteria", "案件の完了条件"],
  ],
  section: [["content", "本文"]],
  requirement: [
    ["description", "要件の内容"],
    ["rationale", "背景・理由"],
    ["acceptance_criteria", "受け入れ条件"],
  ],
};

export function ReviewContent({
  node,
  nodes,
  projectId,
  complete,
  canDiscuss,
  highlight,
  onQuote,
}: {
  node: ArtifactNodeRead;
  nodes: ArtifactNodeRead[];
  projectId: number;
  complete: boolean;
  canDiscuss: boolean;
  highlight: { field: string; quote: string; start: number | null } | null;
  onQuote: (anchor: RequirementReviewAnchor) => void;
}) {
  const article = useRef<HTMLElement>(null);
  const [anchor, setAnchor] = useState<RequirementReviewAnchor | null>(null);
  const fields = fieldsByKind[node.node_kind];
  const code =
    typeof node.payload.requirement_code === "string"
      ? node.payload.requirement_code
      : null;
  useEffect(() => {
    if (!highlight) return;
    const field = article.current?.querySelector<HTMLElement>(
      `[data-review-field="${CSS.escape(highlight.field)}"]`,
    );
    const source = node.payload[highlight.field];
    if (!field || typeof source !== "string") return;
    const range = fixedQuoteRange(
      field,
      source,
      highlight.quote,
      highlight.start,
    );
    if (range) showQuoteRange(range);
  }, [highlight, node.payload]);

  useEffect(() => {
    if (!canDiscuss || !fields) return;

    function readSelection() {
      const selection = window.getSelection();
      const start = selection?.anchorNode;
      const container = start instanceof Element ? start : start?.parentElement;
      const element = container?.closest<HTMLElement>("[data-review-field]");
      if (!selection || !element || !article.current?.contains(element)) {
        setAnchor(null);
        return;
      }
      const field = element.dataset.reviewField;
      const source = field ? node.payload[field] : null;
      const quote =
        typeof source === "string"
          ? quoteMarkdownSource(element, source, selection)
          : null;
      setAnchor(field && quote ? { field, ...quote } : null);
    }

    document.addEventListener("selectionchange", readSelection);
    return () => document.removeEventListener("selectionchange", readSelection);
  }, [canDiscuss, fields, node]);

  if (!fields) {
    return node.node_kind === "test_design" ? (
      <div className="grid min-w-0 gap-3">
        <h2 className="text-xl font-semibold">{reviewTargetTitle(node)}</h2>
        <TestDesignSnapshot
          root={node}
          nodes={nodes}
          projectId={projectId}
          complete={complete}
        />
      </div>
    ) : (
      <SnapshotNode node={node} />
    );
  }

  return (
    <article
      ref={article}
      aria-labelledby="review-content-heading"
      className="grid min-w-0 gap-5"
    >
      <header className="min-w-0">
        <p className="text-sm text-muted-foreground">
          {code ? `${code} ・ ` : ""}
          {reviewTargetKind[node.node_kind]}
        </p>
        <h2
          id="review-content-heading"
          className="mt-2 text-2xl font-semibold tracking-tight [overflow-wrap:anywhere]"
        >
          {reviewTargetTitle(node)}
        </h2>
      </header>
      {fields.map(([field, label]) => {
        const source = node.payload[field];
        if (typeof source !== "string" || !source.trim()) return null;
        return (
          <section
            key={field}
            id={`review-field-${field}`}
            className="min-w-0 scroll-mt-28"
          >
            <h3 className="font-semibold">{label}</h3>
            <div data-review-field={field}>
              <MarkdownPreview
                liveLinks={false}
                className="min-h-0 border-0 bg-transparent px-0 py-2 [overflow-wrap:anywhere]"
                value={source}
                quoteSourcePositions
              />
            </div>
            {canDiscuss && anchor?.field === field ? (
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => {
                  onQuote(anchor);
                  setAnchor(null);
                }}
              >
                <MessageSquarePlusIcon data-icon="inline-start" />
                選択した箇所にコメント
              </Button>
            ) : null}
          </section>
        );
      })}
      {fields.every(
        ([field]) =>
          typeof node.payload[field] !== "string" ||
          !String(node.payload[field]).trim(),
      ) ? (
        <p className="text-sm text-muted-foreground">本文がありません。</p>
      ) : null}
      {nodes
        .filter(
          (item) =>
            item.parent_id === node.id &&
            item.node_kind === "requirement_detail",
        )
        .map((detail) => (
          <SnapshotNode key={detail.id} node={detail} />
        ))}
    </article>
  );
}
