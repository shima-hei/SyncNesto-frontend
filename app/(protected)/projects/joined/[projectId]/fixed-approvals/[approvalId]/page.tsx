import { notFound } from "next/navigation";
import { ApprovalDetail } from "@/features/fixed-approvals/components/approval-detail";

export default async function Page({
  params,
}: {
  params: Promise<{ projectId: string; approvalId: string }>;
}) {
  const { projectId, approvalId } = await params;
  const id = Number(projectId);
  if (
    !Number.isSafeInteger(id) ||
    id <= 0 ||
    !/^[0-9a-f-]{36}$/i.test(approvalId)
  )
    notFound();
  return <ApprovalDetail projectId={id} approvalId={approvalId} />;
}
