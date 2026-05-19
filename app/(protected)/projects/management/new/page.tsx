import { ProjectCreatePage } from "@/features/projects/components/project-create-page";
import { requireSystemAdmin } from "@/lib/auth/server";

export default async function Page() {
  await requireSystemAdmin();

  return <ProjectCreatePage />;
}
