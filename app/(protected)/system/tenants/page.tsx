import { SystemTenantsPage } from "@/features/tenants/components/system-tenants-page";
import { requireSystemAdmin } from "@/lib/auth/server";

export default async function Page() {
  await requireSystemAdmin();
  return <SystemTenantsPage />;
}
