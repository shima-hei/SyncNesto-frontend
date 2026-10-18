import { notFound } from "next/navigation";
import { ApprovalWorkspace } from "@/features/fixed-approvals/components/approval-workspace";

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ projectId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ projectId }, query] = await Promise.all([params, searchParams]);
  const id = Number(projectId);
  if (!Number.isSafeInteger(id) || id <= 0) notFound();
  const release =
    typeof query.release === "string" && /^[0-9a-f-]{36}$/i.test(query.release)
      ? query.release
      : undefined;
  const legacy =
    typeof query.legacyId === "string" ? Number(query.legacyId) : 0;
  const source =
    typeof query.sourceId === "string" ? Number(query.sourceId) : 0;
  const origin =
    typeof query.origin === "string" && /^[0-9a-f-]{36}$/i.test(query.origin)
      ? query.origin
      : undefined;
  return (
    <ApprovalWorkspace
      projectId={id}
      releaseId={release}
      originImport={origin}
      legacyId={Number.isSafeInteger(legacy) && legacy > 0 ? legacy : undefined}
      targetKind={
        typeof query.targetKind === "string" ? query.targetKind : undefined
      }
      sourceId={Number.isSafeInteger(source) && source > 0 ? source : undefined}
    />
  );
}
