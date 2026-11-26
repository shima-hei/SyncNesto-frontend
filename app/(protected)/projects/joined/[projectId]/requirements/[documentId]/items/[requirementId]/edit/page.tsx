import { notFound, redirect } from "next/navigation";

type PageProps = {
  params: Promise<{
    projectId: string;
    documentId: string;
    requirementId: string;
  }>;
  searchParams: Promise<{ returnTo?: string | string[] }>;
};

export default async function Page({ params, searchParams }: PageProps) {
  const { projectId, documentId, requirementId } = await params;
  const parsedProjectId = Number(projectId);
  const parsedDocumentId = Number(documentId);
  const parsedRequirementId = Number(requirementId);

  if (
    !Number.isInteger(parsedProjectId) ||
    !Number.isInteger(parsedDocumentId) ||
    !Number.isInteger(parsedRequirementId)
  ) {
    notFound();
  }

  const { returnTo } = await searchParams;
  const query = new URLSearchParams({ edit: "1" });
  if (typeof returnTo === "string") query.set("returnTo", returnTo);
  redirect(
    `/projects/joined/${parsedProjectId}/requirements/${parsedDocumentId}/items/${parsedRequirementId}?${query}`,
  );
}
