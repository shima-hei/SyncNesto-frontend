import { UserRoundIcon } from "lucide-react";

import { UserAvatar } from "@/components/shared/display/user-avatar";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

export function TaskAssignee({
  user,
  userId,
}: {
  user?: { name: string; avatar_url?: string | null } | null;
  userId?: number | null;
}) {
  const name = user?.name ?? (userId ? `ユーザーID: ${userId}` : "未割当");
  return (
    <span
      className="inline-flex max-w-full min-w-0 items-center gap-2"
      title={name}
    >
      <span aria-hidden="true" className="shrink-0">
        {user ? (
          <UserAvatar name={name} src={user.avatar_url} size="sm" />
        ) : (
          <Avatar size="sm">
            <AvatarFallback>
              <UserRoundIcon className="size-3.5" />
            </AvatarFallback>
          </Avatar>
        )}
      </span>
      <span className="truncate">{name}</span>
    </span>
  );
}
