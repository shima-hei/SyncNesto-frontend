"use client";

import { useMemo, useRef, useState } from "react";
import { PlusIcon } from "lucide-react";
import { useSearchParams } from "next/navigation";

import { DataLoadError } from "@/components/shared/feedback/data-load-error";
import { OverviewReturn } from "@/components/shared/navigation/overview-return";
import { PageHeader } from "@/components/shared/layout/page-header";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FieldGroup } from "@/components/ui/field";
import {
  canCreateTask,
  canUpdateTask,
} from "@/features/auth/utils/authorization";
import { useAuth } from "@/features/auth/providers/auth-provider";
import { useCurrentProjectRole } from "@/features/projects/hooks/use-current-project-role";
import { useUrlFilterState } from "@/hooks/use-url-filter-state";
import type { MilestoneRead } from "@/lib/api/generated/model";

import { useGantt } from "../../hooks/use-gantt";
import { useMilestones } from "../../hooks/use-milestones";
import { usePlanningPhases } from "../../hooks/use-planning-phases";
import { useTaskUserMap } from "../../hooks/use-task-user-map";
import { useTaskPlanning } from "../../hooks/use-task-planning";
import { extendLegacyGanttRange } from "../../lib/gantt-range-controls";
import { TaskUserSelectField } from "../forms/task-user-select-field";
import { TaskRequirementSelectField } from "../forms/task-requirement-select-field";
import { GanttQuickTask } from "../gantt/gantt-quick-task";
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
  const canCreate = canCreateTask(currentProjectRole);
  const canUpdate = canUpdateTask(currentProjectRole);
  const planning = useTaskPlanning(projectId);
  const { getTaskUserLabel } = useTaskUserMap(projectId);
  const [mode, setMode] = useUrlFilterState("planningView", "gantt");
  const activeView = mode === "effort" ? "effort" : "gantt";
  const [search, setSearch] = useUrlFilterState("ganttSearch", "");
  const [quickOpen, setQuickOpen] = useState(false);
  const [unscheduledOpen, setUnscheduledOpen] = useState(false);
  const unscheduledTrigger = useRef<HTMLButtonElement>(null);
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
  const [ganttStartDate] = useUrlFilterState("ganttStartDate", "");
  const [requestedEndDate] = useUrlFilterState("ganttEndDate", "");
  const customGanttRange = searchParams.get("ganttRangeMode") === "custom";
  const [unit, setGanttDisplayUnit] = useUrlFilterState(
    "ganttDisplayUnit",
    "week",
  );
  const ganttDisplayUnit =
    GANTT_DISPLAY_OPTIONS.find(({ value }) => value === unit)?.value ?? "week";
  const ganttEndDate = extendLegacyGanttRange(
    ganttStartDate,
    requestedEndDate,
    ganttDisplayUnit,
    customGanttRange,
  );
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
  const needsDependencyTasks = useMemo(() => {
    if (!currentGantt) return false;
    const ids = new Set(currentGantt.tasks.map((task) => task.id));
    return currentGantt.dependencies.some(
      (edge) =>
        ids.has(edge.predecessor_task_id) !== ids.has(edge.successor_task_id),
    );
  }, [currentGantt]);
  const projectGantt = useGantt(
    projectId,
    {},
    activeView === "gantt" && needsDependencyTasks,
  );
  const needle = search.trim().toLocaleLowerCase();
  const shown =
    currentGantt && needle
      ? {
          ...currentGantt,
          tasks: currentGantt.tasks.filter((task) =>
            `${task.title} ${task.task_code} ${getTaskUserLabel(task.assignee_id)}`
              .toLocaleLowerCase()
              .includes(needle),
          ),
        }
      : currentGantt;
  const unscheduledCount =
    shown?.tasks.filter((task) => {
      const draft = planning.rows[task.id]?.values;
      return draft
        ? !draft.startDate && !draft.dueDate
        : !task.start_date && !task.due_date;
    }).length ?? 0;

  const setRange = (
    { startDate, endDate }: { startDate: string; endDate: string },
    customRange = false,
  ) => {
    const url = new URL(window.location.href);
    for (const [key, value] of [
      ["ganttStartDate", startDate],
      ["ganttEndDate", endDate],
      ["ganttRangeMode", customRange && (startDate || endDate) ? "custom" : ""],
    ]) {
      if (value) url.searchParams.set(key, value);
      else url.searchParams.delete(key);
    }
    window.history.replaceState(
      null,
      "",
      `${url.pathname}${url.search}${url.hash}`,
    );
  };

  return (
    <div className="flex min-w-0 flex-col gap-3">
      <OverviewReturn projectId={projectId} />
      <PageHeader title="計画" />
      <TaskPlanningWorkspace planning={planning} canUpdate={canUpdate} />
      <Tabs
        value={activeView}
        onValueChange={(value) => {
          setMode(value);
          if (value !== "gantt") setUnscheduledOpen(false);
        }}
        className="min-w-0 gap-2"
      >
        <TabsList variant="line" className="w-full justify-start border-b">
          <TabsTrigger value="gantt">ガント</TabsTrigger>
          <TabsTrigger value="effort">工程・工数</TabsTrigger>
        </TabsList>
        <TabsContent
          value="gantt"
          forceMount
          className={activeView === "gantt" ? "min-w-0 space-y-2" : "hidden"}
        >
          <GanttControls
            canUpdate={canUpdate}
            startDate={ganttStartDate}
            endDate={ganttEndDate}
            customRange={customGanttRange}
            displayUnit={ganttDisplayUnit}
            search={search}
            gantt={shown}
            milestones={milestones}
            onRangeChange={setRange}
            onDisplayUnitChange={setGanttDisplayUnit}
            onSearchChange={setSearch}
            onOpenMilestoneList={() => setMilestoneListDialogOpen(true)}
            onOpenMilestoneCreate={() => setMilestoneCreateDialogOpen(true)}
            filterFields={
              <FieldGroup className="grid gap-2 sm:grid-cols-2">
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
            }
            actions={
              <>
                <Button
                  ref={unscheduledTrigger}
                  type="button"
                  size="sm"
                  variant="outline"
                  aria-expanded={unscheduledOpen && Boolean(unscheduledCount)}
                  disabled={!unscheduledCount && !unscheduledOpen}
                  onClick={() => setUnscheduledOpen(!unscheduledOpen)}
                >
                  未日程 {unscheduledCount}
                </Button>
                {canCreate ? (
                  <Button
                    type="button"
                    size="sm"
                    aria-controls="gantt-quick-task"
                    aria-expanded={quickOpen}
                    onClick={() => setQuickOpen(!quickOpen)}
                  >
                    <PlusIcon data-icon="inline-start" /> タスクを追加
                  </Button>
                ) : null}
              </>
            }
          />
          {canCreate ? (
            <GanttQuickTask
              projectId={projectId}
              planning={planning}
              open={quickOpen}
            />
          ) : null}
          {ganttError ? (
            <DataLoadError
              resourceName="ガント"
              isRetrying={isGanttFetching}
              onRetry={() => void refetchGantt()}
            />
          ) : (
            <TasksGanttSection
              projectId={projectId}
              planning={planning}
              phases={phases.data ?? []}
              gantt={shown}
              dependencyTasks={
                needsDependencyTasks &&
                !projectGantt.error &&
                !projectGantt.isPlaceholderData
                  ? (projectGantt.gantt?.tasks ?? currentGantt?.tasks)
                  : currentGantt?.tasks
              }
              isLoading={
                isGanttLoading || isGanttPlaceholder || (ownTasks && !user)
              }
              displayUnit={ganttDisplayUnit}
              displayStart={ganttStartDate}
              displayEnd={ganttEndDate}
              canUpdate={canUpdate}
              unscheduledPanelOpen={unscheduledOpen}
              onCloseUnscheduled={() => {
                setUnscheduledOpen(false);
                unscheduledTrigger.current?.focus();
              }}
              onMilestoneSelect={setEditingMilestone}
            />
          )}
        </TabsContent>
        <TabsContent value="effort" className="min-w-0 space-y-3">
          <PlanningPhaseActions
            projectId={projectId}
            phases={phases}
            tasks={currentGantt?.tasks}
            canManage={currentProjectRole?.role?.key === "project_admin"}
            canUpdate={canUpdate}
            canCreate={canCreate}
            planning={planning}
          />
          <TaskPhaseDialog projectId={projectId} summaryOnly />
        </TabsContent>
      </Tabs>
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
