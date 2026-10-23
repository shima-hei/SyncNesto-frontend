"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import {
  Empty,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
} from "@/components/ui/empty";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { MarkdownPreview } from "@/components/shared/forms/markdown-textarea";
import { FormApiError } from "@/components/shared/forms/form-api-error";
import { DraftRestoreDialog } from "@/components/shared/dialogs/draft-restore-dialog";
import { useFormDraft } from "@/hooks/use-form-draft";
import {
  readStoredDraft,
  removeStoredDraft,
  writeStoredDraft,
} from "@/lib/draft/draft-storage";
import { createDraftStorageKey } from "@/lib/draft/draft-key";
import { getDraftSession } from "@/lib/demo/session";
import { ApiError } from "@/lib/api/error";
import type {
  VerificationDetail,
  VerificationRow,
} from "@/lib/api/generated/model";
import { getPlan, updatePlan } from "../lib/api";
import { VerificationRowEditor } from "./verification-row-editor";
import { VerificationEvidence } from "./verification-evidence";
import { EvidenceSubmissions } from "./evidence-submissions";
import { VerificationHistory } from "./verification-history";
import { readDraftVersion, verificationDraftScope } from "../lib/draft-version";

function text(value: unknown) {
  return typeof value === "string" ? value : "";
}
function record(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function ChecklistSummary({ rows }: { rows: VerificationRow[] }) {
  return (
    <div className="flex flex-col gap-3">
      {rows.map((r) => (
        <section key={r.id} className="flex flex-col gap-1">
          <p className="break-words text-sm font-medium">
            {r.description || "確認内容は未入力"}
          </p>
          <p className="text-sm">
            {r.method === "test"
              ? "テスト"
              : r.method === "manual"
                ? "手動確認"
                : r.method === "not_applicable"
                  ? "対象外候補"
                  : "方法は未設定"}
          </p>
          {r.reference?.text ? (
            <blockquote className="border-l-2 pl-2 text-sm">
              {r.reference.text}
            </blockquote>
          ) : null}
          {[r.manual_plan, r.not_applicable_reason, r.notes]
            .filter(Boolean)
            .map((value, index) => (
              <p
                key={index}
                className="whitespace-pre-wrap break-words text-sm"
              >
                {value}
              </p>
            ))}
          {r.targets?.length ? (
            <p className="text-sm">
              テスト項目 {r.targets.length}件 ·{" "}
              {r.targets.some((t) => t.pattern_scope === "selected")
                ? "個別に選択したパターン"
                : "全有効パターン"}
            </p>
          ) : null}
        </section>
      ))}
    </div>
  );
}

export function VerificationEditor({
  row,
  projectId,
  from,
  queryKey,
  userId,
  tenantId,
}: {
  row: VerificationDetail;
  projectId: number;
  from: string;
  queryKey: (string | number | undefined)[];
  userId?: number;
  tenantId?: number;
}) {
  const cache = useQueryClient();
  const params = useSearchParams();
  const [rows, setRows] = useState<VerificationRow[]>(
    () => row.revision.checklist.rows ?? [],
  );
  const [version, setVersion] = useState(row.current_version);
  const [selected, setSelected] = useState<string | null>(() =>
    row.revision.checklist.rows?.some((r) => r.id === params.get("row"))
      ? params.get("row")
      : null,
  );
  const [conflict, setConflict] = useState<VerificationDetail | null>(null);
  const [confirm, setConfirm] = useState(false);
  const [leave, setLeave] = useState<string | null>(null);
  const saved = useRef(false);
  const operation = useRef<{ input: string; id: string } | null>(null);
  const initial = row.revision.checklist.rows ?? [];
  const scope = verificationDraftScope(tenantId, row.id, version);
  const pointer = createDraftStorageKey(
    userId ?? 0,
    `tenant:${tenantId}:verification:${row.id}:last-draft-version`,
  );
  const [olderDraft, setOlderDraft] = useState(() => {
    if (!userId || typeof window === "undefined") return null;
    try {
      const oldVersion = readDraftVersion(
        localStorage.getItem(pointer),
        row.current_version,
      );
      if (!oldVersion) return null;
      const oldScope = verificationDraftScope(tenantId, row.id, oldVersion);
      const value = readStoredDraft<VerificationRow[]>(userId, oldScope);
      return value && Array.isArray(value.values) && value.values.length <= 100
        ? { ...value, version: oldVersion, scope: oldScope }
        : null;
    } catch {
      return null;
    }
  });
  const draft = useFormDraft({
    userId,
    scope,
    values: rows,
    initialValues: initial,
    onRestore: setRows,
  });
  const dirty =
    JSON.stringify(rows) !== JSON.stringify(initial) ||
    version !== row.current_version;
  const payload = record(row.fixed_subject.payload);
  const fixedDescription = text(payload.description);
  const fixedAcceptance = text(payload.acceptance_criteria);
  const persist = () => {
    if (userId && dirty && !saved.current) {
      try {
        writeStoredDraft(userId, scope, rows, 1, getDraftSession(userId));
        localStorage.setItem(pointer, String(version));
      } catch {
        toast.error(
          "この端末に下書きを残せません。共有の確認表へ保存してから移動してください。",
        );
        return false;
      }
    }
    return true;
  };
  useEffect(() => {
    if (!dirty) return;
    const pointerTimer = window.setTimeout(() => {
      try {
        localStorage.setItem(pointer, String(version));
      } catch {
        /* 保存できる場合だけ復元先を記録する。 */
      }
    }, 800);
    const backup = () => {
      if (userId && !saved.current) {
        try {
          writeStoredDraft(userId, scope, rows, 1, getDraftSession(userId));
          localStorage.setItem(pointer, String(version));
        } catch {
          /* beforeunloadの確認を維持する。 */
        }
      }
    };
    const unload = (event: BeforeUnloadEvent) => {
      backup();
      event.preventDefault();
    };
    const click = (event: MouseEvent) => {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.ctrlKey ||
        event.metaKey ||
        event.shiftKey ||
        event.altKey
      )
        return;
      const link =
        event.target instanceof Element
          ? event.target.closest("a[href]")
          : null;
      if (
        !(link instanceof HTMLAnchorElement) ||
        link.target === "_blank" ||
        link.hasAttribute("download") ||
        link.href === window.location.href
      )
        return;
      const destination = new URL(link.href);
      if (
        destination.origin === window.location.origin &&
        destination.pathname === window.location.pathname &&
        destination.search === window.location.search &&
        destination.hash
      )
        return;
      event.preventDefault();
      event.stopPropagation();
      backup();
      setLeave(link.href);
    };
    window.addEventListener("beforeunload", unload);
    window.addEventListener("popstate", backup, true);
    document.addEventListener("click", click, true);
    return () => {
      window.clearTimeout(pointerTimer);
      window.removeEventListener("beforeunload", unload);
      window.removeEventListener("popstate", backup, true);
      document.removeEventListener("click", click, true);
    };
  }, [dirty, rows, scope, userId, pointer, version]);
  const save = useMutation({
    mutationFn: (coverage: boolean) => {
      const input = {
        version,
        checklist: { rows },
        confirm_coverage: coverage,
      };
      const serialized = JSON.stringify(input);
      if (operation.current?.input !== serialized)
        operation.current = { input: serialized, id: crypto.randomUUID() };
      return updatePlan(projectId, row.id, {
        ...input,
        operation_id: operation.current.id,
      });
    },
    onSuccess: async () => {
      setConfirm(false);
      const latest = await getPlan(projectId, row.id);
      saved.current = true;
      draft.clearDraft();
      localStorage.removeItem(pointer);
      cache.setQueryData(queryKey, latest);
      await cache.invalidateQueries({
        queryKey: ["verification-plans", tenantId, userId, projectId],
      });
      toast.success("確認表を保存しました。要件の合否は変更していません。");
    },
    onError: async (error) => {
      setConfirm(false);
      if (error instanceof ApiError && error.code === "VERSION_CONFLICT") {
        persist();
        try {
          setConflict(await getPlan(projectId, row.id));
        } catch {
          toast.error("最新版の取得に失敗しました。入力を保持しています。");
        }
      }
    },
  });
  const coverage = !dirty && row.revision.checklist.coverage;
  const selectRow = (id: string | null) => {
    const url = new URL(window.location.href);
    if (id) url.searchParams.set("row", id);
    else url.searchParams.delete("row");
    window.history.replaceState(
      window.history.state,
      "",
      `${url.pathname}${url.search}${url.hash}`,
    );
    setSelected(id);
  };
  return (
    <div className="flex min-w-0 flex-col gap-6">
      <Button asChild variant="outline" size="sm" className="self-start">
        <Link href={from}>元の要件・一覧へ戻る</Link>
      </Button>
      <header className="flex flex-col gap-2">
        <p className="text-sm text-muted-foreground">
          要件の確認表 · {row.current_version}版
        </p>
        <h1 className="text-2xl font-semibold break-words">{row.title}</h1>
        <p className="text-sm text-muted-foreground">
          何を確かめるか、どの方法を使うかを整理します。要件の合意や最終合否とは別の準備記録です。
        </p>
      </header>
      {row.comparison !== "same" ? (
        <Alert>
          <AlertTitle>
            {row.comparison === "changed"
              ? "現在の要件と固定内容が異なります"
              : "現在の要件と比較できません"}
          </AlertTitle>
          <AlertDescription>
            この確認表は作成時に固定した要件を対象とします。最新版へ自動で移し替えません。
          </AlertDescription>
        </Alert>
      ) : null}
      <div className="grid min-w-0 gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.7fr)]">
        <Card className="h-fit">
          <CardHeader>
            <CardTitle>1. 確かめる要件</CardTitle>
            <CardDescription>
              固定した要件版 {String(row.fixed_subject.source_version ?? "")}
              。ここでは本文を編集しません。
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <section>
              <h2 className="mb-2 text-sm font-medium">期待する振る舞い</h2>
              <MarkdownPreview
                value={fixedDescription}
                emptyMessage="本文は未登録です"
                className="min-h-0 break-words"
              />
            </section>
            <section>
              <h2 className="mb-2 text-sm font-medium">受け入れ条件</h2>
              <MarkdownPreview
                value={fixedAcceptance}
                emptyMessage="受け入れ条件は未登録です"
                className="min-h-0 break-words"
              />
            </section>
            <details>
              <summary className="cursor-pointer text-sm">
                要件の補足・種別別の詳細
              </summary>
              <div className="mt-3 flex flex-col gap-3">
                {[
                  ["rationale", "背景・理由"],
                  ["source", "出典"],
                  ["category", "分類"],
                ].map(([key, label]) =>
                  text(payload[key]) ? (
                    <section key={key}>
                      <h3 className="text-sm font-medium">{label}</h3>
                      <MarkdownPreview
                        value={text(payload[key])}
                        className="min-h-0 break-words"
                      />
                    </section>
                  ) : null,
                )}
                {Array.isArray(row.fixed_subject.details)
                  ? row.fixed_subject.details.map((value, index) => (
                      <section key={index}>
                        <h3 className="text-sm font-medium">
                          詳細 {index + 1}
                        </h3>
                        <pre className="overflow-auto whitespace-pre-wrap break-words text-xs">
                          {JSON.stringify(
                            record(record(value).payload).detail_json,
                            null,
                            2,
                          )}
                        </pre>
                      </section>
                    ))
                  : null}
              </div>
            </details>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>2. 確認項目を整理する</CardTitle>
            <CardDescription>
              必要な項目から追加できます。未完の項目も下書きとして保存できます。
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={dirty ? "outline" : "secondary"}>
                {dirty ? "未保存の入力があります" : "保存済み"}
              </Badge>
              <Badge variant="outline">
                {coverage ? "条件の対応を確認済み" : "条件の対応は未確認"}
              </Badge>
              {!row.can_prepare ? (
                <Badge variant="secondary">閲覧のみ</Badge>
              ) : null}
            </div>
            {!rows.length ? (
              <Empty>
                <EmptyHeader>
                  <EmptyTitle>最初の確認項目を追加</EmptyTitle>
                  <EmptyDescription>
                    固定した要件の何を確かめるか、短い文章から始められます。
                  </EmptyDescription>
                </EmptyHeader>
              </Empty>
            ) : null}
            {rows.map((condition, index) => (
              <VerificationRowEditor
                key={condition.id}
                row={condition}
                index={index}
                disabled={!row.can_prepare || save.isPending}
                description={fixedDescription}
                acceptance={fixedAcceptance}
                projectId={projectId}
                planId={row.id}
                version={row.current_version}
                onChange={(value) =>
                  setRows((current) =>
                    current.map((r) => (r.id === value.id ? value : r)),
                  )
                }
                onRemove={() => {
                  setRows((current) =>
                    current.filter((r) => r.id !== condition.id),
                  );
                  if (selected === condition.id) selectRow(null);
                }}
                onCandidates={() => selectRow(condition.id)}
                dirty={dirty}
              />
            ))}
            {row.can_prepare ? (
              <>
                <Button
                  variant="outline"
                  disabled={rows.length >= 100 || save.isPending}
                  onClick={() => {
                    const id = crypto.randomUUID();
                    setRows((current) => [
                      ...current,
                      {
                        id,
                        description: "",
                        reference: { field: "whole" },
                        method: null,
                        targets: [],
                      },
                    ]);
                    requestAnimationFrame(() =>
                      document.getElementById(`${id}-content`)?.focus(),
                    );
                  }}
                >
                  確認項目を追加
                </Button>
                <div className="flex flex-wrap gap-2">
                  <Button
                    disabled={save.isPending || !dirty}
                    onClick={() => save.mutate(false)}
                  >
                    {save.isPending ? "保存中…" : "下書きを保存"}
                  </Button>
                  <Button
                    variant="outline"
                    disabled={save.isPending || !rows.length}
                    onClick={() => setConfirm(true)}
                  >
                    条件の対応を確認して保存
                  </Button>
                </div>
              </>
            ) : null}
            <FormApiError error={save.error} />
          </CardContent>
        </Card>
      </div>
      <VerificationEvidence
        projectId={projectId}
        planId={row.id}
        version={row.current_version}
        rowId={selected}
        dirty={dirty}
        condition={rows.find((r) => r.id === selected)}
        canPrepare={row.can_prepare && !save.isPending}
        onChange={(value) =>
          setRows((current) =>
            current.map((r) => (r.id === value.id ? value : r)),
          )
        }
      />
      <EvidenceSubmissions
        projectId={projectId}
        planId={row.id}
        version={row.current_version}
        rows={row.revision.checklist.rows ?? []}
        selected={selected}
        dirty={dirty}
      />
      <VerificationHistory
        projectId={projectId}
        planId={row.id}
        version={row.current_version}
      />
      <DraftRestoreDialog
        open={Boolean(draft.pendingDraft)}
        updatedAt={draft.pendingDraft?.updatedAt}
        onRestore={draft.restoreDraft}
        onDiscard={draft.discardDraft}
      />
      <Dialog
        open={Boolean(olderDraft) && !draft.pendingDraft}
        onOpenChange={(open) => {
          if (!open) setOlderDraft(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>以前の版からの未保存入力があります</DialogTitle>
            <DialogDescription>
              この端末に確認表 {olderDraft?.version}
              版の入力が残っています。現在は {row.current_version}
              版です。最新の内容と比較してから入力を復元できます。条件対応の確認は引き継ぎません。
            </DialogDescription>
          </DialogHeader>
          <div className="grid max-h-64 gap-4 overflow-auto sm:grid-cols-2">
            <section>
              <h3 className="text-sm font-medium">未保存の入力</h3>
              {olderDraft?.values.map((r) => (
                <p key={r.id} className="text-sm">
                  {r.description || "未入力"}
                </p>
              ))}
            </section>
            <section>
              <h3 className="text-sm font-medium">最新の保存内容</h3>
              {initial.map((r) => (
                <p key={r.id} className="text-sm">
                  {r.description || "未入力"}
                </p>
              ))}
            </section>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                if (olderDraft) removeStoredDraft(userId, olderDraft.scope);
                localStorage.removeItem(pointer);
                setOlderDraft(null);
              }}
            >
              以前の入力を破棄
            </Button>
            <Button
              onClick={() => {
                if (olderDraft) setRows(olderDraft.values);
                setOlderDraft(null);
              }}
            >
              比較した入力を復元する
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={confirm} onOpenChange={setConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>条件と確認方法の対応を確認しましたか？</DialogTitle>
            <DialogDescription>
              要件の本文を読み、確認項目の抜けや対象テストを確認してください。この操作は要件の合格判定やテスト実行にはなりません。編集後は再確認が必要です。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirm(false)}>
              戻って確認
            </Button>
            <Button disabled={save.isPending} onClick={() => save.mutate(true)}>
              対応を確認して保存
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog
        open={Boolean(conflict)}
        onOpenChange={(open) => {
          if (!open) setConflict(null);
        }}
      >
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>別の保存が先に完了しています</DialogTitle>
            <DialogDescription>
              入力は保持しています。双方を比較し、続ける内容を選んでください。自動で上書きしません。
            </DialogDescription>
          </DialogHeader>
          <div className="grid max-h-[50vh] gap-4 overflow-auto md:grid-cols-2">
            <div>
              <h3>あなたの入力</h3>
              <ChecklistSummary rows={rows} />
            </div>
            <div>
              <h3>最新の保存（{conflict?.current_version}版）</h3>
              <ChecklistSummary
                rows={conflict?.revision.checklist.rows ?? []}
              />
            </div>
          </div>
          {JSON.stringify(
            rows.filter((r) => r.targets?.length).map((r) => [r.id, r.targets]),
          ) !==
          JSON.stringify(
            (conflict?.revision.checklist.rows ?? [])
              .filter((r) => r.targets?.length)
              .map((r) => [r.id, r.targets]),
          ) ? (
            <Alert>
              <AlertDescription>
                関連するテスト項目・パターンの参照も異なっています。確認表の各項目と実行候補を確認してから続けてください。
              </AlertDescription>
            </Alert>
          ) : null}
          <DialogFooter>
            <Button variant="outline" onClick={() => setConflict(null)}>
              入力を残して閉じる
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                if (conflict) {
                  draft.clearDraft();
                  localStorage.removeItem(pointer);
                  saved.current = true;
                  cache.setQueryData(queryKey, conflict);
                }
                setConflict(null);
              }}
            >
              最新の内容を使う
            </Button>
            <Button
              onClick={() => {
                if (conflict) setVersion(conflict.current_version);
                setConflict(null);
              }}
            >
              この入力で続ける
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog
        open={Boolean(leave)}
        onOpenChange={(open) => {
          if (!open) setLeave(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>未保存の入力があります</DialogTitle>
            <DialogDescription>
              この端末のあなたの下書きに残して移動できます。共有される確認表には保存されません。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLeave(null)}>
              編集に戻る
            </Button>
            <Button
              onClick={() => {
                if (!persist()) return;
                if (leave) {
                  saved.current = true;
                  window.location.assign(leave);
                }
              }}
            >
              下書きを残して移動
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
