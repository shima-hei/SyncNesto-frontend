"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";

import { DataLoadError } from "@/components/shared/feedback/data-load-error";
import { OverviewReturn } from "@/components/shared/navigation/overview-return";
import { PageHeader } from "@/components/shared/layout/page-header";
import { FieldGroup } from "@/components/ui/field";
import { canUpdateTask } from "@/features/auth/utils/authorization";
import { useAuth } from "@/features/auth/providers/auth-provider";
import { useCurrentProjectRole } from "@/features/projects/hooks/use-current-project-role";
import { useUrlFilterState } from "@/hooks/use-url-filter-state";
import type { MilestoneRead } from "@/lib/api/generated/model";

import { useGantt } from "../../hooks/use-gantt";
import { useMilestones } from "../../hooks/use-milestones";
import { usePlanningPhases } from "../../hooks/use-planning-phases";
import { useTaskPlanning } from "../../hooks/use-task-planning";
import { TaskUserSelectField } from "../forms/task-user-select-field";
import { TaskRequirementSelectField } from "../forms/task-requirement-select-field";
import { TaskPlanningWorkspace } from "../gantt/task-planning-workspace";
import { MilestoneDialogs } from "../sections/milestone-dialogs";
import { PlanningPhaseActions } from "../sections/planning-phase-actions";
import { TaskPhaseDialog } from "../sections/task-phase-dialog";
import { TasksGanttSection } from "../sections/tasks-gantt-section";
import {
  GanttControls,
  GANTT_DISPLAY_OPTIONS,
} from "./parts/task-page-controls";

export function PlanningPage({ projectId }: { projectId: number }) {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const { currentProjectRole } = useCurrentProjectRole(projectId);
  const canUpdate = canUpdateTask(currentProjectRole);
  const planning = useTaskPlanning(projectId);
  const ownTasks =
    searchParams.get("assignee") === "me" && !searchParams.has("assigneeId");
  const [assigneeId, setAssigneeId] = useUrlFilterState(
    "assigneeId",
    searchParams.get("assignee") === "me" ? String(user?.id ?? "") : "",
  );
  const [requirementId, setRequirementId] = useUrlFilterState(
    "requirementId",
    "",
  );
  const [ganttStartDate, setGanttStartDate] = useUrlFilterState(
    "ganttStartDate",
    "",
  );
  const [ganttEndDate, setGanttEndDate] = useUrlFilterState("ganttEndDate", "");
  const [unit, setGanttDisplayUnit] = useUrlFilterState(
    "ganttDisplayUnit",
    "day",
  );
  const ganttDisplayUnit =
    GANTT_DISPLAY_OPTIONS.find(({ value }) => value === unit)?.value ?? "day";
  const [milestoneCreateDialogOpen, setMilestoneCreateDialogOpen] =
    useState(false);
  const [milestoneListDialogOpen, setMilestoneListDialogOpen] = useState(false);
  const [editingMilestone, setEditingMilestone] =
    useState<MilestoneRead | null>(null);
  const [deleteMilestoneTarget, setDeleteMilestoneTarget] =
    useState<MilestoneRead | null>(null);
  const { milestones } = useMilestones(projectId);
  const phases = usePlanningPhases(projectId);
  const {
    gantt,
    isLoading: isGanttLoading,
    isFetching: isGanttFetching,
    isPlaceholderData: isGanttPlaceholder,
    error: ganttError,
    refetch: refetchGantt,
  } = useGantt(
    projectId,
    {
      start_date: ganttStartDate || undefined,
      end_date: ganttEndDate || undefined,
      assignee_id: assigneeId ? Number(assigneeId) : undefined,
      requirement_id: requirementId ? Number(requirementId) : undefined,
    },
    !ownTasks || Boolean(user),
  );
  const currentGantt = isGanttPlaceholder || ganttError ? null : gantt;
  const ganttUnscheduled =
    currentGantt?.tasks.filter((task) => !task.start_date && !task.due_date)
      .length ?? 0;

  return (
    <div className="@container flex min-w-0 flex-col gap-4">
      <OverviewReturn projectId={projectId} />
      <PageHeader
        title="計画"
        actions={
          <TaskPhaseDialog projectId={projectId} label="集計・工程管理" />
        }
      />
      <PlanningPhaseActions
        projectId={projectId}
        phases={phases}
        tasks={currentGantt?.tasks}
        canManage={currentProjectRole?.role?.key === "project_admin"}
        canUpdate={canUpdate}
        planning={planning}
      />
      <TaskPlanningWorkspace planning={planning} canUpdate={canUpdate} />
      <section
        aria-label="計画の絞り込み"
        className="flex min-w-0 flex-col gap-3"
      >
        <FieldGroup className="grid gap-3 @md:grid-cols-2">
          <TaskUserSelectField
            projectId={projectId}
            label="担当者"
            value={assigneeId}
            placeholder="すべて"
            onChange={setAssigneeId}
          />
          <TaskRequirementSelectField
            projectId={projectId}
            value={requirementId}
            placeholder="すべて"
            onChange={setRequirementId}
          />
        </FieldGroup>
        <GanttControls
          canUpdate={canUpdate}
          startDate={ganttStartDate}
          endDate={ganttEndDate}
          displayUnit={ganttDisplayUnit}
          gantt={currentGantt}
          milestones={milestones}
          onStartDateChange={setGanttStartDate}
          onEndDateChange={setGanttEndDate}
          onDisplayUnitChange={setGanttDisplayUnit}
          onOpenMilestoneList={() => setMilestoneListDialogOpen(true)}
          onOpenMilestoneCreate={() => setMilestoneCreateDialogOpen(true)}
        />
      </section>
      <p className="text-sm text-muted-foreground">
        対象期間 {ganttStartDate || "開始の制限なし"} 〜{" "}
        {ganttEndDate || "終了の制限なし"}（未日程を含む）
      </p>
      {ganttError ? (
        <DataLoadError
          resourceName="ガント"
          isRetrying={isGanttFetching}
          onRetry={() => void refetchGantt()}
        />
      ) : (
        <>
          {currentGantt ? (
            <p role="status" className="text-sm text-muted-foreground">
              表示対象 {currentGantt.tasks.length}
              件（日程あり{currentGantt.tasks.length - ganttUnscheduled}
              件・未日程{ganttUnscheduled}件）
              {isGanttFetching ? " · 更新中" : ""}
            </p>
          ) : null}
          <TasksGanttSection
            planning={planning}
            phases={phases.data ?? []}
            projectId={projectId}
            gantt={currentGantt}
            isLoading={
              isGanttLoading || isGanttPlaceholder || (ownTasks && !user)
            }
            displayUnit={ganttDisplayUnit}
            canUpdate={canUpdate}
            onMilestoneSelect={setEditingMilestone}
          />
        </>
      )}
      <MilestoneDialogs
        projectId={projectId}
        canUpdate={canUpdate}
        milestones={milestones}
        createOpen={milestoneCreateDialogOpen}
        listOpen={milestoneListDialogOpen}
        editingMilestone={editingMilestone}
        deleteTarget={deleteMilestoneTarget}
        onCreateOpenChange={setMilestoneCreateDialogOpen}
        onListOpenChange={setMilestoneListDialogOpen}
        onEditingMilestoneChange={setEditingMilestone}
        onDeleteTargetChange={setDeleteMilestoneTarget}
      />
    </div>
  );
}
