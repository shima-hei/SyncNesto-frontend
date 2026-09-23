import { notFound } from "next/navigation";
import { DesignsPage } from "@/features/test-designs/components/pages/designs-page";

export default async function Page({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const projectId = Number((await params).projectId);
  if (!Number.isInteger(projectId) || projectId < 1) notFound();
  return <DesignsPage projectId={projectId} cases />;
}
