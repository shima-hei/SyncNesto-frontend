import { ProjectCreatePage } from "@/features/projects/components/management/project-create-page";
import { requireUser } from "@/lib/auth/server";

export default async function Page() {
  await requireUser();

  return <ProjectCreatePage />;
}
