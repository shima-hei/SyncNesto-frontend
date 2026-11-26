import { UserDisplay } from "@/components/shared/display/user-avatar";

export function TaskAssignee({
  user,
  userId,
}: {
  user?: { name: string; avatar_url?: string | null } | null;
  userId?: number | null;
}) {
  return (
    <UserDisplay
      name={user?.name}
      src={user?.avatar_url}
      emptyLabel={userId ? "担当者情報なし" : "未割り当て"}
      truncate
    />
  );
}
