import { notFound } from "next/navigation";
import { SharedApprovalDetail } from "@/features/guest-fixed-approvals/components/shared-approval-detail";

export default async function Page({
  params,
}: {
  params: Promise<{ publicationId: string; approvalId: string }>;
}) {
  const { publicationId, approvalId } = await params;
  const uuid =
    /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
  if (!uuid.test(publicationId) || !uuid.test(approvalId)) notFound();
  return (
    <SharedApprovalDetail
      publicationId={publicationId}
      approvalId={approvalId}
      downloadsEnabled={
        process.env.SHARED_PUBLICATION_DOWNLOAD_ENABLED === "true"
      }
    />
  );
}
