import { notFound } from "next/navigation";
import { SpecificationPage } from "@/features/specifications/components/specification-page";

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ projectId: string }>;
  searchParams: Promise<{ kind?: string }>;
}) {
  const projectId = Number((await params).projectId);
  if (!Number.isSafeInteger(projectId) || projectId <= 0) notFound();
  const { kind } = await searchParams;
  return (
    <SpecificationPage
      projectId={projectId}
      mode="create"
      kind={kind === "screen" ? "screen" : "api"}
    />
  );
}
