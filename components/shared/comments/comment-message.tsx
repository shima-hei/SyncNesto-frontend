import type { ReactNode } from "react";
import { UserAvatar } from "@/components/shared/display/user-avatar";
import { formatDateTime } from "@/lib/format/date";

export function CommentMessage({
  author,
  avatarUrl,
  createdAt,
  reply,
  resolved,
  menu,
  children,
}: {
  author?: string | null;
  avatarUrl?: string | null;
  createdAt: string;
  reply?: boolean;
  resolved?: boolean;
  menu?: ReactNode;
  children: ReactNode;
}) {
  return (
    <article className="flex min-w-0 items-start gap-2.5">
      <UserAvatar
        name={author}
        src={avatarUrl}
        size={reply ? "sm" : "default"}
        decorative
      />
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <header className="flex min-w-0 items-start justify-between gap-1.5">
          <div className="flex min-h-7 min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5 text-xs">
            <span className="font-medium [overflow-wrap:anywhere]">
              {author || "投稿者不明"}
            </span>
            <time dateTime={createdAt} className="text-muted-foreground">
              {formatDateTime(createdAt)}
            </time>
            {resolved ? (
              <span className="text-muted-foreground">解決済み</span>
            ) : null}
          </div>
          {menu}
        </header>
        {children}
      </div>
    </article>
  );
}
