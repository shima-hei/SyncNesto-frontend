"use client";

import type { ReactNode } from "react";
import { SendIcon } from "lucide-react";
import { UserAvatar } from "@/components/shared/display/user-avatar";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { useAuth } from "@/features/auth/providers/auth-provider";
import { CommentIconButton } from "./comment-thread-actions";

export function CommentComposer({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  return (
    <div className="flex min-w-0 items-start gap-2.5">
      <UserAvatar name={user?.name} src={user?.avatar_url} decorative />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

export function CommentSubmit({
  children,
  pending,
  body,
  onCancel,
}: {
  children: ReactNode;
  pending: boolean;
  body: string;
  onCancel?: () => void;
}) {
  return (
    <div className="flex flex-wrap justify-end gap-2">
      {onCancel ? (
        <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
          キャンセル
        </Button>
      ) : null}
      {typeof children === "string" ? (
        <CommentIconButton
          label={children}
          type="submit"
          variant="secondary"
          size="icon"
          disabled={pending || !body.trim()}
        >
          {pending ? <Spinner /> : <SendIcon aria-hidden="true" />}
        </CommentIconButton>
      ) : (
        <Button type="submit" size="sm" disabled={pending || !body.trim()}>
          {pending ? <Spinner data-icon="inline-start" /> : null}
          {children}
        </Button>
      )}
    </div>
  );
}
