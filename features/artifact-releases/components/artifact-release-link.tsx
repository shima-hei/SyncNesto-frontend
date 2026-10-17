"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { ArchiveIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/features/auth/providers/auth-provider";
import { useCurrentProjectRole } from "@/features/projects/hooks/use-current-project-role";
import { artifactReleasesHref, type ArtifactKind } from "../lib/navigation";

export function ArtifactReleaseLink({
  projectId,
  kind,
  sourceId,
  version,
}: {
  projectId: number;
  kind: ArtifactKind;
  sourceId: number;
  version: number;
}) {
  const { user } = useAuth();
  const { currentProjectRole } = useCurrentProjectRole(projectId);
  const pathname = usePathname();
  const query = useSearchParams();
  if (
    user?.user_type !== "internal" ||
    user.demo ||
    !["project_admin", "manager"].includes(currentProjectRole?.role?.key ?? "")
  )
    return null;
  return (
    <Button asChild variant="outline">
      <Link
        href={artifactReleasesHref(
          projectId,
          kind,
          sourceId,
          version,
          `${pathname}${query.size ? `?${query}` : ""}`,
        )}
      >
        <ArchiveIcon data-icon="inline-start" />
        固定版と添付
      </Link>
    </Button>
  );
}
