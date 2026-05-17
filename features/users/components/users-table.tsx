import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { UserAvatar } from "@/components/shared/user-avatar";
import type { UserListItem } from "@/lib/api/generated/model";

type UsersTableProps = {
  users: UserListItem[];
  isLoading: boolean;
};

export function UsersTable({ users, isLoading }: UsersTableProps) {
  if (isLoading) {
    return <UsersTableSkeleton />;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>ユーザー</TableHead>
          <TableHead>部署</TableHead>
          <TableHead>役職</TableHead>
          <TableHead>状態</TableHead>
          <TableHead>最終ログイン</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {users.length ? (
          users.map((user) => (
            <TableRow key={user.id}>
              <TableCell>
                <div className="flex min-w-64 items-center gap-3">
                  <UserAvatar name={user.name} src={user.avatar_url} />
                  <div className="flex min-w-0 flex-col">
                    <span className="truncate font-medium">{user.name}</span>
                    <span className="truncate text-xs text-muted-foreground">
                      {user.email}
                    </span>
                  </div>
                </div>
              </TableCell>
              <TableCell>{user.department ?? "-"}</TableCell>
              <TableCell>{user.position ?? "-"}</TableCell>
              <TableCell>
                <Badge variant={user.is_active ? "secondary" : "outline"}>
                  {user.is_active ? "有効" : "無効"}
                </Badge>
              </TableCell>
              <TableCell>{formatLastLoginAt(user.last_login_at)}</TableCell>
            </TableRow>
          ))
        ) : (
          <TableRow>
            <TableCell
              colSpan={5}
              className="h-24 text-center text-muted-foreground"
            >
              条件に一致するユーザーがありません。
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  );
}

const formatLastLoginAt = (lastLoginAt?: string | null) => {
  if (!lastLoginAt) {
    return "-";
  }

  return new Intl.DateTimeFormat("ja-JP", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(lastLoginAt));
};

function UsersTableSkeleton() {
  return (
    <div className="flex flex-col gap-2">
      {Array.from({ length: 5 }).map((_, index) => (
        <div key={index} className="flex items-center gap-3 px-2 py-2">
          <Skeleton className="size-8 rounded-full" />
          <div className="flex flex-1 flex-col gap-2">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-3 w-56" />
          </div>
          <Skeleton className="h-5 w-14" />
        </div>
      ))}
    </div>
  );
}
