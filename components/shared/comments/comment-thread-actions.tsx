import {
  CheckIcon,
  CornerDownRightIcon,
  EllipsisIcon,
  PencilIcon,
  RotateCcwIcon,
  Trash2Icon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function CommentMessageMenu({
  onEdit,
  onDelete,
}: {
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          aria-label="コメントの操作"
        >
          <EllipsisIcon aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuGroup>
          <DropdownMenuItem onSelect={onEdit}>
            <PencilIcon />
            編集
          </DropdownMenuItem>
          <DropdownMenuItem variant="destructive" onSelect={onDelete}>
            <Trash2Icon />
            削除
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

type CommentThreadActionsProps<TComment> = {
  comment: TComment;
  isResolved: boolean;
  isStatePending: boolean;
  reopenLabel?: string;
  canReply?: boolean;
  canResolve?: boolean;
  onReply: (comment: TComment) => void;
  onResolve: () => void;
  onReopen: () => void;
};

export function CommentThreadActions<TComment>({
  comment,
  isResolved,
  isStatePending,
  reopenLabel = "再オープン",
  canReply = true,
  canResolve = true,
  onReply,
  onResolve,
  onReopen,
}: CommentThreadActionsProps<TComment>) {
  const resolveButton = (
    <Button
      type="button"
      variant="ghost"
      size="xs"
      disabled={isStatePending}
      onClick={isResolved ? onReopen : onResolve}
    >
      {isResolved ? (
        <RotateCcwIcon data-icon="inline-start" />
      ) : (
        <CheckIcon data-icon="inline-start" />
      )}
      {isResolved ? reopenLabel : "解決する"}
    </Button>
  );

  return (
    <div className="flex flex-wrap gap-1">
      {canReply ? (
        <Button
          type="button"
          variant="ghost"
          size="xs"
          onClick={() => onReply(comment)}
        >
          <CornerDownRightIcon data-icon="inline-start" />
          返信
        </Button>
      ) : null}
      {canResolve ? resolveButton : null}
    </div>
  );
}
