"use client";

import { useState } from "react";
import {
  EditIcon,
  ExternalLinkIcon,
  MessageSquarePlusIcon,
  PlusIcon,
  Trash2Icon,
} from "lucide-react";

import { ResourceDeleteDialog } from "@/components/shared/dialogs/resource-delete-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatDateTime } from "@/lib/format/date";
import type { RequirementLinkRead } from "@/lib/api/generated/model";

import {
  getRequirementLinkStatusLabel,
  getRequirementLinkTypeLabel,
} from "../../constants/requirement-options";
import {
  createRequirementLinkCommentAnchor,
  getRequirementCommentAnchorKey,
  type RequirementCommentAnchor,
} from "../../lib/requirement-comment-anchor";
import { useCreateRequirementLink } from "../../hooks/use-create-requirement-link";
import { useDeleteRequirementLink } from "../../hooks/use-delete-requirement-link";
import { useRequirementLinks } from "../../hooks/use-requirement-links";
import { useUpdateRequirementLink } from "../../hooks/use-update-requirement-link";
import { RequirementLinkForm } from "../forms/requirement-link-form";
import { RequirementSectionSkeleton } from "../shared/requirement-section-skeleton";

type RequirementLinksSectionProps = {
  projectId: number;
  requirementId: number;
  canLink: boolean;
  onSelectCommentAnchor?: (targetAnchor: RequirementCommentAnchor) => void;
};

export function RequirementLinksSection({
  projectId,
  requirementId,
  canLink,
  onSelectCommentAnchor,
}: RequirementLinksSectionProps) {
  const [deleteTarget, setDeleteTarget] = useState<RequirementLinkRead | null>(
    null,
  );
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<RequirementLinkRead | null>(
    null,
  );
  const { links, isLoading } = useRequirementLinks(projectId, requirementId);
  const {
    createRequirementLink,
    isPending: isCreatePending,
    error: createError,
  } = useCreateRequirementLink(projectId, requirementId);
  const { deleteRequirementLink, isPending: isDeletePending } =
    useDeleteRequirementLink(projectId, requirementId);
  const {
    updateRequirementLink,
    isPending: isUpdatePending,
    error: updateError,
  } = useUpdateRequirementLink(projectId, requirementId);

  return (
    <Card className="h-[36rem]">
      <CardHeader>
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div className="flex flex-col gap-1">
            <CardTitle className="text-base">関連成果物</CardTitle>
            <CardDescription>
              この要件の確認に使う画面、API、資料などの参照先を記録します。
            </CardDescription>
          </div>
          {canLink ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsCreateOpen(true)}
            >
              <PlusIcon data-icon="inline-start" />
              関連成果物追加
            </Button>
          ) : null}
        </div>
      </CardHeader>
      <CardContent className="flex min-h-0 flex-1 flex-col gap-4">
        {isLoading ? (
          <RequirementSectionSkeleton />
        ) : links.length ? (
          <div className="min-h-0 flex-1 overflow-y-auto pr-1">
            <div className="flex flex-col gap-3">
              {links.map((link) => (
                <div
                  key={link.id}
                  className="scroll-mt-24 rounded-lg border p-3"
                  data-requirement-comment-anchor={getRequirementCommentAnchorKey(
                    createRequirementLinkCommentAnchor(link),
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 flex-col gap-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <LinkTypeBadge type={link.linked_type} />
                        <LinkStatusBadge status={link.status} />
                        <span className="text-xs text-muted-foreground">
                          {formatDateTime(link.created_at)}
                        </span>
                      </div>
                      <span className="break-words text-sm font-medium">
                        {link.linked_id}
                      </span>
                    </div>
                    <div className="flex shrink-0 flex-wrap gap-2">
                      {onSelectCommentAnchor ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            onSelectCommentAnchor(
                              createRequirementLinkCommentAnchor(link),
                            )
                          }
                        >
                          <MessageSquarePlusIcon data-icon="inline-start" />
                          コメント
                        </Button>
                      ) : null}
                      {link.linked_url ? (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          asChild
                        >
                          <a
                            href={link.linked_url}
                            target="_blank"
                            rel="noreferrer"
                          >
                            <ExternalLinkIcon data-icon="inline-start" />
                            開く
                          </a>
                        </Button>
                      ) : null}
                      {canLink ? (
                        <>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setEditTarget(link)}
                          >
                            <EditIcon data-icon="inline-start" />
                            編集
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setDeleteTarget(link)}
                          >
                            <Trash2Icon data-icon="inline-start" />
                            削除
                          </Button>
                        </>
                      ) : null}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            関連成果物はありません。
          </p>
        )}

        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogContent className="max-h-[calc(100vh-2rem)] overflow-y-auto sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle>関連成果物を追加</DialogTitle>
              <DialogDescription>
                参照先、成果物リンク、成果物状態を登録します。
              </DialogDescription>
            </DialogHeader>
            <RequirementLinkForm
              isPending={isCreatePending}
              error={createError}
              onSubmit={async (values) => {
                await createRequirementLink(values);
                setIsCreateOpen(false);
              }}
            />
          </DialogContent>
        </Dialog>

        <Dialog
          open={Boolean(editTarget)}
          onOpenChange={(open) => !open && setEditTarget(null)}
        >
          <DialogContent className="max-h-[calc(100vh-2rem)] overflow-y-auto sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle>関連成果物を編集</DialogTitle>
              <DialogDescription>
                参照先、成果物リンク、成果物状態を更新します。
              </DialogDescription>
            </DialogHeader>
            {editTarget ? (
              <RequirementLinkForm
                initialValues={{
                  linkedType: editTarget.linked_type,
                  linkedId: editTarget.linked_id,
                  linkedUrl: editTarget.linked_url ?? "",
                  status: editTarget.status,
                }}
                submitLabel="関連成果物を更新"
                resetOnSuccess={false}
                isPending={isUpdatePending}
                error={updateError}
                onSubmit={async (values) => {
                  await updateRequirementLink(editTarget.id, values);
                  setEditTarget(null);
                }}
              />
            ) : null}
          </DialogContent>
        </Dialog>

        <ResourceDeleteDialog
          open={Boolean(deleteTarget)}
          onOpenChange={(open) => !open && setDeleteTarget(null)}
          resourceName="関連成果物"
          description="関連成果物の紐づけを削除します。成果物本体は削除されません。"
          isPending={isDeletePending}
          onConfirm={async () => {
            if (!deleteTarget) {
              return;
            }

            await deleteRequirementLink(deleteTarget.id);
            setDeleteTarget(null);
          }}
        />
      </CardContent>
    </Card>
  );
}

function LinkTypeBadge({ type }: { type?: string | null }) {
  const toneClass =
    type === "screen"
      ? "border-indigo-200 bg-indigo-50 text-indigo-700"
      : type === "api"
        ? "border-cyan-200 bg-cyan-50 text-cyan-700"
        : type === "database"
          ? "border-violet-200 bg-violet-50 text-violet-700"
          : type === "task"
            ? "border-blue-200 bg-blue-50 text-blue-700"
            : type === "test_case"
              ? "border-rose-200 bg-rose-50 text-rose-700"
              : type === "document"
                ? "border-teal-200 bg-teal-50 text-teal-700"
                : type === "project"
                  ? "border-orange-200 bg-orange-50 text-orange-700"
                  : "border-zinc-200 bg-zinc-50 text-zinc-600";

  return (
    <Badge variant="outline" className={toneClass}>
      {getRequirementLinkTypeLabel(type)}
    </Badge>
  );
}

function LinkStatusBadge({ status }: { status?: string | null }) {
  const toneClass =
    status === "verified"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : status === "completed"
        ? "border-sky-200 bg-sky-50 text-sky-700"
        : status === "in_progress"
          ? "border-amber-200 bg-amber-50 text-amber-700"
          : status === "not_started"
            ? "border-slate-200 bg-slate-50 text-slate-600"
            : "border-zinc-200 bg-zinc-50 text-zinc-600";

  return (
    <Badge variant="outline" className={toneClass}>
      {getRequirementLinkStatusLabel(status)}
    </Badge>
  );
}
