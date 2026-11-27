import { notFound } from "next/navigation";
import { SharedPublicationDetail } from "@/features/artifact-publications/components/shared-pages";

export default async function SharedPublicationPage({
  params,
  searchParams,
}: {
  params: Promise<{ publicationId: string }>;
  searchParams: Promise<{ thread?: string | string[] }>;
}) {
  const uuid =
    /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
  const { publicationId } = await params;
  const { thread } = await searchParams;
  if (!uuid.test(publicationId)) notFound();
  const threadId =
    typeof thread === "string" && uuid.test(thread) ? thread : undefined;
  return (
    <SharedPublicationDetail identity={publicationId} threadId={threadId} />
  );
}
