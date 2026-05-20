import { UserCreatePage } from "@/features/users/components/pages/user-create-page";
import { requireSystemAdmin } from "@/lib/auth/server";

export default async function Page() {
  await requireSystemAdmin();

  return <UserCreatePage />;
}
