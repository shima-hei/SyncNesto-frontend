import { ProjectListPage } from "@/features/projects/components/shared/project-list-page";
import { requireUser } from "@/lib/auth/server";

export default async function Page() {
  await requireUser();

  return (
    <ProjectListPage
      title="プロジェクト管理"
      description="プロジェクトの登録、編集、削除、メンバー管理を行います。"
      detailBasePath="/projects/management"
      createHref="/projects/management/new"
    />
  );
}
