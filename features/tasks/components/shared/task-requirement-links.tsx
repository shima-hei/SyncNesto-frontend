"use client";

import Link from "next/link";
import { useReadRequirementProjectsProjectIdRequirementsRequirementIdGet } from "@/lib/api/generated/requirements/requirements";
import type { TaskRequirementSummary } from "@/lib/api/generated/model";
import { withTaskOrigin, type TaskOrigin } from "@/lib/navigation/task-origin";
import { canViewRequirement } from "@/features/auth/utils/authorization";
import { useCurrentProjectRole } from "@/features/projects/hooks/use-current-project-role";
import { Button } from "@/components/ui/button";

export function TaskRequirementLinks({
  requirements,
  origin,
}: {
  requirements: TaskRequirementSummary[];
  origin: TaskOrigin;
}) {
  const { currentProjectRole } = useCurrentProjectRole(origin.projectId);
  const canRead = canViewRequirement(currentProjectRole);
  return (
    <ul className="flex flex-col gap-2">
      {requirements.map((requirement) => (
        <RequirementLink
          key={requirement.id}
          requirement={requirement}
          origin={origin}
          canRead={canRead}
        />
      ))}
    </ul>
  );
}

function RequirementLink({
  requirement,
  origin,
  canRead,
}: {
  requirement: TaskRequirementSummary;
  origin: TaskOrigin;
  canRead: boolean;
}) {
  const query = useReadRequirementProjectsProjectIdRequirementsRequirementIdGet(
    origin.projectId,
    requirement.id,
    { query: { enabled: canRead, retry: false, staleTime: 60_000 } },
  );
  const label = `${requirement.requirement_code} ${requirement.title}`;
  if (!canRead) return <li className="text-sm break-words">{label}</li>;
  return (
    <li className="flex flex-col gap-1 text-sm">
      {query.data ? (
        <Link
          className="break-words font-medium underline underline-offset-4"
          href={withTaskOrigin(
            `/projects/joined/${origin.projectId}/requirements/${query.data.document_id}/items/${requirement.id}`,
            origin,
          )}
        >
          {label}
        </Link>
      ) : (
        <>
          <span className="break-words">{label}</span>
          {query.isPending ? (
            <span role="status" className="text-xs text-muted-foreground">
              要件へのリンクを確認中…
            </span>
          ) : (
            <div className="flex flex-wrap items-center gap-1">
              <span className="text-xs text-muted-foreground">
                要件へのリンクを取得できません。
              </span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={query.isFetching}
                onClick={() => void query.refetch()}
              >
                再試行
              </Button>
            </div>
          )}
        </>
      )}
    </li>
  );
}
