"use client";

import { useState } from "react";
import { createDraftScope } from "@/lib/draft/draft-key";
import type { RequirementRead } from "@/lib/api/generated/model";
import { getRequirementFormValues } from "../../constants/requirement-form";
import { useUpdateRequirement } from "../../hooks/use-update-requirement";
import type { RequirementFormValues } from "../../types/requirement-form";
import { RequirementForm } from "./requirement-form";

export function RequirementInlineEditor({
  projectId,
  documentId,
  requirement,
  onSaved,
}: {
  projectId: number;
  documentId: number;
  requirement: RequirementRead;
  onSaved: () => void;
}) {
  const [initial] = useState(requirement);
  const { id, version } = initial;
  const mutation = useUpdateRequirement(projectId, id);
  const save = async (
    values: RequirementFormValues,
    expectedVersion: number,
  ) => {
    await mutation.updateRequirement(values, expectedVersion);
    onSaved();
  };

  return (
    <RequirementForm
      projectId={projectId}
      documentId={documentId}
      mode="update"
      initialValues={getRequirementFormValues(initial)}
      initialOwner={initial.owner ?? null}
      draftScope={createDraftScope(
        "requirements",
        "items",
        "update",
        projectId,
        id,
      )}
      draftResourceId={id}
      isPending={mutation.isPending}
      error={mutation.error}
      conflictValues={
        mutation.conflictCurrent
          ? getRequirementFormValues(mutation.conflictCurrent)
          : null
      }
      onCloseConflict={mutation.resetConflict}
      onResolveConflict={(values) =>
        mutation.conflictCurrent
          ? save(values, mutation.conflictCurrent.version)
          : Promise.resolve()
      }
      onSubmit={(values) => save(values, version)}
    />
  );
}
