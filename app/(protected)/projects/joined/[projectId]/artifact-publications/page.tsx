import { notFound } from "next/navigation";
import { PublicationsPage } from "@/features/artifact-publications/components/publications-page";

export default async function Page({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const id = Number(projectId);
  if (!Number.isSafeInteger(id) || id <= 0) notFound();
  return (
    <PublicationsPage
      projectId={id}
      requestsEnabled={process.env.GUEST_FIXED_APPROVALS_ENABLED === "true"}
    />
  );
}
