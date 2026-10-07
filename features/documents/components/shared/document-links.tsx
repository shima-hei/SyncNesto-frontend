"use client";

import { useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/shared/dialogs/confirm-dialog";
import { FormApiError } from "@/components/shared/forms/form-api-error";
import { SearchFilterBar } from "@/components/shared/filters/search-filter-bar";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  listDocumentLinksProjectsProjectIdDocumentsDocumentIdLinksGet as listLinks,
  documentLinkCandidatesProjectsProjectIdDocumentsLinkCandidatesGet as listCandidates,
  createDocumentLinkProjectsProjectIdDocumentsDocumentIdLinksPost as addLink,
  deleteDocumentLinkProjectsProjectIdDocumentsDocumentIdLinksLinkIdDelete as removeLink,
} from "@/lib/api/generated/documents/documents";
import type { DocumentLinkRead } from "@/lib/api/generated/model/documentLinkRead";
import type { DocumentTargetType } from "@/lib/api/generated/model/documentTargetType";
import { getApiErrorMessage } from "@/lib/messages/api-error-message";
import {
  DOCUMENT_TARGET_LABELS,
  documentKeys,
  documentTargetHref,
} from "../../lib/document";
import { DocumentLoadError } from "./document-feedback";

export function DocumentLinks({
  projectId,
  documentId,
  canEdit,
}: {
  projectId: number;
  documentId: number;
  canEdit: boolean;
}) {
  const [kind, setKind] = useState<DocumentTargetType>("requirement");
  const [search, setSearch] = useState("");
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState("");
  const [deleting, setDeleting] = useState<DocumentLinkRead | null>(null);
  const cache = useQueryClient();
  const key = [...documentKeys.detail(projectId, documentId), "links"];
  const query = useQuery({
    queryKey: key,
    queryFn: () => listLinks(projectId, documentId),
  });
  const candidates = useQuery({
    queryKey: [...documentKeys.all(projectId), "candidates", kind, q],
    queryFn: () =>
      listCandidates(projectId, { target_type: kind, q: q || undefined }),
    enabled: canEdit,
    retry: false,
  });
  const add = useMutation({
    mutationFn: () =>
      addLink(projectId, documentId, {
        target_type: kind,
        target_id: Number(selected),
      }),
    onSuccess: (links) => {
      cache.setQueryData(key, links);
      setSelected("");
    },
  });
  const remove = useMutation({
    mutationFn: (id: number) => removeLink(projectId, documentId, id),
    onSuccess: async () => {
      setDeleting(null);
      await cache.invalidateQueries({ queryKey: key });
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });
  return (
    <div className="flex min-w-0 flex-col gap-4">
      {canEdit ? (
        <div className="flex min-w-0 flex-col gap-3 max-w-3xl">
          <SearchFilterBar
            searchValue={search}
            searchLabel="関連先を検索"
            searchPlaceholder="関連先のタイトルで検索"
            variant="compact"
            onSearchValueChange={setSearch}
            onSearch={() => {
              setQ(search.trim().slice(0, 200));
              setSelected("");
            }}
          >
            <Select
              value={kind}
              onValueChange={(value) => {
                if (
                  value === "requirement" ||
                  value === "task" ||
                  value === "test_design"
                ) {
                  setKind(value);
                  setSelected("");
                }
              }}
            >
              <SelectTrigger className="w-full" aria-label="関連先の種類">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {Object.entries(DOCUMENT_TARGET_LABELS).map(
                    ([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ),
                  )}
                </SelectGroup>
              </SelectContent>
            </Select>
            <Select
              value={selected}
              onValueChange={setSelected}
              disabled={
                candidates.isPending ||
                Boolean(candidates.error) ||
                add.isPending
              }
            >
              <SelectTrigger className="w-full" aria-label="関連先">
                <SelectValue
                  placeholder={
                    candidates.isPending ? "読み込み中…" : "関連先を選択"
                  }
                />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {candidates.data?.map((target) => (
                    <SelectItem
                      key={target.target_id}
                      value={String(target.target_id)}
                    >
                      {target.title}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </SearchFilterBar>
          {candidates.error ? (
            <p role="alert" className="text-muted-foreground">
              この種類の関連先を取得できません。閲覧権限と通信状態を確認してください。
            </p>
          ) : candidates.data?.length === 0 ? (
            <p className="text-muted-foreground">
              候補がありません。検索条件や関連先の登録状況を確認してください。
            </p>
          ) : (
            <p className="text-xs text-muted-foreground">
              候補は最大50件です。検索して絞り込めます。
            </p>
          )}
          <Button
            className="w-fit"
            disabled={!selected || add.isPending}
            onClick={() => add.mutate()}
          >
            関連付ける
          </Button>
        </div>
      ) : null}
      <FormApiError error={add.error ?? remove.error} />
      {query.error ? (
        <DocumentLoadError
          error={query.error}
          projectId={projectId}
          retry={() => void query.refetch()}
        />
      ) : query.isPending ? (
        <p className="text-muted-foreground">関連を読み込んでいます…</p>
      ) : query.data.length ? (
        <ul className="divide-y">
          {query.data.map((target) => {
            const href = target.title
              ? documentTargetHref(projectId, target)
              : null;
            return (
              <li
                key={target.id}
                className="flex min-w-0 items-center justify-between gap-3 py-3"
              >
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">
                    {DOCUMENT_TARGET_LABELS[target.target_type]}
                  </p>
                  {href ? (
                    <Link
                      href={href}
                      className="font-medium break-words hover:underline"
                    >
                      {target.title}
                    </Link>
                  ) : (
                    <p className="text-muted-foreground">
                      削除済みまたは参照権限がありません。
                    </p>
                  )}
                </div>
                {canEdit ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setDeleting(target)}
                  >
                    解除
                  </Button>
                ) : null}
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="text-muted-foreground">関連付けはありません。</p>
      )}
      <ConfirmDialog
        open={Boolean(deleting)}
        onOpenChange={(open) => {
          if (!open) setDeleting(null);
        }}
        title="関連付けを解除しますか"
        description="関連先の要件・タスク・テスト設計書は削除されません。"
        confirmLabel="解除"
        isPending={remove.isPending}
        onConfirm={() =>
          deleting
            ? remove.mutateAsync(deleting.id).catch(() => undefined)
            : undefined
        }
      />
    </div>
  );
}
