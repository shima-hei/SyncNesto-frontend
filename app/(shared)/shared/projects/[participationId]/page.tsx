import { Suspense } from "react";
import { notFound } from "next/navigation";
import { GuestProject } from "@/features/guest-workspace/components/guest-projects";

export default async function Page({
  params,
}: {
  params: Promise<{ participationId: string }>;
}) {
  const { participationId } = await params;
  if (!/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(participationId))
    notFound();
  return (
    <Suspense>
      <GuestProject participationId={participationId} />
    </Suspense>
  );
}
