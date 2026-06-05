import type { ReactNode } from "react";

import { JoinedProjectNav } from "./joined-project-nav";

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
      <JoinedProjectNav projectId={projectId} />
      {children}
    </div>
  );
}
