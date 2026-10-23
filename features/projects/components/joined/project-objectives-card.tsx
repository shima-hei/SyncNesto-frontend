"use client";

import { useState } from "react";
import type { ObjectiveDocument } from "@/lib/api/generated/model";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { DataLoadError } from "@/components/shared/feedback/data-load-error";
import { FormApiError } from "@/components/shared/forms/form-api-error";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  readProjectObjectiveEventsProjectsProjectIdObjectivesEventsGet,
  updateProjectObjectivesProjectsProjectIdObjectivesPatch,
} from "@/lib/api/generated/project-objectives/project-objectives";
import { listRequirementDocumentsProjectsProjectIdRequirementDocumentsGet } from "@/lib/api/generated/requirements/requirements";
import { useAuth } from "@/features/auth/providers/auth-provider";
import { useTenant } from "@/features/tenants/providers/tenant-provider";
import { formatDateTime } from "@/lib/format/date";
import { useProjectObjectives } from "../../hooks/use-project-objectives";
import { ProjectObjectiveFields } from "../shared/project-objective-fields";

export function ProjectObjectivesCard({ projectId }: { projectId: number }) {
  const query = useProjectObjectives(projectId);
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { tenant } = useTenant();
  const [open, setOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [historyPage, setHistoryPage] = useState(1);
  const [selected, setSelected] = useState("none");
  const [reason, setReason] = useState("");
  const [chosenDocument, setChosenDocument] =
    useState<ObjectiveDocument | null>(null);
  const data = query.data;
  const base = `/projects/joined/${projectId}`;
  const candidates = useQuery({
    queryKey: ["goal-source-candidates", tenant?.id, user?.id, projectId, page],
    queryFn: () =>
      listRequirementDocumentsProjectsProjectIdRequirementDocumentsGet(
        projectId,
        { page, page_size: 20 },
      ),
    enabled: open && Boolean(data?.can_manage_source),
    retry: false,
  });
  const history = useQuery({
    queryKey: [
      "goal-source-history",
      tenant?.id,
      user?.id,
      projectId,
      historyPage,
    ],
    queryFn: () =>
      readProjectObjectiveEventsProjectsProjectIdObjectivesEventsGet(
        projectId,
        { page: historyPage, page_size: 20 },
      ),
    enabled: historyOpen,
    retry: false,
  });
  const extraChoices = [
    ...new Map(
      [data?.document, chosenDocument]
        .filter((doc): doc is ObjectiveDocument => Boolean(doc))
        .map((doc) => [doc.id, doc] as const),
    ).values(),
  ].filter(
    (doc) =>
      !candidates.data?.items.some((candidate) => candidate.id === doc.id),
  );
  const selectedDocument =
    candidates.data?.items.find((doc) => String(doc.id) === selected) ??
    (chosenDocument && String(chosenDocument.id) === selected
      ? chosenDocument
      : undefined) ??
    (String(data?.document?.id) === selected ? data?.document : undefined);
  const needsReason =
    data?.state === "unavailable" ||
    (data?.state === "available" && selected !== String(data.document?.id));
  const save = useMutation({
    mutationFn: () =>
      updateProjectObjectivesProjectsProjectIdObjectivesPatch(projectId, {
        version: data!.version!,
        document_id: selected === "none" ? null : Number(selected),
        expected_document_version:
          selected === "none" ? null : selectedDocument!.version,
        reason: reason.trim() || null,
      }),
    onError: () => {
      void query.refetch();
    },
    onSuccess: async () => {
      setOpen(false);
      await Promise.all([
        query.refetch(),
        queryClient.invalidateQueries({ queryKey: ["goal-source-history"] }),
      ]);
      toast.success("案件共通の参照文書を更新しました");
    },
  });
  if (query.isPending)
    return <Skeleton className="h-32" aria-label="ゴールを読込中" />;
  if (query.isError)
    return (
      <DataLoadError
        resourceName="案件のゴール"
        onRetry={() => void query.refetch()}
      />
    );
  if (!data || !data.enabled) return null;
  if (data.state === "restricted")
    return (
      <Card>
        <CardHeader>
          <CardTitle>ゴール・目指すもの</CardTitle>
          <CardDescription>
            要件定義書を閲覧する権限が必要です。
          </CardDescription>
        </CardHeader>
      </Card>
    );
  const editHref = data.document
    ? `${base}/requirements/${data.document.id}/edit`
    : null;
  return (
    <Card>
      <CardHeader>
        <CardTitle>ゴール・目指すもの</CardTitle>
        <CardDescription>
          要件定義書を正本として、チームで同じ目標を確認します。
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {data.document ? (
          <>
            <p className="text-sm leading-7 whitespace-pre-wrap break-words">
              {data.document.project_goal
                ? data.document.project_goal.length > 280
                  ? `${data.document.project_goal.slice(0, 280)}…`
                  : data.document.project_goal
                : "ゴールは未登録です。必要になったときに要件定義書へ追記できます。"}
            </p>
            <p className="text-sm text-muted-foreground">
              出典：
              <Link
                className="underline underline-offset-4"
                href={`${base}/requirements/${data.document.id}`}
              >
                {data.document.document_code} · {data.document.title}
              </Link>
              （現在の版 {data.document.version}）
            </p>
            <details className="border-t pt-3">
              <summary className="cursor-pointer rounded-sm text-sm font-medium focus-visible:outline-2">
                対象範囲・完了条件とゴール全文
              </summary>
              <div className="pt-4">
                <ProjectObjectiveFields values={data.document} />
              </div>
            </details>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">
            {data.state === "unavailable"
              ? "選択した要件定義書を参照できません。別の文書へ自動変更はしていません。"
              : "概要に参照する要件定義書が未設定です。文書が1冊でも、チームの共通出典を明示して選びます。"}
          </p>
        )}
      </CardContent>
      <CardFooter className="flex flex-wrap gap-2">
        {editHref && data.can_edit_document ? (
          <Button variant="outline" size="sm" asChild>
            <Link href={editHref}>要件定義書で目標を編集</Link>
          </Button>
        ) : null}
        {data.can_manage_source ? (
          <Dialog
            open={open}
            onOpenChange={(value) => {
              if (save.isPending) return;
              setOpen(value);
              if (value) {
                setSelected(data.document ? String(data.document.id) : "none");
                setChosenDocument(data.document ?? null);
                setReason("");
                setPage(1);
                save.reset();
              }
            }}
          >
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                参照文書を{data.state === "unselected" ? "選ぶ" : "変更"}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>案件共通の参照文書を選ぶ</DialogTitle>
                <DialogDescription>
                  全員の概要に使う出典を変更します。個人の文書絞り込みとは別の設定です。本文や承認・公開内容は変更しません。
                </DialogDescription>
              </DialogHeader>
              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor="goal-source-document">
                    要件定義書
                  </FieldLabel>
                  <Select
                    value={selected}
                    onValueChange={(value) => {
                      setSelected(value);
                      setChosenDocument(
                        candidates.data?.items.find(
                          (doc) => String(doc.id) === value,
                        ) ??
                          extraChoices.find(
                            (doc) => String(doc.id) === value,
                          ) ??
                          null,
                      );
                    }}
                    disabled={save.isPending}
                  >
                    <SelectTrigger id="goal-source-document">
                      <SelectValue placeholder="参照文書を選択" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectItem value="none">
                          指定しない（設定済みなら解除）
                        </SelectItem>
                        {extraChoices.map((doc) => (
                          <SelectItem key={doc.id} value={String(doc.id)}>
                            {doc.document_code} · {doc.title}
                          </SelectItem>
                        ))}
                        {candidates.data?.items.map((doc) => (
                          <SelectItem key={doc.id} value={String(doc.id)}>
                            {doc.document_code} · {doc.title}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                  {candidates.isError ? (
                    <DataLoadError
                      resourceName="文書候補"
                      onRetry={() => void candidates.refetch()}
                    />
                  ) : null}
                  {candidates.isPending ? (
                    <p className="text-sm text-muted-foreground">
                      候補を読込中…
                    </p>
                  ) : candidates.data?.total === 0 ? (
                    <FieldDescription>
                      文書がありません。先に要件定義書を作成できます。
                    </FieldDescription>
                  ) : null}
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page === 1 || candidates.isFetching}
                      onClick={() => setPage((p) => p - 1)}
                    >
                      前へ
                    </Button>
                    <span className="text-sm">{page}ページ</span>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={
                        !candidates.data ||
                        page * 20 >= candidates.data.total ||
                        candidates.isFetching
                      }
                      onClick={() => setPage((p) => p + 1)}
                    >
                      次へ
                    </Button>
                  </div>
                </Field>
                <Field>
                  <FieldLabel htmlFor="goal-source-reason">
                    {needsReason
                      ? "変更・解除理由（必須）"
                      : "選択理由（任意）"}
                  </FieldLabel>
                  <Textarea
                    id="goal-source-reason"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    maxLength={2000}
                    disabled={save.isPending}
                  />
                </Field>
              </FieldGroup>
              <FormApiError error={save.error} />
              <DialogFooter>
                <Button
                  variant="outline"
                  disabled={save.isPending}
                  onClick={() => setOpen(false)}
                >
                  キャンセル
                </Button>
                <Button
                  disabled={
                    save.isPending ||
                    data.version == null ||
                    (needsReason && !reason.trim()) ||
                    (selected !== "none" && !selectedDocument)
                  }
                  onClick={() => save.mutate()}
                >
                  {save.isPending ? "保存中…" : "共通の参照として保存"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        ) : null}
        {!data.document && data.can_create_document ? (
          <Button variant="outline" size="sm" asChild>
            <Link href={`${base}/requirements/new`}>要件定義書を作成</Link>
          </Button>
        ) : null}
        <Dialog open={historyOpen} onOpenChange={setHistoryOpen}>
          <DialogTrigger asChild>
            <Button variant="ghost" size="sm">
              出典の選択履歴
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[85dvh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>出典の選択履歴</DialogTitle>
              <DialogDescription>
                共通出典を誰が、いつ、なぜ選んだか。文書名は現在の表示です。本文や承認の履歴とは別です。
              </DialogDescription>
            </DialogHeader>
            {history.isError ? (
              <DataLoadError
                resourceName="選択履歴"
                onRetry={() => void history.refetch()}
              />
            ) : history.isPending ? (
              <p>履歴を読込中…</p>
            ) : history.data?.total === 0 ? (
              <p className="text-sm text-muted-foreground">
                選択履歴はまだありません。
              </p>
            ) : (
              <ol className="flex flex-col gap-4">
                {history.data?.items.map((event) => (
                  <li
                    key={event.id}
                    className="flex flex-col gap-1 border-b pb-3 text-sm"
                  >
                    <p className="font-medium">
                      {event.changed_by_name ?? "現在参照できないユーザー"}
                      {event.changed_by === user?.id ? "（あなた）" : ""}
                    </p>
                    <p>
                      {event.previous_document_id == null
                        ? "未設定"
                        : (event.previous_document_title ??
                          "現在参照できない文書")}{" "}
                      →{" "}
                      {event.document_id == null
                        ? "参照を解除"
                        : (event.document_title ?? "現在参照できない文書")}
                    </p>
                    <p className="text-muted-foreground">
                      {formatDateTime(event.changed_at)}
                    </p>
                    {event.reason ? (
                      <p className="whitespace-pre-wrap break-words">
                        {event.reason}
                      </p>
                    ) : null}
                  </li>
                ))}
              </ol>
            )}
            <DialogFooter>
              <Button
                variant="outline"
                size="sm"
                disabled={historyPage === 1 || history.isFetching}
                onClick={() => setHistoryPage((p) => p - 1)}
              >
                前へ
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={
                  !history.data ||
                  historyPage * 20 >= history.data.total ||
                  history.isFetching
                }
                onClick={() => setHistoryPage((p) => p + 1)}
              >
                次へ
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardFooter>
    </Card>
  );
}
