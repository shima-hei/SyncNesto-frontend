import { notFound } from "next/navigation";
import { VerificationPage } from "@/features/requirement-verifications/components/verification-page";

export default async function Page({
  params,
}: {
  params: Promise<{ projectId: string; planId: string }>;
}) {
  const { projectId, planId } = await params;
  const id = Number(projectId);
  if (
    !Number.isSafeInteger(id) ||
    id <= 0 ||
    !/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(planId)
  )
    notFound();
  return <VerificationPage projectId={id} planId={planId} />;
}
