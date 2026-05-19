import { ProjectsPage } from "@/features/projects/components/projects-page";

export default function Page() {
  return (
    <ProjectsPage
      title="参加プロジェクト"
      description="参加しているプロジェクトの作業領域へ移動します。"
      detailBasePath="/projects/joined"
    />
  );
}
