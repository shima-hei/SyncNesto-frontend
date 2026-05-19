import { ProjectsPage } from "@/features/projects/components/projects-page";
import { requireSystemAdmin } from "@/lib/auth/server";

export default async function Page() {
  await requireSystemAdmin();

  return (
    <ProjectsPage
      title="プロジェクト管理"
      description="プロジェクトの登録、編集、削除、メンバー管理を行います。"
      detailBasePath="/projects/management"
      createHref="/projects/management/new"
    />
  );
}
