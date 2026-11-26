import {
  reviewTargetKind,
  reviewTargetTitle,
} from "@/features/requirements/lib/requirement-workflow-review";
import type { PublicationNodeRead } from "@/lib/api/generated/model";

export function PublishedReviewAttachments({
  nodes,
}: {
  nodes: PublicationNodeRead[];
}) {
  const attachments = nodes.filter(
    (node) =>
      node.node_kind === "specification" || node.node_kind === "test_design",
  );
  if (!attachments.length) return null;
  return (
    <details className="rounded-md border p-3 text-sm">
      <summary className="cursor-pointer">
        添付資料（{attachments.length}件）
      </summary>
      <ul className="mt-3 grid gap-2">
        {attachments.map((node) => (
          <li key={node.id}>
            <span className="text-muted-foreground">
              {reviewTargetKind[node.node_kind]} ・{" "}
            </span>
            {reviewTargetTitle(node)}
          </li>
        ))}
      </ul>
    </details>
  );
}
