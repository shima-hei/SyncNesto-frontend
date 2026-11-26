import { notFound } from "next/navigation";
import { RequirementReviewWorkspace } from "@/features/requirements/components/pages/requirement-review-workspace";

const uuid = /^[\da-f]{8}-(?:[\da-f]{4}-){3}[\da-f]{12}$/i;

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ projectId: string; requestId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ projectId, requestId }, { node, thread }] = await Promise.all([
    params,
    searchParams,
  ]);
  const id = Number(projectId);
  if (!Number.isSafeInteger(id) || id <= 0 || !uuid.test(requestId)) {
    notFound();
  }
  const initialNodeId =
    typeof node === "string" && uuid.test(node) ? node : undefined;
  const initialThreadId =
    typeof thread === "string" && uuid.test(thread) ? thread : undefined;

  return (
    <RequirementReviewWorkspace
      key={JSON.stringify([requestId, initialNodeId, initialThreadId])}
      projectId={id}
      requestId={requestId}
      initialNodeId={initialNodeId}
      initialThreadId={initialThreadId}
    />
  );
}
