import { notFound } from "next/navigation";

import { JoinedProjectLayout } from "@/features/projects/components/joined/joined-project-layout";

type JoinedProjectLayoutProps = {
  children: React.ReactNode;
  params: Promise<{
    projectId: string;
  }>;
};

export default async function Layout({
  children,
  params,
}: JoinedProjectLayoutProps) {
  const { projectId } = await params;
  const parsedProjectId = Number(projectId);

  if (!Number.isInteger(parsedProjectId)) {
    notFound();
  }

  return (
    <JoinedProjectLayout projectId={parsedProjectId}>
      {children}
    </JoinedProjectLayout>
  );
}
