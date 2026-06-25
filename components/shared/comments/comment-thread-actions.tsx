import {
  CheckIcon,
  MessageSquareReplyIcon,
  PencilIcon,
  RotateCcwIcon,
  Trash2Icon,
} from "lucide-react";

import { Button } from "@/components/ui/button";

type CommentThreadActionsProps<TComment> = {
  comment: TComment;
  isResolved: boolean;
  isStatePending: boolean;
  resolvePlacement?: "first" | "after-edit";
  reopenLabel?: string;
  onReply: (comment: TComment) => void;
  onEdit: (comment: TComment) => void;
  onDelete: (comment: TComment) => void;
  onResolve: () => void;
  onReopen: () => void;
};

export function CommentThreadActions<TComment>({
  comment,
  isResolved,
  isStatePending,
  resolvePlacement = "after-edit",
  reopenLabel = "再オープン",
  onReply,
  onEdit,
  onDelete,
  onResolve,
  onReopen,
}: CommentThreadActionsProps<TComment>) {
  const resolveButton = (
    <Button
      type="button"
      variant="outline"
      size="sm"
      disabled={isStatePending}
      onClick={isResolved ? onReopen : onResolve}
    >
      {isResolved ? (
        <RotateCcwIcon data-icon="inline-start" />
      ) : (
        <CheckIcon data-icon="inline-start" />
      )}
      {isResolved ? reopenLabel : "解決"}
    </Button>
  );

  return (
    <div className="flex flex-wrap gap-2">
      {resolvePlacement === "first" ? resolveButton : null}
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => onReply(comment)}
      >
        <MessageSquareReplyIcon data-icon="inline-start" />
        返信
      </Button>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => onEdit(comment)}
      >
        <PencilIcon data-icon="inline-start" />
        編集
      </Button>
      {resolvePlacement === "after-edit" ? resolveButton : null}
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => onDelete(comment)}
      >
        <Trash2Icon data-icon="inline-start" />
        削除
      </Button>
    </div>
  );
}
