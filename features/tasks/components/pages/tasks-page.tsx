"use client";

import { useTaskTypes } from "../../hooks/use-task-types";
import { useUrlFilterState } from "@/hooks/use-url-filter-state";

import { useRef, useState } from "react";
import { PlusIcon } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

import { DataLoadError } from "@/components/shared/feedback/data-load-error";
import { LoadingState } from "@/components/shared/feedback/loading-state";
import { OverviewReturn } from "@/components/shared/navigation/overview-return";
import { PageHeader } from "@/components/shared/layout/page-header";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { FieldGroup } from "@/components/ui/field";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  canCreateTask,
  canUpdateTask,
} from "@/features/auth/utils/authorization";
import { useAuth } from "@/features/auth/providers/auth-provider";
import { useCurrentProjectRole } from "@/features/projects/hooks/use-current-project-role";
import { useUrlTabState } from "@/hooks/use-url-tab-state";

import {
  ALL_OVERDUE,
  ALL_PRIORITIES,
  ALL_TYPES,
  SORT_OPTIONS,
  TaskBoardToolbar,
  TaskFilters,
} from "./parts/task-page-controls";
import { useCreateTask } from "../../hooks/use-create-task";
import { useTasks } from "../../hooks/use-tasks";
import { useTaskListScope } from "../../hooks/use-task-list-scope";
import { useTaskStatusFilter } from "../../hooks/use-task-status-filter";
import {
  getTaskStatusQuery,
  getTaskStatusFilterLabel,
  TASK_HIERARCHY_OPTIONS,
} from "../../lib/task-list-filters";
import {
  clearTaskListFilters,
  clearTaskListFilter,
  type TaskListScope,
} from "../../lib/task-list-scope";
import { getPlanningHref } from "../../lib/planning-route";
import { defaultTaskFormValues } from "../../lib/task-mappers";
import { BOARD_TASK_LIMIT, getBoardTaskScope } from "../../lib/task-view-scope";
import {
  TASK_STATUS_OPTIONS,
  getTaskPriorityLabel,
} from "../../constants/task-options";
import { TaskForm } from "../forms/task-form";
import { TaskUserSelectField } from "../forms/task-user-select-field";
import { TaskRequirementSelectField } from "../forms/task-requirement-select-field";
import {
  type BoardSwimlane,
  TasksBoardSection,
} from "../sections/tasks-board-section";
import { TaskListWorkbench } from "../sections/task-list-workbench";
import { TaskFilterSelect } from "./controls/task-filter-select";
import { TaskPhaseDialog } from "../sections/task-phase-dialog";
import { TaskListScopeNav } from "./controls/task-list-scope-nav";
import { TaskAppliedFilters } from "./controls/task-applied-filters";
import { useTaskUserMap } from "../../hooks/use-task-user-map";
import { useRequirement } from "@/features/requirements/hooks/use-requirement";

const PAGE_SIZE = 20;
const TASK_TABS = ["list", "board"] as const;

type TasksPageProps = {
  projectId: number;
};

export function TasksPage({ projectId }: TasksPageProps) {
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useUrlTabState({
    values: TASK_TABS,
    defaultValue: "list",
  });
  const planningHref = getPlanningHref(projectId, searchParams);
  const taskTypes = useTaskTypes(projectId);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const listNavigationGuard = useRef<(action: () => void) => void>((action) =>
    action(),
  );
  const listSelectionResetRef = useRef<() => void>(() => {});
  const [page, setPage] = useUrlFilterState("page", 1);
  const [q, setQ] = useUrlFilterState("q", "");
  const [searchDraft, setSearchDraft] = useState({ query: q, text: q });
  const searchInput = searchDraft.query === q ? searchDraft.text : q;
  const setSearchInput = (text: string) => setSearchDraft({ query: q, text });
  const [status, setStatus] = useTaskStatusFilter();
  const [priority, setPriority] = useUrlFilterState("priority", ALL_PRIORITIES);
  const [taskType, setTaskType] = useUrlFilterState("taskType", ALL_TYPES);
  const [overdue, setOverdue] = useUrlFilterState("overdue", ALL_OVERDUE);
  const [assigneeId, setAssigneeId] = useUrlFilterState(
    "assigneeId",
    searchParams.get("ganttAssigneeId") ??
      (searchParams.get("assignee") === "me" ? String(user?.id ?? "") : ""),
  );
  const [requirementId, setRequirementId] = useUrlFilterState(
    "requirementId",
    searchParams.get("ganttRequirementId") ?? "",
  );
  const [tag, setTag] = useUrlFilterState("tag", "");
  const [startDateFrom, setStartDateFrom] = useUrlFilterState(
    "startDateFrom",
    "",
  );
  const [dueDateTo, setDueDateTo] = useUrlFilterState("dueDateTo", "");
  const [sort, setSort] = useUrlFilterState<
    (typeof SORT_OPTIONS)[number]["value"]
  >("sort", "updated_desc");
  const [boardSwimlane, setBoardSwimlane] = useUrlFilterState<BoardSwimlane>(
    "boardSwimlane",
    "none",
  );
  const [boardCompleted, setBoardCompleted] = useUrlFilterState(
    "boardCompleted",
    "collapsed",
  );
  const isBoardCompletedCollapsed = boardCompleted !== "expanded";
  const { currentProjectRole } = useCurrentProjectRole(projectId);
  const canCreate = canCreateTask(currentProjectRole);
  const canUpdate = canUpdateTask(currentProjectRole);
  const taskListScope = useTaskListScope(projectId, true);
  const { usersById } = useTaskUserMap(projectId);
  const selectedRequirementId = Number(requirementId);
  const { requirement: selectedRequirement } = useRequirement(
    projectId,
    selectedRequirementId || 0,
    {
      enabled:
        activeTab === "list" &&
        Number.isSafeInteger(selectedRequirementId) &&
        selectedRequirementId > 0 &&
        selectedRequirementId <= 2147483647,
    },
  );
  const taskQuery = {
    page: activeTab === "board" ? 1 : page,
    page_size: activeTab === "board" ? BOARD_TASK_LIMIT : PAGE_SIZE,
    q: q || undefined,
    ...taskListScope.query,
    ...getTaskStatusQuery(status),
    task_type: taskType === ALL_TYPES ? undefined : taskType,
    priority: priority === ALL_PRIORITIES ? undefined : priority,
    assignee_id: assigneeId ? Number(assigneeId) : undefined,
    requirement_id: requirementId ? Number(requirementId) : undefined,
    tag: tag.trim() || undefined,
    start_date_from: startDateFrom || undefined,
    due_date_to: dueDateTo || undefined,
    overdue: overdue === ALL_OVERDUE ? undefined : overdue === "overdue",
    sort,
  };
  const {
    tasks,
    total,
    isLoading,
    isFetching,
    isPlaceholderData,
    error,
    refetch,
  } = useTasks(
    projectId,
    taskQuery,
    activeTab === "board" &&
      (searchParams.get("assignee") !== "me" || Boolean(user)),
  );
  const boardScope = getBoardTaskScope(
    tasks,
    total,
    isBoardCompletedCollapsed,
    TASK_STATUS_OPTIONS.map((option) => option.value),
  );
  const {
    createTask,
    isPending: isCreatePending,
    error: createError,
  } = useCreateTask(projectId);
  const handleSearch = () => {
    setPage(1);
    setQ(searchInput.trim());
  };

  const handleScopeChange = (scope: TaskListScope) => {
    taskListScope.setScope(scope);
    listSelectionResetRef.current();
  };
  const handleBrowseChildren = (taskId: number) =>
    handleScopeChange({ kind: "children", parentTaskId: taskId });
  const handleResetFilters = () => {
    const url = new URL(window.location.href);
    clearTaskListFilters(url.searchParams);
    window.history.replaceState(
      null,
      "",
      `${url.pathname}${url.search}${url.hash}`,
    );
    setSearchDraft({ query: "", text: "" });
    listSelectionResetRef.current();
  };
  const handleRemoveFilter = (key: string) => {
    const url = new URL(window.location.href);
    clearTaskListFilter(url.searchParams, key);
    window.history.replaceState(
      null,
      "",
      `${url.pathname}${url.search}${url.hash}`,
    );
    if (key === "q") setSearchDraft({ query: "", text: "" });
  };
  const appliedFilters = [
    { key: "q", label: q ? `検索:「${q}」` : "" },
    {
      key: "status",
      label:
        status.kind !== "all"
          ? `状態: ${getTaskStatusFilterLabel(status, TASK_STATUS_OPTIONS)}`
          : "",
    },
    {
      key: "hierarchy",
      label:
        taskListScope.hierarchy !== "all"
          ? `階層: ${TASK_HIERARCHY_OPTIONS.find((option) => option.value === taskListScope.hierarchy)?.label}`
          : "",
    },
    {
      key: "priority",
      label:
        priority !== ALL_PRIORITIES
          ? `優先度: ${getTaskPriorityLabel(priority)}`
          : "",
    },
    {
      key: "taskType",
      label: taskType !== ALL_TYPES ? `種別: ${taskTypes.name(taskType)}` : "",
    },
    {
      key: "assigneeId",
      label: assigneeId
        ? `担当: ${usersById.get(Number(assigneeId))?.name ?? "名称を確認できません"}`
        : "",
    },
    {
      key: "requirementId",
      label: requirementId
        ? `関連要件: ${selectedRequirement?.id === selectedRequirementId ? `${selectedRequirement.requirement_code} ${selectedRequirement.title}` : "内容を確認できません"}`
        : "",
    },
    { key: "overdue", label: overdue !== ALL_OVERDUE ? "期限超過" : "" },
    { key: "tag", label: tag ? `タグ: ${tag}` : "" },
    {
      key: "startDateFrom",
      label: startDateFrom ? `開始: ${startDateFrom}以降` : "",
    },
    { key: "dueDateTo", label: dueDateTo ? `終了予定: ${dueDateTo}以前` : "" },
  ]
    .filter((filter) => filter.label)
    .map((filter) => ({
      ...filter,
      onRemove: () => handleRemoveFilter(filter.key),
    }));

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <OverviewReturn projectId={projectId} />
      <PageHeader
        title="タスク"
        description="一覧とボードでタスクの進捗を確認・更新します。"
        actions={
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline">
              <Link
                href={planningHref}
                onNavigate={(event) => {
                  if (activeTab !== "list") return;
                  event.preventDefault();
                  listNavigationGuard.current(() => router.push(planningHref));
                }}
              >
                計画を開く
              </Link>
            </Button>
            <TaskPhaseDialog projectId={projectId} />
            {canCreate ? (
              <Button type="button" onClick={() => setCreateDialogOpen(true)}>
                <PlusIcon data-icon="inline-start" />
                タスク新規作成
              </Button>
            ) : null}
          </div>
        }
      />

      {activeTab !== "list" ? (
        <section
          aria-label="すべての表示の共通条件"
          className="flex flex-col gap-2"
        >
          <p className="text-sm text-muted-foreground">
            担当者・関連要件は一覧とボードで共通です。
          </p>
          <FieldGroup className="grid gap-3 md:grid-cols-2">
            <TaskUserSelectField
              projectId={projectId}
              label="担当者"
              value={assigneeId}
              placeholder="すべて"
              onChange={(value) => {
                setPage(1);
                setAssigneeId(value);
              }}
            />
            <TaskRequirementSelectField
              projectId={projectId}
              value={requirementId}
              placeholder="すべて"
              onChange={(value) => {
                setPage(1);
                setRequirementId(value);
              }}
            />
          </FieldGroup>
        </section>
      ) : null}

      <Tabs
        value={activeTab}
        onValueChange={(value) => {
          if (activeTab === "list")
            listNavigationGuard.current(() => setActiveTab(value));
          else setActiveTab(value);
        }}
      >
        <TabsList
          variant="line"
          className="flex h-auto w-full flex-wrap justify-start border-b"
        >
          <TabsTrigger value="list">一覧</TabsTrigger>
          <TabsTrigger value="board">ボード</TabsTrigger>
        </TabsList>

        <TabsContent
          forceMount
          value="list"
          className={activeTab === "list" ? "flex flex-col gap-4" : "hidden"}
        >
          <TaskFilters
            compact
            extraAdvancedCount={
              Number(Boolean(requirementId)) +
              Number(taskListScope.hierarchy !== "all")
            }
            help={
              <p className="text-muted-foreground">
                キーワードはEnterまたは「検索」で適用し、ほかの条件は選択時に適用します。状態内はOR、異なる条件同士はANDです。担当者・関連要件は「計画を開く」から計画にも引き継げます。すべて解除すると並び順も標準に戻ります。
              </p>
            }
            basicExtra={
              <TaskUserSelectField
                projectId={projectId}
                label="担当者"
                value={assigneeId}
                placeholder="すべて"
                onChange={(value) => {
                  setPage(1);
                  setAssigneeId(value);
                }}
              />
            }
            advancedExtra={
              <>
                <TaskRequirementSelectField
                  projectId={projectId}
                  value={requirementId}
                  placeholder="すべて"
                  onChange={(value) => {
                    setPage(1);
                    setRequirementId(value);
                  }}
                />
                <TaskFilterSelect
                  label="階層の種類"
                  value={taskListScope.hierarchy}
                  placeholder="階層の種類を選択"
                  allValue="all"
                  allLabel="すべての種類"
                  options={TASK_HIERARCHY_OPTIONS}
                  onValueChange={taskListScope.setHierarchy}
                />
              </>
            }
            searchInput={searchInput}
            status={status}
            priority={priority}
            taskType={taskType}
            overdue={overdue}
            tag={tag}
            startDateFrom={startDateFrom}
            dueDateTo={dueDateTo}
            sort={sort}
            onSearchInputChange={setSearchInput}
            onSearch={handleSearch}
            onStatusChange={(value) => {
              setPage(1);
              setStatus(value);
            }}
            onPriorityChange={(value) => {
              setPage(1);
              setPriority(value);
            }}
            onTaskTypeChange={(value) => {
              setPage(1);
              setTaskType(value);
            }}
            onTagChange={(value) => {
              setPage(1);
              setTag(value);
            }}
            onStartDateFromChange={(value) => {
              setPage(1);
              setStartDateFrom(value);
            }}
            onDueDateToChange={(value) => {
              setPage(1);
              setDueDateTo(value);
            }}
            onOverdueChange={(value) => {
              setPage(1);
              setOverdue(value);
            }}
            onSortChange={(value) => setSort(value as typeof sort)}
          />
          <TaskAppliedFilters
            filters={appliedFilters}
            hasUnappliedSearch={searchInput.trim() !== q}
            onReset={handleResetFilters}
          />
          {taskListScope.scope.kind === "children" ? (
            <TaskListScopeNav
              projectId={projectId}
              {...taskListScope}
              onScopeChange={handleScopeChange}
              onHierarchyChange={taskListScope.setHierarchy}
              onRetryParent={taskListScope.retryParent}
            />
          ) : null}
          <TaskListWorkbench
            toolbar={
              <>
                <div className="w-40 max-w-full">
                  <TaskFilterSelect
                    compact
                    label="並び順"
                    value={sort}
                    placeholder="並び順を選択"
                    options={SORT_OPTIONS}
                    onValueChange={(value) => setSort(value as typeof sort)}
                  />
                </div>
              </>
            }
            selectionResetRef={listSelectionResetRef}
            enabled={
              activeTab === "list" &&
              (searchParams.get("assignee") !== "me" || Boolean(user))
            }
            navigationGuardRef={listNavigationGuard}
            key={projectId}
            projectId={projectId}
            query={{ ...taskQuery, page_size: PAGE_SIZE, page }}
            canUpdate={canUpdate}
            onPageChange={setPage}
          />
        </TabsContent>

        <TabsContent value="board" className="flex flex-col gap-4">
          <TaskListScopeNav
            projectId={projectId}
            {...taskListScope}
            onScopeChange={handleScopeChange}
            onHierarchyChange={taskListScope.setHierarchy}
            onRetryParent={taskListScope.retryParent}
          />
          <p className="text-sm text-muted-foreground">
            以下の条件は一覧・ボードに共通です。ボードは条件に合う100件までを全件表示します。
          </p>
          <TaskBoardToolbar
            searchInput={searchInput}
            status={status}
            priority={priority}
            taskType={taskType}
            overdue={overdue}
            tag={tag}
            startDateFrom={startDateFrom}
            dueDateTo={dueDateTo}
            sort={sort}
            onSearchInputChange={setSearchInput}
            onSearch={handleSearch}
            onStatusChange={(value) => {
              setPage(1);
              setStatus(value);
            }}
            onPriorityChange={(value) => {
              setPage(1);
              setPriority(value);
            }}
            onTaskTypeChange={(value) => {
              setPage(1);
              setTaskType(value);
            }}
            onTagChange={(value) => {
              setPage(1);
              setTag(value);
            }}
            onStartDateFromChange={(value) => {
              setPage(1);
              setStartDateFrom(value);
            }}
            onDueDateToChange={(value) => {
              setPage(1);
              setDueDateTo(value);
            }}
            onOverdueChange={(value) => {
              setPage(1);
              setOverdue(value);
            }}
            onSortChange={(value) => setSort(value as typeof sort)}
            swimlane={boardSwimlane}
            isCompletedCollapsed={isBoardCompletedCollapsed}
            onSwimlaneChange={(value) => setBoardSwimlane(value)}
            onCompletedCollapsedChange={(collapsed) =>
              setBoardCompleted(collapsed ? "collapsed" : "expanded")
            }
          />
          <TaskAppliedFilters
            filters={appliedFilters}
            hasUnappliedSearch={searchInput.trim() !== q}
            onReset={handleResetFilters}
          />
          {error ? (
            <DataLoadError
              resourceName="ボードのタスク"
              isRetrying={isFetching}
              onRetry={() => void refetch()}
            />
          ) : isLoading || isPlaceholderData ? (
            <LoadingState message="ボードの対象範囲を確認しています。" />
          ) : boardScope.overLimit ? (
            <Alert>
              <AlertTitle>
                条件に合う全{total}件は、表示上限100件を超えています
              </AlertTitle>
              <AlertDescription>
                <p>条件を絞り込むか、一覧で確認してください。</p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setActiveTab("list")}
                >
                  一覧で確認
                </Button>
              </AlertDescription>
            </Alert>
          ) : !boardScope.complete ? (
            <DataLoadError
              resourceName="ボードの表示範囲"
              isRetrying={isFetching}
              onRetry={() => void refetch()}
            />
          ) : (
            <>
              <p role="status" className="text-sm text-muted-foreground">
                条件に合う全{total}件 · カード表示{boardScope.visible}件
                {boardScope.folded
                  ? ` · 完了・中止${boardScope.folded}件を折り畳み`
                  : ""}
                {boardScope.unknown
                  ? ` · 表示列のない状態${boardScope.unknown}件（一覧で確認）`
                  : ""}
                {isFetching ? " · 更新中" : ""}
              </p>
              <TasksBoardSection
                projectId={projectId}
                tasks={tasks}
                canUpdate={canUpdate}
                swimlane={boardSwimlane}
                isCompletedCollapsed={isBoardCompletedCollapsed}
                onBrowseChildren={handleBrowseChildren}
              />
            </>
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="max-h-[calc(100vh-2rem)] w-[min(94vw,960px)] overflow-y-auto p-6 sm:max-w-none">
          <DialogHeader>
            <DialogTitle>タスク登録</DialogTitle>
            <DialogDescription>
              プロジェクトに新しいタスクを追加します。
            </DialogDescription>
          </DialogHeader>
          <TaskForm
            mode="create"
            projectId={projectId}
            initialValues={defaultTaskFormValues}
            isPending={isCreatePending}
            error={createError}
            onSubmit={(values) => createTask(values)}
            onSuccess={() => setCreateDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
