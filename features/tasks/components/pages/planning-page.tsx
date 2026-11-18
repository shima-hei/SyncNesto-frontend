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
import { useTaskStatusFilter } from "../../hooks/use-task-status-filter";
import { extendLegacyGanttRange } from "../../lib/gantt-range-controls";
import { matchesTaskStatus } from "../../lib/task-list-filters";
import { TaskUserSelectField } from "../forms/task-user-select-field";
import { TaskRequirementSelectField } from "../forms/task-requirement-select-field";
import { TaskPlanningWorkspace } from "../gantt/task-planning-workspace";
import { MilestoneDialogs } from "../sections/milestone-dialogs";
import { PlanningPhaseActions } from "../sections/planning-phase-actions";
import { PlanningEffortSummary } from "../sections/planning-effort-summary";
import type { SheetMethod } from "../../lib/estimate-worksheet";
import { EffortControls } from "../sections/effort-controls";
import {
  filterEffortTasks,
  initialEffortFilter,
} from "../../lib/effort-workspace";
import {
  TaskEstimateWorkbench,
  mayLeaveEffortEditor,
} from "../sections/task-estimate-workbench";
import { TasksGanttSection } from "../sections/tasks-gantt-section";
import { GanttStatusFilters } from "./controls/gantt-status-filters";
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
  const ganttTab = useRef<HTMLButtonElement>(null);
  const route = searchParams.get("planningView");
  const view =
    route === "effort" ? (searchParams.get("effortView") ?? "phases") : route;
  const activeView =
    view === "phases" || view === "estimate" || view === "summary"
      ? view
      : "gantt";
  const goToView = (value: string) => {
    const url = new URL(window.location.href);
    url.searchParams.set("planningView", value);
    url.searchParams.delete("effortView");
    window.history.pushState(null, "", url);
    if (value !== "gantt") setUnscheduledGroup(null);
  };
  const [effortFilter, setEffortFilter] = useState(initialEffortFilter);
  const [estimateView, setEstimateView] = useState<SheetMethod | "">("");
  const [effortRevision, setEffortRevision] = useState(0);
  const estimateTab = useRef<HTMLButtonElement>(null);
  const [estimateTask, setEstimateTask] = useState<number | null>(null);
  const [search, setSearch] = useUrlFilterState("ganttSearch", "");
  const [quickOpen, setQuickOpen] = useState(false);
  const [unscheduledGroup, setUnscheduledGroup] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useTaskStatusFilter();
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
    activeView !== "gantt" || needsDependencyTasks,
  );
  const effortTasks =
    projectGantt.isPlaceholderData || projectGantt.error
      ? undefined
      : projectGantt.gantt?.tasks;
  const filteredEffort = useMemo(
    () => filterEffortTasks(effortTasks ?? [], effortFilter, getTaskUserLabel),
    [effortTasks, effortFilter, getTaskUserLabel],
  );
  const needle = search.trim().toLocaleLowerCase();
  const searched =
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
  const shown =
    searched && statusFilter.kind !== "all"
      ? {
          ...searched,
          tasks: searched.tasks.filter((task) =>
            matchesTaskStatus(statusFilter, task.status),
          ),
        }
      : searched;
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

  const effortControls = (
    <EffortControls
      value={effortFilter}
      onChange={(next) => {
        if (!mayLeaveEffortEditor()) return;
        setEstimateTask(null);
        if (document.querySelector('[data-effort-dirty="true"]'))
          setEffortRevision((n) => n + 1);
        setEffortFilter(next);
      }}
      phases={phases.data ?? []}
      tasks={effortTasks ?? []}
      userLabel={getTaskUserLabel}
    />
  );
  return (
    <div className="flex min-w-0 flex-col gap-3">
      <OverviewReturn projectId={projectId} />
      <PageHeader title="計画" />
      <TaskPlanningWorkspace planning={planning} canUpdate={canUpdate} />
      <Tabs
        value={activeView}
        onValueChange={goToView}
        activationMode="manual"
        className="min-w-0 gap-2"
      >
        <TabsList
          variant="line"
          aria-label="計画の画面"
          className="h-10 w-full justify-start border-b sm:w-fit [&_[aria-selected=true]]:after:bg-[var(--status-info-chart)]"
        >
          <TabsTrigger ref={ganttTab} value="gantt">
            ガント
          </TabsTrigger>
          <TabsTrigger value="phases">工程管理</TabsTrigger>
          <TabsTrigger ref={estimateTab} value="estimate">
            工数見積
          </TabsTrigger>
          <TabsTrigger value="summary">工数分析</TabsTrigger>
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
              canCreate ? (
                <Button
                  type="button"
                  size="sm"
                  aria-controls="gantt-quick-task"
                  aria-expanded={quickOpen}
                  onClick={() => setQuickOpen(!quickOpen)}
                >
                  <PlusIcon data-icon="inline-start" /> タスクを追加
                </Button>
              ) : null
            }
          />
          <GanttStatusFilters
            filter={statusFilter}
            onChange={setStatusFilter}
          />
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
              canCreate={canCreate}
              quickOpen={quickOpen}
              visibilityScope={JSON.stringify([
                search,
                assigneeId,
                requirementId,
                ganttStartDate,
                ganttEndDate,
                statusFilter,
              ])}
              phases={phases.data ?? []}
              gantt={shown}
              rangeTasks={
                statusFilter.kind !== "all" ? searched?.tasks : undefined
              }
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
              canReorderPhases={
                currentProjectRole?.role?.key === "project_admin"
              }
              unscheduledGroup={unscheduledGroup}
              onUnscheduledGroupChange={setUnscheduledGroup}
              onEstimate={(task) => {
                if (!mayLeaveEffortEditor()) return;
                setEffortFilter({
                  ...initialEffortFilter,
                  search: task.task_code,
                });
                setEffortRevision((n) => n + 1);
                setEstimateTask(task.id);
                goToView("estimate");
              }}
              onMilestoneSelect={setEditingMilestone}
            />
          )}
        </TabsContent>
        <TabsContent
          value="phases"
          forceMount
          className={activeView === "phases" ? "min-w-0" : "hidden"}
        >
          <PlanningPhaseActions
            active={activeView === "phases"}
            projectId={projectId}
            phases={phases}
            tasks={effortTasks}
            canManage={currentProjectRole?.role?.key === "project_admin"}
            canUpdate={canUpdate}
            canCreate={canCreate}
            planning={planning}
          />
        </TabsContent>
        {activeView === "summary" && effortControls}
        {activeView !== "gantt" && projectGantt.error && (
          <DataLoadError
            resourceName="工程・工数のタスク"
            isRetrying={projectGantt.isFetching}
            onRetry={() => void projectGantt.refetch()}
          />
        )}
        {activeView !== "gantt" && !projectGantt.error && !effortTasks && (
          <p role="status">タスクを取得中…</p>
        )}
        <TabsContent
          value="estimate"
          forceMount
          className={activeView === "estimate" ? "min-w-0" : "hidden"}
        >
          {effortTasks && (
            <TaskEstimateWorkbench
              view={estimateView}
              setView={setEstimateView}
              filters={activeView === "estimate" ? effortControls : null}
              planning={planning}
              key={effortRevision}
              tasks={filteredEffort}
              allTasks={effortTasks}
              phases={phases.data ?? []}
              currentId={estimateTask}
              onSelect={setEstimateTask}
              active={activeView === "estimate"}
              projectId={projectId}
              canUpdate={canUpdate}
              canConfirm={
                canUpdate && currentProjectRole?.role?.key === "project_admin"
              }
            />
          )}
        </TabsContent>
        <TabsContent value="summary" className="min-w-0">
          {activeView !== "gantt" && effortTasks && (
            <PlanningEffortSummary
              filter={effortFilter}
              tasks={filteredEffort}
              phases={phases.data ?? []}
              userLabel={getTaskUserLabel}
              onDrill={(patch) => {
                if (!mayLeaveEffortEditor()) return;
                setEstimateTask(null);
                setEffortRevision((n) => n + 1);
                setEffortFilter({ ...effortFilter, ...patch });
                goToView("estimate");
                requestAnimationFrame(() =>
                  estimateTab.current?.focus({ preventScroll: true }),
                );
              }}
              onGantt={(id) => {
                setAssigneeId(String(id));
                goToView("gantt");
                requestAnimationFrame(() =>
                  ganttTab.current?.focus({ preventScroll: true }),
                );
              }}
            />
          )}
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
