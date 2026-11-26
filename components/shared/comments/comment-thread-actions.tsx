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
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { ComponentProps } from "react";

export function CommentIconButton({
  label,
  children,
  ...props
}: ComponentProps<typeof Button> & { label: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label={label}
          {...props}
        >
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}

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
          size="icon-sm"
          title="コメントの操作"
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
    <CommentIconButton
      label={isResolved ? reopenLabel : "解決する"}
      disabled={isStatePending}
      onClick={isResolved ? onReopen : onResolve}
    >
      {isResolved ? (
        <RotateCcwIcon aria-hidden="true" />
      ) : (
        <CheckIcon aria-hidden="true" />
      )}
    </CommentIconButton>
  );

  return (
    <div className="flex flex-wrap gap-0.5 text-muted-foreground">
      {canReply ? (
        <CommentIconButton label="返信" onClick={() => onReply(comment)}>
          <CornerDownRightIcon aria-hidden="true" />
        </CommentIconButton>
      ) : null}
      {canResolve ? resolveButton : null}
    </div>
  );
}
