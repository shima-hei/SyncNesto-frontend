import { notFound } from "next/navigation";
import { VerdictPage } from "@/features/requirement-verifications/components/verdict-page";

export default async function Page({
  params,
}: {
  params: Promise<{ projectId: string; requestId: string }>;
}) {
  const { projectId, requestId } = await params;
  const id = Number(projectId);
  if (
    !Number.isSafeInteger(id) ||
    id <= 0 ||
    !/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(requestId)
  )
    notFound();
  return <VerdictPage projectId={id} requestId={requestId} />;
}
