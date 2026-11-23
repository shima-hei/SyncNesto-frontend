import type { ReactNode } from "react";

import { JoinedProjectNav } from "./joined-project-nav";
import { JoinedProjectBreadcrumbs } from "./joined-project-breadcrumbs";
import { ProjectWorkOrigin } from "./project-work-origin";

export function JoinedProjectLayout({
  projectId,
  children,
}: {
  projectId: number;
  children: ReactNode;
}) {
  return (
    <div className="flex min-w-0 flex-1 flex-col">
      <JoinedProjectNav projectId={projectId} />
      <div className="@container/main flex min-w-0 flex-1 flex-col gap-4 p-4 md:gap-6 md:p-6">
        <div className="flex min-w-0 flex-col gap-4">
          <ProjectWorkOrigin projectId={projectId} />
          <JoinedProjectBreadcrumbs projectId={projectId} />
          {children}
        </div>
      </div>
    </div>
  );
}
