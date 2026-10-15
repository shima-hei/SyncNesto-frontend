import { UsersPage } from "@/features/users/components/pages/users-page";
import { requireSystemAdmin } from "@/lib/auth/server";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ membership?: string }>;
}) {
  await requireSystemAdmin();

  const { membership } = await searchParams;
  return (
    <UsersPage
      key={membership ?? "all"}
      withoutActiveMembership={membership === "unassigned"}
    />
  );
}
