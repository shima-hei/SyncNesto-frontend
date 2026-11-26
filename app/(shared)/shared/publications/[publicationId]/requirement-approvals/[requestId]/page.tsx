import { notFound } from "next/navigation";
import { SharedRequirementApprovalWorkspace } from "@/features/guest-requirement-reviews/components/approval-workspace";

const uuid = /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i;

export default async function ApprovalPage({
  params,
}: {
  params: Promise<{ publicationId: string; requestId: string }>;
}) {
  const { publicationId, requestId } = await params;
  if (!uuid.test(publicationId) || !uuid.test(requestId)) notFound();
  return (
    <SharedRequirementApprovalWorkspace
      publicationId={publicationId}
      requestId={requestId}
    />
  );
}
