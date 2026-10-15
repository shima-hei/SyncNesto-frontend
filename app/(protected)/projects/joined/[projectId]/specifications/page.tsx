import { notFound } from "next/navigation";
import { SpecificationsPage } from "@/features/specifications/components/specifications-page";

export default async function Page({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const projectId = Number((await params).projectId);
  if (!Number.isSafeInteger(projectId) || projectId <= 0) notFound();
  return <SpecificationsPage projectId={projectId} />;
}
