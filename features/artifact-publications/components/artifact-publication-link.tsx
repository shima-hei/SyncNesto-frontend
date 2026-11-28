"use client";

import Link from "next/link";
import { Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/features/auth/providers/auth-provider";
import { useCurrentProjectRole } from "@/features/projects/hooks/use-current-project-role";

export function ArtifactPublicationLink({
  projectId,
  kind,
  id,
  version,
  dirty = false,
  label = "共有",
}: {
  projectId: number;
  kind: "specification" | "test_design";
  id: number;
  version: number;
  dirty?: boolean;
  label?: string;
}) {
  const { user } = useAuth();
  const { currentProjectRole } = useCurrentProjectRole(projectId);
  const role = currentProjectRole?.role?.key;
  if (
    user?.user_type !== "internal" ||
    user.demo ||
    (role !== "project_admin" && role !== "manager")
  )
    return null;
  if (dirty)
    return (
      <Button
        type="button"
        variant="outline"
        disabled
        title="編集内容を保存してから共有します"
      >
        <Share2 data-icon="inline-start" />
        {label}
      </Button>
    );
  const query = new URLSearchParams({
    sourceKind: kind,
    sourceId: String(id),
    sourceVersion: String(version),
  });
  return (
    <Button asChild variant="outline">
      <Link
        href={`/projects/joined/${projectId}/artifact-publications?${query}`}
      >
        <Share2 data-icon="inline-start" />
        {label}
      </Link>
    </Button>
  );
}
