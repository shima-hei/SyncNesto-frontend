"use client";

import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ApiError } from "@/lib/api/error";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/shared/dialogs/confirm-dialog";
import { ChangeLogDiffRows } from "@/components/shared/change-log/change-log-card";
import { Input } from "@/components/ui/input";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { TestCaseRead, TestCaseUpdate } from "@/lib/api/generated/model";
import {
  listTestCasesProjectsProjectIdTestDesignsDesignIdCasesGet as listCases,
  updateTestCaseProjectsProjectIdTestDesignsDesignIdCasesCaseIdPatch as updateCase,
  refreshTestCaseProjectsProjectIdTestDesignsDesignIdCasesCaseIdRefreshPost as refreshCase,
  readTestDesignProjectsProjectIdTestDesignsDesignIdGet as readDesign,
} from "@/lib/api/generated/test-designs/test-designs";
import { listDesignIssuesProjectsProjectIdTestDesignsDesignIdIssuesGet as listDesignIssues } from "@/lib/api/generated/test-issues/test-issues";
import { useDesignPermissions } from "../../hooks/use-design-permissions";
import { useConfirmAction } from "../../hooks/use-confirm-action";
import { CaseExecutionHistory } from "./case-execution-history";
import { CaseIssues } from "./case-issues";
import { itemColumns } from "../../lib/design";
import {
  getCaseDesignDiff,
  getCaseDesignSummary,
  type CaseSource,
} from "../../lib/case-diff";

const statuses = {
  not_run: "未実行",
  in_progress: "実施中",
  passed: "成功",
  failed: "失敗",
  blocked: "保留",
  not_applicable: "対象外",
};
const sourceOf = (c: TestCaseRead) => c.source as unknown as CaseSource;

function CaseStatusSelect({
  value,
  disabled,
  label,
  onChange,
}: {
  value: TestCaseRead["status"];
  disabled: boolean;
  label: string;
  onChange: (value: TestCaseRead["status"]) => void;
}) {
  return (
    <select
      aria-label={label}
      className="min-w-24 rounded border bg-background p-2"
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value as TestCaseRead["status"])}
    >
      {Object.entries(statuses).map(([key, text]) => (
        <option key={key} value={key}>
          {text}
        </option>
      ))}
    </select>
  );
}

function PatternDetails({ source }: { source: CaseSource }) {
  if (!source.pattern) return <>－</>;
  return (
    <div className="min-w-48 whitespace-pre-wrap">
      <div className="font-medium">
        {source.pattern_table?.name} {source.pattern.code}
      </div>
      {source.values.map((v, i) => (
        <div key={i}>
          {v.factor}：{v.level ?? "－"}
        </div>
      ))}
    </div>
  );
}

const expectations = (s: CaseSource) =>
  s.expected_values ?? (s.expected_value ? [s.expected_value] : []);

export function CasesSection({
  projectId,
  designId,
  version,
  dirty = false,
  onEditDesign,
  initialStatusFilter = "",
  initialTargetFeature = "",
  onlyUnlinkedNg = false,
  issueTaskId,
  initialCaseId,
  initialExecutionId,
}: {
  projectId: number;
  designId: number;
  version: number;
  dirty?: boolean;
  onEditDesign?: (itemId: string, tableId?: string) => void;
  initialStatusFilter?: TestCaseRead["status"] | "";
  initialTargetFeature?: string;
  onlyUnlinkedNg?: boolean;
  issueTaskId?: number;
  initialCaseId?: string;
  initialExecutionId?: string;
}) {
  const permissions = useDesignPermissions(projectId);
  const client = useQueryClient();
  const { confirm, confirmDialogProps } = useConfirmAction();
  const query = useQuery({
    queryKey: ["test-design-cases", projectId, designId, version],
    queryFn: () => listCases(projectId, designId),
    retry: false,
  });
  const issueLinks = useQuery({
    queryKey: ["design-issues", projectId, designId],
    queryFn: () => listDesignIssues(projectId, designId),
  });
  const currentDesign = useQuery({
    queryKey: ["test-design-current", projectId, designId],
    queryFn: () => readDesign(projectId, designId),
  });
  const [selected, setSelected] = useState<TestCaseRead | null>(null);
  const openedInitialCase = useRef(false);
  const [reviewCase, setReviewCase] = useState<TestCaseRead | null>(null);
  const [caseDirty, setCaseDirty] = useState(false);
  const [conflict, setConflict] = useState<TestCaseRead | null>(null);
  const [busy, setBusy] = useState(false);
  const [filter, setFilter] = useState("");
  const [targetFilter, setTargetFilter] = useState(initialTargetFeature);
  const [statusFilter, setStatusFilter] = useState<TestCaseRead["status"] | "">(
    initialStatusFilter,
  );
  const [onlyStale, setOnlyStale] = useState(false);
  const [unlinkedNg, setUnlinkedNg] = useState(onlyUnlinkedNg);
  const [page, setPage] = useState(0);
  const reviewDiffRows = reviewCase?.acknowledged_source
    ? getCaseDesignDiff(
        reviewCase.acknowledged_source as CaseSource,
        sourceOf(reviewCase),
      )
    : [];
  const cases = query.data ?? [];
  useEffect(() => {
    if (openedInitialCase.current || !initialCaseId || !query.data) return;
    openedInitialCase.current = true;
    setSelected(query.data.find((row) => row.id === initialCaseId) ?? null);
  }, [initialCaseId, query.data]);
  const issueCountByCase = new Map<string, number>();
  for (const link of issueLinks.data ?? []) {
    issueCountByCase.set(
      link.case_id,
      (issueCountByCase.get(link.case_id) ?? 0) + 1,
    );
  }
  const targetByItem = new Map(
    (currentDesign.data?.items ?? []).map((item) => [
      item.id,
      item.target_feature,
    ]),
  );
  const currentTarget = (testCase: TestCaseRead) =>
    targetByItem.get(sourceOf(testCase).item.id) ?? "";
  const targets = [
    ...new Set(
      cases
        .filter((c) => c.active)
        .map(currentTarget)
        .filter(Boolean),
    ),
  ].sort();
  const filtered = cases.filter(
    (c) =>
      (!onlyStale || c.stale) &&
      (!unlinkedNg ||
        (issueLinks.data !== undefined &&
          c.status === "failed" &&
          !issueCountByCase.has(c.id))) &&
      (!issueTaskId ||
        issueLinks.data?.some(
          (link) => link.case_id === c.id && link.task_id === issueTaskId,
        )) &&
      (!statusFilter || c.status === statusFilter) &&
      (!targetFilter || currentTarget(c) === targetFilter) &&
      `${sourceOf(c).item.code} ${sourceOf(c).item.target_feature} ${sourceOf(c).item.content} ${sourceOf(c).pattern_table?.name ?? ""} ${sourceOf(c).pattern?.code ?? ""}`.includes(
        filter,
      ),
  );
  async function run(action: () => Promise<unknown>) {
    setBusy(true);
    try {
      await action();
      await query.refetch();
      await client.invalidateQueries({
        queryKey: ["test-progress", projectId, designId],
      });
      toast.success("テストケースを更新しました");
      return true;
    } catch (e) {
      const current =
        e instanceof ApiError && e.code === "VERSION_CONFLICT"
          ? (e.data as { current?: TestCaseRead }).current
          : null;
      if (current && typeof current.id === "string" && current.status) {
        setConflict(current);
        setReviewCase(null);
      } else
        toast.error(e instanceof Error ? e.message : "更新できませんでした");
      return false;
    } finally {
      setBusy(false);
    }
  }
  async function acknowledge(caseToAcknowledge: TestCaseRead) {
    const success = await run(async () => {
      const next = await refreshCase(
        projectId,
        designId,
        caseToAcknowledge.id,
        {
          version: caseToAcknowledge.version,
        },
      );
      if (selected?.id === caseToAcknowledge.id) setSelected(next);
    });
    if (success) {
      setReviewCase(null);
      setCaseDirty(false);
    }
  }
  async function openReview(caseToReview: TestCaseRead) {
    const latest = await query.refetch();
    const current = latest.data?.find((row) => row.id === caseToReview.id);
    if (!current) {
      toast.error("最新のテストケースを取得できませんでした");
    } else if (current.active && !current.stale) {
      toast.info("このテストケースの設計変更は確認済みです");
    } else {
      setReviewCase(current);
    }
  }
  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-sm">
          現在の生成対象 {cases.filter((c) => c.active).length}件 /
          過去の結果を保持 {cases.filter((c) => !c.active).length}件 /
          設計変更の影響あり {cases.filter((c) => c.stale).length}件
        </span>
        {dirty && (
          <span className="text-sm text-muted-foreground">
            設計を保存するとケースへ自動反映されます
          </span>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <Input
          aria-label="ケース検索"
          className="max-w-sm"
          placeholder="項目ID・対象画面/機能・内容・パターンで検索"
          value={filter}
          onChange={(e) => {
            setFilter(e.target.value);
            setPage(0);
          }}
        />
        {targets.length > 0 && (
          <select
            aria-label="対象画面・機能で絞り込み"
            className="rounded-md border bg-background p-2 text-sm"
            value={targetFilter}
            onChange={(e) => {
              setTargetFilter(e.target.value);
              setPage(0);
            }}
          >
            <option value="">すべての対象画面・機能</option>
            {targets.map((target) => (
              <option key={target} value={target}>
                {target}
              </option>
            ))}
          </select>
        )}
        <select
          aria-label="状態で絞り込み"
          className="rounded-md border bg-background p-2 text-sm"
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value as TestCaseRead["status"] | "");
            setPage(0);
          }}
        >
          <option value="">すべての状態</option>
          {Object.entries(statuses).map(([key, label]) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </select>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={onlyStale}
            onChange={(e) => {
              setOnlyStale(e.target.checked);
              setPage(0);
            }}
          />
          影響ありのみ
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={unlinkedNg}
            onChange={(event) => {
              setUnlinkedNg(event.target.checked);
              setPage(0);
            }}
          />
          NG / Issue未登録のみ
        </label>
      </div>
      {query.isPending && <p>テストケースを読み込み中…</p>}
      {query.error && <p role="alert">{query.error.message}</p>}
      {issueLinks.error && (
        <p role="alert">
          関連Issueを読み込めませんでした。Issue未登録の判定はできません。
        </p>
      )}
      <div className="overflow-auto rounded-md border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted">
              <th className="p-2 text-left">項目番号</th>
              {itemColumns.slice(1, 7).map(([key, label]) => (
                <th key={key} className="min-w-44 p-2 text-left">
                  {label}
                </th>
              ))}
              <th className="p-2 text-left">パターン</th>
              <th className="min-w-44 p-2 text-left">期待値</th>
              <th className="p-2 text-left">状態</th>
              <th className="p-2 text-left">影響</th>
              <th className="p-2">操作</th>
            </tr>
          </thead>
          <tbody>
            {filtered.slice(page * 50, (page + 1) * 50).map((c) => {
              const s = sourceOf(c);
              return (
                <tr
                  key={c.id}
                  className={`border-b align-top ${{ not_run: "", in_progress: "bg-sky-50 dark:bg-sky-950/30", passed: "bg-emerald-50 dark:bg-emerald-950/30", failed: "bg-red-50 dark:bg-red-950/30", blocked: "bg-amber-50 dark:bg-amber-950/30", not_applicable: "bg-slate-100 dark:bg-slate-800/40" }[c.status]}`}
                >
                  <td className="whitespace-nowrap p-2">{s.item.code}</td>
                  {itemColumns.slice(1, 7).map(([key]) => (
                    <td key={key} className="min-w-44 whitespace-pre-wrap p-2">
                      {s.item[key] || "－"}
                    </td>
                  ))}
                  <td className="p-2">
                    <PatternDetails source={s} />
                  </td>
                  <td className="min-w-44 whitespace-pre-wrap p-2">
                    {s.item.expected_result ||
                      (expectations(s).length ? "" : "－")}
                    {expectations(s).map((v) => (
                      <div key={v.id}>● {v.name}</div>
                    ))}
                  </td>
                  <td className="p-2">
                    <CaseStatusSelect
                      label={`${s.item.code} ${s.pattern?.code ?? ""} 状態`}
                      value={c.status}
                      disabled={!permissions.execute || busy}
                      onChange={(status) =>
                        void run(() =>
                          updateCase(projectId, designId, c.id, {
                            version: c.version,
                            status,
                            actual_result: c.actual_result,
                            notes: c.notes,
                          }),
                        )
                      }
                    />
                  </td>
                  <td className="whitespace-nowrap p-2">
                    {!c.active || c.stale ? (
                      <button
                        type="button"
                        className="rounded border px-2 py-1 text-xs"
                        title={
                          !c.active
                            ? "生成元が削除・無効になっています"
                            : "元のテスト設計が変更されています。再確認してください"
                        }
                        onClick={() => {
                          void openReview(c);
                        }}
                      >
                        {c.stale ? "⚠ 影響あり" : "生成元なし"}
                      </button>
                    ) : (
                      "－"
                    )}
                  </td>
                  <td className="p-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelected(c)}
                    >
                      詳細・結果
                    </Button>
                    <div className="mt-1 flex flex-wrap gap-1 text-xs">
                      {c.actual_result?.trim() && (
                        <span
                          className="rounded bg-muted px-1"
                          title="実行結果が登録されています"
                        >
                          結果あり
                        </span>
                      )}
                      {c.notes?.trim() && (
                        <span
                          className="rounded bg-muted px-1"
                          title="備考が登録されています"
                        >
                          備考あり
                        </span>
                      )}
                      {(issueCountByCase.get(c.id) ?? 0) > 0 && (
                        <span className="rounded bg-muted px-1">
                          Issue {issueCountByCase.get(c.id)}件
                        </span>
                      )}
                      {issueLinks.data !== undefined &&
                        c.status === "failed" &&
                        !issueCountByCase.has(c.id) && (
                          <span className="rounded bg-amber-100 px-1 text-amber-900 dark:bg-amber-950 dark:text-amber-200">
                            Issue未登録
                          </span>
                        )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {!query.isPending && !filtered.length && (
        <p className="text-sm text-muted-foreground">
          該当するケースはありません。テスト項目を保存すると自動で生成されます。パターン表の紐付けは任意です。
        </p>
      )}
      <div className="flex items-center gap-3">
        <Button
          variant="outline"
          size="sm"
          disabled={page === 0}
          onClick={() => setPage(page - 1)}
        >
          前へ
        </Button>
        <span>
          {page + 1} / {Math.max(1, Math.ceil(filtered.length / 50))}
        </span>
        <Button
          variant="outline"
          size="sm"
          disabled={(page + 1) * 50 >= filtered.length}
          onClick={() => setPage(page + 1)}
        >
          次へ
        </Button>
      </div>
      <Dialog
        open={!!selected}
        onOpenChange={(open) => {
          if (open || busy) return;
          const close = () => {
            setSelected(null);
            setCaseDirty(false);
          };
          if (caseDirty)
            confirm({
              title: "未保存の実行情報があります",
              description: "変更を破棄して詳細を閉じますか？",
              confirmLabel: "破棄して閉じる",
              destructive: true,
              onConfirm: close,
            });
          else close();
        }}
      >
        <DialogContent className="max-h-[85vh] overflow-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>テストケースの詳細・実行結果</DialogTitle>
            <DialogDescription>
              設計内容は保存時に反映されます。実行結果と備考は保持されます。
            </DialogDescription>
          </DialogHeader>
          {selected && (
            <>
              {permissions.edit && onEditDesign && (
                <div className="flex gap-2">
                  {[false, true]
                    .filter(
                      (pattern) => !pattern || sourceOf(selected).pattern_table,
                    )
                    .map((pattern) => (
                      <Button
                        key={String(pattern)}
                        variant="outline"
                        disabled={busy}
                        onClick={() => {
                          const source = sourceOf(selected);
                          const tableId = pattern
                            ? source.pattern_table?.id
                            : undefined;
                          const navigate = () => {
                            setSelected(null);
                            setCaseDirty(false);
                            onEditDesign(source.item.id, tableId);
                          };
                          if (caseDirty)
                            confirm({
                              title: "未保存の実行情報があります",
                              description: "変更を破棄して設計を編集しますか？",
                              confirmLabel: "破棄して移動",
                              destructive: true,
                              onConfirm: navigate,
                            });
                          else navigate();
                        }}
                      >
                        {pattern ? "パターン表を編集" : "元のテスト項目を編集"}
                      </Button>
                    ))}
                </div>
              )}
              <CaseForm
                key={`${selected.id}:${selected.version}`}
                value={selected}
                editable={permissions.execute}
                busy={busy}
                onDirty={() => setCaseDirty(true)}
                onSave={(data) =>
                  run(async () => {
                    const next = await updateCase(
                      projectId,
                      designId,
                      selected.id,
                      data,
                    );
                    setSelected(next);
                    setCaseDirty(false);
                  })
                }
                onRefresh={
                  selected.stale || !selected.active
                    ? () => void openReview(selected)
                    : undefined
                }
              />
              <CaseExecutionHistory
                projectId={projectId}
                designId={designId}
                caseId={selected.id}
                version={selected.version}
                editable={permissions.execute}
                initialExecutionId={initialExecutionId}
              />
              <CaseIssues
                key={selected.id}
                projectId={projectId}
                designId={designId}
                testCase={selected}
                source={sourceOf(selected)}
                editable={permissions.execute}
              />
            </>
          )}
        </DialogContent>
      </Dialog>
      <Dialog
        open={!!reviewCase}
        onOpenChange={(open) => {
          if (!open && !busy) setReviewCase(null);
        }}
      >
        <DialogContent className="max-h-[85vh] overflow-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>設計変更の確認</DialogTitle>
            <DialogDescription>
              テスト項目 {reviewCase ? sourceOf(reviewCase).item.code : ""}
              {reviewCase?.active
                ? "について、ケースで前回確認した設計と最新の設計を比較してください。"
                : "の生成元は現在の設計から削除または無効化されています。"}
            </DialogDescription>
          </DialogHeader>
          {reviewCase && (
            <>
              {!reviewCase.active ? (
                <div className="flex flex-col gap-3">
                  <p role="status" className="rounded-md border p-3 text-sm">
                    最新の設計には、このケースに対応するテスト項目・組み合わせがありません。ケースに保持された直近の内容は以下のとおりです。
                  </p>
                  <dl className="grid gap-2 text-sm sm:grid-cols-[10rem_1fr]">
                    {getCaseDesignSummary(sourceOf(reviewCase)).map((field) => (
                      <div key={field.key} className="contents">
                        <dt className="font-medium">{field.label}</dt>
                        <dd className="whitespace-pre-wrap">{field.value}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
              ) : reviewCase.acknowledged_source ? (
                reviewDiffRows.length ? (
                  <ChangeLogDiffRows
                    rows={reviewDiffRows}
                    oldLabel="ケースで前回確認した内容"
                    newLabel="最新の設計内容"
                  />
                ) : (
                  <p className="rounded-md bg-muted p-3 text-sm">
                    表示名の差分はありません。参照先または設計の構造が変更されています。
                  </p>
                )
              ) : (
                <div className="flex flex-col gap-3">
                  <p role="status" className="rounded-md border p-3 text-sm">
                    このケースは変更前の設計内容が保存される前に影響を受けています。旧値は復元できないため、差分を表示できません。現在の内容を確認してください。
                  </p>
                  <dl className="grid gap-2 text-sm sm:grid-cols-[10rem_1fr]">
                    {getCaseDesignSummary(sourceOf(reviewCase)).map((field) => (
                      <div key={field.key} className="contents">
                        <dt className="font-medium">{field.label}</dt>
                        <dd className="whitespace-pre-wrap">{field.value}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
              )}
              {reviewCase.active && (
                <p className="text-xs text-muted-foreground">
                  確認済みにしても、実行状態・実際の結果・備考は変更されません。
                </p>
              )}
              {caseDirty && (
                <p
                  role="status"
                  className="text-sm text-amber-700 dark:text-amber-300"
                >
                  実行情報に未保存の入力があります。確認済みにすると、その入力は破棄されます。
                </p>
              )}
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  disabled={busy}
                  onClick={() => setReviewCase(null)}
                >
                  閉じる
                </Button>
                {reviewCase.active &&
                  reviewCase.stale &&
                  permissions.execute && (
                    <Button
                      disabled={busy}
                      onClick={() => {
                        if (caseDirty) {
                          confirm({
                            title: "未保存の実行情報があります",
                            description:
                              "確認済みにすると未保存の入力は失われます。先に結果を保存することもできます。",
                            confirmLabel: "破棄して確認済みにする",
                            destructive: true,
                            onConfirm: () => acknowledge(reviewCase),
                          });
                        } else void acknowledge(reviewCase);
                      }}
                    >
                      {busy
                        ? "確認中…"
                        : reviewCase.acknowledged_source
                          ? "確認済みにする"
                          : "現行内容を確認済みにする"}
                    </Button>
                  )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
      <Dialog
        open={!!conflict}
        onOpenChange={(open) => {
          if (!open) setConflict(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>テストケースが更新されています</DialogTitle>
            <DialogDescription>
              自分の入力は保持されています。最新の結果を読み込む場合は、先に必要な入力をコピーしてください。
            </DialogDescription>
          </DialogHeader>
          <p className="whitespace-pre-wrap text-sm">
            最新の結果：{conflict?.actual_result || "記録なし"}
          </p>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => setConflict(null)}>
              入力に戻る
            </Button>
            <Button
              onClick={() =>
                confirm({
                  title: "未保存の結果を破棄しますか？",
                  description:
                    "最新のケースを読み込みます。自分の入力内容は失われます。",
                  confirmLabel: "破棄して読み込む",
                  destructive: true,
                  onConfirm: () => {
                    setSelected(conflict);
                    setConflict(null);
                    setCaseDirty(false);
                  },
                })
              }
            >
              最新のケースを読み込む
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      <ConfirmDialog {...confirmDialogProps} />
    </section>
  );
}

function CaseForm({
  value,
  editable,
  busy,
  onSave,
  onRefresh,
  onDirty,
}: {
  value: TestCaseRead;
  editable: boolean;
  busy: boolean;
  onSave: (data: TestCaseUpdate) => void;
  onRefresh?: () => void;
  onDirty: () => void;
}) {
  const [status, setStatus] = useState(value.status);
  const [actual, setActual] = useState(value.actual_result ?? "");
  const [notes, setNotes] = useState(value.notes ?? "");
  const s = sourceOf(value);
  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted-foreground">
        項目番号: {s.item.code} {s.pattern?.code}
      </p>
      {(!value.active || value.stale) && (
        <p role="status" className="text-sm">
          ⚠{" "}
          {!value.active
            ? "生成元が削除・無効になっています。実行結果は保持されています。"
            : "テスト設計が変更されています。最新の内容を確認し、必要なら再実行してください。"}
        </p>
      )}
      <dl className="grid grid-cols-[10rem_1fr] gap-2 text-sm">
        {itemColumns.map(([key, label]) => (
          <div key={key} className="contents">
            <dt className="font-medium">{label}</dt>
            <dd className="whitespace-pre-wrap">{s.item[key] || "-"}</dd>
          </div>
        ))}
        {Object.entries(s.item.custom_values ?? {}).map(([key, val]) => (
          <div key={key} className="contents">
            <dt>{s.columns?.[key] ?? key}</dt>
            <dd>{val}</dd>
          </div>
        ))}
      </dl>
      <PatternDetails source={s} />
      <h3 className="text-sm font-semibold">実行情報</h3>
      <dl className="grid grid-cols-[10rem_1fr] gap-2 text-sm">
        <dt className="font-medium">実行者</dt>
        <dd>{value.executed_by_name ?? "－"}</dd>
        <dt className="font-medium">実行日時</dt>
        <dd>
          {value.executed_at
            ? new Intl.DateTimeFormat("ja-JP", {
                dateStyle: "medium",
                timeStyle: "short",
              }).format(new Date(value.executed_at))
            : "－"}
        </dd>
      </dl>
      {expectations(s).map((expected) => (
        <p key={expected.id} className="whitespace-pre-wrap text-sm">
          ● 期待値：{expected.name}
        </p>
      ))}
      {onRefresh && (
        <Button variant="outline" disabled={busy} onClick={onRefresh}>
          設計変更の差分を確認
        </Button>
      )}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSave({
            version: value.version,
            status,
            actual_result: actual,
            notes,
          });
        }}
      >
        <FieldGroup>
          <Field>
            <FieldLabel>実行状態</FieldLabel>
            <CaseStatusSelect
              label="実行状態"
              disabled={!editable || busy}
              value={status}
              onChange={(next) => {
                setStatus(next);
                onDirty();
              }}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="case-actual">実際の結果</FieldLabel>
            <textarea
              id="case-actual"
              className="min-h-24 rounded-md border p-2"
              disabled={!editable || busy}
              maxLength={20000}
              value={actual}
              onChange={(e) => {
                setActual(e.target.value);
                onDirty();
              }}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="case-notes">ケースの備考</FieldLabel>
            <textarea
              id="case-notes"
              className="min-h-20 rounded-md border p-2"
              disabled={!editable || busy}
              maxLength={20000}
              value={notes}
              onChange={(e) => {
                setNotes(e.target.value);
                onDirty();
              }}
            />
          </Field>
          <Button type="submit" disabled={!editable || busy}>
            結果を保存
          </Button>
        </FieldGroup>
      </form>
    </div>
  );
}
