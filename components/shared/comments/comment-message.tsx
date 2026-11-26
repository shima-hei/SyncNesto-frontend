import type { ReactNode } from "react";
import { UserAvatar } from "@/components/shared/display/user-avatar";
import { formatDateTime, formatCommentDate } from "@/lib/format/date";
import type { CommentImageRead } from "@/lib/api/generated/model";
import { CommentImageGallery } from "./comment-image-gallery";

export function CommentMessage({
  author,
  avatarUrl,
  createdAt,
  reply,
  resolved,
  menu,
  images,
  children,
}: {
  author?: string | null;
  avatarUrl?: string | null;
  createdAt: string;
  reply?: boolean;
  resolved?: boolean;
  menu?: ReactNode;
  images?: CommentImageRead[] | null;
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
            <span className="font-semibold [overflow-wrap:anywhere]">
              {author || "投稿者不明"}
            </span>
            <time
              dateTime={createdAt}
              title={formatDateTime(createdAt)}
              className="text-[0.7rem] text-muted-foreground"
            >
              {formatCommentDate(createdAt)}
            </time>
            {resolved ? (
              <span className="text-muted-foreground">解決済み</span>
            ) : null}
          </div>
          {menu}
        </header>
        {children}
        <CommentImageGallery images={images} />
      </div>
    </article>
  );
}
