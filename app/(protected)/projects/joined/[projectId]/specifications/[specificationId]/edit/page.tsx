import { notFound } from "next/navigation";
import { SpecificationPage } from "@/features/specifications/components/specification-page";

export default async function Page({
  params,
}: {
  params: Promise<{ projectId: string; specificationId: string }>;
}) {
  const route = await params;
  const projectId = Number(route.projectId);
  const id = Number(route.specificationId);
  if (
    ![projectId, id].every((value) => Number.isSafeInteger(value) && value > 0)
  )
    notFound();
  return <SpecificationPage projectId={projectId} id={id} mode="edit" />;
}
