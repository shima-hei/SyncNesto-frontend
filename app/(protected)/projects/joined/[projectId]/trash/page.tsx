import { notFound } from "next/navigation";
import { TrashPage } from "@/features/trash/components/pages/trash-page";

export default async function Page({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const projectId = Number((await params).projectId);
  if (!Number.isSafeInteger(projectId) || projectId < 1) notFound();
  return <TrashPage key={projectId} projectId={projectId} />;
}
