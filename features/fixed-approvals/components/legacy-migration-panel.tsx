"use client";

import { useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { FormApiError } from "@/components/shared/forms/form-api-error";
import { DataLoadError } from "@/components/shared/feedback/data-load-error";
import { formatDateTime } from "@/lib/format/date";
import type { LegacyApprovalPreview } from "@/lib/api/generated/model";
import {
  previewMigration,
  migrateApproval,
  listReleases,
  readImport,
} from "../lib/api";
import { ApiError } from "@/lib/api/error";
import {
  approvalPath,
  evidenceIssues,
  numberValue,
  textValue,
} from "../lib/display";
import { ChoiceField } from "./choice-field";

export function LegacyMigrationPanel({
  projectId,
  legacyId,
  canManage,
  importId,
}: {
  projectId: number;
  legacyId: number;
  canManage: boolean;
  importId?: string | null;
}) {
  const cache = useQueryClient();
  const [confirmed, setConfirmed] = useState<{
    preview: LegacyApprovalPreview;
    requestId: string;
  } | null>(null);
  const [selected, setSelected] = useState("");
  const [page, setPage] = useState(1);
  const query = useQuery({
    queryKey: ["legacy-approval-preview", projectId, legacyId, importId],
    queryFn: async () => {
      try {
        return {
          ...(await previewMigration(projectId, {
            legacy_approval_id: legacyId,
            mode: "archive",
          })),
          archived: false,
          importId: null,
        };
      } catch (error) {
        if (!importId || !(error instanceof ApiError) || error.status !== 404)
          throw error;
        const archived = await readImport(projectId, importId);
        return {
          legacy_approval_id: legacyId,
          source: archived.source,
          evidence: archived.evidence,
          preview_digest: "",
          archived: true,
          importId: archived.id,
        };
      }
    },
    enabled: canManage,
    retry: false,
  });
  const source = query.data?.source;
  const kind =
    source?.target_type === "document"
      ? "requirement_document"
      : source?.target_type === "requirement_item"
        ? "requirement"
        : undefined;
  const releases = useQuery({
    queryKey: [
      "legacy-switch-releases",
      projectId,
      kind,
      source?.target_id,
      page,
    ],
    queryFn: () =>
      listReleases(projectId, {
        source_kind: kind,
        source_id: numberValue(source?.target_id),
        page,
        page_size: 20,
      }),
    enabled: !!kind,
    retry: false,
  });
  const preview = useMutation({
    mutationFn: () =>
      previewMigration(projectId, {
        legacy_approval_id: legacyId,
        mode: "archive",
      }),
    onSuccess: (value) =>
      setConfirmed({ preview: value, requestId: crypto.randomUUID() }),
  });
  const save = useMutation({
    mutationFn: () => {
      if (!confirmed) throw new Error("先に履歴を確認してください");
      return migrateApproval(projectId, {
        legacy_approval_id: legacyId,
        mode: "archive",
        request_id: confirmed.requestId,
        expected_preview_digest: confirmed.preview.preview_digest,
      });
    },
    onSuccess: async () => {
      setConfirmed(null);
      await cache.invalidateQueries({
        queryKey: ["approval-history", projectId],
      });
      await query.refetch();
    },
  });
  const archivedId = save.data?.id ?? importId ?? query.data?.importId;
  if (!canManage)
    return (
      <Alert>
        <AlertTitle>従来承認 #{legacyId}</AlertTitle>
        <AlertDescription>
          対象版を固定していない従来の記録です。元の要件定義書から詳細を確認できます。履歴の取込はプロジェクト管理者・マネージャーが行います。
        </AlertDescription>
      </Alert>
    );
  if (query.error)
    return (
      <DataLoadError
        resourceName="従来の承認記録"
        onRetry={() => void query.refetch()}
      />
    );
  if (!query.data || !source) return <p>従来の記録を確認しています…</p>;
  return (
    <Card>
      <CardHeader>
        <CardTitle>従来承認 #{legacyId} の確認と移行</CardTitle>
        <CardDescription>
          当時の判断記録を保持し、現在の本文を過去の承認対象に置き換えません。
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <p className="text-sm">
          指定先 ID {numberValue(source.approver_id)} ／ 申請者 ID{" "}
          {numberValue(source.requested_by)} ／ 実操作者{" "}
          {typeof query.data.evidence.actual_actor_id === "number"
            ? `ID ${query.data.evidence.actual_actor_id}`
            : "判断記録からは未確認"}
        </p>
        <p className="text-sm text-muted-foreground">
          申請日時 {formatDateTime(textValue(source.requested_at))}。元状態：
          {textValue(source.status)}
        </p>
        <p className="whitespace-pre-wrap text-sm">
          {textValue(source.comment, "メモなし")}
        </p>
        <Alert>
          <AlertTitle>証明できる範囲</AlertTitle>
          <AlertDescription>
            {evidenceIssues(query.data.evidence).map((issue) => (
              <p key={issue}>{issue}</p>
            ))}
          </AlertDescription>
        </Alert>
        <FormApiError error={preview.error ?? save.error} />
        {!query.data.archived ? (
          <Button
            type="button"
            variant="outline"
            disabled={preview.isPending || save.isPending}
            onClick={() => preview.mutate()}
          >
            取込対象を再確認
          </Button>
        ) : (
          <p className="text-sm">
            元の記録は削除されています。取り込んだ時点の履歴を表示しています。
          </p>
        )}
        {confirmed ? (
          <Alert>
            <AlertTitle>この時点の従来履歴を保存します</AlertTitle>
            <AlertDescription>
              <p>
                元の状態・ID・日時は変わりません。現在の内容が承認済みになる操作ではありません。
              </p>
              <Button
                type="button"
                disabled={save.isPending}
                onClick={() => save.mutate()}
              >
                履歴を取り込む
              </Button>
            </AlertDescription>
          </Alert>
        ) : null}
        {save.isSuccess ? (
          <p role="status" className="text-sm">
            従来履歴を保存しました。当時の対象本文が未確認であることも保持しています。
          </p>
        ) : null}
        {kind &&
        ((source.status === "requested" && !query.data.archived) ||
          (archivedId &&
            ["approved", "rejected"].includes(textValue(source.status)))) ? (
          <>
            <ChoiceField
              label={
                source.status === "requested"
                  ? "切替先の固定内容"
                  : "本人が改めて確認する固定内容"
              }
              value={selected}
              onChange={setSelected}
              choices={
                releases.data?.items.map((item) => ({
                  value: item.id,
                  label: `${item.title}・保存時の版 ${item.source_version}（${formatDateTime(item.captured_at)}）`,
                })) ?? []
              }
            />
            {releases.error ? (
              <DataLoadError
                resourceName="固定内容"
                onRetry={() => void releases.refetch()}
              />
            ) : null}
            <div className="flex flex-wrap gap-2">
              <Button asChild variant="outline">
                <Link
                  href={`/projects/joined/${projectId}/artifact-releases?kind=${kind}&sourceId=${numberValue(source.target_id)}`}
                >
                  先に本文を固定する
                </Link>
              </Button>
              {selected ? (
                <Button asChild>
                  <Link
                    href={`${approvalPath(projectId)}?release=${selected}&${source.status === "requested" ? `legacyId=${legacyId}` : `origin=${archivedId}`}`}
                  >
                    {source.status === "requested"
                      ? "この固定内容で切替を確認"
                      : "旧履歴を引き継いで再確認を依頼"}
                  </Link>
                </Button>
              ) : null}
            </div>
            {(releases.data?.total ?? 0) > 20 ? (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage(page - 1)}
                >
                  前の固定版
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page * 20 >= (releases.data?.total ?? 0)}
                  onClick={() => setPage(page + 1)}
                >
                  次の固定版
                </Button>
              </div>
            ) : null}
          </>
        ) : (
          <p className="text-sm text-muted-foreground">
            判断済みの記録は当時の判断として保持します。章・未決事項を個別要件や定義書の正式承認へ自動変換しません。
          </p>
        )}
      </CardContent>
    </Card>
  );
}
