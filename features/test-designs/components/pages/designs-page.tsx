"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { usePathname, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/shared/dialogs/confirm-dialog";
import { DataLoadError } from "@/components/shared/feedback/data-load-error";
import { PageHeader } from "@/components/shared/layout/page-header";
import { Input } from "@/components/ui/input";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useUrlTabState } from "@/hooks/use-url-tab-state";
import type { TestCaseRead } from "@/lib/api/generated/model";
import {
  listTestDesignsProjectsProjectIdTestDesignsGet as listDesigns,
  createTestDesignProjectsProjectIdTestDesignsPost as createDesign,
  deleteTestDesignProjectsProjectIdTestDesignsDesignIdDelete as deleteDesign,
} from "@/lib/api/generated/test-designs/test-designs";
import { useDesignPermissions } from "../../hooks/use-design-permissions";
import { useConfirmAction } from "../../hooks/use-confirm-action";
import { CasesSection } from "../sections/cases-section";
import { TestProgressSection } from "../sections/test-progress-section";

const CASE_TABS = ["execute", "progress"] as const;
type DrillDown = {
  status?: TestCaseRead["status"];
  targetFeature?: string;
  onlyUnlinkedNg?: boolean;
  issueTaskId?: number;
  caseId?: string;
};

export function DesignsPage({
  projectId,
  cases = false,
}: {
  projectId: number;
  cases?: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [caseTab, setCaseTab] = useUrlTabState({
    values: CASE_TABS,
    defaultValue: "execute",
  });
  const { confirm, confirmDialogProps } = useConfirmAction();
  const permissions = useDesignPermissions(projectId);
  const query = useQuery({
    queryKey: ["test-designs", projectId],
    queryFn: () => listDesigns(projectId),
    retry: false,
  });
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(() => {
    const value = Number(searchParams.get("design"));
    return Number.isInteger(value) && value > 0 ? value : null;
  });
  const [drillDown, setDrillDown] = useState<DrillDown>({});
  const [drillDownRequest, setDrillDownRequest] = useState(0);
  const selected = query.data?.find((d) => d.id === selectedId);
  function selectDesign(id: number | null) {
    setSelectedId(id);
    setDrillDown({});
    const params = new URLSearchParams(searchParams.toString());
    if (id) params.set("design", String(id));
    else {
      params.delete("design");
      params.delete("case");
      params.delete("tab");
    }
    router.replace(`${pathname}${params.size ? `?${params}` : ""}`, {
      scroll: false,
    });
  }
  async function create() {
    if (!name.trim() || busy) return;
    setBusy(true);
    try {
      const result = await createDesign(projectId, { name: name.trim() });
      await query.refetch();
      router.push(`/projects/joined/${projectId}/test-designs/${result.id}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "作成できませんでした");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title={cases ? "テストケース" : "テスト設計書"}
        description={
          cases
            ? "設計書を選択してケースと実行結果を確認します。"
            : "因子・水準からパターンを設計し、項目に紐付けてテストケースを作成します。"
        }
      />
      {!cases && permissions.edit && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void create();
          }}
        >
          <FieldGroup className="flex-row flex-wrap items-end">
            <Field className="max-w-md">
              <FieldLabel htmlFor="new-design-name">
                新しいテスト設計書
              </FieldLabel>
              <Input
                id="new-design-name"
                placeholder="設計書名"
                required
                maxLength={200}
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={busy}
              />
            </Field>
            <Button type="submit" disabled={busy || !name.trim()}>
              作成
            </Button>
          </FieldGroup>
        </form>
      )}
      {query.isPending && <p>読み込み中…</p>}
      {query.error && (
        <DataLoadError
          resourceName="テスト設計書"
          isRetrying={query.isFetching}
          onRetry={() => void query.refetch()}
        />
      )}
      {!query.isPending && !query.error && !query.data?.length && (
        <p>テスト設計書はまだありません。</p>
      )}
      {query.isPending || query.error ? null : cases ? (
        selected ? (
          <>
            <Button
              variant="outline"
              className="w-fit"
              onClick={() => selectDesign(null)}
            >
              ← 設計書を選び直す
            </Button>
            <h2 className="text-xl font-semibold">{selected.name}</h2>
            <Tabs
              value={caseTab}
              onValueChange={(value) => {
                if (value === "execute") {
                  setDrillDown({});
                  setDrillDownRequest((current) => current + 1);
                }
                setCaseTab(value);
              }}
            >
              <TabsList>
                <TabsTrigger value="execute">テスト実行</TabsTrigger>
                <TabsTrigger value="progress">集計・進捗</TabsTrigger>
              </TabsList>
            </Tabs>
            <Link
              className="text-sm underline"
              href={`/projects/joined/${projectId}/test-designs/${selected.id}?tab=cases`}
            >
              設計書を開く
            </Link>
            {caseTab === "progress" ? (
              <TestProgressSection
                projectId={projectId}
                designId={selected.id}
                onDrillDown={(target) => {
                  setDrillDown(target);
                  setDrillDownRequest((current) => current + 1);
                  setCaseTab("execute");
                }}
              />
            ) : (
              <CasesSection
                key={`${selected.id}:${drillDownRequest}`}
                projectId={projectId}
                designId={selected.id}
                version={selected.version}
                initialStatusFilter={drillDown.status}
                initialTargetFeature={drillDown.targetFeature}
                onlyUnlinkedNg={drillDown.onlyUnlinkedNg}
                issueTaskId={drillDown.issueTaskId}
                initialCaseId={
                  drillDown.caseId ?? searchParams.get("case") ?? undefined
                }
                initialExecutionId={searchParams.get("execution") ?? undefined}
              />
            )}
          </>
        ) : (
          <ul
            className="grid gap-3 md:grid-cols-2 xl:grid-cols-3"
            aria-label="テストケースの設計書を選択"
          >
            {query.data?.map((d) => (
              <li key={d.id}>
                <button
                  type="button"
                  className="w-full rounded-lg border p-5 text-left transition-colors hover:border-primary hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  onClick={() => selectDesign(d.id)}
                >
                  <span className="block font-semibold">{d.name}</span>
                  <span className="mt-2 block text-sm text-muted-foreground">
                    {d.description || "説明なし"}
                  </span>
                  <span className="mt-2 block text-sm">
                    テスト項目 {d.item_count}件 · テストケース{" "}
                    {d.expanded_case_count}件
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )
      ) : (
        <ul className="divide-y rounded-md border">
          {query.data?.map((d) => (
            <li
              key={d.id}
              className="relative flex items-center justify-between gap-3 p-4 transition-colors hover:bg-accent focus-within:bg-accent"
            >
              <Link
                className="absolute inset-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary"
                href={`/projects/joined/${projectId}/test-designs/${d.id}`}
                aria-label={`${d.name}を開く`}
              />
              <div className="pointer-events-none relative">
                <span className="font-medium">{d.name}</span>
                <p className="text-sm text-muted-foreground">
                  {d.description || "説明なし"} · v{d.version}
                </p>
                <p className="text-sm">
                  テスト項目：{d.item_count}件 ／ パターン展開後：
                  {d.expanded_case_count}テストケース
                </p>
              </div>
              {permissions.delete && (
                <Button
                  variant="outline"
                  size="sm"
                  className="relative z-10"
                  disabled={busy}
                  onClick={() =>
                    confirm({
                      title: `「${d.name}」を削除しますか？`,
                      description:
                        "設計書と全ケースが利用できなくなります。保持期限内はごみ箱から復元できます。",
                      confirmLabel: "削除",
                      destructive: true,
                      onConfirm: async () => {
                        setBusy(true);
                        try {
                          await deleteDesign(projectId, d.id, {
                            version: d.version,
                          });
                          await query.refetch();
                        } finally {
                          setBusy(false);
                        }
                      },
                    })
                  }
                >
                  削除
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}
      <ConfirmDialog {...confirmDialogProps} />
    </div>
  );
}
