import type { ReactNode } from "react";

import { ProjectWorkOrigin } from "./project-work-origin";

type JoinedProjectLayoutProps = {
  projectId: number;
  children: ReactNode;
};

export function JoinedProjectLayout({
  projectId,
  children,
}: JoinedProjectLayoutProps) {
  return (
    <div className="flex flex-col gap-4">
      <ProjectWorkOrigin projectId={projectId} />
      {children}
    </div>
  );
}
