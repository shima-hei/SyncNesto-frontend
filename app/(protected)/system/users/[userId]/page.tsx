import { notFound } from "next/navigation";

import { UserDetailPage } from "@/features/users/components/pages/user-detail-page";
import { requireSystemAdmin } from "@/lib/auth/server";

type PageProps = {
  searchParams: Promise<{ fromTenant?: string }>;
  params: Promise<{
    userId: string;
  }>;
};

export default async function Page({ params, searchParams }: PageProps) {
  await requireSystemAdmin();

  const { userId } = await params;
  const parsedUserId = Number(userId);

  if (!Number.isSafeInteger(parsedUserId) || parsedUserId <= 0) {
    notFound();
  }

  const fromTenant = Number((await searchParams).fromTenant);
  return (
    <UserDetailPage
      key={parsedUserId}
      userId={parsedUserId}
      fromTenant={
        Number.isSafeInteger(fromTenant) && fromTenant > 0
          ? fromTenant
          : undefined
      }
    />
  );
}
