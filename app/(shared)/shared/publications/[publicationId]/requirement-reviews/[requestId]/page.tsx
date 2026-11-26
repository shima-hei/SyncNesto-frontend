import { notFound } from "next/navigation";
import { SharedRequirementReviewWorkspace } from "@/features/guest-requirement-reviews/components/workspace";

const uuid = /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i;

export default async function ReviewPage({
  params,
}: {
  params: Promise<{ publicationId: string; requestId: string }>;
}) {
  const { publicationId, requestId } = await params;
  if (!uuid.test(publicationId) || !uuid.test(requestId)) notFound();
  return (
    <SharedRequirementReviewWorkspace
      publicationId={publicationId}
      requestId={requestId}
    />
  );
}
