import { notFound } from "next/navigation";
import { DocumentDetailPage } from "@/features/documents/components/pages/document-detail-page";

export default async function Page({
  params,
}: {
  params: Promise<{ projectId: string; documentId: string }>;
}) {
  const route = await params;
  const projectId = Number(route.projectId);
  const documentId = Number(route.documentId);
  if (
    ![projectId, documentId].every((id) => Number.isSafeInteger(id) && id > 0)
  )
    notFound();
  return <DocumentDetailPage projectId={projectId} documentId={documentId} />;
}
