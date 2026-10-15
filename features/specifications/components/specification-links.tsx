"use client";

import { useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { getApiErrorMessage } from "@/lib/messages/api-error-message";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FormApiError } from "@/components/shared/forms/form-api-error";
import { ConfirmDialog } from "@/components/shared/dialogs/confirm-dialog";
import { DataLoadError } from "@/components/shared/feedback/data-load-error";
import type {
  SpecificationLinkCreate,
  SpecificationLinkRead,
} from "@/lib/api/generated/model";
import { listLinks, listCandidates, addLink, removeLink } from "../lib/api";
import {
  relatedHref,
  specificationKeys,
  targetLabels,
} from "../lib/specification";

export function SpecificationLinks({
  projectId,
  id,
  canEdit,
}: {
  projectId: number;
  id: number;
  canEdit: boolean;
}) {
  const cache = useQueryClient();
  const [kind, setKind] =
    useState<SpecificationLinkCreate["target_type"]>("requirement");
  const [input, setInput] = useState("");
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState("");
  const [deleting, setDeleting] = useState<SpecificationLinkRead | null>(null);
  const key = [...specificationKeys.detail(projectId, id), "links"];
  const links = useQuery({
    queryKey: key,
    queryFn: () => listLinks(projectId, id),
    retry: false,
  });
  const candidates = useQuery({
    queryKey: [...specificationKeys.all(projectId), "candidates", kind, q],
    queryFn: () => listCandidates(projectId, { target_type: kind, q }),
    enabled: canEdit,
    retry: false,
  });
  const add = useMutation({
    mutationFn: () =>
      addLink(projectId, id, { target_type: kind, target_id: selected }),
    onSuccess: (data) => {
      cache.setQueryData(key, data);
      setSelected("");
      void cache.invalidateQueries({
        queryKey: ["related-specifications", projectId],
      });
    },
  });
  const remove = useMutation({
    mutationFn: () => removeLink(projectId, id, deleting!.id!),
    onSuccess: () => {
      setDeleting(null);
      void cache.invalidateQueries({ queryKey: key });
      void cache.invalidateQueries({
        queryKey: ["related-specifications", projectId],
      });
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error));
      void cache.invalidateQueries({ queryKey: key });
    },
  });
  return (
    <section className="flex min-w-0 flex-col gap-4">
      <div>
        <h2 className="font-semibold">要件・作業・テストとつなげる</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          設計の根拠、実装タスク、確認するテストを選びます。画面が使うAPIや、添付資料のあるドキュメントも関連付けられます。
        </p>
      </div>
      {canEdit && (
        <form
          className="flex max-w-3xl flex-col gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            add.mutate();
          }}
        >
          <FieldGroup className="grid gap-3 sm:grid-cols-2">
            <Field>
              <FieldLabel htmlFor="spec-link-kind">関連先の種類</FieldLabel>
              <Select
                value={kind}
                onValueChange={(value) => {
                  setKind(value as SpecificationLinkCreate["target_type"]);
                  setSelected("");
                }}
              >
                <SelectTrigger id="spec-link-kind">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {Object.entries(targetLabels).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </Field>
            <Field>
              <FieldLabel htmlFor="spec-link-search">
                名前で候補を検索
              </FieldLabel>
              <div className="flex gap-2">
                <Input
                  id="spec-link-search"
                  value={input}
                  maxLength={200}
                  onChange={(event) => setInput(event.target.value)}
                  placeholder="要件名・作業名…"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setQ(input.trim());
                    setSelected("");
                  }}
                >
                  検索
                </Button>
              </div>
            </Field>
          </FieldGroup>
          <Field>
            <FieldLabel htmlFor="spec-link-target">関連先</FieldLabel>
            <Select value={selected} onValueChange={setSelected}>
              <SelectTrigger id="spec-link-target" className="w-full">
                <SelectValue
                  placeholder={
                    candidates.isPending ? "候補を読み込み中…" : "関連先を選択"
                  }
                />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {candidates.data
                    ?.filter(
                      (item) =>
                        !(
                          item.target_type === "specification" &&
                          item.target_id === String(id)
                        ),
                    )
                    .map((item) => (
                      <SelectItem value={item.target_id} key={item.target_id}>
                        {item.title}
                      </SelectItem>
                    ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </Field>
          <p className="text-xs text-muted-foreground">
            候補は最大50件です。見つからない場合は名前で絞り込んでください。
          </p>
          {candidates.error && <FormApiError error={candidates.error} />}
          <Button
            type="submit"
            className="self-start"
            disabled={!selected || add.isPending}
          >
            関連付ける
          </Button>
          <FormApiError error={add.error} />
        </form>
      )}
      {links.isPending ? (
        <p role="status">関連を読み込み中…</p>
      ) : links.error ? (
        <DataLoadError
          resourceName="関連情報"
          isRetrying={links.isFetching}
          onRetry={() => void links.refetch()}
        />
      ) : !links.data?.length ? (
        <p className="text-sm text-muted-foreground">関連はまだありません。</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {links.data.map((link) => (
            <li
              key={link.id}
              className="flex min-w-0 items-center justify-between gap-3 border-b pb-3"
            >
              <div className="min-w-0">
                <span className="text-xs text-muted-foreground">
                  {targetLabels[link.target_type]}
                </span>
                <Link
                  className="block break-words text-sm font-medium underline-offset-4 hover:underline"
                  href={relatedHref(projectId, link)}
                >
                  {link.title}
                </Link>
              </div>
              {canEdit && (
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => setDeleting(link)}
                >
                  関連を解除
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}
      <ConfirmDialog
        open={Boolean(deleting)}
        onOpenChange={(open) => !open && setDeleting(null)}
        title="関連を解除しますか？"
        description="関連先のデータは削除されません。"
        confirmLabel="関連を解除"
        isPending={remove.isPending}
        onConfirm={() => remove.mutateAsync().catch(() => undefined)}
      />
      <FormApiError error={remove.error} />
    </section>
  );
}
