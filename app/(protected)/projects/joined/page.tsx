import { ProjectListPage } from "@/features/projects/components/shared/project-list-page";

export default function Page() {
  return (
    <ProjectListPage
      title="参加プロジェクト"
      description="参加しているプロジェクトの作業領域へ移動します。"
      detailBasePath="/projects/joined"
    />
  );
}
