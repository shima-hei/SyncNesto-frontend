import type { ArtifactNodeRead } from "@/lib/api/generated/model";
import { readRequirementWorkflowContentProjectsProjectIdRequirementWorkflowRequestIdContentGet as readContent } from "@/lib/api/generated/requirement-workflow/requirement-workflow";

export async function fetchRequirementVersion(
  projectId: number,
  requestId: string,
  signal: AbortSignal,
  expectedReleaseId?: string,
) {
  const nodes: ArtifactNodeRead[] = [];
  let cursor: string | undefined;
  let releaseId = expectedReleaseId;
  let total: number | undefined;
  do {
    const page = await readContent(
      projectId,
      requestId,
      { cursor, page_size: 100 },
      { signal },
    );
    releaseId ??= page.release_id;
    total ??= page.total;
    if (page.release_id !== releaseId || page.total !== total) {
      throw new Error("同じ版の本文を取得できませんでした。");
    }
    nodes.push(...page.items);
    cursor = page.next_cursor ?? undefined;
  } while (cursor);
  if (
    nodes.length !== total ||
    new Set(nodes.map((node) => node.id)).size !== total
  ) {
    throw new Error("版の全文を取得できませんでした。");
  }
  return nodes;
}
