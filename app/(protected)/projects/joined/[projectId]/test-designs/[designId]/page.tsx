import { notFound } from "next/navigation";
import { DesignEditorPage } from "@/features/test-designs/components/pages/design-editor-page";

export default async function Page({
  params,
}: {
  params: Promise<{ projectId: string; designId: string }>;
}) {
  const values = await params;
  const projectId = Number(values.projectId),
    designId = Number(values.designId);
  if (![projectId, designId].every((v) => Number.isInteger(v) && v > 0))
    notFound();
  return <DesignEditorPage projectId={projectId} designId={designId} />;
}
