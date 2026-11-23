"use client";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { TaskRead } from "@/lib/api/generated/model";
import { Button } from "@/components/ui/button";
import { FormApiError } from "@/components/shared/forms/form-api-error";
import { useCreateRequirementTaskRelation } from "../../hooks/use-create-requirement-task-relation";
import { useDeleteRequirementTaskRelation } from "../../hooks/use-delete-requirement-task-relation";
import { invalidateTaskProjectSurfaces } from "../../lib/task-cache";
import {
  TASK_RELATION_TYPE_OPTIONS,
  getTaskRelationTypeLabel,
} from "../../constants/task-options";
import { TaskRequirementSelectField } from "./task-requirement-select-field";
import { TaskSelectField } from "./task-form-fields";

export function TaskRequirementEditor({ task }: { task: TaskRead }) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState("");
  const [relationType, setRelationType] = useState("implements");
  const cache = useQueryClient();
  const refresh = () => invalidateTaskProjectSurfaces(cache, task.project_id);
  const add = useCreateRequirementTaskRelation(Number(selected));
  const duplicate = task.requirements?.some(
    (r) => r.id === Number(selected) && r.relation_type === relationType,
  );
  return (
    <div className="space-y-2">
      <Button
        type="button"
        size="sm"
        variant="ghost"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
      >
        {open ? "関連編集を閉じる" : "関連要件を編集"}
      </Button>
      {open && (
        <>
          <ul className="space-y-1">
            {task.requirements?.map((r) => (
              <li
                className="flex flex-wrap items-center gap-2"
                key={r.relation_id}
              >
                <span>
                  {r.requirement_code} {r.title}（
                  {getTaskRelationTypeLabel(r.relation_type)}）
                </span>
                <RemoveRelation
                  requirementId={r.id}
                  relationId={r.relation_id}
                  refresh={refresh}
                />
              </li>
            ))}
          </ul>
          <form
            aria-label="要件を関連付ける"
            className="grid items-end gap-2 sm:grid-cols-[2fr_1fr_auto]"
            onSubmit={async (e) => {
              e.preventDefault();
              if (!selected || duplicate || add.isPending) return;
              try {
                await add.createRequirementTaskRelation(task.id, relationType);
                await refresh();
                setSelected("");
              } catch {
                /* 失敗時は選択を維持する。 */
              }
            }}
          >
            <TaskRequirementSelectField
              projectId={task.project_id}
              value={selected}
              onChange={setSelected}
            />
            <TaskSelectField
              label="関連種別"
              value={relationType}
              options={TASK_RELATION_TYPE_OPTIONS}
              onChange={setRelationType}
            />
            <Button disabled={!selected || duplicate || add.isPending}>
              {duplicate ? "関連付け済み" : "追加"}
            </Button>
            <FormApiError error={add.error} />
          </form>
        </>
      )}
    </div>
  );
}
function RemoveRelation({
  requirementId,
  relationId,
  refresh,
}: {
  requirementId: number;
  relationId: number;
  refresh: () => Promise<unknown>;
}) {
  const remove = useDeleteRequirementTaskRelation(requirementId);
  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={remove.isPending}
        onClick={() =>
          void remove
            .deleteRequirementTaskRelation(relationId)
            .then(refresh)
            .catch(() => undefined)
        }
      >
        関連を解除
      </Button>
      <FormApiError error={remove.error} />
    </>
  );
}
