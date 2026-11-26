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
import {
  StatusBadge,
  type StatusTone,
} from "@/components/shared/display/status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RelatedItemsGroup } from "@/components/shared/detail/related-items-group";
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
  const { links, isLoading, error } = useRequirementLinks(
    projectId,
    requirementId,
  );
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
    <RelatedItemsGroup
      title="関連資料・リンク"
      count={isLoading || error ? undefined : links.length}
      action={
        canLink ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setIsCreateOpen(true)}
          >
            <PlusIcon data-icon="inline-start" />
            関連付け
          </Button>
        ) : null
      }
    >
      {isLoading ? (
        <RequirementSectionSkeleton />
      ) : error ? (
        <p role="alert" className="text-sm text-muted-foreground">
          関連資料・リンクを読み込めませんでした。
        </p>
      ) : links.length ? (
        <ul className="divide-y">
          {links.map((link) => (
            <li
              key={link.id}
              className="group scroll-mt-24 py-2.5"
              data-requirement-comment-anchor={getRequirementCommentAnchorKey(
                createRequirementLinkCommentAnchor(link),
              )}
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="flex min-w-0 flex-col gap-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <LinkTypeBadge type={link.linked_type} />
                    <LinkStatusBadge status={link.status} />
                    <span className="text-xs text-muted-foreground">
                      {formatDateTime(link.created_at)}
                    </span>
                  </div>
                  {link.linked_url ? (
                    <a
                      className="break-words text-sm font-medium underline-offset-4 hover:underline"
                      href={link.linked_url}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {link.linked_id}
                      <ExternalLinkIcon
                        className="ml-1 inline size-3"
                        aria-label="新しいタブ"
                      />
                    </a>
                  ) : (
                    <span className="break-words text-sm font-medium">
                      {link.linked_id}
                    </span>
                  )}
                </div>
                <div className="flex shrink-0 flex-wrap gap-2">
                  {onSelectCommentAnchor ? (
                    <Button
                      type="button"
                      variant="ghost"
                      className="pointer-fine:opacity-0 pointer-fine:group-hover:opacity-100 pointer-fine:group-focus-within:opacity-100"
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
            </li>
          ))}
        </ul>
      ) : null}

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
    </RelatedItemsGroup>
  );
}

function LinkTypeBadge({ type }: { type?: string | null }) {
  return <Badge variant="secondary">{getRequirementLinkTypeLabel(type)}</Badge>;
}

function LinkStatusBadge({ status }: { status?: string | null }) {
  const tone: StatusTone =
    status === "verified" || status === "completed"
      ? "success"
      : status === "in_progress"
        ? "progress"
        : "neutral";

  return (
    <StatusBadge tone={tone}>
      {getRequirementLinkStatusLabel(status)}
    </StatusBadge>
  );
}
