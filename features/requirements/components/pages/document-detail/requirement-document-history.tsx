"use client";

import { useState } from "react";
import { RequirementBaselineComparison } from "./requirement-baseline-comparison";
import { ApprovedRequirementVersionExport } from "./approved-requirement-version-export";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  EditIcon,
  FileCheckIcon,
  GitCompareIcon,
  MessageSquareIcon,
} from "lucide-react";
import { DataLoadError } from "@/components/shared/feedback/data-load-error";
import { DataPagination } from "@/components/shared/navigation/data-pagination";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArtifactReleaseLink } from "@/features/artifact-releases/components/artifact-release-link";
import { reviewRequestStatus } from "@/features/requirements/lib/requirement-workflow-review";
import type {
  RequirementDocumentRead,
  RequirementWorkflowRead,
} from "@/lib/api/generated/model";
import {
  listRequirementWorkflowProjectsProjectIdRequirementWorkflowGet as listWorkflow,
  readRequirementFormalApprovalBaselineProjectsProjectIdRequirementDocumentsDocumentIdFormalApprovalBaselineGet as readBaseline,
} from "@/lib/api/generated/requirement-workflow/requirement-workflow";
import { formatDateTime } from "@/lib/format/date";
import { RequirementChangeLogsSection } from "../../sections/requirement-change-logs-section";

const RequirementVersionComparison = dynamic(() =>
  import("../requirement-formal-approval-workspace").then(
    (module) => module.RequirementVersionComparison,
  ),
);

export function RequirementDocumentHistory({
  projectId,
  document,
  internal,
}: {
  projectId: number;
  document: RequirementDocumentRead;
  internal: boolean;
}) {
  return (
    <Tabs
      defaultValue={internal ? "versions" : "changes"}
      className="min-w-0 gap-4"
    >
      {internal ? (
        <TabsList
          variant="line"
          aria-label="履歴の種類"
          className="justify-start"
        >
          <TabsTrigger value="versions">バージョン</TabsTrigger>
          <TabsTrigger value="changes">変更履歴</TabsTrigger>
        </TabsList>
      ) : null}
      {internal ? (
        <TabsContent value="versions">
          <RequirementVersions projectId={projectId} document={document} />
        </TabsContent>
      ) : null}
      <TabsContent value="changes">
        <RequirementChangeLogsSection
          projectId={projectId}
          documentId={document.id}
          compact
        />
      </TabsContent>
    </Tabs>
  );
}

function statusLabel(row: RequirementWorkflowRead) {
  if (row.kind === "formal_approval") {
    if (row.status === "requested") return "承認待ち";
    if (row.status === "approved") return "正式承認済み";
  }
  return reviewRequestStatus[row.status];
}

function RequirementVersions({
  projectId,
  document,
}: {
  projectId: number;
  document: RequirementDocumentRead;
}) {
  const [page, setPage] = useState(1);
  const [fromId, setFromId] = useState("");
  const [toId, setToId] = useState("");
  const [compared, setCompared] = useState<{
    before: string;
    after: string;
  } | null>(null);
  const query = useQuery({
    queryKey: ["requirement-workflow", projectId, document.id, "history", page],
    queryFn: ({ signal }) =>
      listWorkflow(
        projectId,
        { document_id: document.id, page, page_size: 15 },
        { signal },
      ),
    retry: false,
  });
  const baseline = useQuery({
    queryKey: ["requirement-formal-approval-baseline", projectId, document.id],
    queryFn: ({ signal }) => readBaseline(projectId, document.id, { signal }),
    retry: false,
  });
  const rows = query.data?.items ?? [];
  const baselineId = baseline.data?.id;
  const versions =
    baseline.data && !rows.some((item) => item.id === baselineId)
      ? [baseline.data, ...rows]
      : rows;
  const older = versions.find((row) => row.id === fromId);
  const newer = versions.find((row) => row.id === toId);
  const compatible =
    older &&
    newer &&
    older.id !== newer.id &&
    older.scope_kind === newer.scope_kind &&
    older.scope_id === newer.scope_id;
  const requestHref = (id: string) =>
    `/projects/joined/${projectId}/requirement-workflow/${id}`;

  function pageChanged(next: number) {
    setPage(next);
    setFromId("");
    setToId("");
    setCompared(null);
  }

  return (
    <div className="grid min-w-0 gap-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="grid min-w-0 gap-2 rounded-lg border p-4">
          <h3 className="flex items-center gap-2 text-sm font-medium">
            <EditIcon className="size-4" aria-hidden="true" />
            現在の編集内容
          </h3>
          <p className="text-sm text-muted-foreground">
            更新 {formatDateTime(document.updated_at)}
          </p>
        </div>
        <div className="grid min-w-0 gap-2 rounded-lg border p-4">
          <h3 className="flex items-center gap-2 text-sm font-medium">
            <FileCheckIcon className="size-4" aria-hidden="true" />
            現在の開発基準
          </h3>
          {baseline.error ? (
            <DataLoadError
              resourceName="開発基準"
              onRetry={() => void baseline.refetch()}
            />
          ) : baseline.isPending ? (
            <p role="status" className="text-sm text-muted-foreground">
              基準版を読み込んでいます…
            </p>
          ) : baseline.data ? (
            <Link
              href={requestHref(baseline.data.id)}
              className="w-fit rounded-sm text-sm underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-ring"
            >
              {baseline.data.version_label} ・ 正式承認済み ・{" "}
              {formatDateTime(baseline.data.finalized_at)}
            </Link>
          ) : (
            <p className="text-sm text-muted-foreground">
              基準版はまだありません。
            </p>
          )}
        </div>
      </div>
      {baselineId ? (
        <RequirementBaselineComparison
          projectId={projectId}
          documentId={document.id}
          baselineId={baselineId}
          documentVersion={document.version}
        />
      ) : null}
      <section className="grid min-w-0 gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-3">
          <h3 className="font-semibold">版の履歴</h3>
          <ArtifactReleaseLink
            projectId={projectId}
            kind="requirement_document"
            sourceId={document.id}
            version={document.version}
            label="保存した版を見る"
          />
        </div>
        {versions.length > 1 ? (
          <details className="rounded-md border px-3 py-2">
            <summary className="cursor-pointer rounded-sm text-sm font-medium focus-visible:outline-2 focus-visible:outline-ring">
              <GitCompareIcon
                className="me-2 inline size-4"
                aria-hidden="true"
              />
              版を比較
            </summary>
            <div className="grid gap-3 pt-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="grid gap-1 text-sm">
                  比較元
                  <VersionSelect
                    value={fromId}
                    rows={versions}
                    onChange={setFromId}
                  />
                </label>
                <label className="grid gap-1 text-sm">
                  比較先
                  <VersionSelect
                    value={toId}
                    rows={versions}
                    onChange={setToId}
                  />
                </label>
              </div>
              {older && newer && !compatible ? (
                <p className="text-sm text-muted-foreground">
                  対象範囲が同じ別の版を選んでください。
                </p>
              ) : null}
              <Button
                type="button"
                size="sm"
                className="justify-self-start"
                disabled={!compatible}
                onClick={() => setCompared({ before: fromId, after: toId })}
              >
                差分を表示
              </Button>
              {compared ? (
                <RequirementVersionComparison
                  projectId={projectId}
                  beforeId={compared.before}
                  afterId={compared.after}
                />
              ) : null}
            </div>
          </details>
        ) : null}
        {query.error ? (
          <DataLoadError
            resourceName="版の履歴"
            onRetry={() => void query.refetch()}
          />
        ) : query.isPending ? (
          <p role="status" className="text-sm text-muted-foreground">
            版の履歴を読み込んでいます…
          </p>
        ) : rows.length ? (
          <ol className="divide-y">
            {rows.map((row) => (
              <li key={row.id} className="grid min-w-0 gap-1 py-3">
                <div className="flex min-w-0 flex-wrap items-center justify-between gap-2">
                  <Link
                    href={requestHref(row.id)}
                    className="flex min-w-0 items-center gap-2 rounded-sm text-sm font-medium hover:underline focus-visible:outline-2 focus-visible:outline-ring"
                  >
                    {row.kind === "review" ? (
                      <MessageSquareIcon
                        className="size-4 shrink-0 text-muted-foreground"
                        aria-hidden="true"
                      />
                    ) : (
                      <FileCheckIcon
                        className="size-4 shrink-0 text-muted-foreground"
                        aria-hidden="true"
                      />
                    )}
                    <span className="[overflow-wrap:anywhere]">
                      {row.version_label} ・ {row.target_title}
                    </span>
                  </Link>
                  <Badge
                    variant="outline"
                    className={
                      row.status === "approved"
                        ? "border-[var(--status-success-border)] text-[var(--status-success-fg)]"
                        : undefined
                    }
                  >
                    {row.id === baselineId
                      ? "現在の開発基準"
                      : statusLabel(row)}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  {formatDateTime(row.finalized_at ?? row.created_at)}
                  {row.requester_name ? ` ・ ${row.requester_name}` : ""}
                </p>
                {row.note ? (
                  <p className="whitespace-pre-wrap text-sm text-muted-foreground [overflow-wrap:anywhere]">
                    {row.note}
                  </p>
                ) : null}
                {row.kind === "formal_approval" && row.status === "approved" ? (
                  <ApprovedRequirementVersionExport
                    projectId={projectId}
                    version={row}
                  />
                ) : null}
              </li>
            ))}
          </ol>
        ) : (
          <p className="text-sm text-muted-foreground">
            レビュー・正式承認の版はまだありません。
          </p>
        )}
        {query.data ? (
          <DataPagination
            page={query.data.page}
            pageSize={query.data.page_size}
            total={query.data.total}
            currentCount={rows.length}
            isFetching={query.isFetching}
            onPageChange={pageChanged}
          />
        ) : null}
      </section>
    </div>
  );
}

function VersionSelect({
  value,
  rows,
  onChange,
}: {
  value: string;
  rows: RequirementWorkflowRead[];
  onChange: (id: string) => void;
}) {
  return (
    <select
      value={value}
      onChange={(event) => onChange(event.currentTarget.value)}
      className="h-9 min-w-0 rounded-md border bg-background px-2"
    >
      <option value="">版を選択</option>
      {rows.map((row) => (
        <option key={row.id} value={row.id}>
          {row.version_label} ・ {statusLabel(row)} ・ {row.target_title}
        </option>
      ))}
    </select>
  );
}
