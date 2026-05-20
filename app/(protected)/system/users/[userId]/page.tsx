import { notFound } from "next/navigation";

import { UserDetailPage } from "@/features/users/components/pages/user-detail-page";
import { requireSystemAdmin } from "@/lib/auth/server";

type PageProps = {
  params: Promise<{
    userId: string;
  }>;
};

export default async function Page({ params }: PageProps) {
  await requireSystemAdmin();

  const { userId } = await params;
  const parsedUserId = Number(userId);

  if (!Number.isInteger(parsedUserId)) {
    notFound();
  }

  return <UserDetailPage userId={parsedUserId} />;
}
