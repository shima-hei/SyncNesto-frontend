import { UsersPage } from "@/features/users/components/users-page";
import { requireSystemAdmin } from "@/lib/auth/server";

export default async function Page() {
  await requireSystemAdmin();

  return <UsersPage />;
}
