import { notFound } from "next/navigation";
import { SharedPublicationDetail } from "@/features/artifact-publications/components/shared-pages";

export default async function SharedPublicationPage({
  params,
}: {
  params: Promise<{ publicationId: string }>;
}) {
  const { publicationId } = await params;
  if (
    !/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(
      publicationId,
    )
  )
    notFound();
  return <SharedPublicationDetail identity={publicationId} />;
}
