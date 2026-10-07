"use client";

import { useId, useState, type FormEvent } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/shared/layout/page-header";
import { DataLoadError } from "@/components/shared/feedback/data-load-error";
import { EmptyState } from "@/components/shared/feedback/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableHeader,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { listAuditLogsTenantsCurrentAuditLogsGet } from "@/lib/api/generated/audit-logs/audit-logs";
import type {
  AuditLogRead,
  ListAuditLogsTenantsCurrentAuditLogsGetParams,
} from "@/lib/api/generated/model";
import {
  TenantAdminGuard,
  useTenant,
} from "@/features/tenants/providers/tenant-provider";
import {
  auditParams,
  EMPTY_FILTERS,
  EVENT_LABELS,
  eventLabel,
  detailLabel,
  detailValue,
  type AuditFilters,
} from "../lib/audit-log";

const date = (value: string) => new Date(value).toLocaleString("ja-JP");
const actor = (row: AuditLogRead) =>
  row.actor_name ??
  (row.actor_user_id === null ? "システム" : `ユーザー ${row.actor_user_id}`);
const project = (row: AuditLogRead) =>
  row.project_name ??
  (row.project_id === null ? "組織全体" : `プロジェクト ${row.project_id}`);

export function AuditLogsPage() {
  return (
    <TenantAdminGuard>
      <AuditLogsContent />
    </TenantAdminGuard>
  );
}

function AuditLogsContent() {
  const { tenant } = useTenant();
  const id = useId();
  const [filters, setFilters] = useState<AuditFilters>(EMPTY_FILTERS);
  const [params, setParams] =
    useState<ListAuditLogsTenantsCurrentAuditLogsGetParams>(() =>
      auditParams(EMPTY_FILTERS),
    );
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<AuditLogRead | null>(null);
  const logs = useQuery({
    queryKey: ["audit-logs", tenant?.id, params],
    queryFn: ({ signal }) =>
      listAuditLogsTenantsCurrentAuditLogsGet(params, { signal }),
    enabled: Boolean(tenant),
    retry: false,
  });
  const page = params.page ?? 1;
  const pages = Math.max(1, Math.ceil((logs.data?.total ?? 0) / 25));
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      setParams(auditParams(filters));
      setError("");
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "検索条件を確認してください。",
      );
    }
  }
  function reset() {
    setFilters(EMPTY_FILTERS);
    setParams(auditParams(EMPTY_FILTERS));
    setError("");
  }
  return (
    <div className="flex min-w-0 flex-col gap-6">
      <PageHeader
        title="監査ログ"
        description={`${tenant?.name ?? "現在の組織"}で記録された重要操作を確認します。`}
        actions={
          <Button asChild variant="outline">
            <Link href="/organization">組織管理へ戻る</Link>
          </Button>
        }
      />
      <form onSubmit={submit} className="flex flex-col gap-3">
        <FieldGroup className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {(
            [
              ["from", "開始日", "date", ""],
              ["to", "終了日", "date", ""],
              ["actor", "操作者ID", "text", "例：12"],
              ["project", "プロジェクトID", "text", "例：3"],
              ["event", "操作種別", "text", "例：task.updated"],
            ] as const
          ).map(([key, label, type, placeholder]) => (
            <Field key={key}>
              <FieldLabel htmlFor={`${id}-${key}`}>{label}</FieldLabel>
              <Input
                id={`${id}-${key}`}
                type={type}
                placeholder={placeholder}
                value={filters[key]}
                inputMode={
                  key === "actor" || key === "project" ? "numeric" : undefined
                }
                maxLength={key === "event" ? 100 : undefined}
                list={key === "event" ? `${id}-events` : undefined}
                onChange={(event) =>
                  setFilters((current) => ({
                    ...current,
                    [key]: event.target.value,
                  }))
                }
              />
            </Field>
          ))}
        </FieldGroup>
        <datalist id={`${id}-events`}>
          {Object.entries(EVENT_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </datalist>
        <div className="flex flex-wrap items-center gap-2">
          <Button type="submit">絞り込む</Button>
          <Button type="button" variant="outline" onClick={reset}>
            条件をクリア
          </Button>
          <Button
            type="button"
            variant="ghost"
            disabled={logs.isFetching}
            onClick={() => void logs.refetch()}
          >
            再読み込み
          </Button>
        </div>
        <p className="text-sm text-muted-foreground">
          日付は端末のタイムゾーンで、終了日まで含めて検索します。操作者とプロジェクトのIDは一覧で確認できます。
        </p>
        {error ? (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        ) : null}
      </form>
      <p className="text-sm text-muted-foreground">
        本文・接続情報は表示しません。組織に紐づかないログイン記録などは、この一覧の対象外です。
      </p>
      {logs.isPending ? (
        <Skeleton className="h-64" />
      ) : logs.isError ? (
        <DataLoadError
          resourceName="監査ログ"
          onRetry={() => void logs.refetch()}
          isRetrying={logs.isFetching}
        />
      ) : logs.data.items.length === 0 ? (
        <EmptyState message="条件に一致する監査ログはありません。" />
      ) : (
        <div className="flex min-w-0 flex-col gap-3">
          <p className="text-sm text-muted-foreground" aria-live="polite">
            {logs.data.total}件 · 新しい記録から表示
          </p>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>日時</TableHead>
                <TableHead>操作</TableHead>
                <TableHead>操作者</TableHead>
                <TableHead>プロジェクト・対象</TableHead>
                <TableHead>
                  <span className="sr-only">詳細</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.data.items.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>
                    <time dateTime={row.created_at}>
                      {date(row.created_at)}
                    </time>
                  </TableCell>
                  <TableCell>
                    <div className="max-w-64 whitespace-normal break-words">
                      {eventLabel(row.event_type)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {row.event_type}
                    </div>
                    {row.source === "mcp" ? (
                      <Badge variant="secondary">MCP</Badge>
                    ) : null}
                  </TableCell>
                  <TableCell>
                    <div className="max-w-48 whitespace-normal break-words">
                      {actor(row)}
                    </div>
                    {row.actor_user_id !== null ? (
                      <div className="text-xs text-muted-foreground">
                        ID {row.actor_user_id}
                      </div>
                    ) : null}
                  </TableCell>
                  <TableCell>
                    <div className="max-w-64 whitespace-normal break-words">
                      {project(row)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {row.project_id !== null
                        ? `案件ID ${row.project_id} · `
                        : ""}
                      {row.resource_type ?? "対象なし"}
                      {row.resource_id !== null ? ` #${row.resource_id}` : ""}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      aria-label={`監査ログ ${row.id} の詳細`}
                      onClick={() => setSelected(row)}
                    >
                      詳細
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
      <nav
        aria-label="監査ログのページ"
        className="flex flex-wrap items-center gap-3"
      >
        <Button
          type="button"
          variant="outline"
          disabled={page <= 1 || logs.isFetching}
          onClick={() =>
            setParams((current) => ({ ...current, page: page - 1 }))
          }
        >
          前へ
        </Button>
        <span className="text-sm">
          {page} / {logs.data ? pages : "…"}
        </span>
        <Button
          type="button"
          variant="outline"
          disabled={
            !logs.data || page >= pages || page >= 500 || logs.isFetching
          }
          onClick={() =>
            setParams((current) => ({ ...current, page: page + 1 }))
          }
        >
          次へ
        </Button>
      </nav>
      <Dialog
        open={selected !== null}
        onOpenChange={(open) => {
          if (!open) setSelected(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>監査ログの詳細</DialogTitle>
            <DialogDescription>
              記録ID {selected?.id} ·
              表示する補足情報は項目名・権限・数値に限定しています。
            </DialogDescription>
          </DialogHeader>
          {selected ? (
            <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-3 text-sm">
              <dt className="text-muted-foreground">日時</dt>
              <dd>{date(selected.created_at)}</dd>
              <dt className="text-muted-foreground">操作</dt>
              <dd className="break-words">
                {eventLabel(selected.event_type)}
                <br />
                {selected.event_type}
              </dd>
              <dt className="text-muted-foreground">操作者</dt>
              <dd className="break-words">
                {actor(selected)}
                {selected.actor_user_id !== null
                  ? `（ID ${selected.actor_user_id}）`
                  : ""}
              </dd>
              <dt className="text-muted-foreground">案件</dt>
              <dd className="break-words">{project(selected)}</dd>
              <dt className="text-muted-foreground">対象</dt>
              <dd>
                {selected.resource_type ?? "なし"}
                {selected.resource_id !== null
                  ? ` #${selected.resource_id}`
                  : ""}
              </dd>
              <dt className="text-muted-foreground">実行元</dt>
              <dd>{selected.source === "mcp" ? "MCP" : "アプリ・運用処理"}</dd>
              {Object.entries(selected.details).map(([key, value]) => (
                <div key={key} className="contents">
                  <dt className="text-muted-foreground">{detailLabel(key)}</dt>
                  <dd className="break-words">{detailValue(value)}</dd>
                </div>
              ))}
            </dl>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
