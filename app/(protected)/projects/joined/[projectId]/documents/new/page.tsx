import { notFound } from "next/navigation";
import { DocumentEditorPage } from "@/features/documents/components/pages/document-editor-page";

export default async function Page({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const projectId = Number((await params).projectId);
  if (!Number.isSafeInteger(projectId) || projectId < 1) notFound();
  return <DocumentEditorPage projectId={projectId} />;
}
