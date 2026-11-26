"use client";

import { useId, useState, type FormEvent } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { FileCheckIcon, MessageSquareIcon, SearchIcon } from "lucide-react";
import { DataLoadError } from "@/components/shared/feedback/data-load-error";
import { DataPagination } from "@/components/shared/navigation/data-pagination";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  reviewRequestStatus,
  reviewTargetKind,
} from "@/features/requirements/lib/requirement-workflow-review";
import type { RequirementWorkflowRead } from "@/lib/api/generated/model";
import { listRequirementWorkflowProjectsProjectIdRequirementWorkflowGet as listWorkflow } from "@/lib/api/generated/requirement-workflow/requirement-workflow";
import { formatDate } from "@/lib/format/date";

const views = [
  { value: "assigned", label: "自分への依頼" },
  { value: "requested", label: "自分の申請" },
  { value: "all", label: "すべて" },
] as const;

export function RequirementProjectInbox({
  projectId,
  documentId,
}: {
  projectId: number;
  documentId?: number;
}) {
  const searchId = useId();
  const [view, setView] = useState<(typeof views)[number]["value"]>("all");
  const [page, setPage] = useState(1);
  const [kind, setKind] = useState<RequirementWorkflowRead["kind"] | "">("");
  const [status, setStatus] = useState<RequirementWorkflowRead["status"] | "">(
    "",
  );
  const [search, setSearch] = useState("");
  const query = useQuery({
    queryKey: [
      "requirement-workflow",
      projectId,
      documentId,
      "inbox",
      view,
      page,
      kind,
      status,
      search,
    ],
    queryFn: ({ signal }) =>
      listWorkflow(
        projectId,
        {
          document_id: documentId,
          view,
          page,
          page_size: 20,
          kind: kind || undefined,
          status: status || undefined,
          q: search || undefined,
        },
        { signal },
      ),
    retry: false,
  });

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSearch(
      String(new FormData(event.currentTarget).get("query") ?? "").trim(),
    );
    setPage(1);
  }

  const rows = query.data?.items ?? [];
  return (
    <section
      aria-label="要件定義書のレビュー・正式承認"
      className="grid min-w-0 gap-4"
    >
      <div
        className="flex flex-wrap gap-2 border-b pb-3"
        role="group"
        aria-label="表示する依頼"
      >
        {views.map((item) => (
          <Button
            key={item.value}
            type="button"
            size="sm"
            variant={view === item.value ? "secondary" : "ghost"}
            aria-pressed={view === item.value}
            onClick={() => {
              setView(item.value);
              setPage(1);
            }}
          >
            {item.label}
            {view === item.value && query.data ? ` ${query.data.total}` : ""}
          </Button>
        ))}
      </div>
      <div className="flex min-w-0 flex-wrap items-end gap-3">
        <form
          onSubmit={submit}
          className="flex min-w-0 flex-1 flex-wrap items-end gap-2 sm:min-w-60"
        >
          <label
            htmlFor={searchId}
            className="grid min-w-0 flex-1 gap-1 text-sm"
          >
            対象名・版番号
            <Input
              id={searchId}
              name="query"
              maxLength={100}
              defaultValue={search}
              placeholder="例　要件定義、R-001"
            />
          </label>
          <Button type="submit" variant="outline">
            <SearchIcon data-icon="inline-start" />
            検索
          </Button>
        </form>
        <label className="grid gap-1 text-sm">
          種類
          <select
            value={kind}
            onChange={(event) => {
              setKind(event.currentTarget.value as typeof kind);
              setPage(1);
            }}
            className="h-9 rounded-md border bg-background px-2"
          >
            <option value="">すべての種類</option>
            <option value="review">レビュー</option>
            <option value="formal_approval">正式承認</option>
          </select>
        </label>
        <label className="grid gap-1 text-sm">
          状態
          <select
            value={status}
            onChange={(event) => {
              setStatus(event.currentTarget.value as typeof status);
              setPage(1);
            }}
            className="h-9 rounded-md border bg-background px-2"
          >
            <option value="">すべての状態</option>
            {Object.entries(reviewRequestStatus).map(([value, label]) => (
              <option value={value} key={value}>
                {value === "requested" ? "対応待ち・進行中" : label}
              </option>
            ))}
          </select>
        </label>
      </div>
      {query.error ? (
        <DataLoadError
          resourceName="レビュー・承認一覧"
          onRetry={() => void query.refetch()}
        />
      ) : query.isPending ? (
        <p role="status" className="text-sm text-muted-foreground">
          依頼を読み込んでいます…
        </p>
      ) : rows.length ? (
        <ul className="divide-y border-y">
          {rows.map((row) => {
            const formal = row.kind === "formal_approval";
            const Icon = formal ? FileCheckIcon : MessageSquareIcon;
            return (
              <li key={row.id}>
                <Link
                  href={`/projects/joined/${projectId}/requirement-workflow/${row.id}`}
                  className="flex min-w-0 items-start gap-3 rounded-md px-2 py-4 hover:bg-muted/60 focus-visible:outline-2 focus-visible:outline-ring"
                >
                  <Icon
                    className="mt-0.5 size-5 shrink-0 text-muted-foreground"
                    aria-hidden="true"
                  />
                  <div className="grid min-w-0 flex-1 gap-1">
                    <span className="font-medium [overflow-wrap:anywhere]">
                      {row.target_title}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      {reviewTargetKind[row.scope_kind]} ・ {row.version_label}{" "}
                      ・ {formal ? "正式承認" : "レビュー依頼"}
                    </span>
                    {row.due_on ? (
                      <span className="text-xs text-muted-foreground">
                        回答期限{" "}
                        <time dateTime={row.due_on}>
                          {formatDate(row.due_on)}
                        </time>
                      </span>
                    ) : null}
                  </div>
                  <Badge
                    variant="outline"
                    className={
                      row.status === "requested" ||
                      row.status === "changes_requested"
                        ? "border-[var(--status-warning-border)] text-[var(--status-warning-fg)]"
                        : undefined
                    }
                  >
                    {formal && row.status === "requested"
                      ? "承認待ち"
                      : reviewRequestStatus[row.status]}
                  </Badge>
                </Link>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">
          この条件に該当する依頼はありません。
        </p>
      )}
      {query.data && query.data.total > query.data.page_size ? (
        <DataPagination
          page={page}
          pageSize={query.data.page_size}
          total={query.data.total}
          currentCount={rows.length}
          isFetching={query.isFetching}
          onPageChange={setPage}
        />
      ) : null}
    </section>
  );
}
