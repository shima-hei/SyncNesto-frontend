import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { InvitationPage } from "@/features/guest-invitations/components/invitation-page";
import { isGuestInvitationPath } from "@/lib/auth/return-path";

export const metadata: Metadata = {
  title: "プロジェクトへの招待",
  referrer: "no-referrer",
  robots: { index: false, follow: false },
};

export default async function Page({
  params,
}: {
  params: Promise<{ invitationId: string }>;
}) {
  const { invitationId } = await params;
  if (!isGuestInvitationPath(`/guest-invitations/${invitationId}`)) notFound();
  return <InvitationPage invitationId={invitationId} />;
}
