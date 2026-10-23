import { notFound } from "next/navigation";
import { ArtifactReleasesPage } from "@/features/artifact-releases/components/artifact-releases-page";
import type { ArtifactKind } from "@/features/artifact-releases/lib/navigation";

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ projectId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ projectId }, query] = await Promise.all([params, searchParams]);
  const id = Number(projectId);
  if (!Number.isSafeInteger(id) || id <= 0) notFound();
  const kind =
    typeof query.kind === "string" &&
    [
      "requirement",
      "requirement_document",
      "specification",
      "test_design",
    ].includes(query.kind)
      ? (query.kind as ArtifactKind)
      : undefined;
  const sourceId =
    typeof query.sourceId === "string" ? Number(query.sourceId) : 0;
  return (
    <ArtifactReleasesPage
      projectId={id}
      source={
        kind && Number.isSafeInteger(sourceId) && sourceId > 0
          ? { kind, id: sourceId }
          : undefined
      }
      from={typeof query.from === "string" ? query.from : null}
    />
  );
}
